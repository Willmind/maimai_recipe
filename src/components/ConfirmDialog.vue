<script setup lang="ts">
withDefaults(
  defineProps<{
    open: boolean
    title?: string
    message?: string
    confirmText?: string
    cancelText?: string
  }>(),
  {
    title: '确认',
    message: '',
    confirmText: '确定',
    cancelText: '取消',
  },
)

const emit = defineEmits<{
  confirm: []
  cancel: []
  'update:open': [open: boolean]
}>()

function close() {
  emit('update:open', false)
}

function onCancel() {
  emit('cancel')
  close()
}

function onConfirm() {
  emit('confirm')
  close()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="overlay" role="presentation" @click.self="onCancel">
        <section
          class="dialog"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          tabindex="-1"
          @keydown.esc.prevent="onCancel"
        >
          <h3 class="title">{{ title }}</h3>
          <p v-if="message" class="msg">{{ message }}</p>
          <div class="actions">
            <button type="button" class="btn ghost" @click="onCancel">{{ cancelText }}</button>
            <button type="button" class="btn primary" @click="onConfirm">{{ confirmText }}</button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
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
  z-index: 50;
}

.dialog {
  width: min(520px, 100%);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-line);
  background: linear-gradient(180deg, rgba(255, 253, 248, 0.98), rgba(246, 240, 230, 0.92));
  box-shadow: 0 22px 70px rgba(31, 20, 12, 0.22);
  padding: 1.15rem 1.15rem 1.05rem;
}

.dialog:focus {
  outline: none;
}

.title {
  margin: 0;
  font-size: 1.15rem;
}

.msg {
  margin: 0.55rem 0 0;
  color: var(--color-ink-muted);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 1rem;
}

.btn {
  min-height: 2.75rem;
  border-radius: 999px;
  padding: 0.55rem 1.15rem;
  font-family: var(--font-display);
  font-weight: 600;
  cursor: pointer;
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
  background: rgba(255, 253, 248, 0.7);
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

/* enter/leave */
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

