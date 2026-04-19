# Supabase Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将应用数据源从 `localStorage` 切换为 Supabase（PostgreSQL），实现线上可用的菜谱与做饭记录 CRUD。

**Architecture:** 在 `src/data/recipesRepo.ts` 抽象「数据仓库」，提供与现有 Pinia store 等价的增删改查；Pinia store 只负责 UI 友好的状态管理，优先走 Supabase，未配置时降级到 `localStorage`。

**Tech Stack:** Vue 3, Pinia, TypeScript, Supabase JS v2, Netlify（环境变量注入）

---

## Scope / Non-goals

- **本计划包含**
  - 读写 Supabase 的完整 CRUD（菜谱 + 做饭记录）
  - `uuid` 主键对齐（前端不再自行生成菜谱/记录 id）
  - 最小可用的错误处理与加载态
  - 部署所需环境变量说明
- **本计划不包含**
  - 多用户/登录（Auth）
  - 图片改为 Supabase Storage（仍先用 data URL；后续可独立计划优化）
  - 离线优先/双写同步（可在 Supabase 版本稳定后再做）

## File Structure

**Create**
- `src/data/supabaseTypes.ts`：数据库行类型（`recipes` / `cooking_records`）
- `src/data/recipesRepo.ts`：仓库接口 + Supabase 实现 + localStorage 实现（fallback）

**Modify**
- `src/stores/recipes.ts`：替换为调用 repo；增加 `loading/error`；移除 `createId` 生成逻辑

---

### Task 1: 定义数据库行类型

**Files:**
- Create: `src/data/supabaseTypes.ts`

- [ ] **Step 1: 添加行类型定义（与表结构一致）**

```ts
export type DbPlanKind = 'none' | 'this_week' | 'by_date'

export interface DbRecipeRow {
  id: string // uuid
  title: string
  cover_image: string | null
  ingredients: string[] // jsonb array
  steps: string[] // jsonb array
  cooked: boolean
  plan_kind: DbPlanKind
  plan_date: string | null // date → 'YYYY-MM-DD'
  created_at: string // timestamptz ISO
  updated_at: string // timestamptz ISO
}

export interface DbCookingRecordRow {
  id: string // uuid
  recipe_id: string // uuid
  photos: string[] // jsonb array
  note: string
  cooked_at: string // timestamptz ISO
  created_at: string // timestamptz ISO
}
```

- [ ] **Step 2: 运行类型检查**

Run: `npm run typecheck`  
Expected: PASS

---

### Task 2: 新建 Repo 抽象（Supabase + localStorage fallback）

**Files:**
- Create: `src/data/recipesRepo.ts`
- Read: `src/stores/recipes.ts`
- Read: `src/lib/supabase.ts`
- Read: `src/types/recipe.ts`

- [ ] **Step 1: 定义 Repo 接口（覆盖现有 store 行为）**

```ts
import type { CookingRecord, PlanKind, Recipe } from '@/types/recipe'

export type RepoMode = 'supabase' | 'local'

export interface RecipesRepo {
  mode: RepoMode

  listRecipes(): Promise<Recipe[]>
  getRecipe(id: string): Promise<Recipe | null>

  createRecipe(payload: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt' | 'cookingRecords'>): Promise<string>
  updateRecipe(id: string, patch: Partial<Omit<Recipe, 'id' | 'createdAt'>>): Promise<void>
  deleteRecipe(id: string): Promise<void>

  setCooked(id: string, cooked: boolean): Promise<void>
  setPlan(id: string, planKind: PlanKind, planDate: string | null): Promise<void>

  addCookingRecord(
    recipeId: string,
    payload: Omit<CookingRecord, 'id' | 'recipeId' | 'createdAt'>,
  ): Promise<string | null>
  updateCookingRecord(
    recipeId: string,
    recordId: string,
    patch: Partial<Pick<CookingRecord, 'photos' | 'note' | 'cookedAt'>>,
  ): Promise<void>
  deleteCookingRecord(recipeId: string, recordId: string): Promise<void>
}
```

- [ ] **Step 2: 实现 localStorageRepo（复刻现有行为）**

要求：
- 与当前 `src/stores/recipes.ts` 逻辑一致（`STORAGE_KEY='recipe-kitchen-v1'`）
- `createRecipe/addCookingRecord` 继续用 `createId()` 生成 `text` id（仅 local 模式会用）

- [ ] **Step 3: 实现 supabaseRepo（两表读写）**

实现细节（需在代码里显式写出）：  
- `listRecipes`：先查 `recipes`，再用 `in('recipe_id', ids)` 拉 `cooking_records`，组装后返回 `Recipe[]`  
- `getRecipe`：单条 `recipes` + 对应记录列表  
- `createRecipe`：`insert recipes ... returning id`，返回 uuid 字符串  
- `updateRecipe`：`update recipes ... eq('id', id)`（`updated_at` 由 trigger 自动维护）  
- `deleteRecipe`：删 `recipes`（记录 cascade）  
- `addCookingRecord`：`insert cooking_records ... returning id`，随后把 `recipes.cooked=true`  
- `updateCookingRecord/deleteCookingRecord`：操作 `cooking_records`；必要时可根据是否还有记录同步 `recipes.cooked`（可先不做，保持现有“独立字段”语义）

- [ ] **Step 4: 导出 createRecipesRepo()（按环境变量决定模式）**

```ts
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

export function createRecipesRepo(): RecipesRepo {
  if (isSupabaseConfigured && supabase) return createSupabaseRepo(supabase)
  return createLocalStorageRepo()
}
```

- [ ] **Step 5: 类型检查**

Run: `npm run typecheck`  
Expected: PASS

---

### Task 3: 改造 Pinia store 为异步加载 + 调用 Repo

**Files:**
- Modify: `src/stores/recipes.ts`
- Create: `src/data/recipesRepo.ts`（Task 2 已创建）

- [ ] **Step 1: 在 store 增加状态**

- `loading: Ref<boolean>`
- `error: Ref<string | null>`
- `ready: Ref<boolean>`（首次 load 是否完成）

- [ ] **Step 2: 将 load() 改为异步**

目标行为：
- 应用启动时调用 `await store.load()`（或 store 内部 `void load()` 并暴露 `ready/loading` 给页面）
- Supabase 模式：调用 `repo.listRecipes()` 填充 `recipes.value`
- local 模式：调用 `repo.listRecipes()`（内部读 localStorage）

- [ ] **Step 3: 将 add/update/delete/setPlan/setCooked/record CRUD 全部改为 await repo**

要求：
- 所有写操作完成后，更新 `recipes.value`（可用“乐观更新 + 失败回滚”或“写完后重拉”两种；优先选实现简单且稳定的一种）
- 任何错误写入 `error.value`（同时不要让页面崩溃）

- [ ] **Step 4: 移除 store 内的 deep watch + localStorage persist（交给 repo）**

Supabase 模式不应再写 localStorage；local 模式由 localStorageRepo 自己写。

- [ ] **Step 5: 类型检查与构建**

Run: `npm run typecheck`  
Expected: PASS

Run: `npm run build`  
Expected: PASS

---

### Task 4: 手动验收（本地 + 线上）

**Local（`.env` 已配置 Supabase）**

- [ ] **Step 1: 启动**

Run: `npm run dev`  
Expected: 首页能正常渲染（必要时显示“加载中…”→ 列表）

- [ ] **Step 2: CRUD 验收**

在浏览器完成：
- 新建菜谱 → 返回详情页能看到
- 编辑菜谱 → 刷新后仍存在
- 新建做饭记录 → 详情页展示
- 删除记录/删除菜谱 → 重新刷新仍保持删除结果

**Netlify**

- [ ] **Step 3: 配置环境变量并重新部署**

在 Netlify 控制台设置：
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Expected: 重新部署后线上 CRUD 正常；深链接刷新不 404（已有 `_redirects`）。

---

### Task 5: 提交与推送（由用户显式触发）

- [ ] **Step 1: 提交（仅当用户明确说“帮我提交”）**

```bash
git add src/data src/stores/recipes.ts docs/superpowers/plans/2026-04-19-supabase-integration.md
git commit -m "feat: 使用 Supabase 持久化菜谱与做饭记录"
```

- [ ] **Step 2: 推送（仅当用户明确说“帮我推送”）**

```bash
git push origin main
```

