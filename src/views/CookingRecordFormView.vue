<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { filesToStoredUrls } from '@/composables/useStoredImages'
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
const saving = ref(false)
const initialSnapshot = ref('')
const showLeaveConfirm = ref(false)
const leaveResolver = ref<((ok: boolean) => void) | null>(null)

const fileInput = useTemplateRef('fileInput')

function refreshInitialSnapshot() {
  initialSnapshot.value = JSON.stringify({
    photos: photos.value,
    note: note.value,
    cookedAt: cookedAt.value,
  })
}

const isDirty = computed(
  () =>
    JSON.stringify({
      photos: photos.value,
      note: note.value,
      cookedAt: cookedAt.value,
    }) !== initialSnapshot.value,
)

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
    refreshInitialSnapshot()
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
  refreshInitialSnapshot()
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

async function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files?.length) return
  const urls = await filesToStoredUrls(files, { folder: `records/${recipeId.value}`, kind: 'record' })
  photos.value = [...urls, ...photos.value]
  input.value = ''
}

function pick() {
  fileInput.value?.click()
}

function removePhoto(i: number) {
  photos.value = photos.value.filter((_, j) => j !== i)
}

async function save() {
  if (saving.value) return
  const r = recipe.value
  if (!r) return
  const at = cookedAt.value ? new Date(cookedAt.value + 'T12:00:00').toISOString() : new Date().toISOString()
  saving.value = true
  try {
    if (isEdit.value && recordId.value) {
      await store.updateCookingRecord(r.id, recordId.value, {
        photos: photos.value,
        note: note.value,
        cookedAt: at,
      })
    } else {
      await store.addCookingRecord(r.id, {
        photos: photos.value,
        note: note.value,
        cookedAt: at,
      })
    }
    refreshInitialSnapshot()
    await router.push(`/recipes/${r.id}`)
  } finally {
    saving.value = false
  }
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
        <button type="button" class="ghost" :disabled="saving" @click="router.back()">取消</button>
        <button type="submit" class="primary" :disabled="saving">{{ saving ? '保存中…' : '保存' }}</button>
      </div>
    </form>
  </div>

  <ConfirmDialog
    v-model:open="showLeaveConfirm"
    title="放弃未保存的记录？"
    message="你刚才的图片和文字还没保存，离开后会丢失。"
    confirm-text="离开"
    cancel-text="继续编辑"
    @confirm="confirmLeave(true)"
    @cancel="confirmLeave(false)"
  />
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
  min-height: 2.75rem;
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
  width: 2rem;
  height: 2rem;
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
