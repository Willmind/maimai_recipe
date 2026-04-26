import type { SupabaseClient } from '@supabase/supabase-js'
import { createId } from '@/lib/id'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { CookingRecord, PlanKind, Recipe, Tag } from '@/types/recipe'
import type { DbCookingRecordRow, DbPlanKind, DbRecipeRow, DbRecipeTagRow, DbTagRow } from './supabaseTypes'

export type RepoMode = 'supabase' | 'local'

export interface RecipesRepo {
  mode: RepoMode

  listRecipes(): Promise<Recipe[]>
  getRecipe(id: string): Promise<Recipe | null>

  listTags(): Promise<Tag[]>
  listRecipeTags(recipeIds: string[]): Promise<DbRecipeTagRow[]>
  setRecipeTags(recipeId: string, tagIds: string[]): Promise<void>

  createTag(name: string): Promise<string>
  renameTag(tagId: string, name: string): Promise<void>
  deleteTag(tagId: string): Promise<void>

  createRecipe(payload: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt' | 'cookingRecords'>): Promise<string>
  updateRecipe(id: string, patch: Partial<Omit<Recipe, 'id' | 'createdAt'>>): Promise<void>
  deleteRecipe(id: string): Promise<void>
  deleteRecipes(ids: string[]): Promise<void>

  setCooked(id: string, cooked: boolean): Promise<void>
  setPlan(id: string, planKind: PlanKind, planDate: string | null): Promise<void>

  addCookingRecord(
    recipeId: string,
    payload: Omit<CookingRecord, 'id' | 'recipeId' | 'createdAt'>,
  ): Promise<string | null>
  updateCookingRecord(
    recipeId: string,
    recordId: string,
    patch: Partial<Pick<CookingRecord, 'photos' | 'note' | 'cookedAt'>>,
  ): Promise<void>
  deleteCookingRecord(recipeId: string, recordId: string): Promise<void>
}

const STORAGE_KEY = 'recipe-kitchen-v1'

function nowIso(): string {
  return new Date().toISOString()
}

function toDbPlanKind(k: PlanKind): DbPlanKind {
  return k
}

function fromDbPlanKind(k: DbPlanKind): PlanKind {
  return k
}

function recipeFromDb(row: DbRecipeRow, records: DbCookingRecordRow[]): Recipe {
  return {
    id: row.id,
    title: row.title,
    coverImage: row.cover_image,
    ingredients: row.ingredients ?? [],
    steps: row.steps ?? [],
    cooked: row.cooked,
    planKind: fromDbPlanKind(row.plan_kind),
    planDate: row.plan_date,
    cookingRecords: records.map((r) => ({
      id: r.id,
      recipeId: r.recipe_id,
      photos: r.photos ?? [],
      note: r.note ?? '',
      cookedAt: r.cooked_at,
      createdAt: r.created_at,
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function tagFromDb(row: DbTagRow): Tag {
  return { id: row.id, name: row.name, color: row.color, createdAt: row.created_at }
}

function safeParseRecipes(raw: string | null): Recipe[] {
  if (!raw) return []
  try {
    return JSON.parse(raw) as Recipe[]
  } catch {
    return []
  }
}

function createLocalStorageRepo(): RecipesRepo {
  async function listTags(): Promise<Tag[]> {
    return []
  }

  async function listRecipeTags(recipeIds: string[]): Promise<DbRecipeTagRow[]> {
    void recipeIds
    return []
  }

  async function setRecipeTags(recipeId: string, tagIds: string[]): Promise<void> {
    void recipeId
    void tagIds
    // local 模式不做 tags
  }

  async function createTag(name: string): Promise<string> {
    void name
    throw new Error('local 模式不支持标签维护')
  }

  async function renameTag(tagId: string, name: string): Promise<void> {
    void tagId
    void name
    throw new Error('local 模式不支持标签维护')
  }

  async function deleteTag(tagId: string): Promise<void> {
    void tagId
    throw new Error('local 模式不支持标签维护')
  }

  async function listRecipes(): Promise<Recipe[]> {
    return safeParseRecipes(localStorage.getItem(STORAGE_KEY))
  }

  async function getRecipe(id: string): Promise<Recipe | null> {
    const all = await listRecipes()
    return all.find((r) => r.id === id) ?? null
  }

  async function writeAll(next: Recipe[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  async function createRecipe(
    payload: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt' | 'cookingRecords'>,
  ): Promise<string> {
    const all = await listRecipes()
    const t = nowIso()
    const r: Recipe = {
      ...payload,
      id: createId(),
      cookingRecords: [],
      createdAt: t,
      updatedAt: t,
    }
    const next = [r, ...all]
    await writeAll(next)
    return r.id
  }

  async function updateRecipe(id: string, patch: Partial<Omit<Recipe, 'id' | 'createdAt'>>): Promise<void> {
    const all = await listRecipes()
    const idx = all.findIndex((x) => x.id === id)
    if (idx === -1) return
    const cur = all[idx]
    all[idx] = {
      ...cur,
      ...patch,
      id: cur.id,
      createdAt: cur.createdAt,
      updatedAt: nowIso(),
    }
    await writeAll(all)
  }

  async function deleteRecipe(id: string): Promise<void> {
    const all = await listRecipes()
    await writeAll(all.filter((x) => x.id !== id))
  }

  async function deleteRecipes(ids: string[]): Promise<void> {
    const set = new Set(ids)
    const all = await listRecipes()
    await writeAll(all.filter((x) => !set.has(x.id)))
  }

  async function setCooked(id: string, cooked: boolean): Promise<void> {
    await updateRecipe(id, { cooked })
  }

  async function setPlan(id: string, planKind: PlanKind, planDate: string | null): Promise<void> {
    await updateRecipe(id, { planKind, planDate: planKind === 'by_date' ? planDate : null })
  }

  async function addCookingRecord(
    recipeId: string,
    payload: Omit<CookingRecord, 'id' | 'recipeId' | 'createdAt'>,
  ): Promise<string | null> {
    const all = await listRecipes()
    const idx = all.findIndex((x) => x.id === recipeId)
    if (idx === -1) return null
    const cur = all[idx]
    const rec: CookingRecord = {
      ...payload,
      id: createId(),
      recipeId,
      createdAt: nowIso(),
    }
    all[idx] = {
      ...cur,
      cookingRecords: [rec, ...cur.cookingRecords],
      cooked: true,
      updatedAt: nowIso(),
    }
    await writeAll(all)
    return rec.id
  }

  async function updateCookingRecord(
    recipeId: string,
    recordId: string,
    patch: Partial<Pick<CookingRecord, 'photos' | 'note' | 'cookedAt'>>,
  ): Promise<void> {
    const all = await listRecipes()
    const idx = all.findIndex((x) => x.id === recipeId)
    if (idx === -1) return
    const cur = all[idx]
    all[idx] = {
      ...cur,
      cookingRecords: cur.cookingRecords.map((c) => (c.id === recordId ? { ...c, ...patch } : c)),
      updatedAt: nowIso(),
    }
    await writeAll(all)
  }

  async function deleteCookingRecord(recipeId: string, recordId: string): Promise<void> {
    const all = await listRecipes()
    const idx = all.findIndex((x) => x.id === recipeId)
    if (idx === -1) return
    const cur = all[idx]
    all[idx] = {
      ...cur,
      cookingRecords: cur.cookingRecords.filter((c) => c.id !== recordId),
      updatedAt: nowIso(),
    }
    await writeAll(all)
  }

  return {
    mode: 'local',
    listTags,
    listRecipeTags,
    setRecipeTags,
    createTag,
    renameTag,
    deleteTag,
    listRecipes,
    getRecipe,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    deleteRecipes,
    setCooked,
    setPlan,
    addCookingRecord,
    updateCookingRecord,
    deleteCookingRecord,
  }
}

function createSupabaseRepo(client: SupabaseClient): RecipesRepo {
  async function listTags(): Promise<Tag[]> {
    const { data, error } = await client.from('tags').select('*').order('name', { ascending: true })
    if (error) throw error
    return ((data ?? []) as DbTagRow[]).map(tagFromDb)
  }

  async function listRecipeTags(recipeIds: string[]): Promise<DbRecipeTagRow[]> {
    if (!recipeIds.length) return []
    const { data, error } = await client
      .from('recipe_tags')
      .select('recipe_id,tag_id,created_at')
      .in('recipe_id', recipeIds)
    if (error) throw error
    return (data ?? []) as DbRecipeTagRow[]
  }

  async function setRecipeTags(recipeId: string, tagIds: string[]): Promise<void> {
    const { error: e0 } = await client.from('recipe_tags').delete().eq('recipe_id', recipeId)
    if (e0) throw e0

    const uniq = Array.from(new Set(tagIds)).filter(Boolean)
    if (!uniq.length) return

    const { error: e1 } = await client.from('recipe_tags').insert(uniq.map((tid) => ({ recipe_id: recipeId, tag_id: tid })))
    if (e1) throw e1
  }

  async function createTag(name: string): Promise<string> {
    const { data, error } = await client.from('tags').insert({ name: name.trim() }).select('id').single()
    if (error) throw error
    return String((data as { id: string }).id)
  }

  async function renameTag(tagId: string, name: string): Promise<void> {
    const { error } = await client.from('tags').update({ name: name.trim() }).eq('id', tagId)
    if (error) throw error
  }

  async function deleteTag(tagId: string): Promise<void> {
    const { error } = await client.from('tags').delete().eq('id', tagId)
    if (error) throw error
  }

  async function listRecipes(): Promise<Recipe[]> {
    const { data: recipes, error: e0 } = await client
      .from('recipes')
      .select('*')
      .order('updated_at', { ascending: false })
    if (e0) throw e0
    const rows = (recipes ?? []) as DbRecipeRow[]
    const ids = rows.map((r) => r.id)
    if (!ids.length) return []

    const { data: recs, error: e1 } = await client
      .from('cooking_records')
      .select('*')
      .in('recipe_id', ids)
      .order('cooked_at', { ascending: false })
    if (e1) throw e1

    const byRecipe = new Map<string, DbCookingRecordRow[]>()
    for (const r of ((recs ?? []) as DbCookingRecordRow[])) {
      const list = byRecipe.get(r.recipe_id) ?? []
      list.push(r)
      byRecipe.set(r.recipe_id, list)
    }

    return rows.map((r) => recipeFromDb(r, byRecipe.get(r.id) ?? []))
  }

  async function getRecipe(id: string): Promise<Recipe | null> {
    const { data: row, error: e0 } = await client.from('recipes').select('*').eq('id', id).single()
    if (e0) return null
    const recipeRow = row as DbRecipeRow

    const { data: recs, error: e1 } = await client
      .from('cooking_records')
      .select('*')
      .eq('recipe_id', id)
      .order('cooked_at', { ascending: false })
    if (e1) throw e1

    return recipeFromDb(recipeRow, (recs ?? []) as DbCookingRecordRow[])
  }

  async function createRecipe(
    payload: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt' | 'cookingRecords'>,
  ): Promise<string> {
    const plan_kind = toDbPlanKind(payload.planKind)
    const plan_date = payload.planKind === 'by_date' ? payload.planDate : null

    const { data, error } = await client
      .from('recipes')
      .insert({
        title: payload.title,
        cover_image: payload.coverImage,
        ingredients: payload.ingredients,
        steps: payload.steps,
        cooked: payload.cooked,
        plan_kind,
        plan_date,
      })
      .select('id')
      .single()
    if (error) throw error
    return String((data as { id: string }).id)
  }

  async function updateRecipe(id: string, patch: Partial<Omit<Recipe, 'id' | 'createdAt'>>): Promise<void> {
    const next: Record<string, unknown> = {}
    if (patch.title !== undefined) next.title = patch.title
    if (patch.coverImage !== undefined) next.cover_image = patch.coverImage
    if (patch.ingredients !== undefined) next.ingredients = patch.ingredients
    if (patch.steps !== undefined) next.steps = patch.steps
    if (patch.cooked !== undefined) next.cooked = patch.cooked
    if (patch.planKind !== undefined) next.plan_kind = toDbPlanKind(patch.planKind)
    if (patch.planDate !== undefined) next.plan_date = patch.planKind === 'by_date' ? patch.planDate : null
    if ((patch as Partial<Recipe>).cookingRecords !== undefined) {
      // cookingRecords 在 DB 中是子表，此处忽略
    }

    const { error } = await client.from('recipes').update(next).eq('id', id)
    if (error) throw error
  }

  async function deleteRecipe(id: string): Promise<void> {
    // 若 DB 外键未设置 ON DELETE CASCADE，需先删子表再删 recipes
    const { error: e0 } = await client.from('cooking_records').delete().eq('recipe_id', id)
    if (e0) throw e0

    const { error } = await client.from('recipes').delete().eq('id', id)
    if (error) throw error
  }

  async function deleteRecipes(ids: string[]): Promise<void> {
    const uniq = Array.from(new Set(ids)).filter(Boolean)
    if (!uniq.length) return

    const { error: e0 } = await client.from('cooking_records').delete().in('recipe_id', uniq)
    if (e0) throw e0

    const { error } = await client.from('recipes').delete().in('id', uniq)
    if (error) throw error
  }

  async function setCooked(id: string, cooked: boolean): Promise<void> {
    await updateRecipe(id, { cooked })
  }

  async function setPlan(id: string, planKind: PlanKind, planDate: string | null): Promise<void> {
    const { error } = await client
      .from('recipes')
      .update({
        plan_kind: toDbPlanKind(planKind),
        plan_date: planKind === 'by_date' ? planDate : null,
      })
      .eq('id', id)
    if (error) throw error
  }

  async function addCookingRecord(
    recipeId: string,
    payload: Omit<CookingRecord, 'id' | 'recipeId' | 'createdAt'>,
  ): Promise<string | null> {
    const { data, error } = await client
      .from('cooking_records')
      .insert({
        recipe_id: recipeId,
        photos: payload.photos,
        note: payload.note,
        cooked_at: payload.cookedAt,
      })
      .select('id')
      .single()
    if (error) throw error

    // 保持与现有 UI 一致：只要有记录就标记 cooked=true
    await setCooked(recipeId, true)

    return String((data as { id: string }).id)
  }

  async function updateCookingRecord(
    _recipeId: string,
    recordId: string,
    patch: Partial<Pick<CookingRecord, 'photos' | 'note' | 'cookedAt'>>,
  ): Promise<void> {
    const next: Record<string, unknown> = {}
    if (patch.photos !== undefined) next.photos = patch.photos
    if (patch.note !== undefined) next.note = patch.note
    if (patch.cookedAt !== undefined) next.cooked_at = patch.cookedAt

    const { error } = await client.from('cooking_records').update(next).eq('id', recordId)
    if (error) throw error
  }

  async function deleteCookingRecord(_recipeId: string, recordId: string): Promise<void> {
    const { error } = await client.from('cooking_records').delete().eq('id', recordId)
    if (error) throw error
  }

  return {
    mode: 'supabase',
    listTags,
    listRecipeTags,
    setRecipeTags,
    createTag,
    renameTag,
    deleteTag,
    listRecipes,
    getRecipe,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    deleteRecipes,
    setCooked,
    setPlan,
    addCookingRecord,
    updateCookingRecord,
    deleteCookingRecord,
  }
}

export function createRecipesRepo(): RecipesRepo {
  if (isSupabaseConfigured && supabase) return createSupabaseRepo(supabase)
  return createLocalStorageRepo()
}

