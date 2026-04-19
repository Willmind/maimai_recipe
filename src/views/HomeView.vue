<script setup lang="ts">
import { computed, ref } from 'vue'
import RecipeCard from '@/components/RecipeCard.vue'
import { useRecipeStore } from '@/stores/recipes'
import type { RecipeListFilter } from '@/types/recipe'

const store = useRecipeStore()
const filter = ref<RecipeListFilter>('all')

const tabs: { key: RecipeListFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'this_week', label: '本周计划' },
  { key: 'not_cooked', label: '未做过' },
  { key: 'cooked', label: '已做过' },
]

const list = computed(() => {
  const rows = store.listFiltered(filter.value)
  return [...rows].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
})
</script>

<template>
  <div class="page">
    <header class="hero animate-rise">
      <h1>我的菜谱本</h1>
      <p class="lede">收藏想做的菜，记下每一次灶台上的味道。</p>
    </header>

    <div class="tabs animate-rise" role="tablist" aria-label="筛选">
      <button
        v-for="t in tabs"
        :key="t.key"
        type="button"
        role="tab"
        class="tab"
        :aria-selected="filter === t.key"
        :class="{ active: filter === t.key }"
        @click="filter = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <div v-if="list.length" class="grid animate-rise-stagger">
      <RecipeCard v-for="r in list" :key="r.id" :recipe="r" />
    </div>
    <p v-else class="empty animate-rise">还没有符合条件的菜谱。去新建一道吧。</p>
  </div>
</template>

<style scoped>
.page {
  padding-bottom: 2rem;
}

.hero {
  margin-bottom: 1.75rem;
}

.hero h1 {
  font-size: clamp(2rem, 5vw, 2.75rem);
  margin: 0 0 0.5rem;
}

.lede {
  margin: 0;
  color: var(--color-ink-muted);
  max-width: 36ch;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 1.5rem;
}

.tab {
  cursor: pointer;
  border: 1px solid transparent;
  background: rgba(255, 253, 248, 0.7);
  color: var(--color-ink-muted);
  padding: 0.4rem 0.85rem;
  border-radius: 999px;
  font-family: var(--font-display);
  font-size: 0.92rem;
}

.tab:hover {
  color: var(--color-ink);
}

.tab.active {
  background: var(--color-accent-soft);
  color: var(--color-accent);
  border-color: rgba(196, 92, 62, 0.35);
}

.grid {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}

.empty {
  color: var(--color-ink-muted);
  padding: 2rem 0;
}
</style>
