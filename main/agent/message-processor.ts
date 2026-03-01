import type { AgentEvent } from '@mariozechner/pi-agent-core'
import type { AssistantMessage, AssistantMessageEvent } from '@mariozechner/pi-ai'
import type { IpcAgentEvent } from '../../shared/types/ipc'
import type { UISchema } from '../../shared/types/ui-schema'
import { normalizeSchema } from './schema-normalizer'

export function processAgentEvent(event: AgentEvent, sessionId: string): IpcAgentEvent[] {
  const events: IpcAgentEvent[] = []

  if (event.type === 'agent_start') {
    events.push({
      type: 'system_init',
      sessionId,
      mcpServers: [],
    })
    return events
  }

  if (event.type === 'message_update') {
    const streamEvent: AssistantMessageEvent = event.assistantMessageEvent

    if (streamEvent.type === 'text_delta') {
      events.push({ type: 'text_delta', sessionId, text: streamEvent.delta })
    }

    if (streamEvent.type === 'toolcall_end') {
      const toolCall = streamEvent.toolCall
      if (toolCall.name === 'ui_render') {
        try {
          const input = toolCall.arguments as Record<string, unknown>
          const schemaInput = input.schema
          const rawSchema =
            typeof schemaInput === 'string' ? JSON.parse(schemaInput) : schemaInput
          const schema: UISchema = normalizeSchema(rawSchema)
          events.push({ type: 'ui_render', sessionId, schema, renderBlockId: toolCall.id })
        } catch {
          events.push({
            type: 'tool_call_start',
            sessionId,
            toolCallId: toolCall.id,
            toolName: toolCall.name,
            input: toolCall.arguments,
          })
        }
      } else {
        events.push({
          type: 'tool_call_start',
          sessionId,
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          input: toolCall.arguments,
        })
      }
    }

    if (streamEvent.type === 'error') {
      const errorMsg = streamEvent.error as AssistantMessage
      events.push({
        type: 'session_end',
        sessionId,
        status: 'error',
        error: errorMsg.errorMessage ?? 'Unknown error',
      })
    }

    return events
  }

  // 不处理 tool_execution_start：tool_call_start 已在 toolcall_end 时发出，避免重复创建块
  if (event.type === 'tool_execution_start') {
    return events
  }

  if (event.type === 'tool_execution_end') {
    events.push({
      type: 'tool_call_result',
      sessionId,
      toolCallId: event.toolCallId,
      output: event.result,
      isError: event.isError ?? false,
    })
    return events
  }

  return events
}
