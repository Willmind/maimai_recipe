export type DbPlanKind = 'none' | 'this_week' | 'by_date'

export interface DbRecipeRow {
  id: string // uuid
  title: string
  cover_image: string | null
  ingredients: string[] // jsonb array
  steps: string[] // jsonb array
  cooked: boolean
  plan_kind: DbPlanKind
  plan_date: string | null // date → 'YYYY-MM-DD'
  created_at: string // timestamptz ISO
  updated_at: string // timestamptz ISO
}

export interface DbCookingRecordRow {
  id: string // uuid
  recipe_id: string // uuid
  photos: string[] // jsonb array
  note: string
  cooked_at: string // timestamptz ISO
  created_at: string // timestamptz ISO
}

export interface DbTagRow {
  id: string // uuid
  name: string
  color: string | null
  created_at: string // timestamptz ISO
}

export interface DbRecipeTagRow {
  recipe_id: string // uuid
  tag_id: string // uuid
  created_at: string // timestamptz ISO
}

