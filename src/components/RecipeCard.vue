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
  <RouterLink
    :to="`/recipes/${recipe.id}`"
    class="card animate-rise"
    :aria-label="`打开菜谱：${recipe.title}`"
  >
    <div class="cover-link">
      <div class="cover">
        <img v-if="recipe.coverImage" :src="recipe.coverImage" :alt="recipe.title" />
        <div v-else class="cover-placeholder">暂无封面</div>
      </div>
    </div>
    <div class="body">
      <div class="title">{{ recipe.title }}</div>
      <div class="meta">
        <span v-if="recipe.cooked" class="pill done">做过</span>
        <span v-else class="pill todo">未做</span>
        <span v-if="planLabel(recipe)" class="pill plan">{{ planLabel(recipe) }}</span>
        <span class="count">{{ recipe.cookingRecords.length }} 条记录</span>
      </div>
    </div>
  </RouterLink>
</template>

<style scoped>
.card {
  container-type: inline-size;
  container-name: recipe-card;
  min-width: 0;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-line);
  box-shadow: 0 12px 36px rgba(31, 20, 12, 0.06);
  display: flex;
  flex-direction: column;
  text-decoration: none;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 18px 48px rgba(31, 20, 12, 0.1);
}

.card:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
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
  font-size: clamp(1rem, 2.8vw, 1.25rem);
  font-weight: 600;
  color: var(--color-ink);
  text-decoration: none;
  display: block;
  overflow-wrap: anywhere;
}

.card:hover .title {
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
  max-width: 100%;
  box-sizing: border-box;
}

@container recipe-card (max-width: 280px) {
  .body {
    padding: 0.65rem 0.7rem 0.75rem;
  }

  .meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.28rem;
    font-size: 0.76rem;
  }

  .count {
    margin-left: 0;
    width: 100%;
  }

  .pill {
    font-size: 0.68rem;
    padding: 0.1rem 0.38rem;
  }
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.count {
  color: var(--color-ink-muted);
  margin-left: auto;
  flex-shrink: 0;
}
</style>
