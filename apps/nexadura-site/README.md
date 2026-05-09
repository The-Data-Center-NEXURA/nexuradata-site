# NEXURA Next Site

Next.js app for the NEXURA automation site. The public contact and audit forms post to local API routes and fan out to:

- Supabase lead storage when configured
- Resend lead alert when configured
- CRM webhook when configured
- Follow-up webhook when configured

## Supabase

Apply the lead table migration in the Supabase SQL editor before enabling storage:

```sql
-- migrations/supabase/0001_nexura_leads.sql
```

Required runtime values:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
LEAD_IP_HASH_SECRET=...
```

`SUPABASE_SERVICE_ROLE_KEY` must stay server-side. The app treats missing, placeholder, or obviously invalid keys as "not configured" and still accepts form submissions through the other automation channels.

The `public.leads` table has RLS enabled and forced, no public read/write policies, and explicit revokes for `anon` and `authenticated`. Inserts are performed server-side through the service-role client only.

### Local setup

1. Copy [apps/nexadura-site/.env.example](apps/nexadura-site/.env.example) to `.env.local`.
2. Set `NEXT_PUBLIC_SUPABASE_URL` (or `SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY`.
3. Optional: run `npm run supabase:key:deposit` from the repo root to store the service-role key in ignored local files.

The helper writes to `apps/nexadura-site/.env.local` and `scripts/hooks/service_role_key.yml` after checking that both paths are git-ignored.

## Checks

Run from the repository root:

```bash
npm run nexura-site:check
```

That command runs lint, TypeScript, and the production Next build.
