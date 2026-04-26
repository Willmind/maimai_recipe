<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useRecipeStore } from '@/stores/recipes'
import type { PlanKind } from '@/types/recipe'

const route = useRoute()
const router = useRouter()
const store = useRecipeStore()

const id = computed(() => route.params.id as string)
const recipe = computed(() => store.recipeById.get(id.value))

/** 做饭日期距「此刻」越近越靠前；无法解析的日期排在最后 */
const cookingRecordsByRecency = computed(() => {
  const r = recipe.value
  if (!r?.cookingRecords.length) return []
  const now = Date.now()
  const t = (iso: string) => {
    const ms = new Date(iso).getTime()
    return Number.isFinite(ms) ? ms : NaN
  }
  const dist = (iso: string) => {
    const ms = t(iso)
    return Number.isFinite(ms) ? Math.abs(ms - now) : Number.POSITIVE_INFINITY
  }
  return [...r.cookingRecords].sort((a, b) => {
    const da = dist(a.cookedAt)
    const db = dist(b.cookedAt)
    if (da !== db) return da - db
    const ta = t(a.cookedAt)
    const tb = t(b.cookedAt)
    if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return tb - ta
    return (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
  })
})

const planKind = computed({
  get: () => recipe.value?.planKind ?? 'none',
  set: (v: PlanKind) => {
    if (!recipe.value) return
    store.setPlan(recipe.value.id, v, v === 'by_date' ? planDateLocal.value || null : null)
  },
})

const planDateLocal = computed({
  get: () => recipe.value?.planDate ?? '',
  set: (v: string) => {
    if (!recipe.value) return
    store.setPlan(recipe.value.id, 'by_date', v || null)
  },
})

function toggleCooked() {
  if (!recipe.value) return
  store.setCooked(recipe.value.id, !recipe.value.cooked)
}

function removeRecipe() {
  if (!recipe.value) return
  deleteTarget.value = { kind: 'recipe', id: recipe.value.id, title: recipe.value.title }
  showDeleteConfirm.value = true
}

function removeRecord(recordId: string) {
  if (!recipe.value) return
  deleteTarget.value = { kind: 'record', recipeId: recipe.value.id, recordId }
  showDeleteConfirm.value = true
}

const showDeleteConfirm = ref(false)
const deleteTarget = ref<
  | null
  | { kind: 'recipe'; id: string; title: string }
  | { kind: 'record'; recipeId: string; recordId: string }
>(null)

function onConfirmDelete() {
  const t = deleteTarget.value
  showDeleteConfirm.value = false
  deleteTarget.value = null
  if (!t) return

  if (t.kind === 'recipe') {
    store.deleteRecipe(t.id)
    router.push('/')
    return
  }

  store.deleteCookingRecord(t.recipeId, t.recordId)
}
</script>

<template>
  <div v-if="recipe" class="page">
    <header class="hero animate-rise">
      <div class="cover">
        <img v-if="recipe.coverImage" :src="recipe.coverImage" :alt="recipe.title" />
        <div v-else class="cover-ph" />
      </div>
      <div class="hero-text">
        <h1>{{ recipe.title }}</h1>
        <div class="chips">
          <RouterLink :to="`/recipes/${recipe.id}/records/new`" class="chip primary">记一次</RouterLink>
          <button type="button" class="chip" :class="{ on: recipe.cooked }" @click="toggleCooked">
            {{ recipe.cooked ? '已做过' : '标记为做过' }}
          </button>
          <RouterLink :to="`/recipes/${recipe.id}/edit`" class="chip link">编辑菜谱</RouterLink>
          <button type="button" class="chip danger" @click="removeRecipe">删除</button>
        </div>
      </div>
    </header>

    <section class="section animate-rise">
      <h2>计划</h2>
      <div class="plan-grid">
        <button
          type="button"
          class="plan-card"
          :class="{ active: planKind === 'none' }"
          @click="planKind = 'none'"
        >
          <span class="plan-title">无</span>
          <span class="plan-copy">先不安排</span>
        </button>
        <button
          type="button"
          class="plan-card"
          :class="{ active: planKind === 'this_week' }"
          @click="planKind = 'this_week'"
        >
          <span class="plan-title">本周要做</span>
          <span class="plan-copy">放进最近待做</span>
        </button>
        <div class="plan-card date-card" :class="{ active: planKind === 'by_date' }">
          <button type="button" class="date-toggle" @click="planKind = 'by_date'">
            <span class="plan-title">指定日期</span>
            <span class="plan-copy">安排到具体某天</span>
          </button>
          <input v-model="planDateLocal" type="date" class="date" :disabled="planKind !== 'by_date'" />
        </div>
      </div>
    </section>

    <section class="section animate-rise">
      <h2>食材</h2>
      <ul v-if="recipe.ingredients.length" class="list">
        <li v-for="(it, i) in recipe.ingredients" :key="i">{{ it }}</li>
      </ul>
      <p v-else class="muted">未填写食材。</p>
    </section>

    <section class="section animate-rise">
      <h2>步骤</h2>
      <ol v-if="recipe.steps.length" class="steps">
        <li v-for="(st, i) in recipe.steps" :key="i">
          <span class="step-n">{{ i + 1 }}</span>
          <span>{{ st }}</span>
        </li>
      </ol>
      <p v-else class="muted">未填写步骤。</p>
    </section>

    <section class="section records animate-rise">
      <div class="records-head">
        <h2>做饭记录</h2>
        <RouterLink :to="`/recipes/${recipe.id}/records/new`" class="add">＋ 新记录</RouterLink>
      </div>
      <p v-if="!recipe.cookingRecords.length" class="muted">还没有记录。做完拍一张吧。</p>
      <article v-for="rec in cookingRecordsByRecency" :key="rec.id" class="record">
        <div class="record-photos">
          <img v-for="(p, pi) in rec.photos" :key="pi" :src="p" alt="" />
        </div>
        <div class="record-body">
          <div class="record-meta">{{ rec.cookedAt.slice(0, 10) }}</div>
          <p class="record-note">{{ rec.note || '（无文字）' }}</p>
          <div class="record-actions">
            <RouterLink :to="`/recipes/${recipe.id}/records/${rec.id}/edit`" class="mini">编辑</RouterLink>
            <button type="button" class="mini danger" @click="removeRecord(rec.id)">删除</button>
          </div>
        </div>
      </article>
    </section>

    <p class="back">
      <RouterLink to="/">← 返回列表</RouterLink>
    </p>
  </div>
  <p v-else class="missing">菜谱不存在。</p>

  <ConfirmDialog
    v-model:open="showDeleteConfirm"
    title="确认删除？"
    :message="
      deleteTarget?.kind === 'recipe'
        ? `将删除「${deleteTarget.title}」，以及它的所有做饭记录。此操作无法撤销。`
        : '将删除这条做饭记录。此操作无法撤销。'
    "
    confirm-text="删除"
    cancel-text="取消"
    @confirm="onConfirmDelete"
    @cancel="
      () => {
        showDeleteConfirm = false
        deleteTarget = null
      }
    "
  />
</template>

<style scoped>
.page {
  padding-bottom: 2rem;
}

.hero {
  display: grid;
  gap: 1rem;
  margin-bottom: 2rem;
}

@media (min-width: 720px) {
  .hero {
    grid-template-columns: 1.1fr 1fr;
    align-items: start;
  }
}

.cover {
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--color-line);
  aspect-ratio: 4 / 3;
  background: linear-gradient(135deg, rgba(196, 92, 62, 0.15), rgba(74, 93, 62, 0.12));
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cover-ph {
  height: 100%;
}

.hero-text h1 {
  margin: 0 0 0.75rem;
  font-size: clamp(1.75rem, 4vw, 2.35rem);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.chip {
  cursor: pointer;
  border: 1px solid var(--color-line);
  background: var(--color-bg-elevated);
  border-radius: 999px;
  min-height: 2.75rem;
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.85rem;
  font-size: 0.88rem;
  font-family: var(--font-display);
  color: var(--color-ink-muted);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease,
    background 0.18s ease;
}

.chip:hover {
  transform: translateY(-1px);
  border-color: rgba(196, 92, 62, 0.35);
  box-shadow: 0 10px 22px rgba(31, 20, 12, 0.08);
}

.chip:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.chip.on {
  background: rgba(74, 93, 62, 0.15);
  color: var(--color-olive);
  border-color: rgba(74, 93, 62, 0.35);
}

.chip.on:hover {
  border-color: rgba(74, 93, 62, 0.5);
  box-shadow: 0 10px 22px rgba(31, 20, 12, 0.1);
}

.chip.link {
  text-decoration: none;
  color: var(--color-accent);
}

.chip.link:hover {
  color: var(--color-olive);
  border-color: rgba(74, 93, 62, 0.35);
}

.chip.primary {
  background: var(--color-accent);
  border-color: transparent;
  color: #fffdf8;
  text-decoration: none;
  box-shadow: 0 4px 14px rgba(196, 92, 62, 0.22);
}

.chip.primary:hover {
  box-shadow: 0 10px 26px rgba(196, 92, 62, 0.35);
  transform: translateY(-1px);
}

.chip.danger {
  color: #a33;
}

.chip.danger:hover {
  border-color: rgba(163, 51, 51, 0.35);
  box-shadow: 0 10px 22px rgba(31, 20, 12, 0.08);
}

.section {
  margin-bottom: 1.75rem;
}

.section h2 {
  font-size: 1.2rem;
  margin: 0 0 0.65rem;
}

.plan-grid {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  background: var(--color-bg-elevated);
}

.plan-card {
  width: 100%;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  background: var(--color-bg-elevated);
  color: var(--color-ink);
  padding: 0.85rem 0.95rem;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease,
    background 0.18s ease;
}

.plan-card:hover {
  border-color: rgba(196, 92, 62, 0.28);
  box-shadow: 0 10px 22px rgba(31, 20, 12, 0.08);
  transform: translateY(-1px);
}

.plan-card:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.plan-card.active {
  border-color: rgba(196, 92, 62, 0.45);
  background: rgba(196, 92, 62, 0.08);
  box-shadow: 0 0 0 1px rgba(196, 92, 62, 0.12);
}

.plan-card.active:hover {
  border-color: rgba(196, 92, 62, 0.55);
  box-shadow:
    0 0 0 1px rgba(196, 92, 62, 0.14),
    0 12px 26px rgba(31, 20, 12, 0.1);
}

.plan-title,
.plan-copy {
  display: block;
}

.plan-title {
  font-family: var(--font-display);
  font-weight: 600;
}

.plan-copy {
  margin-top: 0.15rem;
  font-size: 0.88rem;
  color: var(--color-ink-muted);
}

.date-card {
  display: grid;
  gap: 0.75rem;
}

.date-toggle {
  border: none;
  background: transparent;
  padding: 0;
  text-align: left;
  color: inherit;
  cursor: pointer;
}

.date {
  width: 100%;
  max-width: 14rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-sm);
  padding: 0.6rem 0.75rem;
  background: var(--color-bg-elevated);
}

.list {
  margin: 0;
  padding-left: 1.2rem;
}

.steps {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.steps li {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.65rem;
  align-items: start;
}

.step-n {
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--color-accent);
}

.muted {
  color: var(--color-ink-muted);
  margin: 0;
}

.records-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.records-head h2 {
  margin: 0;
}

.add {
  font-family: var(--font-display);
  font-weight: 600;
  text-decoration: none;
  color: var(--color-accent);
}

.record {
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: 0.85rem 1rem;
  margin-bottom: 0.75rem;
  background: var(--color-bg-elevated);
}

.record-photos {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.5rem;
}

.record-photos img {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-line);
}

.record-meta {
  font-size: 0.85rem;
  color: var(--color-ink-muted);
}

.record-note {
  margin: 0.35rem 0 0.5rem;
  white-space: pre-wrap;
}

.record-actions {
  display: flex;
  gap: 0.5rem;
}

.mini {
  font-size: 0.85rem;
  min-height: 2.25rem;
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--color-line);
  background: var(--color-bg-elevated);
  border-radius: 999px;
  padding: 0.3rem 0.75rem;
  cursor: pointer;
  color: var(--color-accent);
  text-decoration: none;
}

.mini.danger {
  color: #a33;
}

.back {
  margin-top: 2rem;
}

.missing {
  color: var(--color-ink-muted);
}

@media (max-width: 640px) {
  .records-head {
    align-items: center;
  }

  .add {
    display: none;
  }
}
</style>
