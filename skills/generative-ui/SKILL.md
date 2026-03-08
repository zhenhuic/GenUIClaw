---
name: generative-ui
description: Guide for using the ui_render tool to create interactive Dynamic UI components (tables, forms, charts, etc.). UI renders inline in chat on mobile (bottom sheet) and in separate windows on desktop. Optimized for touch interactions and responsive layouts.
---

# Generative Dynamic UI

You have the `ui_render` tool to create interactive UI components. On desktop, they open in a separate window; on mobile, they render inline in chat or in a draggable bottom sheet. Use it to present structured data, collect user input, and build interactive workflows — instead of relying on plain text when a visual interface would be more effective.

## When to Use `ui_render`

- Presenting tabular data, comparison results, or multi-column information → **table**
- Collecting structured user input (settings, parameters, configuration) → **form**
- Showing metrics, trends, distributions → **chart** (bar, line, area, pie)
- Offering a set of choices or options → **select** or **button** group
- Displaying status, progress, or summary information → **progress**, **badge**, **card**
- Confirming destructive or important actions → **button** with `confirmMessage`
- Building multi-step workflows with sequential UI interactions

## UISchema Structure

```json
{
  "version": "1.0",
  "rootId": "<root-component-id>",
  "components": {
    "<id>": { "type": "...", "id": "<id>", ... }
  }
}
```

All components use **flat properties** (no `props` wrapper). The root is referenced by `rootId`.

## Component Reference

### container
Layout wrapper. Use as root to compose multiple components.
```json
{ "type": "container", "id": "root", "direction": "column", "gap": "md", "childIds": ["heading", "content", "actions"] }
```
- `direction`: `"row"` | `"column"` (default: `"column"`)
- `gap`: `"sm"` (8px) | `"md"` (16px) | `"lg"` (24px)
- **Mobile tip**: Prefer `"column"` direction for root containers. Use `"row"` only for small inline groups (e.g. 2-3 buttons side by side).

### text
Display text content with markdown support.
```json
{ "type": "text", "id": "title", "content": "# Results Summary", "variant": "heading" }
```
- `variant`: `"body"` (default, supports markdown) | `"heading"` | `"caption"` | `"code"`

### button
Interactive button that sends an action back to you.
```json
{ "type": "button", "id": "btn1", "label": "Run Analysis", "actionId": "run_analysis", "variant": "primary" }
```
- `variant`: `"primary"` | `"secondary"` | `"destructive"` | `"ghost"`
- `confirmMessage`: Optional confirmation dialog before action
- `disabled`: Boolean to disable the button
- When clicked, you receive: `{ actionId: "run_analysis", data: {} }`

### table
Data table with sorting and pagination.
```json
{
  "type": "table", "id": "results",
  "title": "Search Results",
  "columns": [{ "key": "name", "header": "Name", "sortable": true }, { "key": "value", "header": "Value" }],
  "rows": [{ "name": "Item A", "value": 42 }],
  "selectable": true,
  "onRowSelectActionId": "row_selected",
  "pagination": { "pageSize": 10 }
}
```
- Use `"header"` (not `"label"`) for column headers
- When a row is selected, you receive: `{ actionId: "row_selected", data: { selectedRow: {...}, index: 0 } }`
- **Mobile tip**: Limit to 3-4 columns on mobile for readability. Use short column headers. Table scrolls horizontally if needed.

### form
Structured input form that submits data back to you.
```json
{
  "type": "form", "id": "config_form",
  "title": "Configuration",
  "fields": [
    { "name": "url", "label": "API URL", "type": "text", "placeholder": "https://...", "required": true },
    { "name": "method", "label": "Method", "type": "select", "options": [{ "value": "GET", "label": "GET" }, { "value": "POST", "label": "POST" }] },
    { "name": "body", "label": "Request Body", "type": "textarea" },
    { "name": "verbose", "label": "Verbose", "type": "checkbox" }
  ],
  "actionId": "submit_config",
  "submitLabel": "Save"
}
```
- Field types: `text`, `number`, `email`, `password`, `textarea`, `select`, `checkbox`, `date`, `file`
- On submit, you receive all field values: `{ actionId: "submit_config", data: { url: "...", method: "GET", ... } }`
- **Mobile tip**: Forms render with 44px minimum input height and 16px font on mobile to prevent iOS zoom. Keep field count reasonable (3-6 fields per form). Use placeholders to guide input.

### select
Dropdown selection that immediately sends the choice.
```json
{ "type": "select", "id": "lang", "label": "Language", "options": [{ "value": "en", "label": "English" }, { "value": "zh", "label": "Chinese" }], "actionId": "lang_selected" }
```
- On change, you receive: `{ actionId: "lang_selected", data: { value: "en" } }`

### chart
Data visualization using Recharts.
```json
{
  "type": "chart", "id": "trend",
  "chartType": "line",
  "title": "Monthly Trend",
  "data": [{ "month": "Jan", "revenue": 100, "cost": 60 }],
  "xKey": "month",
  "yKeys": ["revenue", "cost"],
  "colors": ["#7c6af7", "#4ade80"]
}
```
- `chartType`: `"bar"` | `"line"` | `"area"` | `"pie"` | `"scatter"`
- **Mobile tip**: Charts auto-resize to fit the container width. Use short axis labels. Pie charts work well on small screens.

### card
Content card, optionally clickable.
```json
{ "type": "card", "id": "summary", "title": "Project Status", "subtitle": "Last updated 5m ago", "body": "All systems **operational**.", "childIds": ["badge1", "progress1"] }
```
- `body` supports markdown
- `actionId`: Makes the entire card clickable
- `childIds`: Embed other components inside

### progress
Progress bar with status indicator.
```json
{ "type": "progress", "id": "p1", "label": "Upload Progress", "value": 75, "status": "active" }
```
- `status`: `"active"` (purple) | `"success"` (green) | `"error"` (red)

### badge
Status label / tag.
```json
{ "type": "badge", "id": "b1", "label": "Online", "color": "green" }
```
- `color`: `"green"` | `"yellow"` | `"red"` | `"blue"` | `"gray"`

### file_picker
File selection dialog.
```json
{ "type": "file_picker", "id": "fp1", "label": "Select File", "accept": ".json,.csv", "multiple": false, "actionId": "file_selected" }
```

## Design Principles

1. **Always use a container as root** when composing multiple components. Use `direction: "column"` for vertical layouts, `"row"` for horizontal.

2. **Start with a heading or title text** to give context about what the UI shows.

3. **Group related controls** using cards or nested containers.

4. **Use appropriate gap sizes**: `"sm"` for tightly related items, `"md"` for default spacing, `"lg"` for section separation.

5. **Provide feedback paths**: Every interactive element (button, form, select) should have an `actionId` so user interactions come back to you.

6. **Choose the right component**:
   - Need user to pick from options? → `select` (few options) or `table` with `selectable` (many options with details)
   - Need structured input? → `form`
   - Need confirmation? → `button` with `confirmMessage`
   - Showing read-only data? → `table`, `chart`, `text`, or `card`

7. **Keep IDs descriptive** — use meaningful names like `"results_table"`, `"config_form"`, `"run_btn"` instead of `"c1"`, `"c2"`.

8. **Keep action IDs descriptive** — use names like `"submit_config"`, `"delete_item"`, `"select_language"` so you can easily identify what the user did when the action comes back.

## Mobile-First Design Guidelines

When building UI that may be viewed on mobile devices:

1. **Prefer vertical layouts** — use `direction: "column"` for root containers. Row layouts with many items wrap poorly on small screens.
2. **Keep tables narrow** — limit to 3-4 columns. Wide tables require horizontal scrolling which is awkward on touch.
3. **Use larger touch targets** — buttons automatically get 44px min-height on mobile. Keep button labels concise.
4. **Minimize form fields** — break long forms into multi-step workflows (form → results → next form) instead of one giant form.
5. **Use cards for navigation** — clickable cards with `actionId` work great on touch as large tap targets.
6. **Test with shorter content** — mobile screens show less content; prefer concise text and summaries.
7. **Leverage progress + badge** — these compact components communicate status without taking much space.

## Handling User Actions

When a user interacts with your rendered UI (clicks a button, submits a form, selects an option, picks a row), the action data is sent back to you as structured input. You should:

1. Parse the `actionId` to understand what the user did
2. Use the `data` payload to get the user's input
3. Execute the corresponding operation (run a command, read/write files, make API calls, etc.)
4. Optionally render a new UI to show results or ask for next steps

This creates a conversational workflow where UI interactions drive agent actions seamlessly.

## Agent Event Integration

When your UI triggers an action:
- The user sees the action reflected in the chat as a message (e.g. `[UI Action] submit_config: {...}`)
- You receive the action data and can respond with text, tool calls, or a new `ui_render`
- The original UI remains visible; render a new UI if you need to show updated results
- On mobile, the bottom sheet auto-opens when you render a new UI during a conversation

## Example: Complete Workflow

A typical multi-step workflow:
1. Show a form to collect parameters
2. User submits the form → you receive the data
3. Execute the task with the submitted parameters
4. Show results in a table or chart
5. Offer follow-up actions via buttons

This creates a rich, interactive experience without requiring the user to type complex commands.
