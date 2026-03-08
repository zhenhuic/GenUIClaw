import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'
import { createCodingTools } from '@mariozechner/pi-coding-agent'

const UI_RENDER_DESCRIPTION = `Render an interactive UI. On desktop it opens in a new window; on mobile it renders inline or in a bottom sheet.

Schema format:
{ "version": "1.0", "rootId": "<id>", "components": { "<id>": <component>, ... } }

Component types (all require type and id):
- container: { type, id, childIds: string[], direction?: "row"|"column", gap?: "sm"|"md"|"lg" }
- text: { type, id, content: string, variant?: "body"|"heading"|"caption"|"code" }
- button: { type, id, label: string, actionId: string, variant?: "primary"|"secondary"|"destructive"|"ghost", disabled?: boolean, confirmMessage?: string }
- table: { type, id, columns: [{key, header, sortable?}], rows: [Record<string,any>], title?, selectable?, onRowSelectActionId?, pagination?: {pageSize} }
- select: { type, id, label: string, options: [{value, label}], actionId: string, defaultValue?, multiple? }
- form: { type, id, fields: [{name, label, type, placeholder?, defaultValue?, required?, options?}], actionId: string, submitLabel?, title? }
- card: { type, id, title?, subtitle?, body?, childIds?: string[], actionId? }
- chart: { type, id, chartType: "bar"|"line"|"pie"|"area"|"scatter", data: [Record], xKey: string, yKeys: string[], title?, colors? }
- progress: { type, id, value: number, label?, status?: "active"|"success"|"error" }
- badge: { type, id, label: string, color?: "green"|"yellow"|"red"|"blue"|"gray" }
- file_picker: { type, id, label: string, actionId: string, accept?, multiple? }

IMPORTANT:
- Components use flat properties (no "props" wrapper).
- Container uses "childIds" (not "children"). Table columns use "header" (not "label").
- Prefer column layouts and limit tables to 3-4 columns for mobile readability.
- Every interactive element should have an actionId for user feedback.
- User actions are sent back as { actionId, data } for you to process.`

const uiRenderSchema = Type.Object({
  schema: Type.String({ description: 'A UISchema JSON string describing the UI to render' }),
})

function createUiRenderTool(): AgentTool<typeof uiRenderSchema> {
  return {
    name: 'ui_render',
    label: 'Render UI',
    description: UI_RENDER_DESCRIPTION,
    parameters: uiRenderSchema,
    execute: async (_toolCallId, params) => {
      return {
        content: [{ type: 'text', text: `UI rendered with schema: ${params.schema.slice(0, 100)}...` }],
        details: { schema: params.schema },
      }
    },
  }
}

/**
 * Build the full tool set for an agent session.
 * Includes coding tools (read, bash, edit, write, grep, find, ls) + ui_render.
 */
export function buildAgentTools(cwd: string): AgentTool<any>[] {
  const coding = createCodingTools(cwd)
  return [...coding, createUiRenderTool()]
}
