#!/usr/bin/env node
/**
 * Generate all NEXURADATA PNG brand assets from source SVGs.
 * Run: node scripts/generate-brand-assets.mjs
 */
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Brand colors
const NOIR = '#0d0d0b';
const OS = '#e8e4dc';
const OS_DIM = 'rgba(232, 228, 220, 0.35)';

// ─── N Mark (the data-bar glyph) ───
function nMark(size, pad) {
  const s = size - pad * 2;
  const bw = s * 0.08; // bar width
  const gap = s * 0.25;
  return `
    <rect x="${pad}" y="${pad}" width="${bw}" height="${s}" fill="${OS}" opacity="1"/>
    <rect x="${pad + gap}" y="${pad}" width="${bw}" height="${s}" fill="${OS}" opacity="0.55"/>
    <rect x="${pad + gap * 2}" y="${pad}" width="${bw}" height="${s}" fill="${OS}" opacity="0.22"/>
    <rect x="${pad + gap * 3}" y="${pad}" width="${bw}" height="${s}" fill="${OS}" opacity="0.08"/>
    <line x1="${pad}" y1="${pad}" x2="${pad + s}" y2="${pad + s}" stroke="${OS}" stroke-width="${bw * 0.7}" stroke-linecap="butt"/>
    <rect x="${pad + s - bw}" y="${pad}" width="${bw}" height="${s}" fill="${OS}" opacity="1"/>`;
}

// ─── 1. Favicon ICO / Apple Touch Icon ───
async function generateIcons() {
  const faviconSvg = readFileSync(resolve(ROOT, 'assets/icons/favicon.svg'));

  // Apple touch icon (180x180)
  await sharp(faviconSvg).resize(180, 180).png().toFile(resolve(ROOT, 'assets/icons/apple-touch-icon.png'));
  console.log('  ✓ apple-touch-icon.png (180×180)');

  // PWA icons
  for (const size of [192, 512]) {
    await sharp(faviconSvg).resize(size, size).png().toFile(resolve(ROOT, `assets/icons/icon-${size}.png`));
    console.log(`  ✓ icon-${size}.png`);
  }

  // nexuradata-icon.png (referenced in branding doc)
  await sharp(faviconSvg).resize(512, 512).png().toFile(resolve(ROOT, 'assets/nexuradata-icon.png'));
  console.log('  ✓ nexuradata-icon.png (512×512)');
}

// ─── 2. Master logo PNG ───
async function generateMasterPng() {
  const masterSvg = readFileSync(resolve(ROOT, 'assets/nexuradata-master.svg'));
  // 2x resolution for crisp rendering
  await sharp(masterSvg).resize(1000, 180).png().toFile(resolve(ROOT, 'assets/nexuradata-master.png'));
  console.log('  ✓ nexuradata-master.png (1000×180)');
}

// ─── 3. OG Default Image (1200×630, on-brand) ───
async function generateOgDefault() {
  const w = 1200, h = 630;
  // N mark parameters
  const markSize = 120;
  const markPad = 0;
  const markX = 100;
  const markY = 180;

  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${w}" height="${h}" fill="${NOIR}"/>
  <!-- Subtle rule line at top -->
  <line x1="80" y1="60" x2="${w - 80}" y2="60" stroke="${OS}" stroke-width="0.5" opacity="0.12"/>
  <!-- N mark -->
  <g transform="translate(${markX}, ${markY})">
    ${nMark(markSize, markPad)}
  </g>
  <!-- NEXURADATA text -->
  <text x="240" y="280" font-family="Georgia, 'Times New Roman', serif" font-size="72" font-weight="400" letter-spacing="8" fill="${OS}">NEXURA</text>
  <text x="240" y="280" font-family="Georgia, 'Times New Roman', serif" font-size="72" font-weight="400" letter-spacing="8" fill="${OS}" dx="420">
    <tspan fill="${OS}" opacity="0.35" font-size="28" letter-spacing="10" dy="-2">DATA</tspan>
  </text>
  <!-- Tagline -->
  <text x="240" y="340" font-family="Georgia, 'Times New Roman', serif" font-size="18" letter-spacing="4" fill="${OS}" opacity="0.45">Récupération de données · Forensique numérique · Montréal</text>
  <!-- Bottom rule -->
  <line x1="80" y1="560" x2="${w - 80}" y2="560" stroke="${OS}" stroke-width="0.5" opacity="0.12"/>
  <!-- Bottom info -->
  <text x="80" y="590" font-family="Georgia, 'Times New Roman', serif" font-size="13" letter-spacing="3" fill="${OS}" opacity="0.25">nexuradata.ca</text>
  <text x="${w - 80}" y="590" font-family="Georgia, 'Times New Roman', serif" font-size="13" letter-spacing="3" fill="${OS}" opacity="0.25" text-anchor="end">7/7 · 9h – 18h · Urgences 24/7</text>
</svg>`;

  await sharp(Buffer.from(svg)).png().toFile(resolve(ROOT, 'assets/icons/og-default.png'));
  console.log('  ✓ og-default.png (1200×630, on-brand)');
}

// ─── 4. OG English variant ───
async function generateOgEn() {
  const w = 1200, h = 630;
  const markSize = 120;
  const markX = 100;
  const markY = 180;

  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${w}" height="${h}" fill="${NOIR}"/>
  <line x1="80" y1="60" x2="${w - 80}" y2="60" stroke="${OS}" stroke-width="0.5" opacity="0.12"/>
  <g transform="translate(${markX}, ${markY})">
    ${nMark(markSize, 0)}
  </g>
  <text x="240" y="280" font-family="Georgia, 'Times New Roman', serif" font-size="72" font-weight="400" letter-spacing="8" fill="${OS}">NEXURA</text>
  <text x="240" y="280" font-family="Georgia, 'Times New Roman', serif" font-size="72" font-weight="400" letter-spacing="8" fill="${OS}" dx="420">
    <tspan fill="${OS}" opacity="0.35" font-size="28" letter-spacing="10" dy="-2">DATA</tspan>
  </text>
  <text x="240" y="340" font-family="Georgia, 'Times New Roman', serif" font-size="18" letter-spacing="4" fill="${OS}" opacity="0.45">Data Recovery · Digital Forensics · Montreal</text>
  <line x1="80" y1="560" x2="${w - 80}" y2="560" stroke="${OS}" stroke-width="0.5" opacity="0.12"/>
  <text x="80" y="590" font-family="Georgia, 'Times New Roman', serif" font-size="13" letter-spacing="3" fill="${OS}" opacity="0.25">nexuradata.ca</text>
  <text x="${w - 80}" y="590" font-family="Georgia, 'Times New Roman', serif" font-size="13" letter-spacing="3" fill="${OS}" opacity="0.25" text-anchor="end">7/7 · 9 AM – 6 PM · Emergencies 24/7</text>
</svg>`;

  await sharp(Buffer.from(svg)).png().toFile(resolve(ROOT, 'assets/icons/og-en.png'));
  console.log('  ✓ og-en.png (1200×630, EN variant)');
}

// ─── 5. Email signature image ───
async function generateSignature() {
  const w = 500, h = 100;
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${w}" height="${h}" fill="${NOIR}"/>
  <g transform="translate(16, 18)">
    <rect x="0" y="0" width="2" height="30" fill="${OS}" opacity="1"/>
    <rect x="6" y="0" width="2" height="30" fill="${OS}" opacity="0.55"/>
    <rect x="12" y="0" width="2" height="30" fill="${OS}" opacity="0.22"/>
    <rect x="18" y="0" width="2" height="30" fill="${OS}" opacity="0.08"/>
    <line x1="0" y1="0" x2="24" y2="30" stroke="${OS}" stroke-width="1.6" stroke-linecap="butt"/>
    <rect x="22" y="0" width="2" height="30" fill="${OS}" opacity="1"/>
  </g>
  <text x="50" y="40" font-family="Georgia, 'Times New Roman', serif" font-size="28" font-weight="400" letter-spacing="4" fill="${OS}">NEXURA</text>
  <text x="236" y="40" font-family="Georgia, 'Times New Roman', serif" font-size="11" font-weight="400" letter-spacing="6" fill="${OS}" opacity="0.35">DATA</text>
  <line x1="16" y1="60" x2="${w - 16}" y2="60" stroke="${OS}" stroke-width="0.5" opacity="0.12"/>
  <text x="16" y="80" font-family="Georgia, 'Times New Roman', serif" font-size="8.5" letter-spacing="3" fill="${OS}" opacity="0.22">Récupération · RAID · Forensique · Montréal</text>
  <text x="${w - 16}" y="80" font-family="Georgia, 'Times New Roman', serif" font-size="8.5" letter-spacing="2" fill="${OS}" opacity="0.22" text-anchor="end">nexuradata.ca</text>
</svg>`;

  await sharp(Buffer.from(svg)).png().toFile(resolve(ROOT, 'assets/nexuradata-signature.png'));
  console.log('  ✓ nexuradata-signature.png (500×100)');
}

// ─── 6. Social profile square (800×800) ───
async function generateSocialProfile() {
  const s = 800;
  const svg = `<svg width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${s}" height="${s}" rx="0" fill="${NOIR}"/>
  <g transform="translate(${s / 2 - 120}, ${s / 2 - 140})">
    ${nMark(240, 0)}
  </g>
  <text x="${s / 2}" y="${s / 2 + 150}" font-family="Georgia, 'Times New Roman', serif" font-size="44" font-weight="400" letter-spacing="6" fill="${OS}" text-anchor="middle">NEXURADATA</text>
  <text x="${s / 2}" y="${s / 2 + 190}" font-family="Georgia, 'Times New Roman', serif" font-size="14" letter-spacing="5" fill="${OS}" opacity="0.35" text-anchor="middle">RÉCUPÉRATION DE DONNÉES · MONTRÉAL</text>
</svg>`;

  await sharp(Buffer.from(svg)).png().toFile(resolve(ROOT, 'assets/icons/social-profile.png'));
  console.log('  ✓ social-profile.png (800×800)');
}

// ─── 7. Social banner (1500×500 for LinkedIn/Twitter) ───
async function generateSocialBanner() {
  const w = 1500, h = 500;
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${w}" height="${h}" fill="${NOIR}"/>
  <line x1="60" y1="50" x2="${w - 60}" y2="50" stroke="${OS}" stroke-width="0.5" opacity="0.12"/>
  <g transform="translate(${w / 2 - 240}, ${h / 2 - 60})">
    ${nMark(100, 0)}
    <text x="118" y="88" font-family="Georgia, 'Times New Roman', serif" font-size="80" font-weight="400" letter-spacing="8" fill="${OS}">EXURA</text>
    <text x="530" y="88" font-family="Georgia, 'Times New Roman', serif" font-size="26" font-weight="400" letter-spacing="10" fill="${OS}" opacity="0.35">DATA</text>
  </g>
  <text x="${w / 2}" y="${h / 2 + 85}" font-family="Georgia, 'Times New Roman', serif" font-size="16" letter-spacing="5" fill="${OS}" opacity="0.35" text-anchor="middle">Récupération de données · Forensique numérique · Montréal</text>
  <line x1="60" y1="${h - 50}" x2="${w - 60}" y2="${h - 50}" stroke="${OS}" stroke-width="0.5" opacity="0.12"/>
</svg>`;

  await sharp(Buffer.from(svg)).png().toFile(resolve(ROOT, 'assets/icons/social-banner.png'));
  console.log('  ✓ social-banner.png (1500×500)');
}

// ─── 8. Facebook cover photo (1640×624) ───
async function generateFacebookCover() {
  const w = 1640, h = 624;
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${w}" height="${h}" fill="${NOIR}"/>
  <line x1="80" y1="56" x2="${w - 80}" y2="56" stroke="${OS}" stroke-width="0.5" opacity="0.12"/>
  <!-- N mark left -->
  <g transform="translate(120, ${h / 2 - 70})">
    ${nMark(140, 0)}
  </g>
  <!-- NEXURADATA logotype -->
  <text x="290" y="${h / 2 + 28}" font-family="Georgia, 'Times New Roman', serif" font-size="86" font-weight="400" letter-spacing="8" fill="${OS}">NEXURA</text>
  <text x="914" y="${h / 2 + 28}" font-family="Georgia, 'Times New Roman', serif" font-size="28" font-weight="400" letter-spacing="12" fill="${OS}" opacity="0.35">DATA</text>
  <!-- Tagline -->
  <text x="290" y="${h / 2 + 68}" font-family="Georgia, 'Times New Roman', serif" font-size="16" letter-spacing="5" fill="${OS}" opacity="0.38">Récupération de données · Forensique numérique · Montréal</text>
  <!-- Right accent: URL -->
  <text x="${w - 80}" y="${h / 2 + 28}" font-family="Georgia, 'Times New Roman', serif" font-size="14" letter-spacing="3" fill="${OS}" opacity="0.22" text-anchor="end">nexuradata.ca</text>
  <line x1="80" y1="${h - 56}" x2="${w - 80}" y2="${h - 56}" stroke="${OS}" stroke-width="0.5" opacity="0.12"/>
</svg>`;

  await sharp(Buffer.from(svg)).png().toFile(resolve(ROOT, 'assets/icons/facebook-cover.png'));
  console.log('  ✓ facebook-cover.png (1640×624)');
}

// ─── 9. Google Business Profile photo (720×720) ───
async function generateGbpPhoto() {
  const s = 720;
  const svg = `<svg width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${s}" height="${s}" fill="${NOIR}"/>
  <g transform="translate(${s / 2 - 100}, ${s / 2 - 130})">
    ${nMark(200, 0)}
  </g>
  <text x="${s / 2}" y="${s / 2 + 130}" font-family="Georgia, 'Times New Roman', serif" font-size="38" font-weight="400" letter-spacing="5" fill="${OS}" text-anchor="middle">NEXURADATA</text>
  <text x="${s / 2}" y="${s / 2 + 168}" font-family="Georgia, 'Times New Roman', serif" font-size="12" letter-spacing="4" fill="${OS}" opacity="0.35" text-anchor="middle">DATA RECOVERY · DIGITAL FORENSICS</text>
</svg>`;

  await sharp(Buffer.from(svg)).png().toFile(resolve(ROOT, 'assets/icons/gbp-profile.png'));
  console.log('  ✓ gbp-profile.png (720×720)');
}

// ─── Run all ───
console.log('Generating NEXURADATA brand assets…\n');

try {
  await generateIcons();
  await generateMasterPng();
  await generateOgDefault();
  await generateOgEn();
  await generateSignature();
  await generateSocialProfile();
  await generateSocialBanner();
  await generateFacebookCover();
  await generateGbpPhoto();
  console.log('\nDone — all brand assets generated.');
} catch (err) {
  console.error('Error:', err);
  process.exit(1);
}
