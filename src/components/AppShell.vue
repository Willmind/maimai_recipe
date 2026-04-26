<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()
const showAllRecipesLink = computed(() => route.name !== 'home')
const showNewRecipeLink = computed(() => route.name !== 'recipe-new')
</script>

<template>
  <div class="shell">
    <header class="top">
      <RouterLink to="/" class="brand">
        <span class="brand-mark" aria-hidden="true">
          <svg class="brand-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
            <g
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                class="brand-icon-steam"
                d="M8.5 5.5c.5.9.2 1.8-.3 2.5M12 4c.6 1.2.3 2.4-.2 3.2M15.5 5.5c.5.9.2 1.8-.3 2.5"
              />
              <path d="M5 11h14" />
              <path d="M5 11v1c0 3.5 2.8 6.5 7 6.5s7-3 7-6.5v-1" />
              <path d="M7 18v2.5A1.5 1.5 0 0 0 8.5 22h7a1.5 1.5 0 0 0 1.5-1.5V18" />
            </g>
          </svg>
        </span>
        <span class="brand-text">
          <span class="brand-title">麦麦手记</span>
          <span class="brand-sub">菜谱 · 计划 · 做饭记录</span>
        </span>
      </RouterLink>
      <nav class="nav">
        <RouterLink v-if="showAllRecipesLink" to="/" class="nav-link">全部菜谱</RouterLink>
        <RouterLink v-if="showNewRecipeLink" to="/recipes/new" class="nav-cta">新建菜谱</RouterLink>
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
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 12px;
  color: var(--color-accent);
  background: linear-gradient(145deg, rgba(244, 232, 212, 0.95), rgba(196, 92, 62, 0.18));
  box-shadow: 0 6px 18px var(--color-warm-shadow);
}

.brand-icon {
  width: 1.55rem;
  height: 1.55rem;
}

.brand-icon-steam {
  opacity: 0.65;
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
  min-height: 2.75rem;
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  border: 1px solid var(--color-line);
  background: var(--color-bg-elevated);
  color: var(--color-ink-muted);
  text-decoration: none;
  font-size: 0.92rem;
  font-family: var(--font-display);
  font-weight: 600;
  transition:
    border-color 0.18s ease,
    color 0.18s ease,
    box-shadow 0.18s ease;
}

.nav-link:hover {
  border-color: rgba(196, 92, 62, 0.35);
  color: var(--color-accent);
}

.nav-link.router-link-active {
  color: var(--color-accent);
  border-color: rgba(196, 92, 62, 0.45);
  background: var(--color-accent-soft);
  box-shadow: 0 2px 10px rgba(196, 92, 62, 0.12);
}

.nav-cta {
  min-height: 2.75rem;
  display: inline-flex;
  align-items: center;
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

@media (max-width: 640px) {
  .top {
    gap: 0.75rem;
    padding-top: 0.9rem;
    padding-bottom: 0.9rem;
  }

  .brand {
    min-width: 0;
    flex: 1 1 auto;
  }

  .brand-title {
    font-size: 1.2rem;
  }

  .brand-sub {
    display: none;
  }

  .nav {
    gap: 0.5rem;
    flex: 0 0 auto;
  }

  .nav-link,
  .nav-cta {
    padding-inline: 0.85rem;
    font-size: 0.88rem;
  }
}
</style>
