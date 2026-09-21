const DB_NAME = 'plane.media.v1'
const LEGACY_DB_NAME = 'within.media.v1'
const STORE = 'images'

function openDb(name = DB_NAME, create = true): Promise<IDBDatabase | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1)
    request.onupgradeneeded = () => {
      if (!create) {
        request.transaction?.abort()
        resolve(null)
        return
      }
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      if (!create) resolve(null)
      else reject(request.error)
    }
  })
}

async function getImage(name: string, id: string, create = true): Promise<string | null> {
  try {
    const db = await openDb(name, create)
    if (!db) return null
    return await new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains(STORE)) {
        resolve(null)
        return
      }
      const tx = db.transaction(STORE, 'readonly')
      const request = tx.objectStore(STORE).get(id)
      request.onsuccess = () => resolve((request.result as string | undefined) ?? null)
      request.onerror = () => reject(request.error)
    })
  } catch {
    return null
  }
}

export async function saveReferenceImage(id: string, dataUrl: string): Promise<void> {
  const db = await openDb()
  if (!db) return
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(dataUrl, id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadReferenceImage(id: string): Promise<string | null> {
  return (await getImage(DB_NAME, id)) ?? (await getImage(LEGACY_DB_NAME, id, false))
}

export async function deleteReferenceImage(id: string): Promise<void> {
  const db = await openDb()
  if (!db) return
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export function readImageFile(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const dataUrl = String(reader.result)
      const image = new Image()
      image.onload = () => resolve({ dataUrl, width: image.naturalWidth, height: image.naturalHeight })
      image.onerror = () => reject(new Error('Could not read image'))
      image.src = dataUrl
    }
    reader.readAsDataURL(file)
  })
}
