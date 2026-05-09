// One-shot helper: split assets/css/site.css into assets/css/src/*.css partials
// at the section comment markers, then verify a rebuild is byte-identical.
// Run once: `node scripts/split-css-once.mjs`
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const src = await readFile(path.join(root, "assets/css/site.css"), "utf8");
const lines = src.split("\n");
const totalLines = lines.length;
console.log("source lines:", totalLines, "ends with newline:", src.endsWith("\n"));

// Section ranges (1-based, inclusive). Last range goes to end.
const sections = [
  [1,    159,  "00-tokens.css"],
  [160,  278,  "01-header-nav.css"],
  [279,  1980, "02-components.css"],
  [1981, 2752, "03-footer.css"],
  [2753, 3658, "04-client-portal.css"],
  [3659, 3984, "05-ops.css"],
  [3985, 4097, "06-process.css"],
  [4098, 4158, "07-urgency.css"],
  [4159, 4206, "08-credentials.css"],
  [4207, 5013, "09-404.css"],
  [5014, 5158, "10-responsive.css"],
  [5159, 5224, "11-print.css"],
  [5225, 6474, "12-chatbot.css"],
  [6475, 6613, "13-cookie-consent.css"],
  [6614, 6630, "14-whatsapp.css"],
  [6631, 6784, "15-recovery-desk.css"],
  [6785, totalLines, "16-polish-layer.css"]
];

await mkdir(path.join(root, "assets/css/src"), { recursive: true });

let assembled = "";
for (const [start, end, name] of sections) {
  const chunk = lines.slice(start - 1, end).join("\n");
  const isLast = name === "16-polish-layer.css";
  const piece = isLast ? chunk : chunk + "\n";
  assembled += piece;
  await writeFile(path.join(root, "assets/css/src", name), piece, "utf8");
}

const origHash = createHash("sha256").update(src).digest("hex");
const reHash = createHash("sha256").update(assembled).digest("hex");
console.log("original sha256:", origHash);
console.log("rebuilt  sha256:", reHash);
console.log("match:", origHash === reHash);
if (origHash !== reHash) {
  console.log("lengths:", src.length, assembled.length);
  const min = Math.min(src.length, assembled.length);
  for (let i = 0; i < min; i++) {
    if (src[i] !== assembled[i]) {
      console.log(
        "first diff at byte",
        i,
        "orig=",
        JSON.stringify(src.slice(Math.max(0, i - 20), i + 20)),
        "new=",
        JSON.stringify(assembled.slice(Math.max(0, i - 20), i + 20))
      );
      break;
    }
  }
  process.exit(1);
}
