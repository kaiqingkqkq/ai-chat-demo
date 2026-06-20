<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'

const inputValue = ref('')
const storedTopics = readStoredTopics()
const topics = ref(storedTopics.length > 0 ? storedTopics : [createTopic()])
const currentTopicId = ref(readStoredTopicId(topics.value))
const messages = ref(getInitialTopicMessages(topics.value, currentTopicId.value))
const isSending = ref(false)
const messageListRef = ref(null)
const shouldAutoScroll = ref(true)
const isTopicPanelOpen = ref(false)
const searchQuery = ref('')
const searchInputRef = ref(null)
const isAttachmentMenuOpen = ref(false)
const attachmentMenuRef = ref(null)
const fileInputRef = ref(null)
const imageInputRef = ref(null)
const selectedAttachments = ref([])
const currentView = ref('chat')
const loginEmail = ref('')
const loginPassword = ref('')
const loginNotice = ref('')
const loginNoticeType = ref('info')
const isLoggingIn = ref(false)
const currentUser = ref(readStoredUser())
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
const filteredTopics = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  if (!query) {
    return topics.value
  }

  return topics.value.filter(topic => {
    const titleMatched = topic.title.toLowerCase().includes(query)
    const messageMatched = topic.messages.some(message => message.content.toLowerCase().includes(query))

    return titleMatched || messageMatched
  })
})
function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('authUser'))
  } catch {
    return null
  }
}
function readStoredTopics() {
  try {
    const storedTopics = JSON.parse(localStorage.getItem('chatTopics'))

    if (!Array.isArray(storedTopics)) {
      return []
    }

    return storedTopics
      .filter(topic => topic?.id && topic?.title && Array.isArray(topic?.messages))
      .map(topic => ({
        id: topic.id,
        title: topic.title,
        messages: topic.messages.map(normalizeMessage),
        createdAt: topic.createdAt || Date.now(),
        updatedAt: topic.updatedAt || topic.createdAt || Date.now()
      }))
  } catch {
    return []
  }
}
function readStoredTopicId(topics) {
  const storedTopicId = localStorage.getItem('currentTopicId')

  if (topics.some(topic => topic.id === storedTopicId)) {
    return storedTopicId
  }

  return topics[0].id
}
function getInitialTopicMessages(topics, topicId) {
  return topics.find(topic => topic.id === topicId)?.messages || topics[0].messages
}
function createTopic() {
  return {
    id: `topic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: '新聊天',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}
function createMessage(role, content) {
  return {
    id: `message-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content
  }
}
function normalizeMessage(message) {
  return {
    id: message.id || `message-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: message.role,
    content: message.content || ''
  }
}
function persistTopics() {
  localStorage.setItem('chatTopics', JSON.stringify(topics.value))
  localStorage.setItem('currentTopicId', currentTopicId.value)
}
function getCurrentTopic() {
  return topics.value.find(topic => topic.id === currentTopicId.value)
}
function syncCurrentTopicMessages() {
  const topic = getCurrentTopic()

  if (topic) {
    topic.messages = messages.value
    topic.updatedAt = Date.now()
    persistTopics()
  }
}
function updateCurrentTopicTitle(content) {
  const topic = getCurrentTopic()

  if (!topic || topic.title !== '新聊天') {
    return
  }

  topic.title = content.length > 22 ? `${content.slice(0, 22)}...` : content
  topic.updatedAt = Date.now()
  persistTopics()
}
function toggleTopicPanel() {
  isTopicPanelOpen.value = !isTopicPanelOpen.value
}
async function openSearchPanel() {
  isTopicPanelOpen.value = true
  await nextTick()
  searchInputRef.value?.focus()
}
function startNewChat() {
  if (isSending.value) {
    return
  }

  const topic = createTopic()
  topics.value.unshift(topic)
  currentTopicId.value = topic.id
  messages.value = topic.messages
  inputValue.value = ''
  selectedAttachments.value = []
  shouldAutoScroll.value = true
  isTopicPanelOpen.value = false
  persistTopics()
}
function switchTopic(topicId) {
  if (isSending.value) {
    return
  }

  const topic = topics.value.find(topic => topic.id === topicId)

  if (!topic) {
    return
  }

  currentTopicId.value = topic.id
  messages.value = topic.messages
  inputValue.value = ''
  selectedAttachments.value = []
  shouldAutoScroll.value = true
  isTopicPanelOpen.value = false
  persistTopics()
  scrollToBottom()
}
function deleteTopic(topicId) {
  if (isSending.value) {
    return
  }

  const topic = topics.value.find(topic => topic.id === topicId)

  if (!topic) {
    return
  }

  const confirmed = window.confirm(`删除“${topic.title}”？此操作只会清除本机保存的聊天记录。`)

  if (!confirmed) {
    return
  }

  topics.value = topics.value.filter(item => item.id !== topicId)

  if (topics.value.length === 0) {
    topics.value = [createTopic()]
  }

  if (currentTopicId.value === topicId) {
    currentTopicId.value = topics.value[0].id
    messages.value = topics.value[0].messages
    inputValue.value = ''
    selectedAttachments.value = []
    shouldAutoScroll.value = true
  }

  persistTopics()
  scrollToBottom()
}
function getTopicSummary(topic) {
  const lastMessage = [...topic.messages].reverse().find(message => message.content.trim())

  if (!lastMessage) {
    return '暂无消息'
  }

  const prefix = lastMessage.role === 'user' ? '你：' : 'AI：'
  const content = lastMessage.content.replace(/\s+/g, ' ').trim()

  return `${prefix}${content}`
}
function getTopicMessageCount(topic) {
  return `${topic.messages.length} 条消息`
}
function toggleAttachmentMenu() {
  isAttachmentMenuOpen.value = !isAttachmentMenuOpen.value
}
function handlePageClick(event) {
  if (!isAttachmentMenuOpen.value) {
    return
  }

  if (attachmentMenuRef.value?.contains(event.target)) {
    return
  }

  isAttachmentMenuOpen.value = false
}
function openFilePicker() {
  isAttachmentMenuOpen.value = false
  fileInputRef.value?.click()
}
function openImagePicker() {
  isAttachmentMenuOpen.value = false
  imageInputRef.value?.click()
}
function handleAttachmentSelect(event, type) {
  const files = Array.from(event.target.files || [])

  selectedAttachments.value = files.map(file => ({
    name: file.name,
    type,
    size: file.size
  }))
  event.target.value = ''
}
function removeAttachment(index) {
  selectedAttachments.value.splice(index, 1)
}
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

  const userMessage = createMessage('user', message)
  const assistantMessage = createMessage('assistant', '')

  updateAutoScrollState()
  messages.value.push(userMessage)
  syncCurrentTopicMessages()
  updateCurrentTopicTitle(message)
  scrollToBottom()

  const requestMessages = messages.value.map(message => ({
    role: message.role,
    content: message.content
  }))
  const assistantMessageIndex = messages.value.length

  inputValue.value = ''
  selectedAttachments.value = []
  isSending.value = true
  messages.value.push(assistantMessage)
  syncCurrentTopicMessages()
  scrollToBottom()

  try {
    const response = await fetch('/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: requestMessages
      })
    })

    if (!response.ok || !response.body) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.reply || '请求后端失败，请检查后端是否启动')
    }

    const contentType = response.headers.get('Content-Type') || ''

    if (contentType.includes('application/json')) {
      const data = await response.json()
      messages.value[assistantMessageIndex].content = data.reply || ''
      syncCurrentTopicMessages()
      scrollToBottom()
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      messages.value[assistantMessageIndex].content += decoder.decode(value, { stream: true })
      syncCurrentTopicMessages()
      scrollToBottom()
    }

    messages.value[assistantMessageIndex].content += decoder.decode()
    syncCurrentTopicMessages()
    scrollToBottom()
  } catch (error) {
    messages.value[assistantMessageIndex].content = error.message || '请求后端失败，请检查后端是否启动'
    syncCurrentTopicMessages()
    scrollToBottom()

    console.error(error)
  } finally {
    isSending.value = false
    scrollToBottom()
  }
}
function handleKeydown(e) {
  if (e.isComposing || e.keyCode === 229) {
    return
  }

  if (e.key === 'Enter' && e.shiftKey === false) {
    e.preventDefault()// 阻止默认换行
    send()
  }
}
function clearChat() {
  if (isSending.value) {
    return
  }
  startNewChat()
}
function showLoginPage() {
  currentView.value = 'login'
  loginNotice.value = ''
  loginNoticeType.value = 'info'
}
function showChatPage() {
  currentView.value = 'chat'
}
async function handleLoginSubmit() {
  if (isLoggingIn.value) {
    return
  }

  loginNotice.value = ''
  loginNoticeType.value = 'info'
  isLoggingIn.value = true

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: loginEmail.value.trim(),
        password: loginPassword.value
      })
    })
    const data = await response.json()

    if (!response.ok) {
      loginNotice.value = data.message || '登录失败，请检查邮箱和密码'
      loginNoticeType.value = 'error'
      return
    }

    localStorage.setItem('authToken', data.token)
    localStorage.setItem('authUser', JSON.stringify(data.user))
    currentUser.value = data.user
    loginPassword.value = ''
    currentView.value = 'chat'
  } catch (error) {
    loginNotice.value = '登录请求失败，请检查后端是否启动'
    loginNoticeType.value = 'error'
    console.error(error)
  } finally {
    isLoggingIn.value = false
  }
}
function renderMarkdown(content) {
  return markdown.render(content)

}
onMounted(() => {
  document.addEventListener('click', handlePageClick)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', handlePageClick)
})
</script>

<template>
  <main v-if="currentView === 'chat'" class="chat-page">
    <aside class="app-sidebar" aria-label="侧边导航">
      <div class="sidebar-top">
        <div class="sidebar-brand" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path
              d="M12 2.5a4.2 4.2 0 0 0-3.9 2.6 4.2 4.2 0 0 0-5.3 5.2 4.2 4.2 0 0 0 1.5 6 4.2 4.2 0 0 0 6.4 3.2 4.2 4.2 0 0 0 6.5-2.6 4.2 4.2 0 0 0 4-5.8 4.2 4.2 0 0 0-3.5-5.9A4.2 4.2 0 0 0 12 2.5Zm-1.6 4.1 5.3 3.1v6.1l-5.3 3.1-5.3-3.1V9.7l5.3-3.1Zm1.6.9-4.5 2.6v5.2l4.5 2.6 4.5-2.6v-5.2L12 7.5Z" />
          </svg>
        </div>
        <button class="sidebar-toggle" type="button" aria-label="打开历史话题" @click="toggleTopicPanel">
          <span></span>
          <span></span>
        </button>
      </div>

      <nav class="sidebar-nav" aria-label="主要导航">
        <button class="nav-item active" type="button" :disabled="isSending" @click="clearChat">
          <span class="nav-icon">＋</span>
          <span>新聊天</span>
        </button>
        <button class="nav-item" type="button" @click="openSearchPanel">
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

      <section class="sidebar-history" aria-label="本地会话">
        <div class="sidebar-history-header">
          <h2>本地会话</h2>
          <button type="button" :disabled="isSending" @click="startNewChat">新建</button>
        </div>

        <div class="sidebar-search">
          <label class="sr-only" for="sidebar-search-input">搜索聊天</label>
          <input
            id="sidebar-search-input"
            v-model="searchQuery"
            type="search"
            placeholder="搜索聊天"
            @focus="isTopicPanelOpen = true"
          >
        </div>

        <div class="sidebar-topic-list">
          <article v-if="filteredTopics.length === 0" class="topic-empty">
            没有找到匹配的会话
          </article>
          <button
            v-for="topic in filteredTopics"
            :key="topic.id"
            class="sidebar-topic-item"
            :class="{ active: topic.id === currentTopicId }"
            type="button"
            :disabled="isSending && topic.id !== currentTopicId"
            @click="switchTopic(topic.id)"
          >
            <span class="sidebar-topic-title">{{ topic.title }}</span>
            <span class="sidebar-topic-summary">{{ getTopicSummary(topic) }}</span>
            <small>{{ getTopicMessageCount(topic) }}</small>
            <span
              class="topic-delete"
              role="button"
              tabindex="0"
              aria-label="删除会话"
              @click.stop="deleteTopic(topic.id)"
              @keydown.enter.stop.prevent="deleteTopic(topic.id)"
              @keydown.space.stop.prevent="deleteTopic(topic.id)"
            >
              ×
            </span>
          </button>
        </div>
      </section>

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
          <button type="button" @click="showLoginPage">登录</button>
        </div>
      </div>
    </aside>

    <section class="chat-main">
      <header class="chat-header">
        <button class="mobile-menu" type="button" aria-label="打开历史话题" @click="toggleTopicPanel">
          <span></span>
          <span></span>
        </button>
        <button class="model-button" type="button">
          <span>KQChat</span>
        </button>
        <div class="auth-actions">
          <button v-if="!currentUser" class="login-button" type="button" @click="showLoginPage">登录</button>
          <button v-else class="user-button" type="button">{{ currentUser.email }}</button>
          <button class="signup-button" type="button">免费注册</button>
        </div>
      </header>

      <aside class="topic-panel" :class="{ open: isTopicPanelOpen }" aria-label="历史话题">
        <div class="topic-panel-header">
          <div>
            <h2>本地会话</h2>
            <p>搜索、切换或删除本机保存的聊天</p>
          </div>
          <button type="button" aria-label="关闭历史话题" @click="toggleTopicPanel">×</button>
        </div>

        <div class="topic-search">
          <label class="sr-only" for="topic-search-input">搜索聊天</label>
          <input
            id="topic-search-input"
            ref="searchInputRef"
            v-model="searchQuery"
            type="search"
            placeholder="搜索标题或聊天内容"
          >
        </div>

        <button class="topic-new-button" type="button" :disabled="isSending" @click="startNewChat">
          <span>＋</span>
          新聊天
        </button>

        <div class="topic-list">
          <article v-if="filteredTopics.length === 0" class="topic-empty">
            没有找到匹配的会话，换个关键词试试。
          </article>
          <button
            v-for="topic in filteredTopics"
            :key="topic.id"
            class="topic-item"
            :class="{ active: topic.id === currentTopicId }"
            type="button"
            @click="switchTopic(topic.id)"
          >
            <span>{{ topic.title }}</span>
            <strong>{{ getTopicSummary(topic) }}</strong>
            <small>{{ getTopicMessageCount(topic) }}</small>
            <span
              class="topic-delete"
              role="button"
              tabindex="0"
              aria-label="删除会话"
              @click.stop="deleteTopic(topic.id)"
              @keydown.enter.stop.prevent="deleteTopic(topic.id)"
              @keydown.space.stop.prevent="deleteTopic(topic.id)"
            >
              ×
            </span>
          </button>
        </div>
      </aside>

      <div class="chat-body">
        <div v-if="messages.length === 0" class="empty-state">
          <h1>准备好了，随时开始</h1>
        </div>

        <div v-else ref="messageListRef" class="message-list" @scroll="updateAutoScrollState">
          <div v-for="message in messages" :key="message.id" class="message-row" :class="message.role">
            <div class="message-avatar">
              {{ message.role === 'user' ? '你' : 'AI' }}
            </div>
            <div v-if="message.role === 'assistant' && message.content" class="message-content markdown-body"
              v-html="renderMarkdown(message.content)">
            </div>
            <div v-else-if="message.role === 'assistant'" class="message-content typing-content">
              <span>AI 正在思考</span>
              <span class="typing-dot"></span>
              <span class="typing-dot"></span>
              <span class="typing-dot"></span>
            </div>
            <div v-else class="message-content">
              {{ message.content }}
            </div>
          </div>
        </div>
      </div>

      <footer class="chat-composer">
        <div class="composer-stack">
          <div v-if="selectedAttachments.length > 0" class="attachment-list">
            <div v-for="(attachment, index) in selectedAttachments" :key="`${attachment.name}-${index}`" class="attachment-chip">
              <span>{{ attachment.type === 'image' ? '照片' : '文件' }}</span>
              <strong>{{ attachment.name }}</strong>
              <button type="button" aria-label="移除附件" @click="removeAttachment(index)">×</button>
            </div>
          </div>

          <div ref="attachmentMenuRef" class="chat-input-area">
          <button class="add-button" type="button" aria-label="添加内容" @click="toggleAttachmentMenu">＋</button>
          <div v-if="isAttachmentMenuOpen" class="attachment-menu open">
            <button type="button" @click="openFilePicker">上传文件</button>
            <button type="button" @click="openImagePicker">上传照片</button>
          </div>
          <input
            ref="fileInputRef"
            class="file-input-hidden"
            type="file"
            multiple
            @change="handleAttachmentSelect($event, 'file')"
          >
          <input
            ref="imageInputRef"
            class="file-input-hidden"
            type="file"
            accept="image/*"
            multiple
            @change="handleAttachmentSelect($event, 'image')"
          >
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
        </div>
        <p class="legal-copy">
          ChatGPT 是 AI。使用即表示你同意我们的条款和隐私政策。聊天内容可能会被审核，并用于改进我们的 AI 模型。
          <a href="#">了解更多</a>
        </p>
      </footer>
    </section>
  </main>

  <main v-else class="login-page">
    <button class="login-back-button" type="button" @click="showChatPage">
      返回 ChatGPT
    </button>

    <section class="login-panel" aria-labelledby="login-title">
      <div class="login-logo" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path
            d="M12 2.5a4.2 4.2 0 0 0-3.9 2.6 4.2 4.2 0 0 0-5.3 5.2 4.2 4.2 0 0 0 1.5 6 4.2 4.2 0 0 0 6.4 3.2 4.2 4.2 0 0 0 6.5-2.6 4.2 4.2 0 0 0 4-5.8 4.2 4.2 0 0 0-3.5-5.9A4.2 4.2 0 0 0 12 2.5Zm-1.6 4.1 5.3 3.1v6.1l-5.3 3.1-5.3-3.1V9.7l5.3-3.1Zm1.6.9-4.5 2.6v5.2l4.5 2.6 4.5-2.6v-5.2L12 7.5Z" />
        </svg>
      </div>

      <h1 id="login-title">欢迎回来</h1>
      <p class="login-summary">登录后可保存聊天记录，并在不同设备间继续对话。</p>

      <form class="login-form" @submit.prevent="handleLoginSubmit">
        <label for="login-email">邮箱地址</label>
        <input id="login-email" v-model="loginEmail" type="email" autocomplete="email" placeholder="name@example.com"
          required>

        <label for="login-password">密码</label>
        <input id="login-password" v-model="loginPassword" type="password" autocomplete="current-password"
          placeholder="输入密码" required>

        <button class="login-submit-button" type="submit" :disabled="isLoggingIn">
          {{ isLoggingIn ? '登录中...' : '登录' }}
        </button>
      </form>

      <p v-if="loginNotice" class="login-notice" :class="loginNoticeType">{{ loginNotice }}</p>

      <div class="login-divider">
        <span>或</span>
      </div>

      <div class="login-provider-list">
        <button type="button">使用 Google 登录</button>
        <button type="button">使用 Microsoft 登录</button>
        <button type="button">使用 Apple 登录</button>
      </div>

      <p class="login-switch">
        还没有账号？
        <button type="button">免费注册</button>
      </p>
    </section>
  </main>
</template>
