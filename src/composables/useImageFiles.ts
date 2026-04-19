/** 将用户选择的图片文件读为 data URL（便于 localStorage 持久化） */
export async function filesToDataUrls(files: FileList | File[]): Promise<string[]> {
  const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
  const readers = list.map(
    (file) =>
      new Promise<string>((resolve, reject) => {
        const fr = new FileReader()
        fr.onload = () => resolve(String(fr.result))
        fr.onerror = () => reject(fr.error)
        fr.readAsDataURL(file)
      }),
  )
  return Promise.all(readers)
}
