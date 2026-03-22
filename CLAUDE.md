# GenUIClaw — Project Guide

AI Agent desktop app whose core feature is **Generative Dynamic UI**: the LLM can invoke the `ui_render` tool during conversation to dynamically generate interactive UI components (tables, forms, charts, etc.) rendered in standalone windows. Supports multi-model configuration, pluggable Skills, MCP server integration, and remote mobile access via a relay server.

## Tech Stack

- **Framework**: Electron 33 + React 18 + TypeScript
- **Build**: electron-vite (Vite 5) + Rollup, ESM output
- **AI SDK**: `@mariozechner/pi-agent-core` (Agent class + event stream), `@mariozechner/pi-ai` (model registry + streaming inference), `@mariozechner/pi-coding-agent` (coding tool suite)
- **State Management**: Zustand 5
- **Database**: better-sqlite3 (WAL mode, path `userData/genuiclaw.db`)
- **Styling**: Tailwind CSS 3 + CSS variable theming
- **Charts**: Recharts
- **UI Primitives**: Radix UI (Collapsible, Dialog, ScrollArea, Select, Separator, Switch, Tooltip)
- **Schema Validation**: Zod 4

## Commands

```bash
npm run dev          # Start dev mode (Vite dev server + Electron)
npm run build        # Production build
npm run start        # Run the built Electron app
npm run rebuild      # Recompile native modules (better-sqlite3)
npm run mobile:dev   # Start mobile web client dev server (port 3001)
npm run mobile:build # Build mobile web client (output → relay-server/static/)
```

- `postinstall` auto-runs `electron-builder install-app-deps`; `rebuild` manually recompiles native modules like better-sqlite3

## Directory Structure

```
main/                    # Electron main process
  index.ts               # Entry: init DB, register IPC, create window
  window.ts              # Main BrowserWindow creation
  ui-window.ts           # Dynamic UI standalone window (ui_render trigger, smart sizing)
  agent/                 # AI Agent engine
    runner.ts            # Core: create Agent, subscribe events, push IPC
    message-processor.ts # AgentEvent → IpcAgentEvent conversion
    tools.ts             # Register tools: coding tools + ui_render
    abort-controller.ts  # AbortRegistry: session abort management
    title-generator.ts   # Auto-generate conversation title (3-8 word LLM-generated title after first turn)
    schema-normalizer.ts # UISchema normalization (handle LLM output variants)
  ipc/                   # IPC handler registration
    index.ts             # Unified registration entry
    agent-handlers.ts    # agent:start / agent:interrupt / ui:action
    conversation-handlers.ts
    settings-handlers.ts
    mcp-handlers.ts
    skills-handlers.ts   # Skills CRUD + toggle + import (zip)
  storage/               # SQLite data layer
    database.ts          # Init, create tables, connection management
    conversations.ts     # Conversation CRUD
    messages.ts          # Message CRUD (content stored as JSON)
    settings.ts          # Key-value settings store (merged with DEFAULT_SETTINGS)
    skills.ts            # Skills storage (builtin + user, directory + SKILL.md)
  remote/                # Remote access / relay connection
    relay-client.ts      # WebSocket client connecting to relay server
    relay-manager.ts     # Singleton managing RelayClient lifecycle (start/stop/status)
    remote-handler.ts    # Handle incoming remote messages (request/response routing)
    remote-transport.ts  # TransportSender implementation for remote clients
    transport.ts         # TransportSender interface + ElectronTransportSender
    auth.ts              # Device code generation and validation
  security/
    sender-validator.ts  # IPC sender origin validation

preload/
  index.ts               # contextBridge exposing electronAPI (whitelist validation)

renderer/                # React SPA (Vite root)
  index.html             # Main window entry (CSP: default-src 'self')
  main.tsx               # React mount point
  App.tsx                # Root component: layout + theme + event subscriptions + auto-create new conversation
  ui-window.html         # Dynamic UI window entry (forced light theme)
  ui-window-main.tsx     # UI window React mount point + action handling
  components/
    layout/              # Sidebar, MainContent, TitleBar
    chat/                # ChatView, InputBar, MessageList, MessageBubble, ToolCallBlock
    settings/            # SettingsPanel (5 tabs), GeneralSettings, ModelsSettings,
                         # ToolSettings, SkillsSettings, MCPServerList, MCPServerForm
    generative-ui/       # Dynamic UI rendering
      UIRenderer.tsx     # Recursive render engine (rootId → componentRegistry)
      registry.ts        # Component type → React component mapping
      components/        # UITable, UIForm, UICard, UIButton, UIChart, UIText,
                         # UISelect, UIProgress, UIBadge, UIContainer, UIFilePicker
  store/
    conversation-store.ts  # Conversation + message state, handleAgentEvent processes streaming events
    agent-store.ts         # Agent run state (isRunning, activeSessionId, selectedModelId, selectedSkillIds)
    settings-store.ts      # App settings state
    skills-store.ts        # Skills state (load/toggle/save/update/remove/import)
  hooks/
    useAgent.ts          # useAgentStreamSubscription + useAgent (sendMessage, interrupt, sendUIAction)
  styles/
    globals.css          # Tailwind + CSS variable theme definitions + UI window styles

mobile/                  # Mobile web client (served via relay server)
  index.html             # Mobile SPA entry
  main.tsx               # React mount point
  App.tsx                # Root: ConnectScreen ↔ ChatApp (connection-gated)
  vite.config.ts         # Vite config (base: /app/, builds to relay-server/static/)
  api/
    relay-ws-client.ts   # WebSocket client for relay communication
    remote-api.ts        # Creates electronAPI shim over WebSocket (request/response/push)
    connection-store.ts  # Connection state (Zustand): connect, disconnect, auto-connect
  components/
    chat/                # MobileChatView
    connect/             # ConnectScreen (device code entry)
    layout/              # MobileHeader, ConversationDrawer, ConnectionStatusBar
    settings/            # MobileSettings
    ui-overlay/          # UIBottomSheet (generative UI rendered inline as bottom sheet)
  hooks/                 # useAgent, useConnection
  store/                 # conversation-store, settings-store (mirror desktop stores)
  styles/                # Mobile-specific styles
  utils/                 # Shared utilities

relay-server/            # Go relay server (WebSocket bridge)
  main.go                # HTTP server entry (default port 9527)
  handler.go             # WebSocket upgrade + message routing handlers
  protocol.go            # RelayMessage envelope types (request/response/push/control)
  room.go                # Room manager: device code → (desktop, mobile) pairing
  Dockerfile             # Multi-stage build (golang:1.22 → alpine:3.19)
  static/                # Mobile web client build output (served at /app/)

shared/                  # Shared between main and renderer processes
  constants/
    ipc-channels.ts      # All IPC channel name constants
  types/
    ipc.ts               # IPC payload types + IpcAgentEvent + ElectronAPI interface
    settings.ts          # AppSettings, ModelConfig, SkillConfig, McpServerConfig
    conversation.ts      # Conversation, AppMessage, MessageContentBlock
    ui-schema.ts         # UISchema, all UI component type definitions, UIAction

skills/                  # Built-in Skills (each subdirectory contains SKILL.md)
  generative-ui/         # UI render tool usage guide
  email/                 # Email read/write (IMAP/SMTP Python scripts + config.json)
```

## Architecture & Data Flow

### Agent Call Chain

```
User input → renderer useAgent.sendMessage()
  → IPC agent:start (with modelId?, skillIds?) → main agent-handlers.ts
    → saveMessage() + runAgentSession()
      → Resolve model from settings.models, load skills and inject into system prompt
      → Agent(pi-agent-core) created, tools registered, agent.prompt() called
        → Agent subscribes to AgentEvent stream
          → processAgentEvent() converts to IpcAgentEvent
            → sender.send('agent:stream-event', event) pushes to renderer
              → useAgentStreamSubscription → handleAgentEvent → update store → UI re-render
```

### IPC Communication Patterns

- **Renderer → Main**: `ipcRenderer.invoke(channel, payload)` — request-response, validated via preload whitelist
- **Main → Renderer**: `sender.send('agent:stream-event', event)` — push streaming events
- **Main → Renderer**: `sender.send('conversation:title-updated', { id, title })` — push auto-generated title
- **Main → UI Window**: `win.webContents.send('ui-window:schema', payload)` — push UISchema

**IPC Channel List**:

| Category | Channels |
|----------|----------|
| Agent | `agent:start` / `agent:interrupt` / `agent:stream-event` |
| Conversation | `conversation:list` / `conversation:get` / `conversation:create` / `conversation:delete` / `conversation:title-updated` |
| Messages | `messages:get` |
| Settings | `settings:get` / `settings:set` |
| Skills | `skills:list` / `skills:save` / `skills:update` / `skills:delete` / `skills:toggle` / `skills:import` |
| MCP | `mcp:list` / `mcp:add` / `mcp:remove` / `mcp:reconnect` |
| UI | `ui:action` / `ui-window:schema` / `ui-window:action` / `ui-window:get-schema` |

### Generative UI Flow

```
LLM calls ui_render tool (passes UISchema JSON)
  → Agent tool_execution → message-processor parses toolcall_end
    → Emits IpcAgentEvent { type: 'ui_render', schema, renderBlockId }
      ├→ Main window: shows "Dynamic UI opened in new window" indicator
      └→ openUIWindow() creates standalone BrowserWindow
           → Smart window sizing based on content (table col/row count, chart 760x520, form field count, etc.)
           → Loads ui-window.html (forced light theme)
           → On ready-to-show: sends UISchema
           → UIRenderer recursively renders components from schema.rootId
```

### Remote Access / Mobile Flow

```
Desktop app → RelayManager.start(relayUrl)
  → RelayClient connects to relay server via WebSocket (/ws/desktop)
    → Relay server assigns device code (e.g. "ABC123")
    → Desktop displays code in UI

Mobile browser → opens relay-server/app/ (or scans QR)
  → Enters device code → connects to relay server (/ws/mobile)
    → Relay server pairs mobile ↔ desktop in same "room"
    → Mobile installs electronAPI shim (remote-api.ts) over WebSocket
      → All IPC calls (agent:start, conversation:list, etc.) relayed through WebSocket
      → Generative UI rendered inline as bottom sheet (UIBottomSheet)
```

### UISchema Structure

```typescript
interface UISchema {
  version: '1.0'
  rootId: string                           // Root component ID
  components: Record<string, UIComponent>  // Component ID → component definition
  actions?: Record<string, UIAction>       // Action callback definitions
}
```

Supported component types: `table` | `form` | `card` | `button` | `select` | `chart` | `text` | `progress` | `badge` | `container` | `file_picker`

### Schema Normalization (schema-normalizer.ts)

LLM-output UISchema may have various non-standard forms. `normalizeUISchema()` handles:
- Flattening `{ type, props: { ... } }` wrappers to `{ type, ... }`
- `children` → `childIds` (container/card)
- `label` → `header` (table columns)
- Text variant mapping: `h1-h6`/`title` → `heading`, `p`/`paragraph` → `body`
- `onClick.action`/`onClick.actionId` → `actionId` (button/select)
- Auto-generating missing actionIds: `${id}_click` / `${id}_change` / `${id}_submit` / `${id}_pick`
- `text` field → `content` (text component)

### Agent Tool Set

| Tool | Source | Purpose |
|------|--------|---------|
| Bash | pi-coding-agent | Execute shell commands |
| Read | pi-coding-agent | Read files |
| Write | pi-coding-agent | Write files |
| Edit | pi-coding-agent | Edit existing files |
| Glob | pi-coding-agent | Find files by pattern |
| Grep | pi-coding-agent | Search file contents |
| WebFetch | pi-coding-agent | Fetch web pages |
| WebSearch | pi-coding-agent | Search the web |
| ui_render | Custom | Render interactive UI (param: schema JSON string) |

### Skills System

- **Storage**: builtins in `skills/` (project root) or packaged `resources/skills`; user skills in `userData/skills`
- **Format**: each skill is a directory containing a `SKILL.md` file
- **Loading**: `listAllSkills()` merges builtin + user, filters by `skillStates` and `enabled`
- **Injection**: `buildSystemPromptWithSkills()` injects enabled skills as `<skill name="...">...</skill>` blocks into the system prompt
- **Frontend state**: `skills-store.ts` manages skill list loading, enable/disable, CRUD, zip import

### Model Configuration

`runner.ts` reads `ModelConfig[]` from `getSetting('models')`, selects the `enabled === true` model or uses the specified `modelId`.

```typescript
interface ModelConfig {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  apiProtocol: 'openai' | 'anthropic'
  enabled: boolean
}
```

- `apiProtocol === 'anthropic'` uses the Anthropic API; otherwise uses `openai-completions` compatible interface
- API Key is passed to Agent via `getApiKey` callback

### Auto Title Generation

`title-generator.ts` auto-generates a 3-8 word conversation title after the first turn:
- Uses the same model configuration as the conversation
- Sends the first user + assistant messages to a separate Agent instance
- Pushes title to renderer via `CONVERSATION_TITLE_UPDATED` channel
- Caches generated conversation IDs in a Set to avoid duplicate generation

## Key Types

### IpcAgentEvent (main → renderer streaming events)

```typescript
type IpcAgentEvent =
  | { type: 'session_start'; sessionId }
  | { type: 'system_init'; sessionId; mcpServers }
  | { type: 'text_delta'; sessionId; text }
  | { type: 'tool_call_start'; sessionId; toolCallId; toolName; input }
  | { type: 'tool_call_result'; sessionId; toolCallId; output; isError }
  | { type: 'ui_render'; sessionId; schema: UISchema; renderBlockId }
  | { type: 'ui_action_received'; sessionId; renderBlockId; actionId; data }
  | { type: 'session_end'; sessionId; status; error? }
```

### AppMessage (persisted message)

```typescript
interface AppMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: MessageContentBlock[]  // TextBlock | ToolCallBlock | ToolResultBlock | UIRenderBlock
  sessionId?: string
  createdAt: number
}
```

### AppSettings (app configuration)

```typescript
interface AppSettings {
  models: ModelConfig[]           // Multi-model config (each with id, name, baseUrl, apiKey, apiProtocol, enabled)
  skillStates: Record<string, boolean>  // Skill enable/disable states
  theme: 'light' | 'dark' | 'system'
  allowedTools: string[]
  defaultCwd: string
  systemPrompt: string
  mcpServers: Record<string, McpServerConfig>
  fontSize: 'sm' | 'md' | 'lg'
  showToolDetails: boolean
}
```

### Database Schema

| Table | Columns |
|-------|---------|
| `conversations` | id (PK), title, created_at, updated_at, meta (JSON) |
| `messages` | id (PK), conversation_id (FK), role, content (JSON), session_id, created_at |
| `settings` | key (PK), value (JSON) |
| `mcp_servers` | name (PK), config (JSON), enabled (int), created_at |

Index: `idx_messages_conversation` on messages(conversation_id, created_at)

### Zustand Stores

| Store | File | Main State | Main Actions |
|-------|------|------------|--------------|
| `useConversationStore` | `conversation-store.ts` | conversations, activeConversationId, messages | loadConversations, selectConversation, createConversation, deleteConversation, addUserMessage, handleAgentEvent, updateConversationTitle |
| `useAgentStore` | `agent-store.ts` | activeSessionId, isRunning, selectedModelId, selectedSkillIds | setRunning, setIdle, setSelectedModelId, setSelectedSkillIds, toggleSkillId |
| `useSettingsStore` | `settings-store.ts` | settings (AppSettings), loaded | load, update |
| `useSkillsStore` | `skills-store.ts` | skills (SkillConfig[]), loaded | load, toggle, save, update, remove, importFromZip |

## Build Notes

- **ESM Dependencies**: `@mariozechner/pi-*` packages are ESM-only, externalized in `electron.vite.config.ts` (not bundled; imported at runtime by Node.js)
- **Main process output**: `out/main/index.mjs` (ES module format)
- **Renderer dual entry**: `index.html` (main window) + `ui-window.html` (dynamic UI window)
- **Mobile client**: separate Vite build (`mobile/vite.config.ts`), outputs to `relay-server/static/`, served at `/app/`
- **Native modules**: `better-sqlite3` must match Electron version; `npm run rebuild` recompiles; `postinstall` runs `electron-builder install-app-deps`
- **Path aliases**: `@shared` → `shared/`, `@renderer` → `renderer/`, `@generative-ui` → `renderer/components/generative-ui/` (mobile only)
- **CSP**: both HTML entries set `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'`
- **UI window theme**: `ui-window.html` forces light theme, does not follow app theme setting

## Extension Guide

### Adding a New UI Component Type

1. Add component interface in `shared/types/ui-schema.ts` (e.g. `UIMyComponent`), add to `UIComponent` union type
2. Create `UIMyComponent.tsx` in `renderer/components/generative-ui/components/`
3. Register in `componentRegistry` in `registry.ts`
4. (Optional) Add normalization logic for the component type in `schema-normalizer.ts`

### Adding a New Agent Tool

1. Define parameter schema using TypeBox in `main/agent/tools.ts`
2. Implement the `AgentTool` interface (name, label, description, parameters, execute)
3. Add to the `buildAgentTools()` return array
4. If frontend needs special handling, add intercept logic in `message-processor.ts`

### Adding a New IPC Channel

1. `shared/constants/ipc-channels.ts` — add channel name constant
2. `main/ipc/` — create or append handler (`ipcMain.handle`)
3. `preload/index.ts` — add to whitelist + expose API
4. `shared/types/ipc.ts` — update `ElectronAPI` type
5. Renderer calls via `window.electronAPI.xxx`

### Adding a New Setting

1. `shared/types/settings.ts` — add field to `AppSettings` + set `DEFAULT_SETTINGS` default
2. `renderer/components/settings/GeneralSettings.tsx` or appropriate Settings component — add UI control
3. Read in `main/` via `getSetting('newField')`

### Adding a New Skill

1. Create a subdirectory under `skills/` at the project root (e.g. `my-skill/`)
2. Create a `SKILL.md` file defining the skill name and content
3. Builtin skills are auto-discovered by `listAllSkills()`; user skills are imported via Settings → Skills → Import to `userData/skills`
