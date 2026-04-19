import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

/** 是否已配置环境变量（未配置时客户端为 null，应用可继续仅用 localStorage） */
export const isSupabaseConfigured = Boolean(url && key)

/** 浏览器端 Supabase 客户端；未配置时为 null */
export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key) : null
