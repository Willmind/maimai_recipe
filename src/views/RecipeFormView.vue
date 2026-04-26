<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import ImagePicker from '@/components/ImagePicker.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import TagManagerDialog from '@/components/TagManagerDialog.vue'
import { useRecipeStore } from '@/stores/recipes'
import type { PlanKind, Recipe } from '@/types/recipe'

const route = useRoute()
const router = useRouter()
const store = useRecipeStore()

const recipeId = computed(() => (route.params.id as string | undefined) ?? undefined)
const isEdit = computed(() => Boolean(recipeId.value))

const title = ref('')
const coverImage = ref<string | null>(null)
const ingredientLines = ref('')
const stepLines = ref('')
const cooked = ref(false)
const planKind = ref<PlanKind>('none')
const planDate = ref('')
const saving = ref(false)
const initialSnapshot = ref('')
const showLeaveConfirm = ref(false)
const leaveResolver = ref<((ok: boolean) => void) | null>(null)
const selectedTagIds = ref<string[]>([])
const showTagManager = ref(false)

function linesToArr(s: string): string[] {
  return s
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)
}

function arrToLines(a: string[]): string {
  return a.join('\n')
}

function buildPayload(): Omit<Recipe, 'id' | 'createdAt' | 'updatedAt' | 'cookingRecords'> {
  return {
    title: title.value.trim() || '未命名菜谱',
    coverImage: coverImage.value,
    ingredients: linesToArr(ingredientLines.value),
    steps: linesToArr(stepLines.value),
    cooked: cooked.value,
    planKind: planKind.value,
    planDate: planKind.value === 'by_date' ? planDate.value || null : null,
  }
}

function refreshInitialSnapshot() {
  initialSnapshot.value = JSON.stringify(buildPayload())
}

const isDirty = computed(() => JSON.stringify(buildPayload()) !== initialSnapshot.value)

onMounted(() => {
  const id = recipeId.value
  if (!id) {
    refreshInitialSnapshot()
    return
  }
  const r = store.recipeById.get(id)
  if (!r) {
    router.replace('/')
    return
  }
  title.value = r.title
  coverImage.value = r.coverImage
  ingredientLines.value = arrToLines(r.ingredients)
  stepLines.value = arrToLines(r.steps)
  cooked.value = r.cooked
  planKind.value = r.planKind
  planDate.value = r.planDate ?? ''
  selectedTagIds.value = [...(store.recipeTagIdsByRecipeId.get(id) ?? [])]
  refreshInitialSnapshot()
})

watch(recipeId, (id) => {
  if (!id) {
    title.value = ''
    coverImage.value = null
    ingredientLines.value = ''
    stepLines.value = ''
    cooked.value = false
    planKind.value = 'none'
    planDate.value = ''
    selectedTagIds.value = []
    refreshInitialSnapshot()
  }
})

function onBeforeUnload(e: BeforeUnloadEvent) {
  if (!isDirty.value || saving.value) return
  e.preventDefault()
  e.returnValue = ''
}

onMounted(() => {
  window.addEventListener('beforeunload', onBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', onBeforeUnload)
})

onBeforeRouteLeave(() => {
  if (!isDirty.value || saving.value) return true
  showLeaveConfirm.value = true
  return new Promise<boolean>((resolve) => {
    leaveResolver.value = resolve
  })
})

function confirmLeave(ok: boolean) {
  const r = leaveResolver.value
  leaveResolver.value = null
  showLeaveConfirm.value = false
  r?.(ok)
}

async function save() {
  if (saving.value) return
  if (isEdit.value && recipeId.value) {
    saving.value = true
    const r = store.recipeById.get(recipeId.value)
    try {
      await store.updateRecipe(recipeId.value, {
        ...buildPayload(),
        cookingRecords: r?.cookingRecords ?? [],
      })
      await store.setTags(recipeId.value, selectedTagIds.value)
      refreshInitialSnapshot()
      await router.push(`/recipes/${recipeId.value}`)
    } finally {
      saving.value = false
    }
  } else {
    saving.value = true
    try {
      const id = await store.addRecipe(buildPayload())
      if (!id) return
      await store.setTags(id, selectedTagIds.value)
      refreshInitialSnapshot()
      await router.push(`/recipes/${id}`)
    } finally {
      saving.value = false
    }
  }
}

function removeCover() {
  coverImage.value = null
}

function toggleTag(id: string) {
  const set = new Set(selectedTagIds.value)
  if (set.has(id)) set.delete(id)
  else set.add(id)
  selectedTagIds.value = Array.from(set)
}
</script>

<template>
  <div class="page">
    <header class="head animate-rise">
      <h1>{{ isEdit ? '编辑菜谱' : '新建菜谱' }}</h1>
      <p class="sub">标题、封面、食材与步骤。可随时回来改。</p>
    </header>

    <form class="form animate-rise" @submit.prevent="save">
      <label class="field">
        <span class="label">菜名</span>
        <input v-model="title" type="text" class="input" placeholder="例如：葱油拌面" />
      </label>

      <div class="field">
        <span class="label">封面图</span>
        <div class="row">
          <ImagePicker v-model="coverImage" />
          <button v-if="coverImage" type="button" class="ghost" @click="removeCover">移除</button>
        </div>
        <div v-if="coverImage" class="preview">
          <img :src="coverImage" alt="" />
        </div>
      </div>

      <label class="field">
        <span class="label">食材清单 <small>每行一项</small></span>
        <textarea
          v-model="ingredientLines"
          class="textarea"
          rows="6"
          placeholder="鸡蛋 2 个&#10;番茄 300g"
        />
      </label>

      <label class="field">
        <span class="label">步骤 <small>每行一步</small></span>
        <textarea
          v-model="stepLines"
          class="textarea"
          rows="8"
          placeholder="冷油下葱，小火煸至焦黄…"
        />
      </label>

      <label class="check">
        <input v-model="cooked" type="checkbox" />
        <span>我做过这道菜</span>
      </label>

      <fieldset class="fieldset">
        <legend class="label">计划</legend>
        <div class="plan-options">
          <button
            type="button"
            class="plan-option"
            :class="{ active: planKind === 'none' }"
            @click="planKind = 'none'"
          >
            <span class="plan-title">无</span>
            <span class="plan-copy">先收着，之后再安排</span>
          </button>
          <button
            type="button"
            class="plan-option"
            :class="{ active: planKind === 'this_week' }"
            @click="planKind = 'this_week'"
          >
            <span class="plan-title">本周计划</span>
            <span class="plan-copy">这几天准备做</span>
          </button>
          <div class="plan-option date-option" :class="{ active: planKind === 'by_date' }">
            <button type="button" class="date-toggle" @click="planKind = 'by_date'">
              <span class="plan-title">指定日期</span>
              <span class="plan-copy">安排到某一天</span>
            </button>
            <input
              v-model="planDate"
              type="date"
              class="input date"
              :disabled="planKind !== 'by_date'"
            />
          </div>
        </div>
      </fieldset>

      <fieldset class="fieldset">
        <legend class="label row-between">
          <span>标签</span>
          <button type="button" class="mini-link" @click="showTagManager = true">管理标签</button>
        </legend>
        <div v-if="store.tags.length" class="tag-grid">
          <button
            v-for="t in store.tags"
            :key="t.id"
            type="button"
            class="tag-pill"
            :class="{ on: selectedTagIds.includes(t.id) }"
            @click="toggleTag(t.id)"
          >
            {{ t.name }}
          </button>
        </div>
        <p v-else class="muted">还没有标签。点「管理标签」新增一个吧。</p>
      </fieldset>

      <div class="actions">
        <button type="button" class="ghost" :disabled="saving" @click="router.back()">取消</button>
        <button type="submit" class="primary" :disabled="saving">{{ saving ? '保存中…' : '保存' }}</button>
      </div>
    </form>
  </div>

  <ConfirmDialog
    v-model:open="showLeaveConfirm"
    title="放弃未保存的修改？"
    message="你刚才的内容还没保存，离开后会丢失。"
    confirm-text="离开"
    cancel-text="继续编辑"
    @confirm="confirmLeave(true)"
    @cancel="confirmLeave(false)"
  />

  <TagManagerDialog v-model:open="showTagManager" />
</template>

<style scoped>
.page {
  max-width: 640px;
  margin: 0 auto;
}

.head h1 {
  margin: 0 0 0.35rem;
  font-size: 2rem;
}

.sub {
  margin: 0;
  color: var(--color-ink-muted);
}

.form {
  margin-top: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1.35rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.label {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1rem;
}

.label small {
  font-weight: 400;
  color: var(--color-ink-muted);
}

.input,
.textarea {
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: 0.55rem 0.75rem;
  background: var(--color-bg-elevated);
  color: var(--color-ink);
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease;
}

.input:hover,
.textarea:hover {
  border-color: rgba(196, 92, 62, 0.28);
}

.input:focus,
.textarea:focus {
  outline: none;
  border-color: rgba(196, 92, 62, 0.45);
  box-shadow: 0 0 0 3px rgba(196, 92, 62, 0.12);
}

.input:disabled,
.textarea:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.textarea {
  resize: vertical;
  min-height: 6rem;
}

.date {
  max-width: 11rem;
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.preview {
  margin-top: 0.5rem;
  max-width: 280px;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--color-line);
}

.preview img {
  width: 100%;
  display: block;
}

.check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.fieldset {
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: 0.75rem 1rem 1rem;
  margin: 0;
}

.row-between {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.mini-link {
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  color: var(--color-accent);
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 0.92rem;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.tag-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.tag-pill {
  height: 2.5rem;
  padding: 0 0.9rem;
  border-radius: 999px;
  border: 1px solid var(--color-line);
  background: var(--color-bg-elevated);
  color: var(--color-ink-muted);
  font-family: var(--font-display);
  font-weight: 600;
  cursor: pointer;
  line-height: 1;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease,
    background 0.18s ease;
}

.tag-pill:hover {
  transform: translateY(-1px);
  border-color: rgba(196, 92, 62, 0.35);
  box-shadow: 0 10px 22px rgba(31, 20, 12, 0.08);
}

.tag-pill.on {
  border-color: rgba(196, 92, 62, 0.45);
  background: rgba(196, 92, 62, 0.08);
  color: var(--color-accent);
  box-shadow: 0 0 0 1px rgba(196, 92, 62, 0.12);
}

.muted {
  margin: 0;
  color: var(--color-ink-muted);
}

.plan-options {
  display: grid;
  gap: 0.65rem;
}

.plan-option {
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

.plan-option:hover {
  border-color: rgba(196, 92, 62, 0.28);
  box-shadow: 0 10px 22px rgba(31, 20, 12, 0.08);
  transform: translateY(-1px);
}

.plan-option:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.plan-option.active {
  border-color: rgba(196, 92, 62, 0.45);
  background: rgba(196, 92, 62, 0.08);
  box-shadow: 0 0 0 1px rgba(196, 92, 62, 0.12);
}

.plan-option.active:hover {
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

.date-option {
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

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 0.5rem;
  position: sticky;
  bottom: 0;
  padding: 1.85rem 0 calc(0.85rem + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(180deg, rgba(246, 240, 230, 0), rgba(246, 240, 230, 0.92) 24%, rgba(246, 240, 230, 1));
}

.actions .ghost,
.actions .primary {
  min-width: 4.75rem;
}

.primary {
  cursor: pointer;
  border: none;
  border-radius: 999px;
  height: 2.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 1.35rem;
  background: var(--color-accent);
  color: #fffdf8;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 0.92rem;
  line-height: 1;
  box-shadow: 0 4px 14px rgba(196, 92, 62, 0.28);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 26px rgba(196, 92, 62, 0.38);
}

.ghost {
  cursor: pointer;
  border: 1px solid var(--color-line);
  background: transparent;
  border-radius: 999px;
  height: 2.75rem;
  box-sizing: border-box;
  appearance: none;
  -webkit-appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 1rem;
  color: var(--color-ink-muted);
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 0.92rem;
  line-height: 1;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease,
    background 0.18s ease;
}

.ghost:hover {
  transform: translateY(-1px);
  border-color: rgba(196, 92, 62, 0.35);
  color: var(--color-accent);
  background: rgba(255, 253, 248, 0.7);
  box-shadow: 0 10px 22px rgba(31, 20, 12, 0.08);
}

.primary:disabled,
.ghost:disabled {
  cursor: wait;
  opacity: 0.7;
}

.primary:disabled:hover,
.ghost:disabled:hover {
  transform: none;
  box-shadow: none;
}
</style>
