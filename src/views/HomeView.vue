<script setup lang="ts">
import { computed, ref } from 'vue'
import RecipeCard from '@/components/RecipeCard.vue'
import TagSelect from '@/components/TagSelect.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useRecipeStore } from '@/stores/recipes'
import type { RecipeListFilter } from '@/types/recipe'

const store = useRecipeStore()
const filter = ref<RecipeListFilter>('all')
const titleQuery = ref('')
const tagFilter = ref<string>('all')

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
  const rows = store
    .listFiltered(filter.value)
    .filter((r) => titleMatchesQuery(r.title, titleQuery.value))
    .filter((r) => {
      if (tagFilter.value === 'all') return true
      const ids = store.recipeTagIdsByRecipeId.get(r.id) ?? []
      return ids.includes(tagFilter.value)
    })
  return [...rows].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
})

const hasActiveSearch = computed(() => Boolean(titleQuery.value.trim()))

const isInitialLoading = computed(() => !store.ready)
const skeletonCount = 8

const selectMode = ref(false)
const selectedIds = ref<string[]>([])
const showDeleteConfirm = ref(false)

function toggleSelectMode() {
  selectMode.value = !selectMode.value
  selectedIds.value = []
}

function toggleSelected(id: string) {
  const set = new Set(selectedIds.value)
  if (set.has(id)) set.delete(id)
  else set.add(id)
  selectedIds.value = Array.from(set)
}

const selectedCount = computed(() => selectedIds.value.length)
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
      <TagSelect v-if="store.tags.length" v-model="tagFilter" :tags="store.tags" />
      <button type="button" class="tab manage" :class="{ active: selectMode }" @click="toggleSelectMode">
        {{ selectMode ? '取消多选' : '多选' }}
      </button>
    </div>

    <div v-if="selectMode" class="bulk animate-rise" aria-label="批量操作">
      <div class="bulk-left">已选 {{ selectedCount }} 项</div>
      <button
        type="button"
        class="bulk-danger"
        :disabled="selectedCount === 0 || store.loading"
        @click="showDeleteConfirm = true"
      >
        删除
      </button>
    </div>

    <div v-if="list.length" class="grid animate-rise-stagger">
      <RecipeCard
        v-for="r in list"
        :key="r.id"
        :recipe="r"
        :select-mode="selectMode"
        :selected="selectedIds.includes(r.id)"
        @toggle="toggleSelected"
      />
    </div>
    <div
      v-else-if="isInitialLoading"
      class="grid skeleton-grid animate-rise"
      aria-busy="true"
      aria-live="polite"
      aria-label="正在加载菜谱"
    >
      <div v-for="i in skeletonCount" :key="i" class="skeleton-card" aria-hidden="true">
        <div class="sk-cover shimmer" />
        <div class="sk-lines">
          <div class="sk-line shimmer" />
          <div class="sk-line short shimmer" />
        </div>
      </div>
      <span class="sr-only">加载中…</span>
    </div>
    <p v-else class="empty animate-rise">
      <template v-if="hasActiveSearch">没有标题匹配当前搜索的菜谱。</template>
      <template v-else>还没有符合条件的菜谱。去新建一道吧。</template>
    </p>

    <ConfirmDialog
      v-model:open="showDeleteConfirm"
      title="删除已选菜谱？"
      :message="`将删除 ${selectedCount} 个菜谱（以及关联的做饭记录）。此操作无法撤销。`"
      confirm-text="删除"
      cancel-text="取消"
      @confirm="
        async () => {
          const ids = [...selectedIds]
          showDeleteConfirm = false
          await store.deleteRecipes(ids)
          selectedIds = []
          selectMode = false
        }
      "
      @cancel="showDeleteConfirm = false"
    />
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
  position: relative;
  z-index: 10;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  overflow: visible;
  gap: 0.4rem;
  flex: 1 1 auto;
  min-width: 0;
  padding-bottom: 0.1rem;
}

.search {
  flex: 1 1 100%;
  min-width: 0;
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
  min-height: 2.75rem;
  flex: 0 0 auto;
  padding: 0.4rem 0.85rem;
  border-radius: 999px;
  font-family: var(--font-display);
  font-size: 0.92rem;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease,
    background 0.18s ease;
}

.tab.manage {
  flex: 0 0 auto;
}

.bulk {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  background: rgba(255, 253, 248, 0.85);
  margin-bottom: 1rem;
}

.bulk-left {
  color: var(--color-ink-muted);
  font-family: var(--font-display);
  font-weight: 600;
}

.bulk-danger {
  height: 2.75rem;
  padding: 0 1.15rem;
  border-radius: 999px;
  border: 1px solid rgba(163, 51, 51, 0.25);
  background: rgba(163, 51, 51, 0.06);
  color: #a33;
  font-family: var(--font-display);
  font-weight: 600;
  cursor: pointer;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;
}

.bulk-danger:hover:enabled {
  transform: translateY(-1px);
  border-color: rgba(163, 51, 51, 0.4);
  box-shadow: 0 10px 22px rgba(31, 20, 12, 0.08);
}

.bulk-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.tab:hover {
  transform: translateY(-1px);
  border-color: rgba(196, 92, 62, 0.28);
  color: var(--color-accent);
  box-shadow: 0 8px 22px rgba(31, 20, 12, 0.1);
}

.tab.active {
  background: var(--color-accent-soft);
  color: var(--color-accent);
  border-color: rgba(196, 92, 62, 0.35);
  box-shadow: 0 2px 10px rgba(196, 92, 62, 0.12);
}

.tab:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: minmax(0, 1fr);
}

.skeleton-grid {
  align-items: stretch;
}

.skeleton-card {
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  background: var(--color-bg-elevated);
  overflow: hidden;
}

.sk-cover {
  aspect-ratio: 4 / 3;
  background: linear-gradient(
    135deg,
    rgba(196, 92, 62, 0.12),
    rgba(74, 93, 62, 0.09)
  );
}

.sk-lines {
  padding: 0.75rem 0.9rem 0.95rem;
  display: grid;
  gap: 0.55rem;
}

.sk-line {
  height: 12px;
  border-radius: 999px;
  background: rgba(31, 20, 12, 0.05);
}

.sk-line.short {
  width: 68%;
}

.shimmer {
  background-image: linear-gradient(
    90deg,
    rgba(196, 92, 62, 0.08) 0%,
    rgba(255, 253, 248, 0.6) 35%,
    rgba(74, 93, 62, 0.08) 70%,
    rgba(196, 92, 62, 0.08) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.1s ease-in-out infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .shimmer {
    animation: none;
  }
}

@media (min-width: 720px) {
  .grid {
    gap: 1.25rem;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  }
}

@media (min-width: 520px) and (max-width: 719px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.empty {
  color: var(--color-ink-muted);
  padding: 2rem 0;
}
</style>
