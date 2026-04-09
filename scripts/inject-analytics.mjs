import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const analyticsScript = '<script src="assets/js/analytics.js" defer></script>';
const analyticsScriptEn = '<script src="../assets/js/analytics.js" defer></script>';

async function injectAnalytics(filePath, scriptTag) {
  const content = await readFile(filePath, 'utf-8');
  
  // Check if analytics is already injected
  if (content.includes('assets/js/analytics.js')) {
    console.log(`✓ Analytics already present in ${path.basename(filePath)}`);
    return false;
  }
  
  // Inject before </head>
  const updatedContent = content.replace('</head>', `  ${scriptTag}\n</head>`);
  
  if (updatedContent === content) {
    console.log(`⚠ Could not find </head> tag in ${path.basename(filePath)}`);
    return false;
  }
  
  await writeFile(filePath, updatedContent, 'utf-8');
  console.log(`✓ Injected analytics into ${path.basename(filePath)}`);
  return true;
}

async function processHtmlFiles() {
  let injected = 0;
  let skipped = 0;
  
  // Process root HTML files
  const rootEntries = await readdir(projectRoot, { withFileTypes: true });
  for (const entry of rootEntries) {
    if (entry.isFile() && entry.name.endsWith('.html') && entry.name !== 'index2.html') {
      const filePath = path.join(projectRoot, entry.name);
      const result = await injectAnalytics(filePath, analyticsScript);
      if (result) injected++;
      else skipped++;
    }
  }
  
  // Process /en directory
  const enDir = path.join(projectRoot, 'en');
  try {
    const enEntries = await readdir(enDir, { withFileTypes: true });
    for (const entry of enEntries) {
      if (entry.isFile() && entry.name.endsWith('.html')) {
        const filePath = path.join(enDir, entry.name);
        const result = await injectAnalytics(filePath, analyticsScriptEn);
        if (result) injected++;
        else skipped++;
      }
    }
  } catch (err) {
    console.log('No /en directory found, skipping...');
  }
  
  // Process /operations directory
  const opsDir = path.join(projectRoot, 'operations');
  try {
    const opsEntries = await readdir(opsDir, { withFileTypes: true });
    for (const entry of opsEntries) {
      if (entry.isFile() && entry.name.endsWith('.html')) {
        const filePath = path.join(opsDir, entry.name);
        const result = await injectAnalytics(filePath, analyticsScriptEn);
        if (result) injected++;
        else skipped++;
      }
    }
  } catch (err) {
    console.log('No /operations directory found, skipping...');
  }
  
  console.log(`\nSummary: ${injected} files updated, ${skipped} files skipped`);
}

processHtmlFiles().catch(console.error);
