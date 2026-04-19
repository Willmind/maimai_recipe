-- 麦麦手记 · 菜谱与做饭记录（Supabase / PostgreSQL）
-- 在 SQL Editor → New snippet 中整段执行（可按需分段执行）
-- 与前端类型 src/types/recipe.ts 对齐：菜谱与记录分表，食材/步骤/照片用 JSONB 存数组
-- 你已选择：不保留本地旧数据；主键统一使用 uuid（由数据库生成）

-- ---------------------------------------------------------------------------
-- 1. 菜谱表 recipes
-- ---------------------------------------------------------------------------
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null default '未命名菜谱',
  -- 当前前端用 data URL；体积大时建议改为 Storage 公网 URL + 本列仅存 text
  cover_image text,
  -- string[]，如 ["鸡蛋 2 个","番茄 300g"]
  ingredients jsonb not null default '[]'::jsonb,
  -- string[]，每步一行
  steps jsonb not null default '[]'::jsonb,
  cooked boolean not null default false,
  -- 与 PlanKind 一致：none | this_week | by_date
  plan_kind text not null default 'none',
  plan_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipes_plan_kind_check check (
    plan_kind in ('none', 'this_week', 'by_date')
  ),
  -- 与前端一致：none / this_week 时 plan_date 必须为 null；by_date 时日期可空（表单未选）
  constraint recipes_plan_date_consistency check (
    (plan_kind in ('none', 'this_week') and plan_date is null)
    or plan_kind = 'by_date'
  ),
  constraint recipes_ingredients_array check (jsonb_typeof(ingredients) = 'array'),
  constraint recipes_steps_array check (jsonb_typeof(steps) = 'array')
);

comment on table public.recipes is '菜谱主表；做饭记录在 cooking_records';
comment on column public.recipes.ingredients is 'JSON 字符串数组';
comment on column public.recipes.steps is 'JSON 字符串数组';

create index if not exists recipes_updated_at_desc on public.recipes (updated_at desc);
create index if not exists recipes_cooked on public.recipes (cooked);
create index if not exists recipes_plan_kind on public.recipes (plan_kind);

-- ---------------------------------------------------------------------------
-- 2. 做饭记录表 cooking_records（多对一 recipes）
-- ---------------------------------------------------------------------------
create table if not exists public.cooking_records (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  -- string[]，data URL 列表；大图建议后续改 Storage
  photos jsonb not null default '[]'::jsonb,
  note text not null default '',
  cooked_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint cooking_records_photos_array check (jsonb_typeof(photos) = 'array')
);

comment on table public.cooking_records is '某道菜的每次做饭记录';

create index if not exists cooking_records_recipe_cooked_at on public.cooking_records (
  recipe_id,
  cooked_at desc
);

-- ---------------------------------------------------------------------------
-- 3. 自动维护 recipes.updated_at（可选）
-- ---------------------------------------------------------------------------
create or replace function public.touch_recipes_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_recipes_touch_updated_at on public.recipes;

create trigger trg_recipes_touch_updated_at
before update on public.recipes
for each row
execute function public.touch_recipes_updated_at ();

-- ---------------------------------------------------------------------------
-- 4. RLS（按你的环境二选一）
-- ---------------------------------------------------------------------------
-- 单人演示 / 仅用 anon key：与 demo_hello 类似（上线前务必收紧或改 auth.uid()）
alter table public.recipes enable row level security;
alter table public.cooking_records enable row level security;

drop policy if exists "recipes_select_anon" on public.recipes;
drop policy if exists "recipes_insert_anon" on public.recipes;
drop policy if exists "recipes_update_anon" on public.recipes;
drop policy if exists "recipes_delete_anon" on public.recipes;

drop policy if exists "cooking_records_select_anon" on public.cooking_records;
drop policy if exists "cooking_records_insert_anon" on public.cooking_records;
drop policy if exists "cooking_records_update_anon" on public.cooking_records;
drop policy if exists "cooking_records_delete_anon" on public.cooking_records;

create policy "recipes_select_anon" on public.recipes for select to anon using (true);
create policy "recipes_insert_anon" on public.recipes for insert to anon with check (true);
create policy "recipes_update_anon" on public.recipes for update to anon using (true) with check (true);
create policy "recipes_delete_anon" on public.recipes for delete to anon using (true);

create policy "cooking_records_select_anon" on public.cooking_records for select to anon using (true);
create policy "cooking_records_insert_anon" on public.cooking_records for insert to anon with check (true);
create policy "cooking_records_update_anon" on public.cooking_records for update to anon using (true) with check (true);
create policy "cooking_records_delete_anon" on public.cooking_records for delete to anon using (true);

grant select, insert, update, delete on table public.recipes to anon;
grant select, insert, update, delete on table public.cooking_records to anon;
