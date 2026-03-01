import type {
  UISchema,
  UIComponent,
  UIContainerComponent,
  UITableComponent,
  UITableColumn,
  UITextComponent,
  UIButtonComponent,
  UISelectComponent,
  UICardComponent,
  UIChartComponent,
  UIFormComponent,
  UIProgressComponent,
  UIBadgeComponent,
  UIFilePickerComponent,
} from '../../shared/types/ui-schema'

/**
 * Normalize a raw schema (potentially from LLM output) into the canonical
 * UISchema format expected by the renderer components.
 *
 * Handles common LLM variations:
 * - props wrapper: { type, props: { ... } } → flat { type, ... }
 * - children → childIds for container/card
 * - table columns: label → header
 * - text variant: h1/h2/h3/... → heading, p → body
 * - button onClick.action → actionId
 * - select onChange.action → actionId
 * - missing id field (inferred from component map key)
 */
export function normalizeSchema(raw: unknown): UISchema {
  const r = raw as Record<string, any>

  const schema: UISchema = {
    version: r.version || '1.0',
    rootId: r.rootId || 'root',
    components: {},
    actions: r.actions,
  }

  for (const [id, rawComp] of Object.entries(r.components || {})) {
    schema.components[id] = normalizeComponent(id, rawComp as Record<string, any>)
  }

  return schema
}

function normalizeComponent(id: string, raw: Record<string, any>): UIComponent {
  const props = raw.props ? { ...raw.props } : {}
  const merged: Record<string, any> = { ...raw, ...props, id }
  delete merged.props

  switch (merged.type) {
    case 'container':
      return normalizeContainer(merged)
    case 'table':
      return normalizeTable(merged)
    case 'text':
      return normalizeText(merged)
    case 'button':
      return normalizeButton(merged)
    case 'select':
      return normalizeSelect(merged)
    case 'card':
      return normalizeCard(merged)
    case 'chart':
      return normalizeChart(merged)
    case 'form':
      return normalizeForm(merged)
    case 'progress':
      return normalizeProgress(merged)
    case 'badge':
      return normalizeBadge(merged)
    case 'file_picker':
      return normalizeFilePicker(merged)
    default:
      return merged as UIComponent
  }
}

function normalizeContainer(m: Record<string, any>): UIContainerComponent {
  return {
    type: 'container',
    id: m.id,
    childIds: m.childIds || m.children || [],
    direction: m.direction,
    gap: m.gap,
  }
}

function normalizeTable(m: Record<string, any>): UITableComponent {
  const columns: UITableColumn[] = (m.columns || []).map((col: any) => ({
    key: col.key,
    header: col.header || col.label || col.key,
    sortable: col.sortable,
  }))

  return {
    type: 'table',
    id: m.id,
    title: m.title,
    columns,
    rows: m.rows || [],
    selectable: m.selectable,
    onRowSelectActionId: m.onRowSelectActionId,
    pagination: m.pagination,
  }
}

function normalizeText(m: Record<string, any>): UITextComponent {
  let variant = m.variant as string | undefined
  if (variant && /^h[1-6]$|^title$/i.test(variant)) {
    variant = 'heading'
  } else if (variant && /^p$|^paragraph$/i.test(variant)) {
    variant = 'body'
  }

  return {
    type: 'text',
    id: m.id,
    content: m.content || m.text || '',
    variant: variant as UITextComponent['variant'],
  }
}

function normalizeButton(m: Record<string, any>): UIButtonComponent {
  let actionId = m.actionId as string | undefined
  if (!actionId && m.onClick) {
    actionId =
      typeof m.onClick === 'string'
        ? m.onClick
        : m.onClick.action || m.onClick.actionId || ''
  }

  return {
    type: 'button',
    id: m.id,
    label: m.label || m.text || '',
    variant: m.variant,
    disabled: m.disabled,
    actionId: actionId || `${m.id}_click`,
    confirmMessage: m.confirmMessage,
  }
}

function normalizeSelect(m: Record<string, any>): UISelectComponent {
  let actionId = m.actionId as string | undefined
  if (!actionId && m.onChange) {
    actionId =
      typeof m.onChange === 'string'
        ? m.onChange
        : m.onChange.action || m.onChange.actionId || ''
  }

  return {
    type: 'select',
    id: m.id,
    label: m.label || '',
    options: m.options || [],
    defaultValue: m.defaultValue,
    multiple: m.multiple,
    actionId: actionId || `${m.id}_change`,
  }
}

function normalizeCard(m: Record<string, any>): UICardComponent {
  return {
    type: 'card',
    id: m.id,
    title: m.title,
    subtitle: m.subtitle,
    body: m.body,
    childIds: m.childIds || m.children,
    actionId: m.actionId,
  }
}

function normalizeChart(m: Record<string, any>): UIChartComponent {
  return {
    type: 'chart',
    id: m.id,
    chartType: m.chartType,
    title: m.title,
    data: m.data || [],
    xKey: m.xKey,
    yKeys: m.yKeys || [],
    colors: m.colors,
  }
}

function normalizeForm(m: Record<string, any>): UIFormComponent {
  return {
    type: 'form',
    id: m.id,
    title: m.title,
    fields: m.fields || [],
    submitLabel: m.submitLabel,
    actionId: m.actionId || `${m.id}_submit`,
  }
}

function normalizeProgress(m: Record<string, any>): UIProgressComponent {
  return {
    type: 'progress',
    id: m.id,
    label: m.label,
    value: m.value ?? 0,
    status: m.status,
  }
}

function normalizeBadge(m: Record<string, any>): UIBadgeComponent {
  return {
    type: 'badge',
    id: m.id,
    label: m.label || '',
    color: m.color,
  }
}

function normalizeFilePicker(m: Record<string, any>): UIFilePickerComponent {
  return {
    type: 'file_picker',
    id: m.id,
    label: m.label || '',
    accept: m.accept,
    multiple: m.multiple,
    actionId: m.actionId || `${m.id}_pick`,
  }
}
