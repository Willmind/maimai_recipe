import { isSupabaseConfigured, supabase } from '@/lib/supabase'

// 必须与 Supabase Storage 里创建的 bucket 名完全一致
const BUCKET = 'maimaicaipu_recipeImages'

type ImageKind = 'cover' | 'record'

function extFromMime(mime: string): string {
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/png') return 'png'
  return 'jpg'
}

async function compressImage(
  file: File,
  opts: { maxSide: number; quality: number; mime: 'image/jpeg' | 'image/webp' },
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建 canvas 上下文')

  // createImageBitmap 在部分图片（常见：某些 iPhone 照片编码）上会解码失败；这里做 fallback。
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, opts.maxSide / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    canvas.width = w
    canvas.height = h
    ctx.drawImage(bitmap, 0, 0, w, h)
  } catch {
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.decoding = 'async'
      img.src = url
      await img.decode()
      const scale = Math.min(1, opts.maxSide / Math.max(img.naturalWidth, img.naturalHeight))
      const w = Math.max(1, Math.round(img.naturalWidth * scale))
      const h = Math.max(1, Math.round(img.naturalHeight * scale))
      canvas.width = w
      canvas.height = h
      ctx.drawImage(img, 0, 0, w, h)
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('图片压缩失败'))),
      opts.mime,
      opts.quality,
    )
  })
}

async function uploadToSupabaseStorage(file: File, folder: string, kind: ImageKind): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase 未配置，无法上传图片')
  }

  const preferWebp = true
  const mime: 'image/jpeg' | 'image/webp' = preferWebp ? 'image/webp' : 'image/jpeg'
  const maxSide = kind === 'cover' ? 1600 : 1920
  const quality = kind === 'cover' ? 0.8 : 0.78

  const blob = await compressImage(file, { maxSide, quality, mime })
  const ext = extFromMime(mime)
  const id = crypto.randomUUID()
  const path = `${folder}/${id}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: mime, upsert: false })
  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const url = data.publicUrl
  if (!url) throw new Error('无法获取图片 URL')
  return url
}

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result))
    fr.onerror = () => reject(fr.error)
    fr.readAsDataURL(file)
  })
}

/**
 * 在 local 模式：返回 dataURL（可存 localStorage）
 * 在 supabase 模式：上传到 Storage，返回 public URL（写入 DB）
 */
export async function filesToStoredUrls(
  files: FileList | File[],
  params: { folder: string; kind: ImageKind },
): Promise<string[]> {
  const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
  if (!list.length) return []

  if (isSupabaseConfigured && supabase) {
    const out: string[] = []
    for (const f of list) out.push(await uploadToSupabaseStorage(f, params.folder, params.kind))
    return out
  }

  const out: string[] = []
  for (const f of list) out.push(await fileToDataUrl(f))
  return out
}

