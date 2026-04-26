<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Tag } from '@/types/recipe'

const props = defineProps<{
  tags: Tag[]
}>()

const model = defineModel<string>({ required: true })

const open = ref(false)
const root = ref<HTMLElement | null>(null)

const selectedLabel = computed(() => {
  if (model.value === 'all') return '全部标签'
  return props.tags.find((t) => t.id === model.value)?.name ?? '全部标签'
})

function toggle() {
  open.value = !open.value
}

function choose(id: string) {
  model.value = id
  open.value = false
}

function onDocClick(e: MouseEvent) {
  const el = root.value
  if (!el) return
  if (e.target instanceof Node && el.contains(e.target)) return
  open.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
})
</script>

<template>
  <div ref="root" class="wrap">
    <button type="button" class="btn" :aria-expanded="open" aria-haspopup="listbox" @click="toggle">
      <span class="label">{{ selectedLabel }}</span>
      <span class="chev" aria-hidden="true" />
    </button>

    <div v-if="open" class="menu" role="listbox" aria-label="按标签筛选">
      <button
        type="button"
        class="opt"
        :class="{ active: model === 'all' }"
        role="option"
        :aria-selected="model === 'all'"
        @click="choose('all')"
      >
        全部标签
      </button>
      <button
        v-for="t in tags"
        :key="t.id"
        type="button"
        class="opt"
        :class="{ active: model === t.id }"
        role="option"
        :aria-selected="model === t.id"
        @click="choose(t.id)"
      >
        {{ t.name }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.wrap {
  position: relative;
  flex: 0 0 auto;
  z-index: 30;
}

.btn {
  border: 1px solid var(--color-line);
  background: var(--color-bg-elevated);
  color: var(--color-ink-muted);
  border-radius: 999px;
  height: 2.75rem;
  padding: 0 0.85rem 0 0.9rem;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 0.9rem;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease,
    background 0.18s ease;
}

.btn:hover {
  transform: translateY(-1px);
  border-color: rgba(196, 92, 62, 0.35);
  color: var(--color-accent);
  box-shadow: 0 8px 22px rgba(31, 20, 12, 0.1);
}

.btn[aria-expanded='true'] {
  border-color: rgba(196, 92, 62, 0.45);
  background: var(--color-accent-soft);
  color: var(--color-accent);
  box-shadow: 0 2px 10px rgba(196, 92, 62, 0.12);
}

.btn[aria-expanded='true'] .chev {
  transform: rotate(225deg);
  margin-top: 2px;
}

.btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.label {
  max-width: 12ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chev {
  width: 0.55rem;
  height: 0.55rem;
  border-right: 2px solid rgba(31, 20, 12, 0.55);
  border-bottom: 2px solid rgba(31, 20, 12, 0.55);
  transform: rotate(45deg);
  margin-top: -2px;
}

.menu {
  position: absolute;
  left: 0;
  top: calc(100% + 0.5rem);
  width: max-content;
  min-width: 100%;
  max-width: min(18rem, 70vw);
  max-height: min(48vh, 420px);
  overflow: auto;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-line);
  background: rgba(255, 253, 248, 0.98);
  box-shadow: 0 18px 48px rgba(31, 20, 12, 0.12);
  padding: 0.35rem;
  display: grid;
  gap: 0.15rem;
  z-index: 100;
}

.opt {
  height: 2.25rem;
  padding: 0 0.75rem;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--color-ink-muted);
  font-size: 0.9rem;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  white-space: nowrap;
  transition:
    background 0.16s ease,
    color 0.16s ease,
    transform 0.16s ease;
}

.opt:hover {
  background: rgba(196, 92, 62, 0.08);
  color: var(--color-accent);
}

.opt.active {
  background: rgba(196, 92, 62, 0.14);
  color: var(--color-accent);
}

.opt.active:hover {
  background: rgba(196, 92, 62, 0.18);
}
</style>

