-- Migration: Update categories schema to match docs and seed hierarchy
-- 1) Extend categories table with hierarchy and metadata
alter table if exists public.categories
  add column if not exists parent_id text references public.categories(id),
  add column if not exists sort_order integer default 0,
  add column if not exists is_active boolean default true,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

-- Indexes to improve filtering and ordering
create index if not exists idx_categories_parent on public.categories(parent_id);
create index if not exists idx_categories_active on public.categories(is_active);
create index if not exists idx_categories_sort on public.categories(sort_order);

-- updated_at trigger for categories
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Recreate trigger idempotently
drop trigger if exists update_categories_updated_at on public.categories;
create trigger update_categories_updated_at
before update on public.categories
for each row execute function public.update_updated_at_column();

-- 2) Upsert the seven top-level categories per docs with deterministic order
insert into public.categories (id, name, name_ja, icon, color, parent_id, sort_order, is_active)
values
  ('shopping', 'Shopping', '買い物', 'ShoppingBag', '#4ECDC4', null, 1, true),
  ('food', 'Food & Dining', '食べる', 'Utensils', '#FF6B6B', null, 2, true),
  ('play', 'Entertainment', '遊ぶ', 'Gamepad2', '#45B7D1', null, 3, true),
  ('hospital', 'Hospital', '病院', 'Heart', '#96CEB4', null, 4, true),
  ('beauty', 'Beauty Salon', '美容室', 'Scissors', '#FFEAA7', null, 5, true),
  ('lodging', 'Lodging', '宿泊', 'BedDouble', '#6C5CE7', null, 6, true),
  ('other', 'Other Facilities', 'その他施設', 'Building2', '#98D8C8', null, 7, true)
on conflict (id) do update set
  name = excluded.name,
  name_ja = excluded.name_ja,
  icon = excluded.icon,
  color = excluded.color,
  parent_id = excluded.parent_id,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

-- 3) Establish subcategory relations for existing records when present
-- restaurant should be a subcategory under food
update public.categories set parent_id = 'food' where id = 'restaurant';
-- kids, park, sports under play
update public.categories set parent_id = 'play' where id in ('kids', 'park', 'sports');
-- school under other facilities
update public.categories set parent_id = 'other' where id = 'school';

-- Ensure colors/icons for known subcategories (best effort; keep existing if already set)
update public.categories set icon = coalesce(icon, 'Utensils'), color = coalesce(color, '#FF6B6B') where id = 'restaurant';
update public.categories set icon = coalesce(icon, 'Baby'), color = coalesce(color, '#45B7D1') where id = 'kids';
update public.categories set icon = coalesce(icon, 'Trees'), color = coalesce(color, '#45B7D1') where id = 'park';
update public.categories set icon = coalesce(icon, 'School'), color = coalesce(color, '#98D8C8') where id = 'school';

-- 4) Safety: mark any legacy categories we don't recognize as active but sorted after
update public.categories set sort_order = 100 where sort_order is null;
