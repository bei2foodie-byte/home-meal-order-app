-- =============================================================================
-- 居家點餐 App — Supabase schema
--
-- Paste this whole file into the Supabase SQL Editor and run it once on a
-- fresh project. It creates:
--   - public.users        (the fixed two users)
--   - public.meals        (shared menu)
--   - public.daily_orders (one row per user per day, UNIQUE(user_id, date))
--   - the meal-images Storage bucket
--   - RLS policies that let the app's anon key do the CRUD it needs
--
-- IMPORTANT SECURITY NOTE (read this before running in production):
-- This app does not use Supabase Auth. The policies below simply allow the
-- `anon` role (i.e. anyone who has your Supabase URL + anon/publishable key)
-- to read and write these three tables and the meal-images bucket. This is
-- NOT real authentication or authorization — it only relies on the URL and
-- key not being shared publicly. Treat it the same way you'd treat a private
-- shared spreadsheet link: fine for two trusted household members, not safe
-- for anything sensitive or public-facing. Never put your service_role /
-- secret key in the frontend; only the anon/publishable key belongs there.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. users
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

-- Seed the two fixed users. Change the `name` values any time — the `id`
-- values must match src/users.js in the frontend project.
insert into public.users (id, name) values
  ('user_a', '使用者 A'),
  ('user_b', '使用者 B')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. meals (shared menu)
-- ---------------------------------------------------------------------------
create table if not exists public.meals (
  id text primary key,
  name text not null,
  category text not null check (category in ('staple', 'meat', 'egg', 'vegetable', 'soup')),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meals_category_idx on public.meals (category);
create index if not exists meals_is_active_idx on public.meals (is_active);

-- ---------------------------------------------------------------------------
-- 3. daily_orders (one row per user per day)
-- ---------------------------------------------------------------------------
create table if not exists public.daily_orders (
  id text primary key,
  date date not null,
  user_id text not null references public.users (id) on delete cascade,
  staple jsonb,
  meat jsonb,
  egg jsonb,
  vegetable jsonb,
  soup jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- This is what guarantees "each user can have at most one order per day".
  -- The frontend upserts on (user_id, date), so saving twice in one day
  -- updates this same row instead of creating a second one.
  unique (user_id, date)
);

create index if not exists daily_orders_user_date_idx
  on public.daily_orders (user_id, date desc);

-- ---------------------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.meals enable row level security;
alter table public.daily_orders enable row level security;

-- users: the app only ever needs to read the two seeded rows.
drop policy if exists "anon can read users" on public.users;
create policy "anon can read users"
  on public.users for select
  to anon
  using (true);

-- meals: shared menu, full CRUD from the app (no auth, see note above).
drop policy if exists "anon can read meals" on public.meals;
create policy "anon can read meals"
  on public.meals for select
  to anon
  using (true);

drop policy if exists "anon can insert meals" on public.meals;
create policy "anon can insert meals"
  on public.meals for insert
  to anon
  with check (true);

drop policy if exists "anon can update meals" on public.meals;
create policy "anon can update meals"
  on public.meals for update
  to anon
  using (true)
  with check (true);

drop policy if exists "anon can delete meals" on public.meals;
create policy "anon can delete meals"
  on public.meals for delete
  to anon
  using (true);

-- daily_orders: full CRUD from the app (no auth, see note above).
drop policy if exists "anon can read orders" on public.daily_orders;
create policy "anon can read orders"
  on public.daily_orders for select
  to anon
  using (true);

drop policy if exists "anon can insert orders" on public.daily_orders;
create policy "anon can insert orders"
  on public.daily_orders for insert
  to anon
  with check (true);

drop policy if exists "anon can update orders" on public.daily_orders;
create policy "anon can update orders"
  on public.daily_orders for update
  to anon
  using (true)
  with check (true);

drop policy if exists "anon can delete orders" on public.daily_orders;
create policy "anon can delete orders"
  on public.daily_orders for delete
  to anon
  using (true);

-- ---------------------------------------------------------------------------
-- 5. Storage bucket for meal photos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('meal-images', 'meal-images', true)
on conflict (id) do nothing;

drop policy if exists "anon can read meal images" on storage.objects;
create policy "anon can read meal images"
  on storage.objects for select
  to anon
  using (bucket_id = 'meal-images');

drop policy if exists "anon can upload meal images" on storage.objects;
create policy "anon can upload meal images"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'meal-images');

drop policy if exists "anon can update meal images" on storage.objects;
create policy "anon can update meal images"
  on storage.objects for update
  to anon
  using (bucket_id = 'meal-images')
  with check (bucket_id = 'meal-images');

drop policy if exists "anon can delete meal images" on storage.objects;
create policy "anon can delete meal images"
  on storage.objects for delete
  to anon
  using (bucket_id = 'meal-images');

-- ---------------------------------------------------------------------------
-- 6. (Optional) starter meals — uncomment to seed a few sample dishes.
-- ---------------------------------------------------------------------------
-- insert into public.meals (id, name, category, image_url, is_active) values
--   ('seed_staple_1', '白飯', 'staple', 'https://placehold.co/300x300?text=白飯', true),
--   ('seed_meat_1',   '香煎雞腿', 'meat', 'https://placehold.co/300x300?text=雞腿', true),
--   ('seed_egg_1',    '荷包蛋', 'egg', 'https://placehold.co/300x300?text=荷包蛋', true),
--   ('seed_veg_1',    '炒高麗菜', 'vegetable', 'https://placehold.co/300x300?text=高麗菜', true),
--   ('seed_soup_1',   '味噌湯', 'soup', 'https://placehold.co/300x300?text=味噌湯', true)
-- on conflict (id) do nothing;
