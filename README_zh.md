# GenUIClaw

[English Documentation](./README.md)

> AI Agent 桌面应用，核心特性是 **Generative Dynamic UI**——让 LLM 在对话中生成并渲染真正可交互的界面。

---

## 理念

大多数 AI 聊天工具只能输出文字。GenUIClaw 提出了一个不同的思路：**让 LLM 直接"画"出界面**。

当你向 Agent 提问或下达任务时，它不仅能返回文本，还能调用 `ui_render` 工具，实时生成一段 UISchema JSON，由应用在独立窗口中渲染出真正可操作的 UI 组件——表格、图表、表单、进度条、徽章……用户与这些组件的每次交互（点击按钮、提交表单、选择行）都会以结构化数据的形式回传给 Agent，驱动下一轮推理和行动。

这形成了一个 **对话 × 界面** 的闭环：

```
用户提问 → Agent 推理 → 生成 UI → 用户在界面上操作 → Agent 收到反馈 → 继续推理 → ...
```

传统聊天界面擅长处理自然语言，而 GenUIClaw 的 Generative UI 让 Agent 可以在需要时切换到可视化交互，兼顾了自然表达和精确操作的优势。

---

## 核心特性

- **Generative Dynamic UI** — LLM 通过 `ui_render` 工具动态生成交互式 UI，在独立窗口实时渲染
- **双向 UI 交互** — 用户在 UI 窗口中的操作（点击、提交、选择）回传 Agent，形成对话驱动的工作流
- **手机远程访问** — 通过中继服务器从手机浏览器访问桌面 Agent；Generative UI 在手机端以底部弹出面板形式呈现
- **多模型支持** — 兼容 OpenAI 兼容接口和 Anthropic 原生 API，可同时配置多个模型
- **Skills 技能系统** — 模块化技能扩展，注入 Agent 的 system prompt；内置 Generative UI 指南和邮件技能，支持用户通过 zip 导入自定义技能
- **MCP 服务器集成** — 通过 [Model Context Protocol](https://modelcontextprotocol.io) 连接外部工具服务器，扩展 Agent 可调用的工具集
- **本地优先存储** — 对话历史、设置、技能均持久化到本地 SQLite 数据库
- **代码执行工具链** — 内置编码工具集（Bash、文件读写、代码搜索、网页抓取/搜索）
- **智能窗口尺寸** — UI 窗口根据组件内容（表格列数/行数、图表尺寸、表单字段数）自动估算最佳尺寸
- **自动标题生成** — 首轮对话完成后，LLM 自动生成 3-8 词对话标题

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
| 中继服务器 | Go（WebSocket 桥接，用于手机访问） |
| 移动端客户端 | React + Vite SPA（通过中继服务器提供） |

---

## 快速开始

### 环境要求

- Node.js 18+
- npm 9+
- Go 1.22+（仅在运行中继服务器时需要）

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
| `email` | 通过 IMAP/SMTP 读取和发送邮件 |

### 启用/禁用

Settings → Skills → 切换开关即可。

### 自定义技能

1. 创建一个目录，内含 `SKILL.md` 文件（文件头部可写 YAML front matter 定义 `name` 和 `description`）
2. 将目录打包成 zip 文件
3. Settings → Skills → Import → 上传 zip

技能内容会以 `<skill name="...">...</skill>` 的形式注入到每次对话的 system prompt 中。

---

## MCP 服务器

Settings → MCP Servers，配置符合 [Model Context Protocol](https://modelcontextprotocol.io) 标准的外部工具服务器（支持 stdio 和 SSE 两种连接方式），扩展 Agent 可调用的工具集。

---

## 手机远程访问

GenUIClaw 支持通过**中继服务器**从手机浏览器远程访问桌面 Agent。

### 工作原理

1. **中继服务器** — 一个轻量级 Go WebSocket 桥接服务，通过设备码配对桌面端和手机端
2. **桌面端**连接到中继服务器，获得一个配对码（如 `ABC123`）
3. **手机端**在浏览器中打开中继服务器地址，输入配对码即可连接
4. 所有 IPC 调用通过 WebSocket 透明中转——手机端使用与桌面渲染进程完全相同的 API
5. Generative UI 在手机端以底部弹出面板形式呈现（而非独立窗口）

### 运行中继服务器

```bash
cd relay-server

# 方式 A：直接运行（需要 Go 1.22+）
go run .

# 方式 B：Docker
docker build -t genuiclaw-relay .
docker run -p 9527:9527 genuiclaw-relay
```

服务器默认在 `9527` 端口启动（可通过 `PORT` 环境变量配置）。

### 构建移动端客户端

```bash
npm run mobile:build    # 输出到 relay-server/static/
```

构建产物由中继服务器在 `/app/` 路径下提供服务。

### 移动端开发

```bash
npm run mobile:dev      # 开发服务器，端口 3001，支持局域网访问
```

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
                           └─ ui_render → 独立 UI 窗口（桌面端）
                                          或底部弹出面板（移动端）
                                └─ UIRenderer 递归渲染 UISchema
                                     └─ 用户交互 → IPC: ui:action → Agent 继续推理
```

---

## 项目结构

```
main/            # Electron 主进程（Agent 引擎、IPC、数据库、工具、远程连接）
preload/         # contextBridge 安全层
renderer/        # React SPA（聊天界面、设置、Generative UI 渲染）
mobile/          # 移动端 Web 客户端（React + Vite，通过中继服务器提供）
relay-server/    # Go WebSocket 中继服务器，用于手机远程访问
shared/          # 主进程和渲染进程共享的类型和常量
skills/          # 内置技能目录
```

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

## License

MIT
