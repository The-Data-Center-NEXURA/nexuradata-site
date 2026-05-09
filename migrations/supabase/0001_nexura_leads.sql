create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source text not null default 'nexura-site',
  form_type text not null,
  full_name text not null,
  email text not null,
  company text not null,
  website text,
  role text,
  team_size text not null,
  monthly_lead_volume text not null,
  current_stack text not null,
  biggest_constraint text not null,
  timeline text not null,
  budget text not null,
  consent boolean not null default false,
  lead_score integer not null,
  lead_tier text not null,
  score_reasons text[] not null default '{}',
  next_step text not null,
  endpoint text,
  referrer text,
  user_agent text,
  ip_hash text,
  payload jsonb not null default '{}'::jsonb
);

alter table public.leads add column if not exists endpoint text;
alter table public.leads add column if not exists referrer text;
alter table public.leads add column if not exists user_agent text;
alter table public.leads add column if not exists ip_hash text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'leads_source_check' and conrelid = 'public.leads'::regclass) then
    alter table public.leads add constraint leads_source_check check (source in ('nexura-site'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'leads_form_type_check' and conrelid = 'public.leads'::regclass) then
    alter table public.leads add constraint leads_form_type_check check (form_type in ('contact', 'audit'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'leads_team_size_check' and conrelid = 'public.leads'::regclass) then
    alter table public.leads add constraint leads_team_size_check check (team_size in ('1-5', '6-20', '21-50', '51-200', '200+'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'leads_monthly_volume_check' and conrelid = 'public.leads'::regclass) then
    alter table public.leads add constraint leads_monthly_volume_check check (monthly_lead_volume in ('0-25', '26-100', '101-500', '500+'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'leads_timeline_check' and conrelid = 'public.leads'::regclass) then
    alter table public.leads add constraint leads_timeline_check check (timeline in ('now', '30-days', 'quarter', 'exploring'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'leads_budget_check' and conrelid = 'public.leads'::regclass) then
    alter table public.leads add constraint leads_budget_check check (budget in ('under-2k', '2k-5k', '5k-15k', '15k+', 'unknown'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'leads_score_check' and conrelid = 'public.leads'::regclass) then
    alter table public.leads add constraint leads_score_check check (lead_score between 0 and 100);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'leads_tier_check' and conrelid = 'public.leads'::regclass) then
    alter table public.leads add constraint leads_tier_check check (lead_tier in ('priority', 'qualified', 'nurture'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'leads_email_shape_check' and conrelid = 'public.leads'::regclass) then
    alter table public.leads add constraint leads_email_shape_check check (position('@' in email) > 1 and length(email) <= 180);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'leads_consent_true_check' and conrelid = 'public.leads'::regclass) then
    alter table public.leads add constraint leads_consent_true_check check (consent is true);
  end if;
end $$;

alter table public.leads enable row level security;
alter table public.leads force row level security;

revoke all on table public.leads from anon;
revoke all on table public.leads from authenticated;
grant all on table public.leads to service_role;

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_email_idx on public.leads (lower(email));
create index if not exists leads_tier_created_at_idx on public.leads (lead_tier, created_at desc);
create index if not exists leads_ip_hash_created_at_idx on public.leads (ip_hash, created_at desc) where ip_hash is not null;

create or replace function public.set_leads_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_leads_updated_at on public.leads;
create trigger set_leads_updated_at
before update on public.leads
for each row
execute function public.set_leads_updated_at();
