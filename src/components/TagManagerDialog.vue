<script setup lang="ts">
import { computed, ref } from 'vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useRecipeStore } from '@/stores/recipes'

const store = useRecipeStore()

const open = defineModel<boolean>('open', { required: true })

const name = ref('')
const renamingId = ref<string | null>(null)
const showDelete = ref(false)
const deleteId = ref<string | null>(null)

const canSubmit = computed(() => name.value.trim().length > 0)

function close() {
  open.value = false
  name.value = ''
  renamingId.value = null
}

async function submit() {
  const n = name.value.trim()
  if (!n) return
  if (renamingId.value) {
    await store.renameTag(renamingId.value, n)
  } else {
    await store.createTag(n)
  }
  name.value = ''
  renamingId.value = null
}

function startRename(id: string, cur: string) {
  renamingId.value = id
  name.value = cur
}

function askDelete(id: string) {
  deleteId.value = id
  showDelete.value = true
}

async function confirmDelete() {
  if (!deleteId.value) return
  await store.deleteTag(deleteId.value)
  deleteId.value = null
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="overlay" role="presentation" @click.self="close">
        <section class="dialog" role="dialog" aria-modal="true" aria-label="管理标签" tabindex="-1">
          <header class="head">
            <h3 class="title">管理标签</h3>
            <button type="button" class="x" aria-label="关闭" @click="close">×</button>
          </header>

          <form class="form" @submit.prevent="submit">
            <label class="field">
              <span class="label">{{ renamingId ? '重命名标签' : '新增标签' }}</span>
              <div class="row">
                <input v-model="name" class="input" type="text" placeholder="例如：快手 / 下饭 / 早午餐" />
                <button type="submit" class="btn primary" :disabled="!canSubmit">
                  {{ renamingId ? '保存' : '新增' }}
                </button>
              </div>
              <button v-if="renamingId" type="button" class="link" @click="(renamingId = null), (name = '')">
                取消重命名
              </button>
            </label>
          </form>

          <div class="list">
            <div v-for="t in store.tags" :key="t.id" class="item">
              <span class="pill">{{ t.name }}</span>
              <div class="ops">
                <button type="button" class="btn ghost" @click="startRename(t.id, t.name)">改名</button>
                <button type="button" class="btn danger" @click="askDelete(t.id)">删除</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>

  <ConfirmDialog
    v-model:open="showDelete"
    title="删除标签？"
    message="删除后会自动从所有菜谱中移除该标签。此操作无法撤销。"
    confirm-text="删除"
    cancel-text="取消"
    @confirm="confirmDelete"
    @cancel="
      () => {
        showDelete = false
        deleteId = null
      }
    "
  />
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(31, 20, 12, 0.35);
  backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  padding:
    max(1.5rem, env(safe-area-inset-top, 0px))
    max(1.5rem, env(safe-area-inset-right, 0px))
    max(1.5rem, env(safe-area-inset-bottom, 0px))
    max(1.5rem, env(safe-area-inset-left, 0px));
  z-index: 40;
}

.dialog {
  width: min(640px, 100%);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-line);
  background: linear-gradient(180deg, rgba(255, 253, 248, 0.98), rgba(246, 240, 230, 0.92));
  box-shadow: 0 22px 70px rgba(31, 20, 12, 0.22);
  padding: 1.15rem 1.15rem 1.05rem;
}

.dialog:focus {
  outline: none;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.8rem;
}

.title {
  margin: 0;
  font-size: 1.15rem;
}

.x {
  border: 1px solid var(--color-line);
  background: rgba(255, 253, 248, 0.75);
  border-radius: 999px;
  width: 2.5rem;
  height: 2.5rem;
  cursor: pointer;
  color: var(--color-ink-muted);
  display: grid;
  place-items: center;
}

.field {
  display: grid;
  gap: 0.35rem;
}

.label {
  font-family: var(--font-display);
  font-weight: 600;
}

.row {
  display: flex;
  gap: 0.6rem;
  align-items: center;
}

.input {
  flex: 1 1 auto;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: 0.65rem 0.8rem;
  background: var(--color-bg-elevated);
}

.link {
  border: none;
  background: none;
  padding: 0;
  text-align: left;
  cursor: pointer;
  color: var(--color-accent);
  text-decoration: underline;
  text-underline-offset: 2px;
  font-size: 0.92rem;
}

.list {
  margin-top: 0.9rem;
  display: grid;
  gap: 0.55rem;
  max-height: min(52vh, 520px);
  overflow: auto;
  padding-right: 0.15rem;
}

.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  background: var(--color-bg-elevated);
  padding: 0.65rem 0.7rem;
}

.pill {
  font-family: var(--font-display);
  font-weight: 600;
}

.ops {
  display: flex;
  gap: 0.45rem;
}

.btn {
  height: 2.5rem;
  padding: 0 0.9rem;
  border-radius: 999px;
  cursor: pointer;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 0.9rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease,
    background 0.18s ease;
}

.btn:hover {
  transform: translateY(-1px);
}

.ghost {
  border: 1px solid var(--color-line);
  background: rgba(255, 253, 248, 0.75);
  color: var(--color-ink-muted);
}

.ghost:hover {
  border-color: rgba(196, 92, 62, 0.35);
  color: var(--color-accent);
  box-shadow: 0 10px 22px rgba(31, 20, 12, 0.08);
}

.primary {
  border: 1px solid transparent;
  background: var(--color-accent);
  color: #fffdf8;
  box-shadow: 0 4px 14px rgba(196, 92, 62, 0.28);
}

.primary:hover {
  box-shadow: 0 10px 26px rgba(196, 92, 62, 0.38);
}

.danger {
  border: 1px solid rgba(163, 51, 51, 0.25);
  background: rgba(163, 51, 51, 0.06);
  color: #a33;
}

.danger:hover {
  border-color: rgba(163, 51, 51, 0.4);
  box-shadow: 0 10px 22px rgba(31, 20, 12, 0.08);
}

/* reuse ConfirmDialog modal transition name */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.16s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-active .dialog,
.modal-leave-active .dialog {
  transition:
    transform 0.2s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.2s ease;
}
.modal-enter-from .dialog,
.modal-leave-to .dialog {
  transform: translateY(6px) scale(0.985);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .modal-enter-active,
  .modal-leave-active,
  .modal-enter-active .dialog,
  .modal-leave-active .dialog {
    transition: none;
  }
}
</style>

