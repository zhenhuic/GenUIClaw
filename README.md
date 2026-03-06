# GenUIClaw

> AI Agent 桌面应用，核心特性是 **Generative Dynamic UI**——让 LLM 在对话中生成并渲染真正可交互的界面。另有 Relay Server 子系统支持通过 Web 浏览器远程控制桌面 Agent。

---

## 概念

大多数 AI 聊天工具只能输出文字。GenUIClaw 提出了一个不同的思路：**让 LLM 直接"画"出界面**。

当你向 Agent 提问或下达任务时，它不仅能返回文本，还能调用 `ui_render` 工具，实时生成一段 UISchema JSON，由应用在独立窗口中渲染出真正可操作的 UI 组件——表格、图表、表单、进度条、徽章……用户与这些组件的每次交互（点击按钮、提交表单、选择行）都会以结构化数据的形式回传给 Agent，驱动下一轮推理和行动。

这形成了一个 **对话 x 界面** 的闭环：

```
用户提问 → Agent 推理 → 生成 UI → 用户在界面上操作 → Agent 收到反馈 → 继续推理 → ...
```

传统聊天界面擅长处理自然语言，而 GenUIClaw 的 Generative UI 让 Agent 可以在需要时切换到可视化交互，兼顾了自然表达和精确操作的优势。

---

## 核心特性

- **Generative Dynamic UI**：LLM 通过 `ui_render` 工具动态生成交互式 UI，在独立窗口实时渲染
- **双向 UI 交互**：用户在 UI 窗口中的操作（点击、提交、选择）回传 Agent，形成对话驱动的工作流
- **多模型支持**：兼容 OpenAI 兼容接口和 Anthropic 原生 API，可同时配置多个模型
- **Skills 技能系统**：模块化技能扩展，内置代码审查、邮件读写、Generative UI 指南，支持用户自定义导入
- **MCP 服务器集成**：通过 Model Context Protocol 连接外部工具和数据源
- **本地数据存储**：对话历史、设置、技能均持久化到本地 SQLite 数据库
- **代码执行工具链**：内置编码工具集（Bash、文件读写、代码搜索、网页抓取）
- **远程控制**：通过 Relay Server + Web 客户端，在浏览器中远程操控桌面 Agent
- **智能窗口尺寸**：UI 窗口根据组件内容（表格列数/行数、图表、表单字段数）自动估算最佳尺寸
- **自动标题生成**：首轮对话完成后，LLM 自动生成 3-8 词对话标题

---

## 支持的 UI 组件

| 组件 | 用途 |
|------|------|
| `table` | 数据表格，支持排序、分页、行选择 |
| `form` | 结构化输入表单，支持文本/数字/选择/复选框/文件/日期等字段 |
| `chart` | 数据可视化，支持折线图、柱状图、面积图、饼图、散点图 |
| `card` | 内容卡片，可嵌套子组件，支持点击回调 |
| `button` | 动作按钮，支持确认弹窗、禁用状态和多种样式变体 |
| `select` | 下拉选择，支持单选/多选，即时触发回调 |
| `progress` | 进度条，带状态指示（进行中/成功/错误） |
| `badge` | 状态标签，支持多种颜色 |
| `text` | 富文本内容块，支持 heading/body/caption/code 变体 |
| `container` | 布局容器，支持横向/纵向排列，可设置间距 |
| `file_picker` | 文件选择对话框，支持文件类型过滤和多选 |

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Electron 33 + React 18 + TypeScript |
| 构建 | electron-vite (Vite 5) + Rollup，ESM 输出 |
| AI SDK | `@mariozechner/pi-agent-core` / `pi-ai` / `pi-coding-agent` |
| 状态管理 | Zustand 5 |
| 数据库 | better-sqlite3（WAL 模式） |
| 样式 | Tailwind CSS 3 + CSS 变量主题 |
| 图表 | Recharts |
| UI 原语 | Radix UI（Dialog, ScrollArea, Select, Switch, Tooltip 等） |
| Schema 验证 | Zod 4 |
| Relay Server | Express + WebSocket + JWT + bcryptjs |

---

## 快速开始

### 环境要求

- Node.js 18+
- npm 9+

### 安装

```bash
git clone <repo-url>
cd GenUIClaw
npm install
```

> `postinstall` 会自动执行 `electron-builder install-app-deps` 编译 native 模块。

### 开发模式

```bash
npm run dev
```

启动 Vite dev server 和 Electron 窗口，支持热重载。

### 生产构建

```bash
npm run build   # 构建应用
npm run start   # 运行已构建的包
```

### 重新编译 Native 模块

若升级 Electron 版本后遇到 `better-sqlite3` 报错：

```bash
npm run rebuild
```

---

## 配置模型

启动后，进入 **Settings → Models**，添加至少一个模型配置：

| 字段 | 说明 |
|------|------|
| Name | 显示名称，随意填写 |
| Base URL | API 地址（如 `https://api.openai.com` 或本地 Ollama 地址） |
| API Key | 对应服务的密钥 |
| API Protocol | `openai`（兼容接口）或 `anthropic`（原生 API） |
| Enabled | 启用后才会在对话中使用 |

支持同时配置多个模型，在发起对话时选择使用哪个。

---

## Skills 技能系统

Skills 是注入 Agent system prompt 的可插拔模块，告诉 Agent 特定场景下该如何思考和行动。

### 内置技能

| 技能 | 描述 |
|------|------|
| `generative-ui` | 教 Agent 如何使用 `ui_render` 工具构建交互式界面 |
| `code-review` | 代码审查指南，输出按严重度分级的审查报告 |
| `email` | 通过 IMAP/SMTP 读取和发送邮件 |

### 启用技能

Settings → Skills → 切换开关即可启用/禁用技能。

### 自定义技能

1. 创建一个目录，内含 `SKILL.md` 文件（文件头部可写 YAML front matter 定义 `name` 和 `description`）
2. 将目录打包成 zip 文件
3. Settings → Skills → Import → 上传 zip

技能内容会以 `<skill name="...">...</skill>` 的形式注入到每次对话的 system prompt 中。

---

## MCP 服务器

Settings → MCP Servers，配置符合 [Model Context Protocol](https://modelcontextprotocol.io) 标准的外部工具服务器（支持 stdio 和 SSE 两种连接方式），扩展 Agent 可调用的工具集。

---

## 架构概览

```
用户输入
  └─ IPC: agent:start
       └─ main/agent/runner.ts
            ├─ 加载模型配置 + 注入 Skills system prompt
            ├─ 注册工具（coding tools + ui_render）
            └─ Agent(pi-agent-core).prompt()
                 └─ 流式 AgentEvent
                      └─ IPC: agent:stream-event → 渲染进程
                           ├─ 文本增量 → MessageBubble
                           ├─ 工具调用 → ToolCallBlock
                           └─ ui_render → 独立 UI 窗口
                                └─ UIRenderer 递归渲染 UISchema
                                     └─ 用户交互 → IPC: ui:action → Agent 继续推理
```

### 远程控制架构

```
Web 浏览器 ──WebSocket(/web)──→ Relay Server ──WebSocket(/desktop)──→ Electron 桌面应用
                                     │
                               REST API + SQLite
                         (users, agents, conversations, messages)
```

---

## Relay Server 远程控制

`relay-server/` 是一个独立子项目，提供通过 Web 浏览器远程控制桌面 Agent 的能力。

### 功能

- **用户认证**：bcrypt 密码哈希 + JWT（30 天过期）
- **Agent 配对**：桌面应用通过 pairing key 注册，Web 客户端通过 JWT 连接
- **双向消息转发**：WebSocket 实时转发 Agent 事件流和用户指令
- **对话持久化**：远程对话和消息独立存储在 Relay Server 的 SQLite 中
- **配置同步**：桌面端注册时同步 models 和 skills 配置

### REST API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/register` | 用户注册 |
| POST | `/auth/login` | 用户登录，返回 JWT |
| GET | `/agents` | 获取当前用户的 Agent 列表 |
| POST | `/agents` | 注册新 Agent |
| DELETE | `/agents/:id` | 删除 Agent |
| GET | `/agents/:id/config` | 获取 Agent 配置（models/skills） |
| GET | `/conversations` | 获取对话列表 |
| POST | `/conversations` | 创建新对话 |
| GET | `/conversations/:id/messages` | 获取对话消息 |
| PATCH | `/conversations/:id/title` | 更新对话标题 |

### WebSocket 端点

- `/desktop` — 桌面应用连接端点，接收 `agent_start` / `agent_interrupt` / `ui_action` 指令
- `/web?token=<jwt>` — Web 客户端连接端点，发送操作指令，接收 `agent_event` 流

---

## 未来前景

GenUIClaw 代表的是一种对"人机交互"的重新想象：**界面不再是开发者静态编写的，而是 AI 根据上下文即时生成的**。

这个方向有若干值得探索的可能性：

### 更丰富的 UI 语义

当前 UISchema 提供了基础的布局和交互原语。未来可以扩展：
- 地图、甘特图、看板、思维导图等复杂可视化
- 富文本编辑器、代码编辑器等输入组件
- 动画与状态过渡，让界面反映任务进展

### 持久化 UI 工作区

目前每个 UI 窗口是独立的、无状态的。未来可以：
- 将 UI 状态保存到对话历史，允许重新打开
- 多个 UI 窗口协同，构成完整的"应用视图"

### Agent 驱动的工作流自动化

将 Generative UI 与 MCP 工具结合，Agent 可以：
- 调用外部 API，将结果以表格/图表呈现
- 通过表单收集参数，执行批处理任务
- 构建多步骤向导（wizard），引导用户完成复杂操作

### 技能市场

技能系统目前基于文件目录，天然适合向社区开放：
- 标准化的技能格式（SKILL.md + 脚本 + 配置）
- 可发布/分享的技能包
- 领域专属技能集（数据分析、DevOps、法律文书……）

### 本地优先 + 隐私保护

所有数据存储在本地 SQLite，模型配置支持私有部署地址（Ollama、LM Studio 等），天然契合对数据隐私有要求的场景（企业内网、个人敏感信息处理）。

---

## 扩展开发

### 添加新的 UI 组件

1. `shared/types/ui-schema.ts` — 添加组件接口，加入 `UIComponent` 联合类型
2. `renderer/components/generative-ui/components/` — 创建 React 组件
3. `renderer/components/generative-ui/registry.ts` — 注册组件类型映射
4. （可选）`main/agent/schema-normalizer.ts` — 添加该组件类型的规范化逻辑

### 添加新的 Agent 工具

1. `main/agent/tools.ts` — 用 TypeBox 定义参数 schema，实现 `AgentTool` 接口
2. `main/agent/message-processor.ts` — 如需前端特殊处理，添加拦截逻辑

### 添加新的 IPC 通道

1. `shared/constants/ipc-channels.ts` — 添加通道名常量
2. `main/ipc/` — 添加 `ipcMain.handle` 处理函数
3. `preload/index.ts` — 加入白名单并暴露 API
4. `shared/types/ipc.ts` — 更新 `ElectronAPI` 类型

### 添加新的 Skill

1. 在项目根 `skills/` 下创建子目录，内含 `SKILL.md`
2. builtin 技能自动被 `listAllSkills()` 发现
3. user 技能通过 Settings → Skills → Import 导入

---

## 项目结构速览

```
main/            # Electron 主进程（Agent 引擎、IPC、数据库、工具）
preload/         # contextBridge 安全层
renderer/        # React SPA（聊天界面、设置、Generative UI 渲染）
shared/          # 主进程和渲染进程共享的类型和常量
skills/          # 内置技能目录
relay-server/    # 远程控制中继服务器（Express + WebSocket + JWT）
relay-web/       # Web 远程控制客户端（开发中）
```

---

## License

MIT
