-- Crop2Cash production-minded Supabase schema.
-- Run this script once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  username text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.market_quotes(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  market_name text not null,
  crop_name text not null,
  price numeric not null check(price >= 0),
  unit text not null,
  quote_date date not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.harvest_analyses(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  crop_name text not null,
  quantity numeric not null check(quantity > 0),
  unit text not null,
  harvest_date date,
  location text,
  notes text,
  image_path text,
  quality_grade text,
  visual_condition text,
  spoilage_risk text,
  vision_json jsonb,
  market_json jsonb,
  transport_cost numeric not null default 0,
  other_cost numeric not null default 0,
  recommended_action text,
  confidence numeric,
  expected_net_value numeric,
  best_market text,
  rationale text,
  next_action text,
  risk_flags jsonb not null default '[]'::jsonb,
  wait_scenario text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.market_quotes enable row level security;
alter table public.harvest_analyses enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select using(auth.uid()=id);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert with check(auth.uid()=id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using(auth.uid()=id) with check(auth.uid()=id);

drop policy if exists quotes_select_own on public.market_quotes;
create policy quotes_select_own on public.market_quotes for select using(auth.uid()=user_id);
drop policy if exists quotes_insert_own on public.market_quotes;
create policy quotes_insert_own on public.market_quotes for insert with check(auth.uid()=user_id);
drop policy if exists quotes_update_own on public.market_quotes;
create policy quotes_update_own on public.market_quotes for update using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists quotes_delete_own on public.market_quotes;
create policy quotes_delete_own on public.market_quotes for delete using(auth.uid()=user_id);

drop policy if exists analyses_select_own on public.harvest_analyses;
create policy analyses_select_own on public.harvest_analyses for select using(auth.uid()=user_id);
drop policy if exists analyses_insert_own on public.harvest_analyses;
create policy analyses_insert_own on public.harvest_analyses for insert with check(auth.uid()=user_id);
drop policy if exists analyses_update_own on public.harvest_analyses;
create policy analyses_update_own on public.harvest_analyses for update using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists analyses_delete_own on public.harvest_analyses;
create policy analyses_delete_own on public.harvest_analyses for delete using(auth.uid()=user_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,full_name,username)
  values(new.id,new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'username')
  on conflict(id) do update set
    full_name=excluded.full_name,
    username=excluded.username,
    updated_at=now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Storage bucket for future private harvest photos.
insert into storage.buckets(id,name,public) values('produce-images','produce-images',false)
on conflict(id) do nothing;

drop policy if exists produce_insert_own on storage.objects;
create policy produce_insert_own on storage.objects for insert to authenticated
with check(bucket_id='produce-images' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists produce_select_own on storage.objects;
create policy produce_select_own on storage.objects for select to authenticated
using(bucket_id='produce-images' and (storage.foldername(name))[1]=auth.uid()::text);

-- The browser client uses the Supabase Data API. RLS remains the main boundary.
-- Do not expose a secret/service-role key in the browser.
