# 菜谱与做饭记录 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在浏览器内交付可运行的菜谱、计划与做饭记录管理应用，数据本地持久化。

**架构：** 单 Pinia store + Vue Router 多页；无后端，localStorage 为事实来源。

**Tech Stack:** Vue 3、TypeScript、Vite、Pinia、Vue Router。

---

本仓库已按下列任务一次性实现（供后续增量开发时对照）：

### Task 1: 工程与依赖

**Files:** `package.json`, `vite.config.ts`, `tsconfig.`*, `eslint.config.js`, `index.html`

- 初始化 Vite + Vue + TS，配置 `@` 别名与 ESLint/Prettier。

### Task 2: 领域类型与 Store

**Files:** `src/types/recipe.ts`, `src/stores/recipes.ts`, `src/lib/id.ts`

- 定义 `Recipe` / `CookingRecord` / `PlanKind` / 筛选枚举。
- 实现 CRUD、计划、做过标记、记录增删改及 `listFiltered` 逻辑。

### Task 3: 路由与页面

**Files:** `src/router/index.ts`, `src/views/*.vue`, `src/components/*.vue`

- 挂载列表、表单、详情、记录表单路由。
- 完成 UI 与表单校验（日期必填于记录表单）。

### Task 4: 样式与可访问性基线

**Files:** `src/assets/main.css`, Google Fonts（`index.html`）

- CSS 变量主题、焦点环、基础动画。

### Task 5: 规格与 OpenSpec

**Files:** `openspec/specs/recipe-kitchen/spec.md`, `openspec/changes/initial-recipe-app/tasks.md`

- RFC2119 需求 + GIVEN/WHEN/THEN 场景。

### Task 6: 验证

- 运行 `npm run typecheck` 与 `npm run build` 确保通过。