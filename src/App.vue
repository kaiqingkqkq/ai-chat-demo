<script setup>
import { ref } from 'vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'

const inputValue = ref('')
const messages = ref([])
const isSending = ref(false)
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
async function send() {
  const message = inputValue.value.trim()

  if (message === '' || isSending.value) {
    return
  }

  messages.value.push({
    role: 'user',
    content: message
  })

  inputValue.value = ''
  isSending.value = true

  try {
    const response = await fetch('/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message
      })
    })

    const data = await response.json()

    messages.value.push({
      role: 'assistant',
      content: data.reply
    })
  } catch (error) {
    messages.value.push({
      role: 'assistant',
      content: '请求后端失败，请检查后端是否启动'
    })

    console.error(error)
  } finally {
    isSending.value = false
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
    <section class="chat-main">
      <header class="chat-header">
        <div class="brand-block">
          <div class="brand-mark" aria-hidden="true">AI</div>
          <div>
            <h1>AI 助手</h1>
            <p>Vue 3 + Express AI Chat</p>
          </div>
        </div>
        <button class="clear-button" :disabled="isSending" @click="clearChat">
          新聊天
        </button>
      </header>

      <div class="message-list">
        <div v-if="messages.length === 0" class="empty-state">
          <div class="empty-icon" aria-hidden="true">AI</div>
          <h2>开始一段新对话</h2>
          <p>输入问题后按 Enter 发送,Shift + Enter 可以换行。</p>
        </div>

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

      <div class="chat-input-area">
        <label class="sr-only" for="chat-input">输入消息</label>
        <textarea id="chat-input" v-model="inputValue" rows="1" placeholder="输入消息，按 Enter 发送" :disabled="isSending"
          @keydown="handleKeydown"></textarea>
        <button class="send-button" :disabled="!inputValue.trim() || isSending" @click="send">
          {{ isSending ? '发送中...' : '发送' }}
        </button>
      </div>
    </section>
  </main>
</template>
