import { getDb } from './database'
import type { AppSettings } from '../../shared/types/settings'
import { DEFAULT_SETTINGS } from '../../shared/types/settings'

export function getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
  const row = getDb()
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get(key) as { value: string } | undefined

  if (!row) return DEFAULT_SETTINGS[key]
  return JSON.parse(row.value) as AppSettings[K]
}

export function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
  getDb()
    .prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    .run(key, JSON.stringify(value))
}

export function getAllSettings(): AppSettings {
  const rows = getDb()
    .prepare('SELECT key, value FROM settings')
    .all() as Array<{ key: string; value: string }>

  const stored = Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value)]))
  return { ...DEFAULT_SETTINGS, ...stored } as AppSettings
}

export function updateSettings(partial: Partial<AppSettings>): void {
  const db = getDb()
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
  const transaction = db.transaction((updates: Partial<AppSettings>) => {
    for (const [key, value] of Object.entries(updates)) {
      upsert.run(key, JSON.stringify(value))
    }
  })
  transaction(partial)
}
