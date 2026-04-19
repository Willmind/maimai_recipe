<script setup lang="ts">
import { computed, ref } from 'vue'
import RecipeCard from '@/components/RecipeCard.vue'
import { useRecipeStore } from '@/stores/recipes'
import type { RecipeListFilter } from '@/types/recipe'

const store = useRecipeStore()
const filter = ref<RecipeListFilter>('all')
const titleQuery = ref('')

function includesInsensitive(hay: string, needle: string): boolean {
  return hay.toLowerCase().includes(needle.toLowerCase())
}

/** 字符按序出现在标题中（不必相邻），用于简单模糊 */
function subsequenceInsensitive(hay: string, needle: string): boolean {
  const h = hay.toLowerCase()
  const n = needle.toLowerCase().replace(/\s+/g, '')
  if (!n.length) return true
  let j = 0
  for (let i = 0; i < h.length && j < n.length; i++) {
    if (h[i] === n[j]) j++
  }
  return j === n.length
}

function titleMatchesQuery(title: string, raw: string): boolean {
  const tokens = raw
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
  if (!tokens.length) return true
  return tokens.every(
    (tok) => includesInsensitive(title, tok) || subsequenceInsensitive(title, tok),
  )
}

const tabs: { key: RecipeListFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'this_week', label: '本周计划' },
  { key: 'not_cooked', label: '未做过' },
  { key: 'cooked', label: '已做过' },
]

const list = computed(() => {
  const rows = store.listFiltered(filter.value).filter((r) => titleMatchesQuery(r.title, titleQuery.value))
  return [...rows].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
})

const hasActiveSearch = computed(() => Boolean(titleQuery.value.trim()))
</script>

<template>
  <div class="page">
    <header class="hero animate-rise">
      <h1>我的菜谱本</h1>
      <p class="lede">收藏想做的菜，记下每一次灶台上的味道。</p>
    </header>

    <div class="toolbar animate-rise">
      <div class="tabs" role="tablist" aria-label="筛选">
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
      <label class="search">
        <span class="sr-only">按标题模糊搜索菜谱</span>
        <input
          v-model="titleQuery"
          type="search"
          class="search-input"
          placeholder="搜索标题…"
          autocomplete="off"
          aria-label="按标题模糊搜索菜谱"
        />
      </label>
    </div>

    <div v-if="list.length" class="grid animate-rise-stagger">
      <RecipeCard v-for="r in list" :key="r.id" :recipe="r" />
    </div>
    <p v-else class="empty animate-rise">
      <template v-if="hasActiveSearch">没有标题匹配当前搜索的菜谱。</template>
      <template v-else>还没有符合条件的菜谱。去新建一道吧。</template>
    </p>
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

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1rem;
  margin-bottom: 1.5rem;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  flex: 1 1 auto;
  min-width: 0;
}

.search {
  flex: 0 1 14rem;
  min-width: 10rem;
}

.search-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--color-line);
  border-radius: 999px;
  padding: 0.4rem 0.85rem 0.4rem 1rem;
  background: var(--color-bg-elevated);
  color: var(--color-ink);
  font-size: 0.92rem;
}

.search-input::placeholder {
  color: var(--color-ink-muted);
}

.search-input:focus {
  outline: none;
  border-color: rgba(196, 92, 62, 0.45);
  box-shadow: 0 0 0 3px rgba(196, 92, 62, 0.12);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
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
  gap: 0.75rem;
  /* 窄屏（如 iPhone 12/16 Pro）固定两列，避免 minmax(260px) 挤成单列 */
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (min-width: 720px) {
  .grid {
    gap: 1.25rem;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  }
}

.empty {
  color: var(--color-ink-muted);
  padding: 2rem 0;
}
</style>
