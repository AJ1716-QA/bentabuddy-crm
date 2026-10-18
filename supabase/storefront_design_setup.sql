-- BentaBuddy Storefront Designer
-- Run once in Supabase SQL Editor. Additive only: does not change orders, products, checkout, or payments.
create table if not exists public.storefront_designs (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  store_name text null check (store_name is null or char_length(store_name) <= 120),
  theme text not null default 'classic' check (theme in ('classic','fresh','bold')),
  primary_color text not null default '#123b63' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  background_color text not null default '#f5f7fb' check (background_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text not null default '#ffffff' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  welcome_message text not null default 'Browse our products and place an order.' check (char_length(welcome_message) <= 240),
  logo_url text null check (logo_url is null or (char_length(logo_url) <= 1000 and logo_url ~* '^https?://')),
  cover_image_url text null check (cover_image_url is null or (char_length(cover_image_url) <= 1000 and cover_image_url ~* '^https?://')),
  updated_at timestamptz not null default now()
);
alter table public.storefront_designs enable row level security;
revoke all on table public.storefront_designs from anon, public;
grant select, insert, update on table public.storefront_designs to authenticated;
drop policy if exists storefront_designs_owner_select on public.storefront_designs;
create policy storefront_designs_owner_select on public.storefront_designs
for select to authenticated
using (coalesce(private.owns_business(business_id), false) and coalesce(private.has_crm_access(business_id), false));
drop policy if exists storefront_designs_owner_insert on public.storefront_designs;
create policy storefront_designs_owner_insert on public.storefront_designs
for insert to authenticated
with check (coalesce(private.owns_business(business_id), false) and coalesce(private.has_crm_access(business_id), false));
drop policy if exists storefront_designs_owner_update on public.storefront_designs;
create policy storefront_designs_owner_update on public.storefront_designs
for update to authenticated
using (coalesce(private.owns_business(business_id), false) and coalesce(private.has_crm_access(business_id), false))
with check (coalesce(private.owns_business(business_id), false) and coalesce(private.has_crm_access(business_id), false));

create or replace function public.get_public_store_design(p_store_slug text)
returns table (
  store_name text,
  theme text,
  primary_color text,
  background_color text,
  accent_color text,
  welcome_message text,
  logo_url text,
  cover_image_url text
)
language sql
stable
security definer
set search_path = ''
as $function$
  select d.store_name, d.theme, d.primary_color, d.background_color, d.accent_color,
         d.welcome_message, d.logo_url, d.cover_image_url
  from public.businesses b
  join public.storefront_designs d on d.business_id = b.id
  where b.store_slug = p_store_slug
    and b.storefront_enabled is true
  limit 1;
$function$;
revoke all on function public.get_public_store_design(text) from public;
grant execute on function public.get_public_store_design(text) to anon, authenticated;
