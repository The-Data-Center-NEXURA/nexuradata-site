# Video asset drop zone

Generated web-ready background motion assets for the NEXURADATA homepage belong here.

Current deployable files:

- None. The current homepage uses controlled CSS and canvas background motion so the site does not feel static while avoiding dead video references and heavy public assets.

Optional future files, only after web compression and browser testing:

- `nexuradata-hero-dataflow.webm`
- `nexuradata-hero-dataflow.mp4`
- `nexuradata-critical-scan.webm`
- `nexuradata-critical-scan.mp4`

Rules:

- Keep homepage loop files compressed, muted, decorative and behind content.
- Prefer `.webm` first with `.mp4` fallback.
- Keep each public video asset below 900 KB so Cloudflare Pages and mobile visits stay fast.
- Do not commit heavy source exports or uncompressed masters here.
- Every public video must be marked as a controlled background layer, respect `prefers-reduced-motion`, and pass the project quality gate.
