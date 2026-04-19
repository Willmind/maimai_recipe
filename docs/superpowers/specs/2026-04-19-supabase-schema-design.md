## 目标

- 将「麦麦手记」从本地 `localStorage` 升级为服务端存储（Supabase / PostgreSQL）。
- 当前阶段：**单用户**、不做登录；**不迁移现有本地数据**（视为全新线上数据）。

## 数据模型

### 表 1：`public.recipes`

- **用途**：菜谱主表（一道菜一行）
- **主键**：`id uuid`（数据库生成 `gen_random_uuid()`）
- **主要字段**
  - `title text`
  - `cover_image text`：当前前端仍可能是 data URL；后续可改成 Storage URL/Path
  - `ingredients jsonb`：字符串数组（对齐 `string[]`）
  - `steps jsonb`：字符串数组（对齐 `string[]`）
  - `cooked boolean`
  - `plan_kind text`：`none | this_week | by_date`
  - `plan_date date`：仅当 `plan_kind='by_date'` 时可用；其余必须为 `null`
  - `created_at/updated_at timestamptz`

### 表 2：`public.cooking_records`

- **用途**：做饭记录（一次做饭一行，多对一菜谱）
- **主键**：`id uuid`（数据库生成）
- **外键**：`recipe_id uuid references recipes(id) on delete cascade`
- **主要字段**
  - `photos jsonb`：字符串数组（当前可能为 data URL；后续建议改 Storage）
  - `note text`
  - `cooked_at timestamptz`
  - `created_at timestamptz`

## 约束与索引

- **约束**
  - `plan_kind` 取值约束
  - `plan_date` 与 `plan_kind` 一致性约束
  - `ingredients/steps/photos` 必须为 JSON 数组
- **索引**
  - `recipes(updated_at desc)`：列表按最近更新
  - `recipes(cooked)`、`recipes(plan_kind)`：筛选
  - `cooking_records(recipe_id, cooked_at desc)`：详情页记录排序

## 时间与排序语义

- 数据库存 `timestamptz`，前端用 ISO 字符串交互。
- `plan_date` 用 `date`，避免时区导致的“日期偏移”。

## 安全（当前阶段）

- 开启 RLS，并允许 `anon` 对两表 `select/insert/update/delete`（仅适合自用/演示）。
- 若站点公开或要多人使用，下一阶段必须改为：
  - Supabase Auth + RLS `auth.uid()`；或
  - 仅通过 Netlify Function/Edge Function 代理写入（浏览器不直连写库）。

## 落地文件

- 数据库 DDL：`supabase/schema_recipes.sql`

