import { ipcMain, dialog } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels'
import {
  listAllSkills,
  saveUserSkill,
  updateUserSkill,
  deleteUserSkill,
  toggleSkillEnabled,
} from '../storage/skills'
import AdmZip from 'adm-zip'
import path from 'path'
import log from 'electron-log'

const TEXT_EXTENSIONS = new Set(['.md', '.txt', '.markdown', '.text', '.prompt'])
const PRIORITY_FILES = ['SKILL.md', 'skill.md', 'README.md', 'readme.md', 'index.md']

export function registerSkillsHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SKILLS_LIST, async () => {
    try {
      return { data: listAllSkills() }
    } catch (err) {
      log.error('[IPC] skills:list error:', err)
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.SKILLS_SAVE, async (_event, payload: { name: string; content: string }) => {
    try {
      const skill = saveUserSkill(payload.name, payload.content)
      return { data: skill }
    } catch (err) {
      log.error('[IPC] skills:save error:', err)
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.SKILLS_UPDATE, async (_event, payload: { id: string; name: string; content: string }) => {
    try {
      const skill = updateUserSkill(payload.id, payload.name, payload.content)
      if (!skill) return { error: 'Skill not found or not a user skill' }
      return { data: skill }
    } catch (err) {
      log.error('[IPC] skills:update error:', err)
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.SKILLS_DELETE, async (_event, payload: { id: string }) => {
    try {
      const ok = deleteUserSkill(payload.id)
      if (!ok) return { error: 'Skill not found or not a user skill' }
      return { data: undefined }
    } catch (err) {
      log.error('[IPC] skills:delete error:', err)
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.SKILLS_TOGGLE, async (_event, payload: { id: string }) => {
    try {
      const enabled = toggleSkillEnabled(payload.id)
      return { data: { enabled } }
    } catch (err) {
      log.error('[IPC] skills:toggle error:', err)
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.SKILLS_IMPORT, async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Import Skills',
        filters: [{ name: 'Zip Archives', extensions: ['zip'] }],
        properties: ['openFile', 'multiSelections'],
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { data: [] }
      }

      const imported = []

      for (const filePath of result.filePaths) {
        try {
          const zip = new AdmZip(filePath)
          const entries = zip.getEntries()

          const textEntries = entries.filter((entry) => {
            if (entry.isDirectory) return false
            const ext = path.extname(entry.entryName).toLowerCase()
            return TEXT_EXTENSIONS.has(ext)
          })

          if (textEntries.length === 0) {
            log.warn(`[Skills] No text files found in ${filePath}`)
            continue
          }

          const priorityEntry = textEntries.find((e) => {
            const basename = path.basename(e.entryName)
            return PRIORITY_FILES.includes(basename)
          })

          let content: string
          if (priorityEntry) {
            content = priorityEntry.getData().toString('utf8')
          } else {
            content = textEntries
              .map((e) => e.getData().toString('utf8'))
              .join('\n\n---\n\n')
          }

          const zipBaseName = path.basename(filePath, '.zip')
          const skill = saveUserSkill(zipBaseName, content.trim())
          imported.push(skill)
        } catch (err) {
          log.error(`[Skills] Failed to parse zip ${filePath}:`, err)
        }
      }

      return { data: imported }
    } catch (err) {
      log.error('[IPC] skills:import error:', err)
      return { error: (err as Error).message }
    }
  })
}
