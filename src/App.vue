<script setup>
import { ref } from 'vue'
const inputValue = ref('')
const messages = ref([])
const isSending = ref(false)

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
    const response = await fetch('/api/chat', {
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
</script>

<template>
  <main class="chat-page">
    <section class="chat-main">
      <header class="chat-header">
        <div>
          <h1>AI 助手</h1>
          <p>Vue 3 + Express AI Chat</p>
        </div>
        <button class="clear-button" :disabled="isSending" @click="clearChat">
          新聊天
        </button>
      </header>

      <div class="message-list">
        <div v-for="message in messages" :key="message.content" class="message-row" :class="message.role">
          <div class="message-avatar">
            {{ message.role === 'user' ? '你' : 'AI' }}
          </div>
          <div class="message-content">
            {{ message.content }}
          </div>
        </div>
        <div v-if="isSending" class="message-row assistant">
          <div class="message-avatar">AI</div>
          <div class="message-content">AI 正在思考...</div>
        </div>
      </div>
      <div class="chat-input-area">
        <textarea v-model="inputValue" placeholder="输入消息,按Enter发送" :disabled="isSending" @keydown="handleKeydown">
        </textarea>
        <button :disabled="!inputValue.trim() || isSending" @click="send">
          {{ isSending ? '发送中...' : '发送' }}
        </button>
      </div>
    </section>
  </main>
</template>
