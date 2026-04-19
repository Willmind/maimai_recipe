import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    {
      path: '/recipes/new',
      name: 'recipe-new',
      component: () => import('../views/RecipeFormView.vue'),
    },
    {
      path: '/recipes/:id',
      name: 'recipe-detail',
      component: () => import('../views/RecipeDetailView.vue'),
    },
    {
      path: '/recipes/:id/edit',
      name: 'recipe-edit',
      component: () => import('../views/RecipeFormView.vue'),
      props: true,
    },
    {
      path: '/recipes/:recipeId/records/new',
      name: 'record-new',
      component: () => import('../views/CookingRecordFormView.vue'),
      props: true,
    },
    {
      path: '/recipes/:recipeId/records/:recordId/edit',
      name: 'record-edit',
      component: () => import('../views/CookingRecordFormView.vue'),
      props: true,
    },
    {
      path: '/demo/supabase',
      name: 'demo-supabase',
      component: () => import('../views/DemoSupabaseView.vue'),
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
