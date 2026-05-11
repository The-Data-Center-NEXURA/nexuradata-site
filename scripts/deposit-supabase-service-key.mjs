import { spawnSync } from "node:child_process";
import { chmod, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(scriptDir);
const defaultSupabaseUrl = "https://ajflsebrzwbmprucqqyt.supabase.co";

const targets = [
  "apps/nexadura-site/.env.local",
  "scripts/hooks/service_role_key.yml",
];

const readTextIfExists = async (filePath) => {
  try {
    await stat(filePath);
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return "";
    throw error;
  }
};

const assertIgnored = (relativePath) => {
  const result = spawnSync("git", ["check-ignore", "--quiet", relativePath], { cwd: repoRoot });
  if (result.status !== 0) {
    throw new Error(`${relativePath} is not ignored by Git. Refusing to write a service-role key.`);
  }
};

const readExistingEnvValue = (text, key) => {
  const line = text.split(/\r?\n/).find((entry) => entry.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : "";
};

const updateEnvText = (text, entries) => {
  const keys = new Set(Object.keys(entries));
  const seen = new Set();
  const lines = text.split(/\r?\n/).filter((line, index, all) => line.length > 0 || index < all.length - 1);
  const nextLines = lines.map((line) => {
    const [candidateKey] = line.split("=", 1);
    if (!keys.has(candidateKey)) return line;
    seen.add(candidateKey);
    return `${candidateKey}=${entries[candidateKey]}`;
  });

  for (const [key, value] of Object.entries(entries)) {
    if (!seen.has(key)) nextLines.push(`${key}=${value}`);
  }

  return `${nextLines.join("\n").trim()}\n`;
};

const promptHidden = (question) =>
  new Promise((resolve, reject) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    let value = "";

    const cleanup = () => {
      stdin.off("data", onData);
      if (stdin.isTTY) stdin.setRawMode(false);
      stdin.pause();
    };

    const onData = (chunk) => {
      const text = String(chunk);
      for (const char of text) {
        if (char === "\u0003") {
          cleanup();
          stdout.write("\n");
          reject(new Error("Operation cancelled."));
          return;
        }
        if (char === "\r" || char === "\n") {
          cleanup();
          stdout.write("\n");
          resolve(value.trim());
          return;
        }
        if (char === "\u007f") {
          value = value.slice(0, -1);
          continue;
        }
        if (char >= " ") value += char;
      }
    };

    stdout.write(question);
    stdin.resume();
    stdin.setEncoding("utf8");
    if (stdin.isTTY) stdin.setRawMode(true);
    stdin.on("data", onData);
  });

const validateSupabaseUrl = (value) => {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") throw new Error("Supabase URL must use https.");
    return url.toString().replace(/\/$/, "");
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid https URL.");
  }
};

const validateServiceRoleKey = (value) => {
  const key = value.trim();
  if (!key || key === "your_service_role_key_here") {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is still empty or a placeholder.");
  }
  if (/\s/.test(key)) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY must be one single line without spaces.");
  }
  if (key.length < 40) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY looks too short.");
  }
  return key;
};

const writePrivateEnvFile = async (relativePath, entries) => {
  const absolutePath = join(repoRoot, relativePath);
  const existing = await readTextIfExists(absolutePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, updateEnvText(existing, entries), { mode: 0o600 });
  await chmod(absolutePath, 0o600);
};

const main = async () => {
  for (const target of targets) assertIgnored(target);

  if (process.argv.includes("--check")) {
    console.log("Supabase service-role deposit access is ready. Target files are ignored by Git.");
    return;
  }

  const envLocalPath = join(repoRoot, "apps/nexadura-site/.env.local");
  const existingEnv = await readTextIfExists(envLocalPath);
  const supabaseUrl = validateSupabaseUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL || readExistingEnvValue(existingEnv, "NEXT_PUBLIC_SUPABASE_URL") || defaultSupabaseUrl,
  );
  const suppliedKey = process.env.SUPABASE_SERVICE_ROLE_KEY || (await promptHidden("SUPABASE_SERVICE_ROLE_KEY: "));
  const serviceRoleKey = validateServiceRoleKey(suppliedKey);
  const entries = {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  };

  for (const target of targets) await writePrivateEnvFile(target, entries);
  console.log("Service-role key deposited locally. Files remain ignored by Git.");
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Could not deposit the service-role key.");
  process.exit(1);
});