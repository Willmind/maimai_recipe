<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ImagePicker from '@/components/ImagePicker.vue'
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

function linesToArr(s: string): string[] {
  return s
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)
}

function arrToLines(a: string[]): string {
  return a.join('\n')
}

onMounted(() => {
  const id = recipeId.value
  if (!id) return
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
  }
})

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

function save() {
  if (isEdit.value && recipeId.value) {
    const r = store.recipeById.get(recipeId.value)
    store.updateRecipe(recipeId.value, {
      ...buildPayload(),
      cookingRecords: r?.cookingRecords ?? [],
    })
    router.push(`/recipes/${recipeId.value}`)
  } else {
    const id = store.addRecipe(buildPayload())
    router.push(`/recipes/${id}`)
  }
}

function removeCover() {
  coverImage.value = null
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
        <label class="radio">
          <input v-model="planKind" type="radio" value="none" />
          <span>无</span>
        </label>
        <label class="radio">
          <input v-model="planKind" type="radio" value="this_week" />
          <span>列入本周计划</span>
        </label>
        <label class="radio row">
          <input v-model="planKind" type="radio" value="by_date" />
          <span>指定日期</span>
          <input
            v-model="planDate"
            type="date"
            class="input date"
            :disabled="planKind !== 'by_date'"
          />
        </label>
      </fieldset>

      <div class="actions">
        <button type="button" class="ghost" @click="router.back()">取消</button>
        <button type="submit" class="primary">保存</button>
      </div>
    </form>
  </div>
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

.check,
.radio {
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
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 0.5rem;
}

.primary {
  cursor: pointer;
  border: none;
  border-radius: 999px;
  padding: 0.55rem 1.35rem;
  background: var(--color-accent);
  color: #fffdf8;
  font-family: var(--font-display);
  font-weight: 600;
}

.ghost {
  cursor: pointer;
  border: 1px solid var(--color-line);
  background: transparent;
  border-radius: 999px;
  padding: 0.5rem 1rem;
  color: var(--color-ink-muted);
}
</style>
