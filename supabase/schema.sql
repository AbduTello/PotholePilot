-- PotholePilot schema
-- Run in: https://supabase.com/dashboard/project/satbvnqyuafiviscezdy/sql

-- ── reports ──────────────────────────────────────────────────────────────────
create table if not exists reports (
  id                      uuid        primary key default gen_random_uuid(),
  description             text        not null,
  address                 text        not null,
  lat                     double precision not null,
  lng                     double precision not null,
  photo_url               text,
  status                  text        not null default 'open',
  -- AI-extracted fields
  severity                text,
  safety_concerns         jsonb,
  urgency_signals         jsonb,
  landmarks_mentioned     jsonb,
  -- scoring
  priority_score          integer,
  priority_reason         text,
  freeze_thaw_multiplier  numeric     default 1.0,
  equity_flag             boolean     default false,
  -- geo enrichment
  nearby_sensitive        jsonb,
  cluster_id              uuid,
  created_at              timestamptz not null default now()
);

alter table reports enable row level security;

create policy "anyone can insert reports"
  on reports for insert with check (true);

create policy "service role full access on reports"
  on reports for all using (auth.role() = 'service_role');


-- ── clusters ─────────────────────────────────────────────────────────────────
create table if not exists clusters (
  id              uuid        primary key default gen_random_uuid(),
  centroid_lat    double precision not null,
  centroid_lng    double precision not null,
  report_count    integer     not null default 1,
  priority_score  integer,
  status          text        not null default 'open',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table clusters enable row level security;

create policy "service role can manage clusters"
  on clusters for all using (auth.role() = 'service_role');

alter table reports
  add constraint if not exists fk_reports_cluster
  foreign key (cluster_id) references clusters(id)
  on delete set null deferrable initially deferred;


-- ── sensitive_locations ───────────────────────────────────────────────────────
create table if not exists sensitive_locations (
  id    uuid primary key default gen_random_uuid(),
  name  text not null,
  type  text not null,   -- school | bus_stop | hospital | park | senior_center
  lat   double precision not null,
  lng   double precision not null,
  unique (name, type, lat, lng)
);

alter table sensitive_locations enable row level security;

create policy "anyone can read sensitive_locations"
  on sensitive_locations for select using (true);

create policy "service role can manage sensitive_locations"
  on sensitive_locations for all using (auth.role() = 'service_role');


-- ── seed: Detroit sensitive locations ────────────────────────────────────────
insert into sensitive_locations (name, type, lat, lng) values
  -- Schools
  ('Cass Technical High School',           'school',   42.3362, -83.0549),
  ('Detroit Edison Public School Academy', 'school',   42.3498, -83.0638),
  ('Renaissance High School',              'school',   42.3956, -83.1366),
  ('Mumford High School',                  'school',   42.4005, -83.1489),
  ('Martin Luther King High School',       'school',   42.3767, -83.1561),
  ('Western International High School',    'school',   42.3194, -83.1194),
  -- Bus stops
  ('Rosa Parks Transit Center',            'bus_stop', 42.3314, -83.0484),
  ('Grand Circus Park Station',            'bus_stop', 42.3374, -83.0493),
  ('Michigan Ave & Livernois',             'bus_stop', 42.3336, -83.1271),
  ('Woodward Ave & McNichols',             'bus_stop', 42.4198, -83.1009),
  ('Jefferson Ave & Belle Isle',           'bus_stop', 42.3303, -82.9942),
  ('7 Mile & Gratiot',                     'bus_stop', 42.4295, -82.9854),
  -- Hospitals
  ('Detroit Medical Center',               'hospital', 42.3556, -83.0573),
  ('Henry Ford Hospital',                  'hospital', 42.3693, -83.1023),
  ('Sinai-Grace Hospital',                 'hospital', 42.4073, -83.2004),
  ('Children''s Hospital of Michigan',     'hospital', 42.3556, -83.0573),
  -- Parks
  ('Belle Isle Park',                      'park',     42.3303, -82.9942),
  ('Palmer Park',                          'park',     42.4114, -83.1199),
  ('Chandler Park',                        'park',     42.4037, -82.9697)
on conflict (name, type, lat, lng) do nothing;
