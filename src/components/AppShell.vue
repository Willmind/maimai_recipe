<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="shell">
    <header class="top">
      <RouterLink to="/" class="brand">
        <span class="brand-mark" aria-hidden="true" />
        <span class="brand-text">
          <span class="brand-title">麦麦手记</span>
          <span class="brand-sub">菜谱 · 计划 · 做饭记录</span>
        </span>
      </RouterLink>
      <nav class="nav">
        <RouterLink to="/" class="nav-link">全部菜谱</RouterLink>
        <RouterLink to="/recipes/new" class="nav-cta">新建菜谱</RouterLink>
      </nav>
    </header>
    <main class="main">
      <slot />
    </main>
    <footer class="foot">数据保存在本机浏览器（localStorage）。</footer>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.1rem var(--space-page);
  border-bottom: 1px solid var(--color-line);
  background: linear-gradient(180deg, rgba(255, 253, 248, 0.94), rgba(246, 240, 230, 0.6));
  backdrop-filter: blur(8px);
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  color: inherit;
}

.brand-mark {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 12px;
  background: radial-gradient(circle at 30% 25%, #f4e8d4, #c45c3e 42%, #3d2914);
  box-shadow: 0 6px 18px var(--color-warm-shadow);
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.brand-title {
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 700;
}

.brand-sub {
  font-size: 0.85rem;
  color: var(--color-ink-muted);
}

.nav {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.nav-link {
  padding: 0.45rem 0.75rem;
  border-radius: var(--radius-sm);
  color: var(--color-ink-muted);
  text-decoration: none;
  font-size: 0.95rem;
}

.nav-link.router-link-active {
  color: var(--color-ink);
  background: rgba(31, 20, 12, 0.06);
}

.nav-cta {
  padding: 0.5rem 1rem;
  border-radius: 999px;
  background: var(--color-accent);
  color: #fffdf8;
  text-decoration: none;
  font-size: 0.92rem;
  font-family: var(--font-display);
  font-weight: 600;
  box-shadow: 0 4px 14px rgba(196, 92, 62, 0.35);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.nav-cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 22px rgba(196, 92, 62, 0.4);
}

.main {
  flex: 1;
  padding: var(--space-page);
  max-width: 960px;
  width: 100%;
  margin: 0 auto;
}

.foot {
  padding: 1rem var(--space-page) 1.5rem;
  font-size: 0.82rem;
  color: var(--color-ink-muted);
  text-align: center;
}
</style>
