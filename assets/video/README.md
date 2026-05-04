# Video asset drop zone

Generated web-ready video assets for the NEXURADATA Cinematic V2 homepage belong here.

Current deployable files:

- `nexura-hero-reconstruction-loop.mp4`
- `nexura-control-dashboard-loop.mp4`
- `nexura-pc-recovery-status.mp4`
- `sleek-futuristic-recovery.mp4`

Optional future files, only after web compression:

- `nexura-hero-reconstruction-loop.webm`
- `nexura-hero-reconstruction-poster.webp`
- `nexura-failure-fragmentation.webm`
- `nexura-failure-fragmentation-poster.webp`
- `nexura-control-dashboard-loop.webm`
- `nexura-control-dashboard-poster.webp`

Rules:

- Keep homepage loop files compressed and muted.
- Prefer `.webm` first with `.mp4` fallback.
- Keep each public video asset below 25 MiB so Cloudflare Pages deploys stay reliable.
- Do not commit heavy source exports or uncompressed masters here.
- See `docs/CINEMATIC-V2-VIDEO-BRIEF.md` for prompts, encoding targets, and integration notes.
