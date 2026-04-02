-- ============================================================
-- SupplementScanner Supabase Schema
-- Run this in the Supabase SQL Editor to set up all tables,
-- RLS policies, and triggers.
-- ============================================================

-- 1. Products table
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  barcode     text unique not null,
  product_name text not null default 'Unknown Product',
  brand       text not null default 'Unknown Brand',
  category    text not null default 'supplement',
  sub_category text default 'other',
  form        text default 'other',
  servings_per_container integer,
  serving_size jsonb default '{"amount": null, "unit": null}',
  ingredients  jsonb default '[]',
  ingredient_list_text text,
  quality     jsonb default '{"underDosed": null, "overDosed": null, "fillerRisk": null, "bioavailability": null}',
  meta        jsonb default '{"source": "user", "verified": false}',
  pre_workout_data jsonb,
  herb_data   jsonb,
  protein_data jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 2. Profiles table (extends auth.users)
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- 3. Saved scans table
create table if not exists public.saved_scans (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  barcode    text not null,
  notes      text,
  scanned_at timestamptz default now(),
  unique(user_id, barcode)
);

-- 4. Favorites table
create table if not exists public.favorites (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, product_id)
);

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists idx_products_barcode on public.products(barcode);
create index if not exists idx_products_category on public.products(category);
create index if not exists idx_products_brand on public.products(brand);
create index if not exists idx_saved_scans_user on public.saved_scans(user_id);
create index if not exists idx_favorites_user on public.favorites(user_id);

-- ============================================================
-- RLS Policies
-- ============================================================

-- Products: publicly readable, only service_role can write
alter table public.products enable row level security;

create policy "Products are publicly readable"
  on public.products for select
  using (true);

create policy "Service role can insert products"
  on public.products for insert
  with check (true);

create policy "Service role can update products"
  on public.products for update
  using (true);

-- Profiles: users can only access their own row
alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Saved scans: users can only access their own rows
alter table public.saved_scans enable row level security;

create policy "Users can read own scans"
  on public.saved_scans for select
  using (auth.uid() = user_id);

create policy "Users can insert own scans"
  on public.saved_scans for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own scans"
  on public.saved_scans for delete
  using (auth.uid() = user_id);

-- Favorites: users can only access their own rows
alter table public.favorites enable row level security;

create policy "Users can read own favorites"
  on public.favorites for select
  using (auth.uid() = user_id);

create policy "Users can insert own favorites"
  on public.favorites for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own favorites"
  on public.favorites for delete
  using (auth.uid() = user_id);

-- ============================================================
-- Triggers
-- ============================================================

-- Auto-update updated_at on products
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger products_updated_at
  before update on public.products
  for each row execute function public.handle_updated_at();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
