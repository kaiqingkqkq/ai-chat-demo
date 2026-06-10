# AI Chat Demo

一个基于 Vue 3、Vite 和 Express 的 AI 聊天示例项目。前端提供简洁的聊天界面，后端通过兼容 OpenAI Chat Completions 格式的接口转发用户消息到 AI 服务。

## 功能特性

- Vue 3 聊天界面
- Express 后端 API
- Markdown 回复渲染
- 代码块高亮
- Enter 发送消息，Shift + Enter 换行
- 一键清空当前对话
- Vite 开发代理转发 `/api` 到后端服务

## 技术栈

- 前端：Vue 3、Vite、Markdown It、Highlight.js
- 后端：Node.js、Express、CORS、dotenv
- API：兼容 Chat Completions 的 AI 服务接口

## 项目结构

```text
.
├── backend/
│   ├── package.json
│   └── server.js
├── src/
│   ├── App.vue
│   ├── main.js
│   └── style.css
├── index.html
├── package.json
└── vite.config.js
```

## 环境要求

- Node.js 18 或更高版本
- npm
- 一个兼容 Chat Completions 的 AI API 服务

## 快速开始

### 1. 安装前端依赖

```bash
npm install
```

### 2. 安装后端依赖

```bash
cd backend
npm install
```

### 3. 配置后端环境变量

在 `backend` 目录下创建 `.env` 文件：

```env
AI_API_KEY=你的_API_Key
AI_API_URL=https://你的_API_服务地址
AI_MODEL=你的模型名称
```

后端会请求：

```text
${AI_API_URL}/chat/completions
```

请求格式兼容：

```json
{
  "model": "你的模型名称",
  "messages": [
    {
      "role": "user",
      "content": "用户输入"
    }
  ],
  "stream": false
}
```

### 4. 启动后端服务

在 `backend` 目录下执行：

```bash
npm start
```

默认后端地址：

```text
http://localhost:3000
```

### 5. 启动前端开发服务

回到项目根目录执行：

```bash
npm run dev
```

前端开发服务启动后，访问终端输出的本地地址即可使用。

## 构建与预览

构建生产版本：

```bash
npm run build
```

本地预览构建结果：

```bash
npm run preview
```

## API 说明

前端向后端发送请求：

```http
POST /api
Content-Type: application/json
```

请求体：

```json
{
  "message": "你好"
}
```

响应体：

```json
{
  "reply": "AI 回复内容"
}
```

## 常见问题

### 请求后端失败

请确认：

- 后端服务已通过 `npm start` 启动
- 后端运行在 `http://localhost:3000`
- 前端开发服务使用 Vite 启动

### AI 服务调用失败

请确认：

- `backend/.env` 已创建
- `AI_API_KEY`、`AI_API_URL`、`AI_MODEL` 配置正确
- AI 服务地址支持 `/chat/completions`
- API Key 具备调用当前模型的权限

## 注意事项

- `.env` 文件包含敏感信息，不要提交到 GitHub
- 当前项目只保留浏览器内存中的对话记录，刷新页面后会清空
- 当前后端接口为非流式响应，`stream` 固定为 `false`

## License

ISC
