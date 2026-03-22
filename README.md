# GenUIClaw

[中文文档 / Chinese Documentation](./README_zh.md)

> AI Agent desktop app with **Generative Dynamic UI** — let the LLM build and render truly interactive interfaces during conversation.

---

## The Idea

Most AI chat tools can only output text. GenUIClaw takes a different approach: **let the LLM "draw" the interface**.

When you ask the Agent a question or assign it a task, it can do more than reply with text — it can call the `ui_render` tool to generate a UISchema JSON on the fly, which the app renders as fully interactive UI components in a standalone window: tables, charts, forms, progress bars, badges, and more. Every user interaction with these components (clicking a button, submitting a form, selecting a row) is sent back to the Agent as structured data, driving the next round of reasoning and action.

This creates a **conversation × interface** feedback loop:

```
User asks → Agent reasons → Generates UI → User interacts → Agent receives feedback → Continues reasoning → ...
```

Traditional chat excels at natural language. GenUIClaw's Generative UI lets the Agent switch to visual interaction when needed — combining the expressiveness of conversation with the precision of structured interfaces.

---

## Key Features

- **Generative Dynamic UI** — LLM dynamically generates interactive UI via the `ui_render` tool, rendered in real time in a standalone window
- **Bidirectional UI Interaction** — user actions in the UI window (clicks, submissions, selections) feed back to the Agent, forming conversation-driven workflows
- **Mobile Remote Access** — access your desktop Agent from your phone via a relay server; generative UI renders as a bottom sheet on mobile
- **Multi-Model Support** — compatible with OpenAI-compatible APIs and native Anthropic API; configure multiple models simultaneously
- **Skills System** — modular skill extensions injected into the Agent's system prompt; built-in skills for generative UI guidance and email; supports custom user skills via zip import
- **MCP Server Integration** — connect external tool servers via the [Model Context Protocol](https://modelcontextprotocol.io), expanding the Agent's tool set
- **Local-First Storage** — conversations, settings, and skills persisted to a local SQLite database
- **Coding Tool Chain** — built-in coding tools (Bash, file read/write, code search, web fetch/search)
- **Smart Window Sizing** — UI windows auto-estimate optimal size based on content (table columns/rows, chart dimensions, form field count)
- **Auto Title Generation** — LLM generates a 3–8 word conversation title after the first exchange

---

## Supported UI Components

| Component | Purpose |
|-----------|---------|
| `table` | Data table with sorting, pagination, and row selection |
| `form` | Structured input form supporting text, number, select, checkbox, file, date fields |
| `chart` | Data visualization — line, bar, area, pie, and scatter charts |
| `card` | Content card with nested child components and click callbacks |
| `button` | Action button with confirmation dialogs, disabled state, and style variants |
| `select` | Dropdown selection with single/multi-select and instant callbacks |
| `progress` | Progress bar with status indicators (active, success, error) |
| `badge` | Status label in multiple colors |
| `text` | Rich text block — heading, body, caption, and code variants |
| `container` | Layout container — horizontal/vertical arrangement with configurable spacing |
| `file_picker` | File selection dialog with type filtering and multi-select |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Electron 33 + React 18 + TypeScript |
| Build | electron-vite (Vite 5) + Rollup, ESM output |
| AI SDK | `@mariozechner/pi-agent-core` / `pi-ai` / `pi-coding-agent` |
| State | Zustand 5 |
| Database | better-sqlite3 (WAL mode) |
| Styling | Tailwind CSS 3 + CSS variable theming |
| Charts | Recharts |
| UI Primitives | Radix UI (Dialog, ScrollArea, Select, Switch, Tooltip, etc.) |
| Validation | Zod 4 |
| Relay Server | Go (WebSocket bridge for mobile access) |
| Mobile Client | React + Vite SPA (served via relay server) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Go 1.22+ (only if running the relay server)

### Install

```bash
git clone <repo-url>
cd GenUIClaw
npm install
```

> `postinstall` auto-runs `electron-builder install-app-deps` to compile native modules.

### Development

```bash
npm run dev
```

Starts the Vite dev server and Electron window with hot reload.

### Production Build

```bash
npm run build   # Build the app
npm run start   # Run the built package
```

### Recompile Native Modules

If you encounter `better-sqlite3` errors after upgrading Electron:

```bash
npm run rebuild
```

---

## Model Configuration

After launch, go to **Settings → Models** and add at least one model:

| Field | Description |
|-------|-------------|
| Name | Display name (anything you like) |
| Base URL | API endpoint (e.g. `https://api.openai.com` or a local Ollama address) |
| API Key | Your API key for the service |
| API Protocol | `openai` (compatible API) or `anthropic` (native API) |
| Enabled | Only enabled models are available for conversations |

You can configure multiple models and select which one to use when starting a conversation.

---

## Skills

Skills are pluggable modules injected into the Agent's system prompt, guiding how the Agent thinks and acts in specific scenarios.

### Built-in Skills

| Skill | Description |
|-------|-------------|
| `generative-ui` | Teaches the Agent how to use the `ui_render` tool to build interactive interfaces |
| `email` | Read and send emails via IMAP/SMTP |

### Enable/Disable

Settings → Skills → toggle the switch.

### Custom Skills

1. Create a directory with a `SKILL.md` file (optional YAML front matter for `name` and `description`)
2. Package the directory as a zip file
3. Settings → Skills → Import → upload the zip

Skill content is injected as `<skill name="...">...</skill>` into every conversation's system prompt.

---

## MCP Servers

Settings → MCP Servers — configure external tool servers conforming to the [Model Context Protocol](https://modelcontextprotocol.io) standard (supports stdio and SSE transport), extending the tools available to the Agent.

---

## Mobile Remote Access

GenUIClaw supports remote access from a mobile browser via a **relay server**.

### How It Works

1. **Relay Server** — a lightweight Go WebSocket bridge that pairs desktop and mobile clients via a device code
2. **Desktop** connects to the relay server and receives a pairing code (e.g. `ABC123`)
3. **Mobile** opens the relay server URL in a browser, enters the code, and connects
4. All IPC calls are transparently relayed over WebSocket — the mobile client uses the same API surface as the desktop renderer
5. Generative UI renders inline as a bottom sheet on mobile (no standalone windows)

### Running the Relay Server

```bash
cd relay-server

# Option A: Run directly (requires Go 1.22+)
go run .

# Option B: Docker
docker build -t genuiclaw-relay .
docker run -p 9527:9527 genuiclaw-relay
```

The server starts on port `9527` by default (configurable via `PORT` env var).

### Building the Mobile Client

```bash
npm run mobile:build    # Outputs to relay-server/static/
```

The built files are served by the relay server at `/app/`.

### Mobile Development

```bash
npm run mobile:dev      # Dev server on port 3001 with LAN access
```

---

## Architecture Overview

```
User input
  └─ IPC: agent:start
       └─ main/agent/runner.ts
            ├─ Load model config + inject Skills system prompt
            ├─ Register tools (coding tools + ui_render)
            └─ Agent(pi-agent-core).prompt()
                 └─ Streaming AgentEvent
                      └─ IPC: agent:stream-event → renderer
                           ├─ Text deltas → MessageBubble
                           ├─ Tool calls → ToolCallBlock
                           └─ ui_render → standalone UI window (desktop)
                                          or bottom sheet (mobile)
                                └─ UIRenderer recursively renders UISchema
                                     └─ User interaction → IPC: ui:action → Agent continues
```

---

## Project Structure

```
main/            # Electron main process (Agent engine, IPC, database, tools, remote)
preload/         # contextBridge security layer
renderer/        # React SPA (chat UI, settings, generative UI rendering)
mobile/          # Mobile web client (React + Vite, served via relay server)
relay-server/    # Go WebSocket relay server for mobile access
shared/          # Types and constants shared between main and renderer
skills/          # Built-in skill directories
```

---

## Extending GenUIClaw

### Add a New UI Component

1. `shared/types/ui-schema.ts` — add component interface, include in `UIComponent` union
2. `renderer/components/generative-ui/components/` — create React component
3. `renderer/components/generative-ui/registry.ts` — register type mapping
4. (Optional) `main/agent/schema-normalizer.ts` — add normalization logic

### Add a New Agent Tool

1. `main/agent/tools.ts` — define parameter schema with TypeBox, implement `AgentTool`
2. `main/agent/message-processor.ts` — add intercept logic if frontend needs special handling

### Add a New IPC Channel

1. `shared/constants/ipc-channels.ts` — add channel name constant
2. `main/ipc/` — add `ipcMain.handle` handler
3. `preload/index.ts` — add to whitelist and expose API
4. `shared/types/ipc.ts` — update `ElectronAPI` type

### Add a New Skill

1. Create a subdirectory under `skills/` with a `SKILL.md` file
2. Built-in skills are auto-discovered by `listAllSkills()`
3. User skills: Settings → Skills → Import

---

## License

MIT
