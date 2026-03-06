import { Agent } from '@mariozechner/pi-agent-core'
import type { AgentEvent } from '@mariozechner/pi-agent-core'
import type { Model } from '@mariozechner/pi-ai'
import log from 'electron-log'
import type { TransportSender } from '../remote/transport'
import { ElectronTransportSender } from '../remote/transport'
import type { IpcAgentEvent } from '../../shared/types/ipc'
import type { MessageContentBlock } from '../../shared/types/conversation'
import type { McpServerConfig as AppMcpServerConfig, ModelConfig, SkillConfig } from '../../shared/types/settings'
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels'
import { AbortRegistry } from './abort-controller'
import { processAgentEvent } from './message-processor'
import { buildAgentTools } from './tools'
import { openUIWindow } from '../ui-window'
import { getSetting } from '../storage/settings'
import { listAllSkills } from '../storage/skills'
import { saveMessage } from '../storage/messages'
import { normalizeSchema } from './schema-normalizer'

export interface AgentRunOptions {
  sessionId: string
  prompt: string
  conversationId: string
  allowedTools: string[]
  mcpServers: Record<string, AppMcpServerConfig>
  cwd?: string
  systemPrompt?: string
  sender: TransportSender
  modelId?: string
  skillIds?: string[]
}

/** 将 pi-ai AssistantMessage 的 content 转为持久化用的 MessageContentBlock[] */
function assistantContentToBlocks(
  content: Array<{ type: string; text?: string; thinking?: string; id?: string; name?: string; arguments?: Record<string, unknown> }>
): MessageContentBlock[] {
  const blocks: MessageContentBlock[] = []
  for (const item of content) {
    if (item.type === 'text' && item.text != null) {
      blocks.push({ type: 'text', text: item.text })
    }
    // thinking 块不持久化到会话消息
    if (item.type === 'toolCall' && item.id != null && item.name != null) {
      const args = item.arguments ?? {}
      if (item.name === 'ui_render' && typeof args.schema === 'object') {
        try {
          const schema = normalizeSchema(args.schema)
          blocks.push({ type: 'ui_render', renderBlockId: item.id, schema })
        } catch {
          blocks.push({
            type: 'tool_call',
            toolCallId: item.id,
            toolName: item.name,
            input: args,
            status: 'done',
          })
        }
      } else {
        blocks.push({
          type: 'tool_call',
          toolCallId: item.id,
          toolName: item.name,
          input: args,
          status: 'done',
        })
      }
    }
  }
  return blocks
}

function resolveModelFromConfig(config: ModelConfig): Model<any> {
  const api = config.apiProtocol === 'anthropic' ? 'anthropic' : 'openai-completions'
  return {
    id: config.name,
    name: config.name,
    api,
    provider: config.apiProtocol,
    baseUrl: config.baseUrl,
    reasoning: false,
    input: ['text'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 200000,
    maxTokens: 8192,
  } as Model<any>
}

function buildSystemPromptWithSkills(basePrompt: string, skills: SkillConfig[]): string {
  if (skills.length === 0) return basePrompt
  const skillsBlock = skills
    .map((s) => `<skill name="${s.name}">\n${s.content}\n</skill>`)
    .join('\n\n')
  return `${basePrompt}\n\n<agent_skills>\n${skillsBlock}\n</agent_skills>`
}

export async function runAgentSession(opts: AgentRunOptions): Promise<void> {
  const abortController = new AbortController()
  AbortRegistry.register(opts.sessionId, abortController)

  const emit = (event: IpcAgentEvent): void => {
    if (!opts.sender.isDestroyed()) {
      opts.sender.send(IPC_CHANNELS.AGENT_STREAM_EVENT, event)
    }
  }

  log.info(`[Agent] Session ${opts.sessionId} starting. Prompt: ${opts.prompt.slice(0, 80)}...`)

  try {
    emit({ type: 'session_start', sessionId: opts.sessionId })

    const models = getSetting('models') as ModelConfig[]
    const selectedModel = opts.modelId
      ? models.find((m) => m.id === opts.modelId)
      : models.find((m) => m.enabled)

    if (!selectedModel) {
      throw new Error('No model configured. Please add a model in Settings → Models.')
    }

    const allSkills = listAllSkills()

    const autoLoadSkillIds = new Set<string>()
    for (const s of allSkills) {
      if (s.source === 'builtin' && s.enabled) {
        autoLoadSkillIds.add(s.id)
      }
    }
    if (opts.skillIds) {
      for (const id of opts.skillIds) autoLoadSkillIds.add(id)
    }

    const selectedSkills = Array.from(autoLoadSkillIds)
      .map((id) => allSkills.find((s) => s.id === id))
      .filter((s): s is SkillConfig => s != null)

    log.info(`[Agent] Model: ${selectedModel.name} (${selectedModel.apiProtocol}), Skills: [${selectedSkills.map((s) => s.name).join(', ')}]`)

    const resolvedModel = resolveModelFromConfig(selectedModel)
    const systemPrompt = buildSystemPromptWithSkills(opts.systemPrompt || '', selectedSkills)
    const cwd = opts.cwd || process.cwd()
    const tools = buildAgentTools(cwd)

    log.info(`[Agent] Registered ${tools.length} tools: ${tools.map((t) => t.name).join(', ')}`)

    const agent = new Agent({
      initialState: {
        systemPrompt,
        model: resolvedModel,
        tools,
      },
      getApiKey: async (_provider: string) => selectedModel.apiKey || undefined,
    })

    const eventPromise = new Promise<void>((resolve, reject) => {
      const unsubscribe = agent.subscribe((event: AgentEvent) => {
        const ipcEvents = processAgentEvent(event, opts.sessionId)
        for (const ipcEvent of ipcEvents) {
          emit(ipcEvent)

          if (ipcEvent.type === 'ui_render') {
            // Only open a standalone Electron window for local desktop clients.
            // Remote clients receive the schema via the push event above.
            if (opts.sender instanceof ElectronTransportSender) {
              openUIWindow({
                sessionId: opts.sessionId,
                renderBlockId: ipcEvent.renderBlockId,
                schema: ipcEvent.schema,
                parentSender: opts.sender,
              })
            }
          }
        }

        if (event.type === 'agent_end') {
          const messages = event.messages as Array<{ role: string; content?: unknown[] }>
          const last = messages[messages.length - 1]
          if (last?.role === 'assistant' && Array.isArray(last.content) && last.content.length > 0) {
            try {
              const blocks = assistantContentToBlocks(
                last.content as Array<{
                  type: string
                  text?: string
                  thinking?: string
                  id?: string
                  name?: string
                  arguments?: Record<string, unknown>
                }>
              )
              if (blocks.length > 0) {
                saveMessage(opts.conversationId, 'assistant', blocks, opts.sessionId)
              }
            } catch (err) {
              log.warn('[Agent] Failed to persist assistant message:', err)
            }
          }
          unsubscribe()
          resolve()
        }
      })

      abortController.signal.addEventListener('abort', () => {
        agent.abort()
        unsubscribe()
        reject(new DOMException('Aborted', 'AbortError'))
      })
    })

    await agent.prompt(opts.prompt)
    await eventPromise

    emit({ type: 'session_end', sessionId: opts.sessionId, status: 'success' })
    log.info(`[Agent] Session ${opts.sessionId} completed successfully`)
  } catch (err) {
    const error = err as Error
    if (error.name === 'AbortError') {
      emit({ type: 'session_end', sessionId: opts.sessionId, status: 'interrupted' })
      log.info(`[Agent] Session ${opts.sessionId} interrupted`)
    } else {
      emit({
        type: 'session_end',
        sessionId: opts.sessionId,
        status: 'error',
        error: error.message,
      })
      log.error(`[Agent] Session ${opts.sessionId} error:`, error)
    }
  } finally {
    AbortRegistry.unregister(opts.sessionId)
  }
}

// Serialize a UI action back into a prompt for the agent
export function serializeUIAction(
  actionId: string,
  data: Record<string, unknown>,
  renderBlockId: string
): string {
  const dataStr = JSON.stringify(data, null, 2)
  return `[UI Action from rendered component]
Action ID: ${actionId}
Render Block ID: ${renderBlockId}
User provided data:
${dataStr}

Please continue the task based on the user's selection/input above.`
}
