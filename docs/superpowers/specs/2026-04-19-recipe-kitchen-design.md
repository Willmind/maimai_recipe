# 菜谱与做饭记录 App — 设计摘要

## 目的与受众

个人厨房笔记：管理「想做 / 已做」的菜谱，记录每次实操与成品照片。单机、无账号，数据仅存本机。

## 技术架构

- **Vue 3 + `<script setup>` + TypeScript**：视图与表单。
- **Pinia**：单一 `recipes` store，内含菜谱数组；`watch` 深比较写入 `localStorage`。
- **Vue Router**：列表、新建/编辑菜谱、详情、新建/编辑记录。
- **图片**：`FileReader.readAsDataURL` 存入状态（注意大图会占用存储配额）。

## 数据模型

- **Recipe**：`title`, `coverImage`, `ingredients[]`, `steps[]`, `cooked`, `planKind`（`none` | `this_week` | `by_date`）, `planDate`, `cookingRecords[]`, 时间戳。
- **CookingRecord**：`photos[]`, `note`, `cookedAt`, 元数据 id / `recipeId`。

## 交互要点

- 首页四个筛选：全部 / 本周计划 / 未做过 / 已做过。「本周计划」包含 `planKind === this_week` 或 `planDate` 落在当周内的菜谱。
- 新建记录默认将菜谱标为已做过（与需求一致）。
- 删除菜谱级联删除其记录（内存模型内嵌数组一并移除）。

## 视觉方向（对齐 frontend-design）

暖色编辑厨房手记：Fraunces + Newsreader、陶土accent、橄榄绿辅助、纸张纹理与轻微入场动画；避免通用「AI 紫渐变 + Inter」审美。