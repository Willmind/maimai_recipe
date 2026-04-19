/** 计划类型：无 / 本周要做 / 指定日期 */
export type PlanKind = 'none' | 'this_week' | 'by_date'

export interface CookingRecord {
  id: string
  recipeId: string
  /** 实拍图，浏览器内使用 data URL 持久化 */
  photos: string[]
  note: string
  /** 做饭日期（用户可选） */
  cookedAt: string
  createdAt: string
}

export interface Recipe {
  id: string
  title: string
  coverImage: string | null
  ingredients: string[]
  steps: string[]
  /** 是否已做过这道菜（独立于记录，用于快速筛选） */
  cooked: boolean
  planKind: PlanKind
  /** planKind 为 by_date 时使用 ISO 日期 yyyy-mm-dd */
  planDate: string | null
  cookingRecords: CookingRecord[]
  createdAt: string
  updatedAt: string
}

export type RecipeListFilter = 'all' | 'this_week' | 'not_cooked' | 'cooked'
