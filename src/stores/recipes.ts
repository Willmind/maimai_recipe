import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import { createRecipesRepo } from '@/data/recipesRepo'
import type { CookingRecord, PlanKind, Recipe, RecipeListFilter, Tag } from '@/types/recipe'

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
  const recipeById = shallowRef(new Map<string, Recipe>())
  const indexById = shallowRef(new Map<string, number>())
  const tags = ref<Tag[]>([])
  const recipeTagIdsByRecipeId = shallowRef(new Map<string, string[]>())
  const loading = ref(false)
  const ready = ref(false)
  const error = ref<string | null>(null)

  function setRecipes(next: Recipe[]) {
    recipes.value = next
    const map = new Map<string, Recipe>()
    const idx = new Map<string, number>()
    for (let i = 0; i < next.length; i++) {
      const r = next[i]
      map.set(r.id, r)
      idx.set(r.id, i)
    }
    recipeById.value = map
    indexById.value = idx
  }

  function updateRecipeLocal(next: Recipe) {
    const i = indexById.value.get(next.id)
    if (i === undefined) return false
    recipes.value[i] = next
    const map = new Map(recipeById.value)
    map.set(next.id, next)
    recipeById.value = map
    return true
  }

  function removeRecipeLocal(id: string) {
    const i = indexById.value.get(id)
    if (i === undefined) return
    const nextList = recipes.value.filter((r) => r.id !== id)
    setRecipes(nextList)
  }

  function removeRecipesLocal(ids: string[]) {
    const set = new Set(ids)
    if (!set.size) return
    const nextList = recipes.value.filter((r) => !set.has(r.id))
    setRecipes(nextList)
    const relNext = new Map<string, string[]>()
    for (const [rid, t] of recipeTagIdsByRecipeId.value.entries()) {
      if (!set.has(rid)) relNext.set(rid, t)
    }
    recipeTagIdsByRecipeId.value = relNext
  }

  async function load() {
    loading.value = true
    error.value = null
    try {
      const list = await repo.listRecipes()
      setRecipes(list)
      tags.value = await repo.listTags()
      const rel = await repo.listRecipeTags(list.map((r) => r.id))
      const map = new Map<string, string[]>()
      for (const x of rel) map.set(x.recipe_id, [...(map.get(x.recipe_id) ?? []), x.tag_id])
      recipeTagIdsByRecipeId.value = map
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      setRecipes([])
      tags.value = []
      recipeTagIdsByRecipeId.value = new Map()
    } finally {
      loading.value = false
      ready.value = true
    }
  }

  // 启动时拉取一次
  void load()

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
    const list = await repo.listRecipes()
    setRecipes(list)
    tags.value = await repo.listTags()
    const rel = await repo.listRecipeTags(list.map((r) => r.id))
    const map = new Map<string, string[]>()
    for (const x of rel) map.set(x.recipe_id, [...(map.get(x.recipe_id) ?? []), x.tag_id])
    recipeTagIdsByRecipeId.value = map
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

  async function setTags(recipeId: string, tagIds: string[]) {
    loading.value = true
    error.value = null
    try {
      await repo.setRecipeTags(recipeId, tagIds)
      recipeTagIdsByRecipeId.value = new Map(recipeTagIdsByRecipeId.value).set(recipeId, Array.from(new Set(tagIds)))
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  async function createTag(name: string) {
    loading.value = true
    error.value = null
    try {
      const id = await repo.createTag(name)
      tags.value = await repo.listTags()
      return id
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      return null
    } finally {
      loading.value = false
    }
  }

  async function renameTag(tagId: string, name: string) {
    loading.value = true
    error.value = null
    try {
      await repo.renameTag(tagId, name)
      tags.value = await repo.listTags()
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  async function deleteTag(tagId: string) {
    loading.value = true
    error.value = null
    try {
      await repo.deleteTag(tagId)
      tags.value = await repo.listTags()
      // 清理本地关联缓存
      const next = new Map<string, string[]>()
      for (const [rid, ids] of recipeTagIdsByRecipeId.value.entries()) {
        next.set(
          rid,
          ids.filter((x) => x !== tagId),
        )
      }
      recipeTagIdsByRecipeId.value = next
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
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
      removeRecipeLocal(id)
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      console.error('deleteRecipe failed', e)
    } finally {
      loading.value = false
    }
  }

  async function deleteRecipes(ids: string[]) {
    loading.value = true
    error.value = null
    try {
      await repo.deleteRecipes(ids)
      removeRecipesLocal(ids)
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      console.error('deleteRecipes failed', e)
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

    // 计划切换是高频交互：先本地乐观更新，避免每次都 refresh 全量列表导致卡顿
    const prev = recipeById.value.get(id) ?? null
    if (prev) {
      updateRecipeLocal({
        ...prev,
        planKind,
        planDate: planKind === 'by_date' ? planDate : null,
        updatedAt: new Date().toISOString(),
      })
    }

    try {
      await repo.setPlan(id, planKind, planDate)
    } catch (e) {
      // 回滚乐观更新
      if (prev) updateRecipeLocal(prev)
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
    tags,
    recipeTagIdsByRecipeId,
    loading,
    ready,
    error,
    listFiltered,
    load,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    deleteRecipes,
    setCooked,
    setPlan,
    setTags,
    createTag,
    renameTag,
    deleteTag,
    addCookingRecord,
    updateCookingRecord,
    deleteCookingRecord,
  }
})
