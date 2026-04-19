import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { createId } from '@/lib/id'
import type { CookingRecord, PlanKind, Recipe, RecipeListFilter } from '@/types/recipe'

const STORAGE_KEY = 'recipe-kitchen-v1'

function nowIso(): string {
  return new Date().toISOString()
}

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
  const recipes = ref<Recipe[]>([])

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) recipes.value = JSON.parse(raw) as Recipe[]
    } catch {
      recipes.value = []
    }
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes.value))
  }

  load()

  watch(
    recipes,
    () => {
      persist()
    },
    { deep: true },
  )

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

  function addRecipe(payload: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt' | 'cookingRecords'>) {
    const t = nowIso()
    const r: Recipe = {
      ...payload,
      id: createId(),
      cookingRecords: [],
      createdAt: t,
      updatedAt: t,
    }
    recipes.value.unshift(r)
    return r.id
  }

  function updateRecipe(id: string, patch: Partial<Omit<Recipe, 'id' | 'createdAt'>>) {
    const idx = recipes.value.findIndex((x) => x.id === id)
    if (idx === -1) return
    const cur = recipes.value[idx]
    recipes.value[idx] = {
      ...cur,
      ...patch,
      id: cur.id,
      createdAt: cur.createdAt,
      updatedAt: nowIso(),
    }
  }

  function deleteRecipe(id: string) {
    recipes.value = recipes.value.filter((x) => x.id !== id)
  }

  function setCooked(id: string, cooked: boolean) {
    updateRecipe(id, { cooked })
  }

  function setPlan(id: string, planKind: PlanKind, planDate: string | null) {
    updateRecipe(id, {
      planKind,
      planDate: planKind === 'by_date' ? planDate : null,
    })
  }

  function addCookingRecord(
    recipeId: string,
    payload: Omit<CookingRecord, 'id' | 'recipeId' | 'createdAt'>,
  ) {
    const recipe = recipeById.value.get(recipeId)
    if (!recipe) return null
    const rec: CookingRecord = {
      ...payload,
      id: createId(),
      recipeId,
      createdAt: nowIso(),
    }
    const nextRecords = [rec, ...recipe.cookingRecords]
    updateRecipe(recipeId, { cookingRecords: nextRecords, cooked: true })
    return rec.id
  }

  function updateCookingRecord(
    recipeId: string,
    recordId: string,
    patch: Partial<Pick<CookingRecord, 'photos' | 'note' | 'cookedAt'>>,
  ) {
    const recipe = recipeById.value.get(recipeId)
    if (!recipe) return
    const next = recipe.cookingRecords.map((c) =>
      c.id === recordId ? { ...c, ...patch } : c,
    )
    updateRecipe(recipeId, { cookingRecords: next })
  }

  function deleteCookingRecord(recipeId: string, recordId: string) {
    const recipe = recipeById.value.get(recipeId)
    if (!recipe) return
    const next = recipe.cookingRecords.filter((c) => c.id !== recordId)
    updateRecipe(recipeId, { cookingRecords: next })
  }

  return {
    recipes,
    recipeById,
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
