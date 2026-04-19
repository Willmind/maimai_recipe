<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
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
  if (!confirm(`确定删除「${recipe.value.title}」？相关记录也会一并删除。`)) return
  store.deleteRecipe(recipe.value.id)
  router.push('/')
}

function removeRecord(recordId: string) {
  if (!recipe.value) return
  if (!confirm('删除这条做饭记录？')) return
  store.deleteCookingRecord(recipe.value.id, recordId)
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
        <label class="radio">
          <input v-model="planKind" type="radio" value="none" />
          <span>无</span>
        </label>
        <label class="radio">
          <input v-model="planKind" type="radio" value="this_week" />
          <span>本周要做</span>
        </label>
        <label class="radio wide">
          <input v-model="planKind" type="radio" value="by_date" />
          <span>指定日期</span>
          <input v-model="planDateLocal" type="date" class="date" :disabled="planKind !== 'by_date'" />
        </label>
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
  padding: 0.35rem 0.85rem;
  font-size: 0.88rem;
  font-family: var(--font-display);
  color: var(--color-ink-muted);
}

.chip.on {
  background: rgba(74, 93, 62, 0.15);
  color: var(--color-olive);
  border-color: rgba(74, 93, 62, 0.35);
}

.chip.link {
  text-decoration: none;
  color: var(--color-accent);
}

.chip.danger {
  color: #a33;
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

.radio {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  cursor: pointer;
}

.radio.wide {
  flex-wrap: wrap;
}

.date {
  border: 1px solid var(--color-line);
  border-radius: var(--radius-sm);
  padding: 0.25rem 0.4rem;
  background: #fff;
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
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  color: var(--color-accent);
  text-decoration: underline;
  text-underline-offset: 2px;
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
</style>
