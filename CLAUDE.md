# GenUIClaw — 项目指南

AI Agent 桌面应用，核心特性是 Generative Dynamic UI：LLM 可以在对话中调用 `ui_render` 工具动态生成交互式 UI 组件（表格、表单、图表等），在独立窗口渲染。支持多模型配置、Skill 技能扩展、MCP 服务器集成。另有 Relay Server 子系统支持通过 Web 浏览器远程控制桌面 Agent。

## 技术栈

- **框架**: Electron 33 + React 18 + TypeScript
- **构建**: electron-vite (Vite 5) + Rollup，输出 ESM
- **AI SDK**: `@mariozechner/pi-agent-core`（Agent 类 + 事件流）、`@mariozechner/pi-ai`（模型注册 + 流式推理）、`@mariozechner/pi-coding-agent`（编码工具集）
- **状态管理**: Zustand 5
- **数据库**: better-sqlite3（WAL 模式，路径 `userData/genuiclaw.db`）
- **样式**: Tailwind CSS 3 + CSS 变量主题
- **图表**: Recharts
- **UI 原语**: Radix UI（Collapsible, Dialog, ScrollArea, Select, Separator, Switch, Tooltip）
- **Schema 验证**: Zod 4
- **Relay Server**: Express + WebSocket + JWT + bcryptjs（独立子项目）

## 命令

```bash
npm run dev      # 启动开发模式（Vite dev server + Electron）
npm run build    # 生产构建
npm run start    # 运行已构建的 Electron 应用
npm run rebuild  # 重新编译 native 模块 (better-sqlite3)
```

- `postinstall` 自动执行 `electron-builder install-app-deps`；`rebuild` 用于手动重新编译 better-sqlite3 等 native 模块

## 目录结构

```
main/                    # Electron 主进程
  index.ts               # 入口：初始化 DB、注册 IPC、创建窗口
  window.ts              # 主窗口 BrowserWindow 创建
  ui-window.ts           # 动态 UI 独立窗口（ui_render 触发，含智能尺寸估算）
  agent/                 # AI Agent 引擎
    runner.ts            # 核心：创建 Agent、订阅事件、推送 IPC
    message-processor.ts # AgentEvent → IpcAgentEvent 转换
    tools.ts             # 注册工具：coding tools + ui_render
    abort-controller.ts  # AbortRegistry：会话中断管理
    title-generator.ts   # 对话标题自动生成（首轮对话后 LLM 生成 3-8 词标题）
    schema-normalizer.ts # UISchema 规范化（处理 LLM 输出变体）
  ipc/                   # IPC handler 注册
    index.ts             # 统一注册入口
    agent-handlers.ts    # agent:start / agent:interrupt / ui:action
    conversation-handlers.ts
    settings-handlers.ts
    mcp-handlers.ts
    skills-handlers.ts   # Skills CRUD + toggle + import (zip)
  storage/               # SQLite 数据层
    database.ts          # 初始化、建表、连接管理
    conversations.ts     # 对话 CRUD
    messages.ts          # 消息 CRUD（content 存 JSON）
    settings.ts          # 键值设置存储（合并 DEFAULT_SETTINGS）
    skills.ts            # Skills 存储（builtin + user，目录 + SKILL.md）
  security/
    sender-validator.ts  # IPC sender 来源校验

preload/
  index.ts               # contextBridge 暴露 electronAPI（白名单校验）

renderer/                # React SPA（Vite root）
  index.html             # 主窗口入口（CSP: default-src 'self'）
  main.tsx               # React 挂载点
  App.tsx                # 根组件：布局 + 主题 + 事件订阅 + 自动创建新对话
  ui-window.html         # 动态 UI 窗口入口（强制 light 主题）
  ui-window-main.tsx     # UI 窗口 React 挂载点 + action 处理
  components/
    layout/              # Sidebar, MainContent, TitleBar
    chat/                # ChatView, InputBar, MessageList, MessageBubble, ToolCallBlock
    settings/            # SettingsPanel（5 tab）, GeneralSettings, ModelsSettings,
                         # ToolSettings, SkillsSettings, MCPServerList, MCPServerForm
    generative-ui/       # 动态 UI 渲染
      UIRenderer.tsx     # 递归渲染引擎（rootId → componentRegistry）
      registry.ts        # 组件类型 → React 组件映射表
      components/        # UITable, UIForm, UICard, UIButton, UIChart, UIText,
                         # UISelect, UIProgress, UIBadge, UIContainer, UIFilePicker
  store/
    conversation-store.ts  # 对话 + 消息状态、handleAgentEvent 处理流式事件
    agent-store.ts         # Agent 运行状态 (isRunning, activeSessionId, selectedModelId, selectedSkillIds)
    settings-store.ts      # 应用设置状态
    skills-store.ts        # Skills 状态（load/toggle/save/update/remove/import）
  hooks/
    useAgent.ts          # useAgentStreamSubscription + useAgent (sendMessage, interrupt, sendUIAction)
  styles/
    globals.css          # Tailwind + CSS 变量主题定义 + UI 窗口样式

shared/                  # 主进程和渲染进程共享
  constants/
    ipc-channels.ts      # 所有 IPC 通道名常量（24 个）
  types/
    ipc.ts               # IPC 负载类型 + IpcAgentEvent + ElectronAPI 接口
    settings.ts          # AppSettings, ModelConfig, SkillConfig, McpServerConfig
    conversation.ts      # Conversation, AppMessage, MessageContentBlock
    ui-schema.ts         # UISchema, 全部 UI 组件类型定义, UIAction

skills/                  # 内置 Skills（每个子目录含 SKILL.md）
  generative-ui/         # UI 渲染工具使用指南
  code-review/           # 代码审查指南
  email/                 # 邮件读写（含 IMAP/SMTP Python 脚本 + config.json）

relay-server/            # 远程控制中继服务器（独立子项目）
  dist/                  # 编译输出
    index.js             # Express + HTTP + WebSocket 服务器入口
    db.js                # SQLite 数据库（users, remote_agents, remote_conversations, remote_messages）
    auth.js              # bcrypt + JWT 认证（注册/登录/验证）
    routes/
      auth-routes.js     # POST /auth/register, POST /auth/login
      agent-routes.js    # GET/POST/DELETE /agents, GET /agents/:id/config
      conv-routes.js     # GET/POST /conversations, GET /:id/messages, PATCH /:id/title
      middleware.js      # Bearer token 认证中间件
    ws/
      relay.js           # Session 管理 + 消息双向转发 + 内容累积
      desktop-ws.js      # 桌面端 WebSocket 端点 (/desktop)
      web-ws.js          # Web 客户端 WebSocket 端点 (/web?token=<jwt>)

relay-web/               # Web 远程控制客户端（WIP）
  .env                   # VITE_RELAY_WS_URL=ws://localhost:3000
  src/                   # 前端源码（开发中）
```

## 架构与数据流

### Agent 调用链

```
用户输入 → renderer useAgent.sendMessage()
  → IPC agent:start (含 modelId?, skillIds?) → main agent-handlers.ts
    → saveMessage() + runAgentSession()
      → 从 settings.models 解析模型，从 skills 加载并注入 system prompt
      → Agent(pi-agent-core) 创建，注册工具，调用 agent.prompt()
        → Agent 订阅 AgentEvent
          → processAgentEvent() 转为 IpcAgentEvent
            → sender.send('agent:stream-event', event) 推到渲染进程
              → useAgentStreamSubscription → handleAgentEvent → 更新 store → UI 重渲染
```

### IPC 通信模式

- **Renderer → Main**: `ipcRenderer.invoke(channel, payload)` — 请求-响应，通过 preload 白名单校验
- **Main → Renderer**: `sender.send('agent:stream-event', event)` — 推送流式事件
- **Main → Renderer**: `sender.send('conversation:title-updated', { id, title })` — 推送自动生成的标题
- **Main → UI Window**: `win.webContents.send('ui-window:schema', payload)` — 推送 UISchema

**IPC 通道清单**：

| 分类 | 通道 |
|------|------|
| Agent | `agent:start` / `agent:interrupt` / `agent:stream-event` |
| Conversation | `conversation:list` / `conversation:get` / `conversation:create` / `conversation:delete` / `conversation:title-updated` |
| Messages | `messages:get` |
| Settings | `settings:get` / `settings:set` |
| Skills | `skills:list` / `skills:save` / `skills:update` / `skills:delete` / `skills:toggle` / `skills:import` |
| MCP | `mcp:list` / `mcp:add` / `mcp:remove` / `mcp:reconnect` |
| UI | `ui:action` / `ui-window:schema` / `ui-window:action` / `ui-window:get-schema` |

### 动态 UI (Generative UI) 流程

```
LLM 调用 ui_render 工具（传入 UISchema JSON）
  → Agent tool_execution → message-processor 解析 toolcall_end
    → 发出 IpcAgentEvent { type: 'ui_render', schema, renderBlockId }
      ├→ 主窗口：显示 "Dynamic UI opened in new window" 提示
      └→ openUIWindow() 创建独立 BrowserWindow
           → 根据组件内容智能估算窗口尺寸（表格按列数/行数、图表 760x520、表单按字段数等）
           → 加载 ui-window.html（强制 light 主题）
           → ready-to-show 时发送 UISchema
           → UIRenderer 根据 schema.rootId 递归渲染组件
```

### UISchema 结构

```typescript
interface UISchema {
  version: '1.0'
  rootId: string                           // 根组件 ID
  components: Record<string, UIComponent>  // 组件 ID → 组件定义
  actions?: Record<string, UIAction>       // 动作回调定义
}
```

支持的组件类型：`table` | `form` | `card` | `button` | `select` | `chart` | `text` | `progress` | `badge` | `container` | `file_picker`

### Schema 规范化 (schema-normalizer.ts)

LLM 输出的 UISchema 可能有多种变体，`normalizeUISchema()` 负责统一处理：
- 展平 `{ type, props: { ... } }` 包装为 `{ type, ... }`
- `children` → `childIds`（container/card）
- `label` → `header`（table columns）
- 文本 variant 映射：`h1-h6`/`title` → `heading`，`p`/`paragraph` → `body`
- `onClick.action`/`onClick.actionId` → `actionId`（button/select）
- 自动补全缺失的 actionId：`${id}_click` / `${id}_change` / `${id}_submit` / `${id}_pick`
- `text` 字段 → `content`（text 组件）

### Agent 工具集

| 工具 | 来源 | 用途 |
|------|------|------|
| Bash | pi-coding-agent | 执行 shell 命令 |
| Read | pi-coding-agent | 读取文件 |
| Write | pi-coding-agent | 写入文件 |
| Edit | pi-coding-agent | 编辑现有文件 |
| Glob | pi-coding-agent | 按模式查找文件 |
| Grep | pi-coding-agent | 搜索文件内容 |
| WebFetch | pi-coding-agent | 抓取网页 |
| WebSearch | pi-coding-agent | 搜索网页 |
| ui_render | 自定义 | 渲染交互式 UI（参数: schema JSON 字符串） |

### Skills 技能系统

- **存储**：builtin 位于 `skills/`（项目根）或打包后 `resources/skills`，user 位于 `userData/skills`
- **格式**：每个技能一个目录，内含 `SKILL.md` 文件
- **加载**：`listAllSkills()` 合并 builtin + user，按 `skillStates` 和 `enabled` 筛选
- **注入**：`buildSystemPromptWithSkills()` 将启用技能以 `<skill name="...">...</skill>` 形式注入 system prompt
- **前端状态**：`skills-store.ts` 管理 Skills 列表的加载、启用/禁用、增删改查、zip 导入

### 模型配置

`runner.ts` 中从 `getSetting('models')` 读取 `ModelConfig[]`，选择 `enabled === true` 的模型，或按 `modelId` 指定。

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

- `apiProtocol === 'anthropic'` 使用 anthropic API，否则使用 `openai-completions` 兼容接口
- API Key 通过 `getApiKey` 回调传给 Agent

### 标题自动生成

`title-generator.ts` 在首轮对话完成后自动调用 LLM 生成 3-8 词对话标题：
- 使用与对话相同的模型配置
- 发送首条 user + assistant 消息给独立 Agent 实例
- 通过 `CONVERSATION_TITLE_UPDATED` 通道推送标题到渲染进程
- 用 Set 缓存已生成标题的对话 ID，避免重复生成

### Relay Server 远程控制系统

独立子项目 `relay-server/`，提供通过 Web 浏览器远程控制桌面 Agent 的能力。

**架构**：

```
Web 浏览器 ──WebSocket(/web)──→ Relay Server ──WebSocket(/desktop)──→ Electron 桌面应用
                                     │
                               REST API + SQLite
                         (users, agents, conversations, messages)
```

**认证**：bcrypt 密码哈希 + JWT（30 天过期）

**WebSocket 端点**：
- `/desktop`：桌面应用连接，通过 pairing key 注册 Agent，接收 `agent_start` / `agent_interrupt` / `ui_action` 指令
- `/web?token=<jwt>`：Web 客户端连接，发送 `start_session` / `interrupt` / `ui_action`，接收 `agent_event` 流

**REST API**：
- `POST /auth/register` / `POST /auth/login` — 用户认证
- `GET/POST/DELETE /agents` — Agent 管理
- `GET /agents/:id/config` — 获取 Agent 配置（models/skills 从桌面同步）
- `GET/POST /conversations` / `GET /:id/messages` / `PATCH /:id/title` — 对话管理

**数据库表**：`users` / `remote_agents` / `remote_conversations` / `remote_messages`

**桌面端配置同步**：桌面注册时发送 `models` 和 `skills` 数组，持久化到 agent 记录的 `config_json`。

## 关键类型

### IpcAgentEvent（main → renderer 流式事件）

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

### AppMessage（持久化消息）

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

### AppSettings（应用配置）

```typescript
interface AppSettings {
  models: ModelConfig[]           // 多模型配置（每个含 id, name, baseUrl, apiKey, apiProtocol, enabled）
  skillStates: Record<string, boolean>  // Skill 启用状态
  theme: 'light' | 'dark' | 'system'
  allowedTools: string[]
  defaultCwd: string
  systemPrompt: string
  mcpServers: Record<string, McpServerConfig>
  fontSize: 'sm' | 'md' | 'lg'
  showToolDetails: boolean
}
```

### 数据库 Schema

| 表 | 列 |
|---|---|
| `conversations` | id (PK), title, created_at, updated_at, meta (JSON) |
| `messages` | id (PK), conversation_id (FK), role, content (JSON), session_id, created_at |
| `settings` | key (PK), value (JSON) |
| `mcp_servers` | name (PK), config (JSON), enabled (int), created_at |

索引：`idx_messages_conversation` on messages(conversation_id, created_at)

### Zustand Store 一览

| Store | 文件 | 主要状态 | 主要 Actions |
|-------|------|---------|-------------|
| `useConversationStore` | `conversation-store.ts` | conversations, activeConversationId, messages | loadConversations, selectConversation, createConversation, deleteConversation, addUserMessage, handleAgentEvent, updateConversationTitle |
| `useAgentStore` | `agent-store.ts` | activeSessionId, isRunning, selectedModelId, selectedSkillIds | setRunning, setIdle, setSelectedModelId, setSelectedSkillIds, toggleSkillId |
| `useSettingsStore` | `settings-store.ts` | settings (AppSettings), loaded | load, update |
| `useSkillsStore` | `skills-store.ts` | skills (SkillConfig[]), loaded | load, toggle, save, update, remove, importFromZip |

## 构建注意事项

- **ESM 依赖**: `@mariozechner/pi-`* 均为 ESM-only 包，在 `electron.vite.config.ts` 中全部外部化（不打包进 bundle，运行时由 Node.js 直接 import）
- **主进程输出**: `out/main/index.mjs`（ES 模块格式）
- **Renderer 双入口**: `index.html`（主窗口）+ `ui-window.html`（动态 UI 窗口）
- **Native 模块**: `better-sqlite3` 需与 Electron 版本匹配，`npm run rebuild` 可重新编译；`postinstall` 执行 `electron-builder install-app-deps`
- **路径别名**: `@shared` → `shared/`，`@renderer` → `renderer/`
- **CSP**: 两个 HTML 入口均设置 `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'`
- **UI 窗口主题**: `ui-window.html` 强制 light 主题，不跟随应用主题设置

## 扩展开发指南

### 添加新的 UI 组件类型

1. 在 `shared/types/ui-schema.ts` 添加组件接口（如 `UIMyComponent`），加入 `UIComponent` 联合类型
2. 在 `renderer/components/generative-ui/components/` 创建 `UIMyComponent.tsx`
3. 在 `registry.ts` 的 `componentRegistry` 中注册
4. （可选）在 `schema-normalizer.ts` 中添加该组件类型的规范化逻辑

### 添加新的 Agent 工具

1. 在 `main/agent/tools.ts` 中使用 TypeBox 定义参数 schema
2. 实现 `AgentTool` 接口（name, label, description, parameters, execute）
3. 在 `buildAgentTools()` 返回数组中加入
4. 如需在前端特殊处理，在 `message-processor.ts` 中添加拦截逻辑

### 添加新的 IPC 通道

1. `shared/constants/ipc-channels.ts` — 添加通道名常量
2. `main/ipc/` — 创建或追加 handler（`ipcMain.handle`）
3. `preload/index.ts` — 添加到白名单 + 暴露 API
4. `shared/types/ipc.ts` — 更新 `ElectronAPI` 类型
5. 渲染进程通过 `window.electronAPI.xxx` 调用

### 添加新的设置项

1. `shared/types/settings.ts` — 在 `AppSettings` 中添加字段 + 设置 `DEFAULT_SETTINGS` 默认值
2. `renderer/components/settings/GeneralSettings.tsx` 或对应 Settings 组件 — 添加 UI 控件
3. `main/` 中通过 `getSetting('newField')` 读取

### 添加新的 Skill

1. 在项目根 `skills/` 下创建子目录（如 `my-skill/`）
2. 创建 `SKILL.md` 文件，定义技能名称和内容
3. builtin 技能会自动被 `listAllSkills()` 发现；user 技能通过 Settings → Skills 的 import 导入到 `userData/skills`
