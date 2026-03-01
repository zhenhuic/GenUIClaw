import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import log from 'electron-log'
import type { SkillConfig } from '../../shared/types/settings'
import { getSetting, setSetting } from './settings'

const SKILL_FILE = 'SKILL.md'

function getBuiltinSkillsDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'skills')
  }
  return path.join(app.getAppPath(), 'skills')
}

function getUserSkillsDir(): string {
  const dir = path.join(app.getPath('userData'), 'skills')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

function readSkillsFromDir(dir: string, source: 'builtin' | 'user'): Omit<SkillConfig, 'enabled'>[] {
  if (!fs.existsSync(dir)) return []

  const skills: Omit<SkillConfig, 'enabled'>[] = []

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const skillDir = path.join(dir, entry.name)
      const skillFile = path.join(skillDir, SKILL_FILE)

      if (!fs.existsSync(skillFile)) continue

      try {
        const content = fs.readFileSync(skillFile, 'utf8').trim()
        if (!content) continue

        const name = extractSkillName(content, entry.name)

        skills.push({
          id: `${source}:${entry.name}`,
          name,
          content,
          source,
        })
      } catch (err) {
        log.warn(`[Skills] Failed to read ${skillFile}:`, err)
      }
    }
  } catch (err) {
    log.error(`[Skills] Failed to scan directory ${dir}:`, err)
  }

  return skills
}

function extractSkillName(content: string, fallback: string): string {
  const match = content.match(/^#\s+(.+)$/m)
  if (match) return match[1].trim()
  return fallback
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function getSkillStates(): Record<string, boolean> {
  return (getSetting('skillStates') as Record<string, boolean>) || {}
}

function setSkillStates(states: Record<string, boolean>): void {
  setSetting('skillStates', states)
}

export function listAllSkills(): SkillConfig[] {
  const builtinDir = getBuiltinSkillsDir()
  const userDir = getUserSkillsDir()

  const builtinRaw = readSkillsFromDir(builtinDir, 'builtin')
  const userRaw = readSkillsFromDir(userDir, 'user')

  const states = getSkillStates()

  return [...builtinRaw, ...userRaw].map((s) => ({
    ...s,
    enabled: states[s.id] ?? true,
  }))
}

export function getSkillById(id: string): SkillConfig | null {
  return listAllSkills().find((s) => s.id === id) ?? null
}

export function saveUserSkill(name: string, content: string): SkillConfig {
  const dirName = name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '')
    || `skill-${Date.now()}`

  const userDir = getUserSkillsDir()
  const skillDir = path.join(userDir, dirName)

  fs.mkdirSync(skillDir, { recursive: true })
  fs.writeFileSync(path.join(skillDir, SKILL_FILE), content, 'utf8')

  const id = `user:${dirName}`
  const states = getSkillStates()
  states[id] = true
  setSkillStates(states)

  log.info(`[Skills] Saved user skill: ${name} → ${skillDir}`)

  return {
    id,
    name: extractSkillName(content, dirName),
    content,
    enabled: true,
    source: 'user',
  }
}

export function updateUserSkill(id: string, name: string, content: string): SkillConfig | null {
  const prefix = 'user:'
  if (!id.startsWith(prefix)) return null

  const dirName = id.slice(prefix.length)
  const userDir = getUserSkillsDir()
  const skillDir = path.join(userDir, dirName)

  if (!fs.existsSync(skillDir)) return null

  fs.writeFileSync(path.join(skillDir, SKILL_FILE), content, 'utf8')

  const states = getSkillStates()
  log.info(`[Skills] Updated user skill: ${id}`)

  return {
    id,
    name: extractSkillName(content, dirName),
    content,
    enabled: states[id] ?? true,
    source: 'user',
  }
}

export function deleteUserSkill(id: string): boolean {
  const prefix = 'user:'
  if (!id.startsWith(prefix)) return false

  const dirName = id.slice(prefix.length)
  const userDir = getUserSkillsDir()
  const skillDir = path.join(userDir, dirName)

  if (!fs.existsSync(skillDir)) return false

  fs.rmSync(skillDir, { recursive: true, force: true })

  const states = getSkillStates()
  delete states[id]
  setSkillStates(states)

  log.info(`[Skills] Deleted user skill: ${id}`)
  return true
}

export function toggleSkillEnabled(id: string): boolean {
  const states = getSkillStates()
  const current = states[id] ?? true
  states[id] = !current
  setSkillStates(states)
  return !current
}
