-- Migration: Add lodging category and multi-category support for map_spots

-- 1) Add new category "lodging" (宿泊)
insert into public.categories (id, name, name_ja, icon, color)
values ('lodging', 'Lodging', '宿泊', 'BedDouble', '#6C5CE7')
on conflict (id) do nothing;

-- 2) Additional categories per spot (many-to-many)
create table if not exists public.map_spot_categories (
  spot_id uuid not null references public.map_spots(id) on delete cascade,
  category_id text not null references public.categories(id) on delete restrict,
  created_at timestamp with time zone default now(),
  primary key (spot_id, category_id)
);

create index if not exists idx_map_spot_categories_category on public.map_spot_categories(category_id);

-- 3) RLS Policies
alter table public.map_spot_categories enable row level security;

-- Anyone can read category tags for rendering/spa filters
create policy "map_spot_categories_select" on public.map_spot_categories
  for select using (true);

-- Only the spot owner can add tags
create policy "map_spot_categories_insert_own_spot" on public.map_spot_categories
  for insert
  with check (
    exists (
      select 1 from public.map_spots s
      where s.id = map_spot_categories.spot_id and s.created_by = auth.uid()
    )
  );

-- Only the spot owner can delete tags
create policy "map_spot_categories_delete_own_spot" on public.map_spot_categories
  for delete using (
    exists (
      select 1 from public.map_spots s
      where s.id = map_spot_categories.spot_id and s.created_by = auth.uid()
    )
  );
