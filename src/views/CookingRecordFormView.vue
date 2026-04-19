<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { filesToDataUrls } from '@/composables/useImageFiles'
import { useRecipeStore } from '@/stores/recipes'

const route = useRoute()
const router = useRouter()
const store = useRecipeStore()

const recipeId = computed(() => route.params.recipeId as string)
const recordId = computed(() => (route.params.recordId as string | undefined) ?? undefined)
const isEdit = computed(() => Boolean(recordId.value))

const recipe = computed(() => store.recipeById.get(recipeId.value))

const photos = ref<string[]>([])
const note = ref('')
const cookedAt = ref('')

const fileInput = useTemplateRef('fileInput')

onMounted(() => {
  const r = recipe.value
  if (!r) {
    router.replace('/')
    return
  }
  const rid = recordId.value
  if (!rid) {
    const t = new Date()
    cookedAt.value = t.toISOString().slice(0, 10)
    return
  }
  const rec = r.cookingRecords.find((x) => x.id === rid)
  if (!rec) {
    router.replace(`/recipes/${r.id}`)
    return
  }
  photos.value = [...rec.photos]
  note.value = rec.note
  cookedAt.value = rec.cookedAt.slice(0, 10)
})

async function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files?.length) return
  const urls = await filesToDataUrls(files)
  photos.value = [...urls, ...photos.value]
  input.value = ''
}

function pick() {
  fileInput.value?.click()
}

function removePhoto(i: number) {
  photos.value = photos.value.filter((_, j) => j !== i)
}

function save() {
  const r = recipe.value
  if (!r) return
  const at = cookedAt.value ? new Date(cookedAt.value + 'T12:00:00').toISOString() : new Date().toISOString()
  if (isEdit.value && recordId.value) {
    store.updateCookingRecord(r.id, recordId.value, {
      photos: photos.value,
      note: note.value,
      cookedAt: at,
    })
  } else {
    store.addCookingRecord(r.id, {
      photos: photos.value,
      note: note.value,
      cookedAt: at,
    })
  }
  router.push(`/recipes/${r.id}`)
}
</script>

<template>
  <div v-if="recipe" class="page">
    <header class="head animate-rise">
      <h1>{{ isEdit ? '编辑记录' : '新做饭记录' }}</h1>
      <p class="sub">「{{ recipe.title }}」——实拍与随笔。</p>
    </header>

    <form class="form animate-rise" @submit.prevent="save">
      <div class="field">
        <span class="label">实拍图 <small>可多选</small></span>
        <input ref="fileInput" type="file" class="hidden" accept="image/*" multiple @change="onFiles" />
        <button type="button" class="btn-dashed" @click="pick">添加图片</button>
        <div v-if="photos.length" class="thumbs">
          <div v-for="(p, i) in photos" :key="i" class="thumb-wrap">
            <img :src="p" alt="" />
            <button type="button" class="rm" aria-label="移除" @click="removePhoto(i)">×</button>
          </div>
        </div>
      </div>

      <label class="field">
        <span class="label">做饭日期</span>
        <input v-model="cookedAt" type="date" class="input" required />
      </label>

      <label class="field">
        <span class="label">文字记录</span>
        <textarea v-model="note" class="textarea" rows="7" placeholder="火候、调整、家人们的风评…" />
      </label>

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
  font-size: 1.85rem;
}

.sub {
  margin: 0;
  color: var(--color-ink-muted);
}

.form {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.label {
  font-family: var(--font-display);
  font-weight: 600;
}

.label small {
  font-weight: 400;
  color: var(--color-ink-muted);
}

.hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.btn-dashed {
  cursor: pointer;
  align-self: flex-start;
  border: 1px dashed var(--color-line);
  background: var(--color-bg-elevated);
  color: var(--color-ink-muted);
  padding: 0.45rem 0.85rem;
  border-radius: var(--radius-sm);
}

.btn-dashed:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.thumb-wrap {
  position: relative;
}

.thumb-wrap img {
  width: 96px;
  height: 96px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-line);
}

.rm {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 999px;
  border: none;
  background: var(--color-ink);
  color: #fff;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
}

.input,
.textarea {
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: 0.55rem 0.75rem;
  background: var(--color-bg-elevated);
  max-width: 12rem;
}

.textarea {
  max-width: none;
  resize: vertical;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
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
