import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { createRecipesRepo } from '@/data/recipesRepo'
import type { CookingRecord, PlanKind, Recipe, RecipeListFilter } from '@/types/recipe'

function startOfWeekMonday(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function endOfWeekSunday(d: Date): Date {
  const mon = startOfWeekMonday(d)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  sun.setHours(23, 59, 59, 999)
  return sun
}

function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const useRecipeStore = defineStore('recipes', () => {
  const repo = createRecipesRepo()

  const recipes = ref<Recipe[]>([])
  const loading = ref(false)
  const ready = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      recipes.value = await repo.listRecipes()
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      recipes.value = []
    } finally {
      loading.value = false
      ready.value = true
    }
  }

  // 启动时拉取一次
  void load()

  const recipeById = computed(() => {
    const map = new Map<string, Recipe>()
    for (const r of recipes.value) map.set(r.id, r)
    return map
  })

  function listFiltered(filter: RecipeListFilter): Recipe[] {
    const today = new Date()
    const w0 = startOfWeekMonday(today)
    const w1 = endOfWeekSunday(today)
    return recipes.value.filter((r) => {
      if (filter === 'all') return true
      if (filter === 'not_cooked') return !r.cooked
      if (filter === 'cooked') return r.cooked
      if (filter === 'this_week') {
        if (r.planKind === 'this_week') return true
        if (r.planKind === 'by_date' && r.planDate) {
          const pd = parseYmd(r.planDate)
          return pd >= w0 && pd <= w1
        }
        return false
      }
      return true
    })
  }

  async function refresh() {
    recipes.value = await repo.listRecipes()
  }

  async function addRecipe(payload: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt' | 'cookingRecords'>) {
    loading.value = true
    error.value = null
    try {
      const id = await repo.createRecipe(payload)
      await refresh()
      return id
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateRecipe(id: string, patch: Partial<Omit<Recipe, 'id' | 'createdAt'>>) {
    loading.value = true
    error.value = null
    try {
      await repo.updateRecipe(id, patch)
      await refresh()
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  async function deleteRecipe(id: string) {
    loading.value = true
    error.value = null
    try {
      await repo.deleteRecipe(id)
      await refresh()
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  async function setCooked(id: string, cooked: boolean) {
    await updateRecipe(id, { cooked })
  }

  async function setPlan(id: string, planKind: PlanKind, planDate: string | null) {
    loading.value = true
    error.value = null
    try {
      await repo.setPlan(id, planKind, planDate)
      await refresh()
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  async function addCookingRecord(
    recipeId: string,
    payload: Omit<CookingRecord, 'id' | 'recipeId' | 'createdAt'>,
  ) {
    loading.value = true
    error.value = null
    try {
      const id = await repo.addCookingRecord(recipeId, payload)
      await refresh()
      return id
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateCookingRecord(
    recipeId: string,
    recordId: string,
    patch: Partial<Pick<CookingRecord, 'photos' | 'note' | 'cookedAt'>>,
  ) {
    loading.value = true
    error.value = null
    try {
      await repo.updateCookingRecord(recipeId, recordId, patch)
      await refresh()
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  async function deleteCookingRecord(recipeId: string, recordId: string) {
    loading.value = true
    error.value = null
    try {
      await repo.deleteCookingRecord(recipeId, recordId)
      await refresh()
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  return {
    repoMode: repo.mode,
    recipes,
    recipeById,
    loading,
    ready,
    error,
    listFiltered,
    load,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    setCooked,
    setPlan,
    addCookingRecord,
    updateCookingRecord,
    deleteCookingRecord,
  }
})
