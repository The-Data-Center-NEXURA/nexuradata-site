import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const packageJsonPath = path.join(projectRoot, "package.json");
const wranglerConfigPath = path.join(projectRoot, "wrangler.jsonc");
const releaseDir = path.join(projectRoot, "release-cloudflare");
const wranglerBin = path.join(
  projectRoot,
  "node_modules",
  "wrangler",
  "bin",
  "wrangler.js"
);

const productionBranch = "main";
const previewBranch = "staging";

const ensurePath = async (targetPath, label) => {
  try {
    await access(targetPath, constants.F_OK);
  } catch {
    throw new Error(`Missing ${label}: ${path.relative(projectRoot, targetPath)}`);
  }
};

const getConfiguredPagesProjectName = async () => {
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const projectName = packageJson?.config?.pagesProjectName;

  if (typeof projectName !== "string" || projectName.trim() === "") {
    throw new Error('package.json must define "config.pagesProjectName".');
  }

  return projectName.trim();
};

const stripJsoncComments = (content) => {
  let output = "";
  let inString = false;
  let quote = "";
  let escaped = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        inString = false;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      output += char;
      continue;
    }

    if (char === "/" && next === "/") {
      while (index < content.length && content[index] !== "\n") index += 1;
      output += "\n";
      continue;
    }

    if (char === "/" && next === "*") {
      index += 2;
      while (index < content.length && !(content[index] === "*" && content[index + 1] === "/")) {
        if (content[index] === "\n") output += "\n";
        index += 1;
      }
      index += 1;
      continue;
    }

    output += char;
  }

  return output;
};

const stripJsoncTrailingCommas = (content) => {
  let output = "";
  let inString = false;
  let quote = "";
  let escaped = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        inString = false;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      output += char;
      continue;
    }

    if (char === ",") {
      let nextIndex = index + 1;
      while (/\s/.test(content[nextIndex] || "")) nextIndex += 1;
      if (content[nextIndex] === "}" || content[nextIndex] === "]") continue;
    }

    output += char;
  }

  return output;
};

const parseJsonc = (content) => JSON.parse(stripJsoncTrailingCommas(stripJsoncComments(content)));

const getWranglerConfig = async () => parseJsonc(await readFile(wranglerConfigPath, "utf8"));

const ensureReleaseOutput = async () => {
  await ensurePath(releaseDir, "release directory");
  await ensurePath(path.join(releaseDir, "index.html"), "release homepage");
  await ensurePath(path.join(releaseDir, "_headers"), "release _headers file");
  await ensurePath(path.join(releaseDir, "_redirects"), "release _redirects file");
};

const runWrangler = async (args, options = {}) => {
  await ensurePath(wranglerBin, "Wrangler binary");

  return new Promise((resolve, reject) => {
    const command = process.execPath;
    const commandArgs = [wranglerBin, ...args];

    const child = spawn(command, commandArgs, {
      cwd: projectRoot,
      env: process.env,
      shell: false,
      stdio: options.capture ? ["inherit", "pipe", "pipe"] : "inherit"
    });

    let stdout = "";
    let stderr = "";

    if (options.capture) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      const details = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
      reject(new Error(details ? `Wrangler exited with code ${code}.\n${details}` : `Wrangler exited with code ${code}.`));
    });
  });
};

const list = async (extraArgs = []) => {
  await runWrangler(["pages", "project", "list", ...extraArgs]);
};

const whoami = async (extraArgs = []) => {
  await runWrangler(["whoami", ...extraArgs]);
};

const check = async () => {
  await ensureReleaseOutput();

  const projectName = await getConfiguredPagesProjectName();

  const { stdout } = await runWrangler(["pages", "project", "list", "--json"], { capture: true });
  const projects = JSON.parse(stdout);
  const matchingProject = projects.find((project) => project["Project Name"] === projectName);

  if (!matchingProject) {
    throw new Error(`Pages project "${projectName}" was not found in wrangler pages project list output.`);
  }

  console.log(`Validated release-cloudflare/ and Cloudflare Pages access for "${projectName}".`);
};

const deploy = async (branch) => {
  await ensureReleaseOutput();

  const projectName = await getConfiguredPagesProjectName();
  await runWrangler(["pages", "deploy", "./release-cloudflare", "--project-name", projectName, "--branch", branch]);
};

const dev = async (extraArgs = []) => {
  await ensureReleaseOutput();

  const config = await getWranglerConfig();
  const args = ["pages", "dev", "./release-cloudflare", "--live-reload"];

  if (typeof config.compatibility_date === "string" && config.compatibility_date.trim()) {
    args.push("--compatibility-date", config.compatibility_date.trim());
  }

  for (const flag of config.compatibility_flags || []) {
    if (typeof flag === "string" && flag.trim()) {
      args.push("--compatibility-flag", flag.trim());
    }
  }

  await runWrangler([...args, ...extraArgs]);
};

const create = async () => {
  const projectName = await getConfiguredPagesProjectName();
  await runWrangler(["pages", "project", "create", projectName, "--production-branch", productionBranch]);
};

const command = process.argv[2];
const extraArgs = process.argv.slice(3);

try {
  if (command === "check") {
    await check();
  } else if (command === "dev") {
    await dev(extraArgs);
  } else if (command === "list") {
    await list(extraArgs);
  } else if (command === "whoami") {
    await whoami(extraArgs);
  } else if (command === "create") {
    await create();
  } else if (command === "deploy-prod") {
    await deploy(productionBranch);
  } else if (command === "deploy-staging") {
    await deploy(previewBranch);
  } else {
    throw new Error(`Unknown command: ${command ?? "<missing>"}`);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
