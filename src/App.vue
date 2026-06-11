<script setup>
import { nextTick, ref } from 'vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'

const inputValue = ref('')
const messages = ref([])
const isSending = ref(false)
const messageListRef = ref(null)
const shouldAutoScroll = ref(true)
const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return `<pre class="hljs"><code>${hljs.highlight(code, { language: lang }).value}</code></pre>`
    }
    return `<pre class="hljs"><code>${hljs.highlightAuto(code).value}</code></pre>`
  }
})
function isNearBottom(element) {
  return element.scrollHeight - element.scrollTop - element.clientHeight < 80
}
function updateAutoScrollState() {
  const messageList = messageListRef.value

  if (!messageList) {
    shouldAutoScroll.value = true
    return
  }

  shouldAutoScroll.value = isNearBottom(messageList)
}
async function scrollToBottom() {
  if (!shouldAutoScroll.value) {
    return
  }

  await nextTick()

  const messageList = messageListRef.value
  if (messageList) {
    messageList.scrollTop = messageList.scrollHeight
  }
}
async function send() {
  const message = inputValue.value.trim()

  if (message === '' || isSending.value) {
    return
  }

  const userMessage = {
    role: 'user',
    content: message
  }
  updateAutoScrollState()
  messages.value.push(userMessage)
  scrollToBottom()

  inputValue.value = ''
  isSending.value = true
  scrollToBottom()

  try {
    const response = await fetch('/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: messages.value.map(message => ({
          role: message.role,
          content: message.content
        }))
      })
    })

    const data = await response.json()

    messages.value.push({
      role: 'assistant',
      content: data.reply
    })
    scrollToBottom()
  } catch (error) {
    messages.value.push({
      role: 'assistant',
      content: '请求后端失败，请检查后端是否启动'
    })
    scrollToBottom()

    console.error(error)
  } finally {
    isSending.value = false
    scrollToBottom()
  }
}
function handleKeydown(e) {
  if (e.key === 'Enter' && e.shiftKey === false) {
    e.preventDefault()// 阻止默认换行
    send()
  }
}
function clearChat() {
  if (isSending.value) {
    return
  }
  messages.value = []
  inputValue.value = ''
}
function renderMarkdown(content) {
  return markdown.render(content)

}
</script>

<template>
  <main class="chat-page">
    <aside class="app-sidebar" aria-label="侧边导航">
      <div class="sidebar-top">
        <div class="sidebar-brand" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path
              d="M12 2.5a4.2 4.2 0 0 0-3.9 2.6 4.2 4.2 0 0 0-5.3 5.2 4.2 4.2 0 0 0 1.5 6 4.2 4.2 0 0 0 6.4 3.2 4.2 4.2 0 0 0 6.5-2.6 4.2 4.2 0 0 0 4-5.8 4.2 4.2 0 0 0-3.5-5.9A4.2 4.2 0 0 0 12 2.5Zm-1.6 4.1 5.3 3.1v6.1l-5.3 3.1-5.3-3.1V9.7l5.3-3.1Zm1.6.9-4.5 2.6v5.2l4.5 2.6 4.5-2.6v-5.2L12 7.5Z" />
          </svg>
        </div>
        <button class="sidebar-toggle" type="button" aria-label="折叠侧边栏">
          <span></span>
          <span></span>
        </button>
      </div>

      <nav class="sidebar-nav" aria-label="主要导航">
        <button class="nav-item active" type="button" :disabled="isSending" @click="clearChat">
          <span class="nav-icon">＋</span>
          <span>新聊天</span>
        </button>
        <button class="nav-item" type="button">
          <span class="nav-icon">⌕</span>
          <span>搜索聊天</span>
        </button>
        <button class="nav-item" type="button">
          <span class="nav-icon">□</span>
          <span>图片</span>
        </button>
        <button class="nav-item" type="button">
          <span class="nav-icon">⌘</span>
          <span>应用</span>
        </button>
        <button class="nav-item" type="button">
          <span class="nav-icon">⌁</span>
          <span>深度研究</span>
        </button>
      </nav>

      <div class="sidebar-footer">
        <button class="nav-item" type="button">
          <span class="nav-icon">◇</span>
          <span>查看套餐和定价</span>
        </button>
        <button class="nav-item" type="button">
          <span class="nav-icon">⚙</span>
          <span>设置</span>
        </button>
        <button class="nav-item" type="button">
          <span class="nav-icon">?</span>
          <span>帮助</span>
        </button>

        <div class="login-card">
          <h2>获取为你量身定制的回复</h2>
          <p>登录以获取基于已保存聊天的回答，并可创建图片和上传文件。</p>
          <button type="button">登录</button>
        </div>
      </div>
    </aside>

    <section class="chat-main">
      <header class="chat-header">
        <button class="mobile-menu" type="button" aria-label="打开菜单">
          <span></span>
          <span></span>
        </button>
        <button class="model-button" type="button">
          <span>ChatGPT</span>
          <span class="chevron">⌄</span>
        </button>
        <div class="auth-actions">
          <button class="login-button" type="button">登录</button>
          <button class="signup-button" type="button">免费注册</button>
        </div>
      </header>

      <div class="chat-body">
        <div v-if="messages.length === 0" class="empty-state">
          <h1>准备好了，随时开始</h1>
        </div>

        <div v-else ref="messageListRef" class="message-list" @scroll="updateAutoScrollState">
          <div v-for="message in messages" :key="message.content" class="message-row" :class="message.role">
            <div class="message-avatar">
              {{ message.role === 'user' ? '你' : 'AI' }}
            </div>
            <div v-if="message.role === 'assistant'" class="message-content markdown-body"
              v-html="renderMarkdown(message.content)">
            </div>
            <div v-else class="message-content">
              {{ message.content }}
            </div>
          </div>

          <div v-if="isSending" class="message-row assistant">
            <div class="message-avatar">AI</div>
            <div class="message-content typing-content">
              <span>AI 正在思考</span>
              <span class="typing-dot"></span>
              <span class="typing-dot"></span>
              <span class="typing-dot"></span>
            </div>
          </div>
        </div>
      </div>

      <footer class="chat-composer">
        <div class="chat-input-area">
          <button class="add-button" type="button" aria-label="添加内容">＋</button>
          <label class="sr-only" for="chat-input">输入消息</label>
          <textarea id="chat-input" v-model="inputValue" rows="1" placeholder="有问题，尽管问" :disabled="isSending"
            @keydown="handleKeydown"></textarea>
          <button class="mic-button" type="button" aria-label="语音输入">⌕</button>
          <button class="voice-button" type="button">
            <span class="voice-bars" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </span>
            <span>语音</span>
          </button>
          <button class="send-button" :disabled="!inputValue.trim() || isSending" @click="send">
            {{ isSending ? '发送中' : '发送' }}
          </button>
        </div>
        <p class="legal-copy">
          ChatGPT 是 AI。使用即表示你同意我们的条款和隐私政策。聊天内容可能会被审核，并用于改进我们的 AI 模型。
          <a href="#">了解更多</a>
        </p>
      </footer>
    </section>
  </main>
</template>
