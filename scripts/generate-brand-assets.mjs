#!/usr/bin/env node
/**
 * Generate all NEXURADATA PNG brand assets from source SVGs.
 * Run: node scripts/generate-brand-assets.mjs
 */
import sharp from 'sharp';
import QRCode from 'qrcode';
import { readFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Brand colors
const NOIR = '#0d0d0b';
const OS = '#e8e4dc';
const OS_DIM = 'rgba(232, 228, 220, 0.35)';
const CONTACT_URL = 'https://nexuradata.ca/#contact';

async function qrDataUri(size = 220) {
  const svg = await QRCode.toString(CONTACT_URL, {
    type: 'svg',
    margin: 1,
    width: size,
    errorCorrectionLevel: 'H',
    color: {
      dark: NOIR,
      light: OS,
    },
  });

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function ruleGrid(w, h, step = 72) {
  let lines = '';
  for (let x = step; x < w; x += step) {
    lines += `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="${OS}" stroke-width="0.5" opacity="0.035"/>`;
  }
  for (let y = step; y < h; y += step) {
    lines += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="${OS}" stroke-width="0.5" opacity="0.035"/>`;
  }
  return lines;
}

function servicePills(x, y, labels, gap = 14) {
  let cursor = x;
  return labels.map((label) => {
    const width = label.length * 10 + 34;
    const pill = `<g transform="translate(${cursor}, ${y})">
      <rect width="${width}" height="38" rx="0" fill="${NOIR}" stroke="${OS}" stroke-width="0.5" opacity="0.95"/>
      <text x="17" y="25" font-family="Georgia, 'Times New Roman', serif" font-size="13" letter-spacing="2" fill="${OS}" opacity="0.58">${label}</text>
    </g>`;
    cursor += width + gap;
    return pill;
  }).join('');
}

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
  ${ruleGrid(s, s, 80)}
  <line x1="96" y1="96" x2="704" y2="96" stroke="${OS}" stroke-width="0.5" opacity="0.16"/>
  <line x1="96" y1="704" x2="704" y2="704" stroke="${OS}" stroke-width="0.5" opacity="0.16"/>
  <g transform="translate(${s / 2 - 116}, ${s / 2 - 190})">
    ${nMark(232, 0)}
  </g>
  <text x="${s / 2}" y="${s / 2 + 92}" font-family="Georgia, 'Times New Roman', serif" font-size="46" font-weight="400" letter-spacing="6" fill="${OS}" text-anchor="middle">NEXURADATA</text>
  <text x="${s / 2}" y="${s / 2 + 138}" font-family="Georgia, 'Times New Roman', serif" font-size="14" letter-spacing="5" fill="${OS}" opacity="0.42" text-anchor="middle">RAID · SSD · MOBILE · FORENSIQUE</text>
  <text x="${s / 2}" y="${s / 2 + 204}" font-family="Georgia, 'Times New Roman', serif" font-size="21" letter-spacing="1.5" fill="${OS}" opacity="0.72" text-anchor="middle">Qualification avant intervention</text>
  <text x="${s / 2}" y="${s / 2 + 244}" font-family="Georgia, 'Times New Roman', serif" font-size="14" letter-spacing="4" fill="${OS}" opacity="0.38" text-anchor="middle">MONTRÉAL · GRAND MONTRÉAL</text>
</svg>`;

  await sharp(Buffer.from(svg)).png().toFile(resolve(ROOT, 'assets/icons/social-profile.png'));
  console.log('  ✓ social-profile.png (800×800)');
}

// ─── 7. Social banner (1500×500 for LinkedIn/Twitter) ───
async function generateSocialBanner() {
  const w = 1500, h = 500;
  const qr = await qrDataUri(190);
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${w}" height="${h}" fill="${NOIR}"/>
  ${ruleGrid(w, h, 80)}
  <line x1="60" y1="50" x2="${w - 60}" y2="50" stroke="${OS}" stroke-width="0.5" opacity="0.14"/>
  <line x1="60" y1="${h - 50}" x2="${w - 60}" y2="${h - 50}" stroke="${OS}" stroke-width="0.5" opacity="0.14"/>
  <g transform="translate(92, 122)">
    ${nMark(126, 0)}
  </g>
  <text x="260" y="184" font-family="Georgia, 'Times New Roman', serif" font-size="78" font-weight="400" letter-spacing="8" fill="${OS}">NEXURA</text>
  <text x="820" y="184" font-family="Georgia, 'Times New Roman', serif" font-size="26" font-weight="400" letter-spacing="11" fill="${OS}" opacity="0.38">DATA</text>
  <text x="260" y="235" font-family="Georgia, 'Times New Roman', serif" font-size="24" letter-spacing="2" fill="${OS}" opacity="0.76">Récupération de données et forensique numérique</text>
  <text x="260" y="280" font-family="Georgia, 'Times New Roman', serif" font-size="16" letter-spacing="4" fill="${OS}" opacity="0.42">MONTRÉAL · GRAND MONTRÉAL · DOSSIER QUALIFIÉ</text>
  ${servicePills(260, 326, ['RAID', 'SSD', 'MOBILE', 'SERVEUR', 'FORENSIQUE'])}
  <g transform="translate(1230, 112)">
    <rect x="-18" y="-18" width="226" height="262" fill="${NOIR}" stroke="${OS}" stroke-width="0.5" opacity="0.96"/>
    <image href="${qr}" x="0" y="0" width="190" height="190"/>
    <text x="95" y="226" font-family="Georgia, 'Times New Roman', serif" font-size="12" letter-spacing="2.6" fill="${OS}" opacity="0.48" text-anchor="middle">DEMANDER UNE QUALIFICATION</text>
  </g>
</svg>`;

  await sharp(Buffer.from(svg)).png().toFile(resolve(ROOT, 'assets/icons/social-banner.png'));
  console.log('  ✓ social-banner.png (1500×500)');
}

// ─── 8. Facebook cover photo (1640×624) ───
async function generateFacebookCover() {
  const w = 1640, h = 624;
  const qr = await qrDataUri(210);
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${w}" height="${h}" fill="${NOIR}"/>
  ${ruleGrid(w, h, 82)}
  <line x1="80" y1="56" x2="${w - 80}" y2="56" stroke="${OS}" stroke-width="0.5" opacity="0.16"/>
  <line x1="80" y1="${h - 56}" x2="${w - 80}" y2="${h - 56}" stroke="${OS}" stroke-width="0.5" opacity="0.16"/>
  <g transform="translate(118, 168)">
    ${nMark(152, 0)}
  </g>
  <text x="300" y="230" font-family="Georgia, 'Times New Roman', serif" font-size="88" font-weight="400" letter-spacing="8" fill="${OS}">NEXURA</text>
  <text x="934" y="230" font-family="Georgia, 'Times New Roman', serif" font-size="29" font-weight="400" letter-spacing="12" fill="${OS}" opacity="0.38">DATA</text>
  <text x="300" y="291" font-family="Georgia, 'Times New Roman', serif" font-size="26" letter-spacing="2" fill="${OS}" opacity="0.78">Récupération de données · RAID · SSD · mobile</text>
  <text x="300" y="337" font-family="Georgia, 'Times New Roman', serif" font-size="17" letter-spacing="4" fill="${OS}" opacity="0.46">FORENSIQUE NUMÉRIQUE · MONTRÉAL · DOSSIER SÉCURISÉ</text>
  ${servicePills(300, 398, ['Qualification', 'Autorisation', 'Suivi sécurisé'])}
  <g transform="translate(1310, 140)">
    <rect x="-20" y="-20" width="250" height="288" fill="${NOIR}" stroke="${OS}" stroke-width="0.5" opacity="0.96"/>
    <image href="${qr}" x="0" y="0" width="210" height="210"/>
    <text x="105" y="250" font-family="Georgia, 'Times New Roman', serif" font-size="13" letter-spacing="2.4" fill="${OS}" opacity="0.5" text-anchor="middle">SCAN · OUVRIR UN DOSSIER</text>
  </g>
  <text x="80" y="604" font-family="Georgia, 'Times New Roman', serif" font-size="13" letter-spacing="3" fill="${OS}" opacity="0.28">nexuradata.ca</text>
</svg>`;

  await sharp(Buffer.from(svg)).png().toFile(resolve(ROOT, 'assets/icons/facebook-cover.png'));
  console.log('  ✓ facebook-cover.png (1640×624)');
}

// ─── 9. Google Business Profile photo (720×720) ───
async function generateGbpPhoto() {
  const s = 720;
  const qr = await qrDataUri(150);
  const svg = `<svg width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${s}" height="${s}" fill="${NOIR}"/>
  ${ruleGrid(s, s, 72)}
  <line x1="72" y1="72" x2="648" y2="72" stroke="${OS}" stroke-width="0.5" opacity="0.16"/>
  <line x1="72" y1="648" x2="648" y2="648" stroke="${OS}" stroke-width="0.5" opacity="0.16"/>
  <g transform="translate(${s / 2 - 88}, 94)">
    ${nMark(176, 0)}
  </g>
  <text x="${s / 2}" y="334" font-family="Georgia, 'Times New Roman', serif" font-size="39" font-weight="400" letter-spacing="5" fill="${OS}" text-anchor="middle">NEXURADATA</text>
  <text x="${s / 2}" y="381" font-family="Georgia, 'Times New Roman', serif" font-size="15" letter-spacing="4" fill="${OS}" opacity="0.48" text-anchor="middle">RAID · SSD · MOBILE · FORENSIQUE</text>
  <text x="${s / 2}" y="430" font-family="Georgia, 'Times New Roman', serif" font-size="21" letter-spacing="1" fill="${OS}" opacity="0.72" text-anchor="middle">Dossier qualifié à Montréal</text>
  <g transform="translate(${s / 2 - 75}, 470)">
    <image href="${qr}" x="0" y="0" width="150" height="150"/>
  </g>
  <text x="${s / 2}" y="642" font-family="Georgia, 'Times New Roman', serif" font-size="11" letter-spacing="2.4" fill="${OS}" opacity="0.42" text-anchor="middle">SCAN · DEMANDE SÉCURISÉE</text>
</svg>`;

  await sharp(Buffer.from(svg)).png().toFile(resolve(ROOT, 'assets/icons/gbp-profile.png'));
  console.log('  ✓ gbp-profile.png (720×720)');
}

// ─── 10. Standalone QR intake card ───
async function generateContactQr() {
  const s = 1080;
  const qr = await qrDataUri(520);
  const svg = `<svg width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${s}" height="${s}" fill="${NOIR}"/>
  ${ruleGrid(s, s, 90)}
  <line x1="110" y1="110" x2="970" y2="110" stroke="${OS}" stroke-width="0.5" opacity="0.18"/>
  <line x1="110" y1="970" x2="970" y2="970" stroke="${OS}" stroke-width="0.5" opacity="0.18"/>
  <g transform="translate(110, 132)">
    ${nMark(92, 0)}
  </g>
  <text x="226" y="197" font-family="Georgia, 'Times New Roman', serif" font-size="54" font-weight="400" letter-spacing="6" fill="${OS}">NEXURA</text>
  <text x="614" y="197" font-family="Georgia, 'Times New Roman', serif" font-size="19" font-weight="400" letter-spacing="9" fill="${OS}" opacity="0.38">DATA</text>
  <text x="110" y="304" font-family="Georgia, 'Times New Roman', serif" font-size="34" letter-spacing="1" fill="${OS}" opacity="0.82">Ouvrir une demande de qualification</text>
  <text x="110" y="354" font-family="Georgia, 'Times New Roman', serif" font-size="18" letter-spacing="3" fill="${OS}" opacity="0.42">RÉCUPÉRATION DE DONNÉES · FORENSIQUE · MONTRÉAL</text>
  <g transform="translate(280, 420)">
    <rect x="-26" y="-26" width="572" height="572" fill="${NOIR}" stroke="${OS}" stroke-width="0.5" opacity="0.96"/>
    <image href="${qr}" x="0" y="0" width="520" height="520"/>
  </g>
  <text x="540" y="1010" font-family="Georgia, 'Times New Roman', serif" font-size="17" letter-spacing="3" fill="${OS}" opacity="0.44" text-anchor="middle">nexuradata.ca/#contact</text>
</svg>`;

  await sharp(Buffer.from(svg)).png().toFile(resolve(ROOT, 'assets/icons/contact-qr.png'));
  console.log('  ✓ contact-qr.png (1080×1080)');
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
  await generateContactQr();
  console.log('\nDone — all brand assets generated.');
} catch (err) {
  console.error('Error:', err);
  process.exit(1);
}
