<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

/** 与 supabase/demo_hello.sql 中的表名一致 */
const TABLE = 'demo_hello'

const loading = ref(false)
const lastError = ref<string | null>(null)
const rows = ref<unknown[] | null>(null)

async function fetchRows() {
  lastError.value = null
  rows.value = null
  if (!supabase) {
    lastError.value = '未配置 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY（检查 .env 后重启 dev）'
    return
  }
  loading.value = true
  try {
    const { data, error } = await supabase.from(TABLE).select('*').order('created_at', { ascending: false })
    if (error) {
      lastError.value = error.message
      return
    }
    rows.value = data ?? []
  } finally {
    loading.value = false
  }
}

async function insertDemoRow() {
  lastError.value = null
  if (!supabase) {
    lastError.value = 'Supabase 未配置'
    return
  }
  loading.value = true
  try {
    const { error } = await supabase.from(TABLE).insert({
      message: `来自网页的测试写入 · ${new Date().toLocaleString('zh-CN')}`,
    })
    if (error) {
      lastError.value = error.message
      return
    }
    await fetchRows()
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page">
    <header class="head">
      <h1>Supabase 连接演示</h1>
      <p class="sub">表名：<code>{{ TABLE }}</code>（需先在控制台执行仓库里的 SQL）</p>
    </header>

    <section class="panel">
      <p class="row">
        <span class="label">环境</span>
        <span :class="isSupabaseConfigured ? 'ok' : 'bad'">
          {{ isSupabaseConfigured ? '已配置客户端' : '未检测到环境变量' }}
        </span>
      </p>

      <div class="actions">
        <button type="button" class="primary" :disabled="loading || !isSupabaseConfigured" @click="fetchRows">
          {{ loading ? '请求中…' : '拉取 demo 表' }}
        </button>
        <button type="button" class="ghost" :disabled="loading || !isSupabaseConfigured" @click="insertDemoRow">
          插入一行测试数据
        </button>
      </div>

      <p v-if="lastError" class="err">错误：{{ lastError }}</p>

      <div v-if="rows !== null" class="out">
        <h2>查询结果</h2>
        <pre>{{ JSON.stringify(rows, null, 2) }}</pre>
      </div>
    </section>

    <p class="back">
      <RouterLink to="/">← 返回首页</RouterLink>
    </p>
  </div>
</template>

<style scoped>
.page {
  max-width: 640px;
  margin: 0 auto;
  padding-bottom: 2rem;
}

.head h1 {
  margin: 0 0 0.35rem;
  font-size: 1.75rem;
}

.sub {
  margin: 0;
  color: var(--color-ink-muted);
  font-size: 0.95rem;
}

code {
  font-size: 0.88em;
  padding: 0.1rem 0.35rem;
  border-radius: var(--radius-sm);
  background: rgba(31, 20, 12, 0.06);
}

.panel {
  margin-top: 1.5rem;
  padding: 1.25rem 1.35rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  background: var(--color-bg-elevated);
}

.row {
  margin: 0 0 1rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.label {
  font-weight: 600;
  font-family: var(--font-display);
}

.ok {
  color: var(--color-olive);
  font-weight: 600;
}

.bad {
  color: var(--color-accent);
  font-weight: 600;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.primary {
  cursor: pointer;
  border: none;
  border-radius: 999px;
  padding: 0.5rem 1.1rem;
  background: var(--color-accent);
  color: #fffdf8;
  font-family: var(--font-display);
  font-weight: 600;
}

.primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.ghost {
  cursor: pointer;
  border: 1px solid var(--color-line);
  background: transparent;
  border-radius: 999px;
  padding: 0.45rem 1rem;
  color: var(--color-ink-muted);
}

.ghost:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.err {
  margin: 1rem 0 0;
  color: #a33;
  font-size: 0.92rem;
}

.out {
  margin-top: 1.25rem;
}

.out h2 {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
}

pre {
  margin: 0;
  padding: 0.85rem 1rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-line);
  background: rgba(255, 253, 248, 0.85);
  font-size: 0.82rem;
  overflow: auto;
  max-height: 22rem;
}

.back {
  margin-top: 2rem;
}

.back a {
  color: var(--color-accent);
}
</style>
