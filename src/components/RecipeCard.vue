<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { Recipe } from '@/types/recipe'

defineProps<{ recipe: Recipe }>()

function planLabel(r: Recipe): string | null {
  if (r.planKind === 'this_week') return '本周计划'
  if (r.planKind === 'by_date' && r.planDate) return `计划 · ${r.planDate}`
  return null
}
</script>

<template>
  <article class="card animate-rise">
    <RouterLink :to="`/recipes/${recipe.id}`" class="cover-link">
      <div class="cover">
        <img v-if="recipe.coverImage" :src="recipe.coverImage" :alt="recipe.title" />
        <div v-else class="cover-placeholder">暂无封面</div>
      </div>
    </RouterLink>
    <div class="body">
      <RouterLink :to="`/recipes/${recipe.id}`" class="title">{{ recipe.title }}</RouterLink>
      <div class="meta">
        <span v-if="recipe.cooked" class="pill done">做过</span>
        <span v-else class="pill todo">未做</span>
        <span v-if="planLabel(recipe)" class="pill plan">{{ planLabel(recipe) }}</span>
        <span class="count">{{ recipe.cookingRecords.length }} 条记录</span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.card {
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-line);
  box-shadow: 0 12px 36px rgba(31, 20, 12, 0.06);
  display: flex;
  flex-direction: column;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 18px 48px rgba(31, 20, 12, 0.1);
}

.cover-link {
  display: block;
  text-decoration: none;
}

.cover {
  aspect-ratio: 16 / 10;
  background: linear-gradient(145deg, rgba(196, 92, 62, 0.12), rgba(74, 93, 62, 0.1));
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cover-placeholder {
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--color-ink-muted);
  font-size: 0.95rem;
}

.body {
  padding: 1rem 1.1rem 1.15rem;
}

.title {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-ink);
  text-decoration: none;
  display: block;
}

.title:hover {
  color: var(--color-accent);
}

.meta {
  margin-top: 0.55rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: center;
  font-size: 0.85rem;
}

.pill {
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-family: var(--font-display);
}

.done {
  background: rgba(74, 93, 62, 0.15);
  color: var(--color-olive);
}

.todo {
  background: rgba(196, 92, 62, 0.12);
  color: var(--color-accent);
}

.plan {
  background: rgba(31, 20, 12, 0.06);
  color: var(--color-ink-muted);
}

.count {
  color: var(--color-ink-muted);
  margin-left: auto;
}
</style>
