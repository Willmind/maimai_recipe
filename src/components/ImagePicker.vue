<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { filesToStoredUrls } from '@/composables/useStoredImages'

withDefaults(defineProps<{ label?: string }>(), { label: '选择图片' })

const model = defineModel<string | null>({ required: true })

const inputRef = useTemplateRef('fileInput')

async function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files?.length) return
  const urls = await filesToStoredUrls(files, { folder: 'covers', kind: 'cover' })
  model.value = urls[0] ?? null
  input.value = ''
}

function pick() {
  inputRef.value?.click()
}
</script>

<template>
  <div class="picker">
    <input
      ref="fileInput"
      type="file"
      class="hidden"
      accept="image/*"
      @change="onFiles"
    />
    <button type="button" class="btn" @click="pick">{{ label }}</button>
  </div>
</template>

<style scoped>
.hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.btn {
  cursor: pointer;
  border: 1px dashed var(--color-line);
  background: var(--color-bg-elevated);
  color: var(--color-ink-muted);
  min-height: 2.75rem;
  padding: 0.45rem 0.85rem;
  border-radius: var(--radius-sm);
  font-size: 0.92rem;
}

.btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
</style>
