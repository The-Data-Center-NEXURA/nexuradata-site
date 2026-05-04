# NEXURADATA Cinematic V2 video brief

This brief is for producing the AI-generated motion assets that will replace or sit behind the current CSS-only cinematic homepage modules.

## Asset set

| Asset | Purpose | Duration | Output files | Notes |
| --- | --- | ---: | --- | --- |
| Hero reconstruction loop | Top homepage motion layer | 8-12s loop | `nexura-hero-reconstruction-loop.webm`, `nexura-hero-reconstruction-loop.mp4` | Capability first: analysis, alignment, reconstruction. No failure imagery here. |
| Failure fragmentation clip | Mid-page problem-awareness section | 10-15s | `nexura-failure-fragmentation.webm`, `nexura-failure-fragmentation.mp4` | Tension after interest: flicker, corrupted data, fragmented UI. |
| Control dashboard loop | Final CTA/contact trust layer | 5-8s loop | `nexura-control-dashboard-loop.webm`, `nexura-control-dashboard-loop.mp4` | Calm, restored system, premium dark interface. |
| Master commercial | Pitch/homepage optional long-form | 40-45s | `nexura-cinematic-master-45s.mp4` | Not autoplayed on the homepage. Use only as an optional embedded player or sales asset. |

Place final web assets in `assets/video/`. Keep source project files, high-bitrate masters, and generator exports outside the repo unless intentionally needed.

## Global visual direction

- Premium forensic technology commercial, not generic startup gloss.
- Dark, precise, controlled, high contrast.
- Palette: black, bone/ivory, small cool signal accents. Avoid purple-dominant or blue-purple gradient looks.
- No visible personal identity, address, or private workspace details.
- Do not promote AI as the offer. The client-facing message is recovery, reconstruction, control, confidentiality.
- No audio for loops. The master can include sound/voiceover, but homepage embeds must be muted.

## Prompts

### 1. Hero reconstruction loop

Use for the first viewport. Show capability immediately.

```text
Ultra cinematic futuristic forensic data recovery sequence, fragmented digital files aligning into structured data, scanning beams passing across a dark premium interface, precise robotic camera movement, shallow depth of field, subtle film grain, black and ivory palette with minimal cool blue signal accents, high-end technology commercial, controlled motion, smooth reconstruction, no people, no brand text, no readable private data, seamless loop
```

Negative prompt:

```text
cartoon, stock footage, generic hacker screen, neon purple gradient, busy sci-fi city, human faces, readable personal data, logos, text overlays, messy cables, cheap glitch effects, loud colors
```

### 2. Failure fragmentation clip

Use after the proof bar or in the problem-awareness section.

```text
Ultra cinematic macro digital failure scene, corrupted files breaking into particles, fragmented interface panels drifting in dark space, hard-drive failure mood without showing gore or destruction, screen flicker, subtle sparks, deep shadows, dramatic side lighting, slow motion, premium forensic technology aesthetic, black and ivory palette with restrained warning red and cool signal accents, no people, no readable private data
```

Negative prompt:

```text
explosions, flames, horror, cyberpunk overload, purple dominant lighting, fake code rain, readable personal data, messy typography, cartoon particles, cheap template glitch
```

### 3. Control dashboard loop

Use near final CTA/contact.

```text
Modern dark data recovery dashboard fully restored, structured file tree, clean system status, calm interface animation, soft glow lighting, premium technology brand feel, cinematic depth, stable slow push-in, black and ivory palette with restrained cool signal accents, no real customer data, no brand text, no human faces, seamless loop
```

Negative prompt:

```text
busy analytics dashboard, colorful SaaS charts, crypto trading UI, purple gradient background, random logos, real names, emails, addresses, unreadable clutter, rounded playful app cards
```

### 4. Master 40-45s commercial

Structure:

1. 0-7s: failure, hard-drive or system collapse, minimal text: `Failure.`
2. 7-15s: fragmentation, files dissolving into particles.
3. 15-25s: intervention, scan passes over fragments, motion becomes controlled.
4. 25-35s: reconstruction, particles form files and systems reconnect.
5. 35-45s: control, clean restored dashboard and NEXURA DATA end card.

Voiceover:

```text
Failure doesn't warn you.
Data disappears... systems collapse.
What's lost... feels permanent.

Until precision takes over.

At Nexura, we don't just recover data...
we reconstruct it.

From failure...
to full control.
```

## Encoding targets

Homepage loops:

- Resolution: 1920x1080 source, export web versions at 1280x720 minimum.
- Frame rate: 24 fps or 30 fps.
- Loop length: keep under 12 seconds for hero.
- MP4: H.264, muted, fast start.
- WEBM: VP9 or AV1 if practical.
- Target size: hero loop under 3 MB, mid clip under 4 MB, CTA loop under 2 MB.
- Provide a still poster frame for each loop if possible: `.webp`, 1600px wide, under 250 KB.

Suggested ffmpeg commands:

```bash
ffmpeg -i hero-master.mov -an -vf "scale=1280:-2,fps=24" -c:v libx264 -crf 26 -preset slow -movflags +faststart assets/video/nexura-hero-reconstruction-loop.mp4
ffmpeg -i hero-master.mov -an -vf "scale=1280:-2,fps=24" -c:v libvpx-vp9 -b:v 0 -crf 34 assets/video/nexura-hero-reconstruction-loop.webm
ffmpeg -i hero-master.mov -vf "scale=1600:-2" -frames:v 1 assets/video/nexura-hero-reconstruction-poster.webp
```

## Integration rule

Do not reference a video file in HTML until that file exists in `assets/video/` and has been compressed. The current CSS motion modules are the fallback visual system.
