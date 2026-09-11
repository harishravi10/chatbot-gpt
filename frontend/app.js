/**
 * AI Chatbot - Next-Gen Client Controller
 * Exact layout & UI match for https://chatbotfrontend-one.vercel.app/
 * Features: Plus Jakarta Sans design, Canvas background particles,
 * 3D Robot state reactivity, multimodal PC file upload, and Gemini streaming.
 */

// Determine API Base URL
const API_BASE_URL = (window.location.protocol.startsWith('http') && (window.location.port === '8000' || !['localhost', '127.0.0.1'].includes(window.location.hostname)))
  ? ''
  : 'http://127.0.0.1:8000';

// Application State
const state = {
  currentConversationId: null,
  conversations: [],
  currentModel: 'gemini-3.5-flash',
  isStreaming: false,
  abortController: null,
  speechSynth: window.speechSynthesis || null,
  speechRecognition: null,
  isListening: false,
  currentlySpeakingBtn: null,
  robotState: 'idle', // 'idle' | 'thinking' | 'answering'
  idleTimer: null,
  attachedFiles: [] // Array of { name, type, content, size, isImage, previewUrl }
};

// DOM Elements
const elements = {
  sidebar: document.getElementById('sidebar'),
  sidebarBackdrop: document.getElementById('sidebarBackdrop'),
  openSidebarBtn: document.getElementById('openSidebarBtn'),
  closeSidebarBtn: document.getElementById('closeSidebarBtn'),
  newChatBtn: document.getElementById('newChatBtn'),
  topNewChatBtn: document.getElementById('topNewChatBtn'),
  conversationsList: document.getElementById('conversationsList'),
  emptyHistoryNotice: document.getElementById('emptyHistoryNotice'),
  statusDot: document.getElementById('statusDot'),
  statusText: document.getElementById('statusText'),
  statusModelText: document.getElementById('statusModelText'),

  // Top Nav
  modelDropdownWrapper: document.getElementById('modelDropdownWrapper'),
  modelSelectBtn: document.getElementById('modelSelectBtn'),
  modelMenu: document.getElementById('modelMenu'),
  currentModelLabel: document.getElementById('currentModelLabel'),

  // Viewport & Hero
  chatViewport: document.getElementById('chatViewport'),
  welcomeScreen: document.getElementById('welcomeScreen'),
  messagesInner: document.getElementById('messagesInner'),
  scrollBottomBtn: document.getElementById('scrollBottomBtn'),
  suggestionsGrid: document.getElementById('suggestionsGrid'),
  heroStartBtn: document.getElementById('heroStartBtn'),
  heroExploreBtn: document.getElementById('heroExploreBtn'),

  // 3D Robot Elements
  robotDisplayImg: document.getElementById('robotDisplayImg'),
  robotStatusText: document.getElementById('robotStatusText'),

  // Controls & File Upload
  streamingControlBar: document.getElementById('streamingControlBar'),
  stopGeneratingBtn: document.getElementById('stopGeneratingBtn'),
  inputContainerWrapper: document.getElementById('inputContainerWrapper'),
  attachedFilesContainer: document.getElementById('attachedFilesContainer'),
  fileUploadInput: document.getElementById('fileUploadInput'),
  attachmentBtn: document.getElementById('attachmentBtn'),
  voiceMicBtn: document.getElementById('voiceMicBtn'),
  promptInput: document.getElementById('promptInput'),
  sendBtn: document.getElementById('sendBtn'),
  bgCanvas: document.getElementById('bgCanvas')
};

/* ==========================================================================
   Initialization
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initCanvasParticles();
  initRobotState();
  initSidebar();
  initFileUpload();
  initVoiceRecognition();
  initEventListeners();
  checkBackendHealth();
  loadConversations();
});

/* ==========================================================================
   Interactive Background Particle Canvas
   ========================================================================== */
function initCanvasParticles() {
  const canvas = elements.bgCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  const count = Math.min(Math.floor(width / 35), 35);

  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 2 + 1,
      color: ['rgba(66, 133, 244, 0.25)', 'rgba(147, 51, 234, 0.2)', 'rgba(52, 168, 83, 0.2)'][i % 3]
    });
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();

      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
        if (dist < 130) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(66, 133, 244, ${0.12 * (1 - dist / 130)})`;
          ctx.lineWidth = 0.75;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(animate);
  }
  animate();
}

/* ==========================================================================
   3D Robot Companion State Engine
   ========================================================================== */
function initRobotState() {
  setRobotState('idle');
  // Preload robot images
  ['assets/robot_idle.jpg', 'assets/robot_thinking.jpg', 'assets/robot_answering.jpg'].forEach(src => {
    const img = new Image();
    img.src = src;
  });
}

function setRobotState(stateName) {
  state.robotState = stateName;
  if (state.idleTimer) {
    clearTimeout(state.idleTimer);
    state.idleTimer = null;
  }

  const companion = document.getElementById('floatingRobotCompanion');
  if (companion) {
    companion.classList.remove('thinking', 'answering');
    if (stateName === 'thinking') companion.classList.add('thinking');
    if (stateName === 'answering') companion.classList.add('answering');
  }

  let src = 'assets/robot_idle.jpg';
  let label = 'Ready';

  if (stateName === 'thinking') {
    src = 'assets/robot_thinking.jpg';
    label = 'Thinking...';
  } else if (stateName === 'answering') {
    src = 'assets/robot_answering.jpg';
    label = 'Answering...';
  }

  if (elements.robotDisplayImg) {
    elements.robotDisplayImg.src = src;
  }
  if (elements.robotStatusText) {
    elements.robotStatusText.textContent = label;
  }

  // Also update active streaming assistant row avatar if present
  const activeAssistantAvatar = document.querySelector('.message-row.assistant:last-child .message-avatar.assistant img');
  if (activeAssistantAvatar) {
    activeAssistantAvatar.src = src;
  }
}

/* ==========================================================================
   Sidebar Management
   ========================================================================== */
function initSidebar() {
  elements.openSidebarBtn.addEventListener('click', () => {
    elements.sidebar.classList.remove('closed');
    elements.sidebarBackdrop.style.display = 'block';
  });

  elements.closeSidebarBtn.addEventListener('click', closeSidebar);
  elements.sidebarBackdrop.addEventListener('click', closeSidebar);
}

function closeSidebar() {
  elements.sidebar.classList.add('closed');
  elements.sidebarBackdrop.style.display = 'none';
}

/* ==========================================================================
   PC File Upload Engine (Supports Images, Code, PDFs, CSV, Text)
   ========================================================================== */
function initFileUpload() {
  if (!elements.attachmentBtn || !elements.fileUploadInput) return;

  elements.attachmentBtn.addEventListener('click', () => {
    elements.fileUploadInput.click();
  });

  elements.fileUploadInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds 20MB limit.`);
        continue;
      }
      await processSelectedFile(file);
    }

    elements.fileUploadInput.value = '';
    renderAttachedFilesPreview();
    updateSendButtonState();
  });
}

function processSelectedFile(file) {
  return new Promise((resolve) => {
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    const reader = new FileReader();

    if (isImage || isPdf) {
      reader.onload = () => {
        state.attachedFiles.push({
          name: file.name,
          type: file.type || (isImage ? 'image/jpeg' : 'application/pdf'),
          content: reader.result,
          size: file.size,
          isImage: isImage,
          previewUrl: isImage ? reader.result : null
        });
        resolve();
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = () => {
        state.attachedFiles.push({
          name: file.name,
          type: file.type || 'text/plain',
          content: reader.result,
          size: file.size,
          isImage: false,
          previewUrl: null
        });
        resolve();
      };
      reader.readAsText(file);
    }
  });
}

function renderAttachedFilesPreview() {
  if (!elements.attachedFilesContainer) return;

  if (state.attachedFiles.length === 0) {
    elements.attachedFilesContainer.style.display = 'none';
    elements.attachedFilesContainer.innerHTML = '';
    return;
  }

  elements.attachedFilesContainer.style.display = 'flex';
  elements.attachedFilesContainer.innerHTML = '';

  state.attachedFiles.forEach((file, index) => {
    const chip = document.createElement('div');
    chip.className = 'file-preview-chip';

    let iconOrThumb = '';
    if (file.isImage && file.previewUrl) {
      iconOrThumb = `<img src="${file.previewUrl}" class="file-chip-thumb" alt="${escapeHtml(file.name)}">`;
    } else {
      iconOrThumb = `<div class="file-chip-icon"><i class="fa-solid fa-file-code"></i></div>`;
    }

    const sizeKb = (file.size / 1024).toFixed(1);

    chip.innerHTML = `
      ${iconOrThumb}
      <span style="font-weight:600;max-width:130px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(file.name)}</span>
      <span style="color:var(--text-muted);font-size:11px;">${sizeKb} KB</span>
      <button class="file-chip-remove" data-index="${index}" title="Remove file"><i class="fa-solid fa-xmark"></i></button>
    `;

    chip.querySelector('.file-chip-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      state.attachedFiles.splice(index, 1);
      renderAttachedFilesPreview();
      updateSendButtonState();
    });

    elements.attachedFilesContainer.appendChild(chip);
  });
}

function updateSendButtonState() {
  const hasText = elements.promptInput.value.trim().length > 0;
  const hasFiles = state.attachedFiles.length > 0;
  elements.sendBtn.disabled = !(hasText || hasFiles);
}

/* ==========================================================================
   Backend Health Check
   ========================================================================== */
async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    if (res.ok) {
      const data = await res.json();
      elements.statusDot.className = 'status-dot online';
      elements.statusText.textContent = 'Backend: Online';
      if (elements.statusModelText) {
        elements.statusModelText.textContent = data.default_model || 'Gemini 3.5 Flash';
      }
    } else {
      throw new Error("Bad response");
    }
  } catch (err) {
    elements.statusDot.className = 'status-dot offline';
    elements.statusText.textContent = 'Backend: Offline';
  }
}

/* ==========================================================================
   Conversations History
   ========================================================================== */
async function loadConversations() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/conversations`);
    if (!res.ok) return;
    state.conversations = await res.json();
    renderConversationsList();
  } catch (err) {
    console.error("Failed to load conversations:", err);
  }
}

function renderConversationsList() {
  elements.conversationsList.innerHTML = '';
  if (!state.conversations || state.conversations.length === 0) {
    elements.emptyHistoryNotice.style.display = 'block';
    return;
  }
  elements.emptyHistoryNotice.style.display = 'none';

  state.conversations.forEach(conv => {
    const item = document.createElement('div');
    item.className = `conv-item ${conv.id === state.currentConversationId ? 'active' : ''}`;
    item.setAttribute('data-id', conv.id);

    item.innerHTML = `
      <span class="conv-title" title="${escapeHtml(conv.title)}">${escapeHtml(conv.title)}</span>
      <button class="delete-conv-btn" title="Delete conversation"><i class="fa-solid fa-xmark"></i></button>
    `;

    item.addEventListener('click', (e) => {
      if (e.target.closest('.delete-conv-btn')) return;
      selectConversation(conv.id);
      closeSidebar();
    });

    const delBtn = item.querySelector('.delete-conv-btn');
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteConversation(conv.id);
    });

    elements.conversationsList.appendChild(item);
  });
}

async function selectConversation(convId) {
  if (state.isStreaming) return;
  state.currentConversationId = convId;
  renderConversationsList();

  try {
    const res = await fetch(`${API_BASE_URL}/api/conversations/${convId}`);
    if (!res.ok) throw new Error("Conversation not found");
    const data = await res.json();
    if (data.model) setModel(data.model);
    renderMessages(data.messages || []);
  } catch (err) {
    console.error("Failed to load conversation:", err);
  }
}

function startNewChat() {
  if (state.isStreaming) return;
  state.currentConversationId = null;
  elements.messagesInner.innerHTML = '';
  elements.messagesInner.style.display = 'none';
  elements.welcomeScreen.style.display = 'flex';
  elements.promptInput.value = '';
  elements.promptInput.style.height = 'auto';
  state.attachedFiles = [];
  renderAttachedFilesPreview();
  updateSendButtonState();
  elements.promptInput.focus();
  setRobotState('idle');
  renderConversationsList();
}

async function deleteConversation(convId) {
  if (!confirm("Delete this conversation?")) return;
  try {
    const res = await fetch(`${API_BASE_URL}/api/conversations/${convId}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      if (state.currentConversationId === convId) startNewChat();
      await loadConversations();
    }
  } catch (err) {
    console.error("Failed to delete chat:", err);
  }
}

/* ==========================================================================
   Chat Messages & Layout
   ========================================================================== */
function renderMessages(messages) {
  elements.messagesInner.innerHTML = '';
  if (!messages || messages.length === 0) {
    elements.welcomeScreen.style.display = 'flex';
    elements.messagesInner.style.display = 'none';
    setRobotState('idle');
    return;
  }

  elements.welcomeScreen.style.display = 'none';
  elements.messagesInner.style.display = 'flex';

  messages.forEach(msg => {
    appendMessageCard(msg.role, msg.content, msg.id, false);
  });

  scrollToBottom();
}

function appendMessageCard(role, content, msgId = null, isStreaming = false, files = null) {
  elements.welcomeScreen.style.display = 'none';
  elements.messagesInner.style.display = 'flex';

  const row = document.createElement('div');
  row.className = `message-row ${role}`;
  if (msgId) row.id = `msg-${msgId}`;

  // Avatar matching Vercel
  if (role === 'assistant') {
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar assistant';
    avatar.innerHTML = `<img src="assets/robot_idle.jpg" alt="AI">`;
    row.appendChild(avatar);
  }

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';

  // Files preview inside user bubble
  if (role === 'user' && files && files.length > 0) {
    const filesWrap = document.createElement('div');
    filesWrap.style.display = 'flex';
    filesWrap.style.flexWrap = 'wrap';
    filesWrap.style.gap = '6px';
    filesWrap.style.marginBottom = '6px';

    files.forEach(f => {
      if (f.isImage && f.previewUrl) {
        const img = document.createElement('img');
        img.src = f.previewUrl;
        img.style.maxWidth = '180px';
        img.style.maxHeight = '140px';
        img.style.borderRadius = '8px';
        filesWrap.appendChild(img);
      } else {
        const badge = document.createElement('span');
        badge.style.fontSize = '11.5px';
        badge.style.padding = '2px 8px';
        badge.style.borderRadius = '6px';
        badge.style.background = 'rgba(255,255,255,0.15)';
        badge.innerHTML = `<i class="fa-solid fa-paperclip"></i> ${escapeHtml(f.name)}`;
        filesWrap.appendChild(badge);
      }
    });
    bubble.appendChild(filesWrap);
  }

  const contentBox = document.createElement('div');
  contentBox.className = 'markdown-content';

  if (role === 'assistant') {
    contentBox.innerHTML = renderMarkdown(content) + (isStreaming ? '<span class="typing-dots"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></span>' : '');
  } else {
    contentBox.textContent = content;
  }

  bubble.appendChild(contentBox);

  // Message Actions for Assistant
  if (role === 'assistant' && !isStreaming && content) {
    const actions = createMessageActions(content);
    bubble.appendChild(actions);
  }

  row.appendChild(bubble);

  if (role === 'user') {
    const userAvatar = document.createElement('div');
    userAvatar.className = 'message-avatar user';
    userAvatar.innerHTML = '<i class="fa-solid fa-user" style="font-size: 13px;"></i>';
    row.appendChild(userAvatar);
  }

  elements.messagesInner.appendChild(row);
  attachCodeBlockEvents(contentBox);
  return { row, contentBox, bubble };
}

function createMessageActions(text) {
  const actions = document.createElement('div');
  actions.className = 'message-actions';

  const copyBtn = document.createElement('button');
  copyBtn.className = 'msg-action-btn';
  copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
      setTimeout(() => {
        copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
      }, 2000);
    });
  });

  const speakBtn = document.createElement('button');
  speakBtn.className = 'msg-action-btn';
  speakBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i> Read';
  speakBtn.addEventListener('click', () => {
    toggleSpeech(text, speakBtn);
  });

  actions.appendChild(copyBtn);
  actions.appendChild(speakBtn);
  return actions;
}

/* ==========================================================================
   Real-Time Streaming Engine with 3D Robot State Reactivity
   ========================================================================== */
async function sendMessage(textToSend = null) {
  let text = textToSend || elements.promptInput.value.trim();
  const attachedFiles = [...state.attachedFiles];

  if (!text && attachedFiles.length > 0) {
    text = "Please analyze and explain the attached files.";
  }

  if (!text || state.isStreaming) return;

  // Reset input & files
  elements.promptInput.value = '';
  elements.promptInput.style.height = 'auto';
  state.attachedFiles = [];
  renderAttachedFilesPreview();
  updateSendButtonState();

  appendMessageCard('user', text, null, false, attachedFiles);
  scrollToBottom();

  // 1. Trigger 3D Robot Thinking State
  setRobotState('thinking');

  state.isStreaming = true;
  elements.streamingControlBar.style.display = 'flex';
  state.abortController = new AbortController();

  const { contentBox, bubble } = appendMessageCard('assistant', '', null, true);
  scrollToBottom();

  let accumulatedText = '';
  let hasTransitionedToAnswering = false;

  try {
    const payload = {
      conversation_id: state.currentConversationId,
      message: text,
      model: state.currentModel,
      files: attachedFiles.map(f => ({
        name: f.name,
        type: f.type,
        content: f.content,
        size: f.size
      }))
    };

    const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: state.abortController.signal
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.detail || `Server error ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const block of lines) {
        const trimmed = block.trim();
        if (!trimmed.startsWith('data:')) continue;

        try {
          const jsonStr = trimmed.replace(/^data:\s*/, '');
          const event = JSON.parse(jsonStr);

          if (event.type === 'init') {
            state.currentConversationId = event.conversation_id;
            loadConversations();
          } else if (event.type === 'chunk') {
            accumulatedText += event.token;

            // 2. Transition 3D Robot to Answering State
            if (!hasTransitionedToAnswering) {
              hasTransitionedToAnswering = true;
              setRobotState('answering');
            }

            contentBox.innerHTML = renderMarkdown(accumulatedText) + '<span class="typing-dots"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></span>';
            attachCodeBlockEvents(contentBox);
            autoScrollNearBottom();
          } else if (event.type === 'done') {
            state.currentConversationId = event.conversation_id;
            loadConversations();
          } else if (event.type === 'error') {
            accumulatedText += `\n\n> ⚠️ **Notice:** ${event.error}`;
            contentBox.innerHTML = renderMarkdown(accumulatedText);
          }
        } catch (parseErr) {
          // ignore malformed SSE frames
        }
      }
    }

    // Final clean render
    contentBox.innerHTML = renderMarkdown(accumulatedText);
    attachCodeBlockEvents(contentBox);

    const actions = createMessageActions(accumulatedText);
    bubble.appendChild(actions);

  } catch (err) {
    if (err.name === 'AbortError') {
      contentBox.innerHTML = renderMarkdown(accumulatedText + '\n\n*(Generation stopped)*');
    } else {
      contentBox.innerHTML = renderMarkdown(`> ⚠️ **Notice:** ${err.message}`);
    }
  } finally {
    state.isStreaming = false;
    state.abortController = null;
    elements.streamingControlBar.style.display = 'none';
    elements.promptInput.focus();
    scrollToBottom();

    state.idleTimer = setTimeout(() => {
      setRobotState('idle');
    }, 4500);
  }
}

function stopGenerating() {
  if (state.abortController) {
    state.abortController.abort();
  }
}

/* ==========================================================================
   Voice Dictation (Speech-to-Text)
   ========================================================================== */
function initVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  state.speechRecognition = new SpeechRecognition();
  state.speechRecognition.continuous = false;
  state.speechRecognition.interimResults = false;
  state.speechRecognition.lang = 'en-US';

  state.speechRecognition.onstart = () => {
    state.isListening = true;
    elements.voiceMicBtn.classList.add('listening');
    elements.promptInput.placeholder = "Listening... Speak your prompt";
  };

  state.speechRecognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    elements.promptInput.value = transcript;
    elements.promptInput.style.height = 'auto';
    elements.promptInput.style.height = `${Math.min(elements.promptInput.scrollHeight, 160)}px`;
    updateSendButtonState();
  };

  state.speechRecognition.onerror = () => stopListening();
  state.speechRecognition.onend = () => stopListening();

  elements.voiceMicBtn.addEventListener('click', () => {
    if (state.isListening) {
      state.speechRecognition.stop();
    } else {
      state.speechRecognition.start();
    }
  });
}

function stopListening() {
  state.isListening = false;
  if (elements.voiceMicBtn) elements.voiceMicBtn.classList.remove('listening');
  elements.promptInput.placeholder = "Type your message here...";
}

/* ==========================================================================
   Speech Synthesis
   ========================================================================== */
function toggleSpeech(text, buttonElement) {
  if (!state.speechSynth) return;

  if (state.speechSynth.speaking) {
    state.speechSynth.cancel();
    if (state.currentlySpeakingBtn) {
      state.currentlySpeakingBtn.classList.remove('speaking');
      state.currentlySpeakingBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i> Read';
    }
    if (state.currentlySpeakingBtn === buttonElement) {
      state.currentlySpeakingBtn = null;
      return;
    }
  }

  const cleanText = text
    .replace(/```[\s\S]*?```/g, 'Code snippet omitted.')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*#_~]/g, '')
    .trim();

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = 1.05;
  utterance.pitch = 1.0;

  utterance.onend = () => {
    buttonElement.classList.remove('speaking');
    buttonElement.innerHTML = '<i class="fa-solid fa-volume-high"></i> Read';
    state.currentlySpeakingBtn = null;
  };

  utterance.onerror = () => {
    buttonElement.classList.remove('speaking');
    buttonElement.innerHTML = '<i class="fa-solid fa-volume-high"></i> Read';
    state.currentlySpeakingBtn = null;
  };

  buttonElement.classList.add('speaking');
  buttonElement.innerHTML = '<i class="fa-solid fa-pause"></i> Stop';
  state.currentlySpeakingBtn = buttonElement;

  state.speechSynth.speak(utterance);
}

/* ==========================================================================
   Markdown Parsing & Code Highlighting
   ========================================================================== */
function renderMarkdown(md) {
  if (!md) return '';

  const codeBlocks = [];
  let html = md.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push({ lang: lang || 'code', code: code.trim() });
    return placeholder;
  });

  html = escapeHtml(html);

  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');
  html = html.replace(/`([^`]+)`/g, '<span class="inline-code">$1</span>');
  html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

  html = html.replace(/^\s*[-*]\s+(.*$)/gim, '<ul><li>$1</li></ul>');
  html = html.replace(/<\/ul>\s*<ul>/gim, '');
  html = html.replace(/^\s*\d+\.\s+(.*$)/gim, '<ol><li>$1</li></ol>');
  html = html.replace(/<\/ol>\s*<ol>/gim, '');

  html = html.replace(/\n\n+/g, '</p><p>');
  html = `<p>${html}</p>`;
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/\n/g, '<br>');

  codeBlocks.forEach((block, idx) => {
    const placeholder = `__CODE_BLOCK_${idx}__`;
    const escapedCode = escapeHtml(block.code);
    const blockMarkup = `
      <div class="code-block-wrapper">
        <div class="code-header">
          <span>${escapeHtml(block.lang)}</span>
          <button class="copy-code-btn" data-code="${encodeURIComponent(block.code)}">
            <i class="fa-regular fa-copy"></i>
            <span>Copy</span>
          </button>
        </div>
        <pre class="code-block"><code>${escapedCode}</code></pre>
      </div>
    `;
    html = html.replace(placeholder, blockMarkup);
  });

  return html;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function attachCodeBlockEvents(container) {
  const copyButtons = container.querySelectorAll('.copy-code-btn');
  copyButtons.forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const rawCode = decodeURIComponent(btn.getAttribute('data-code'));
      navigator.clipboard.writeText(rawCode).then(() => {
        btn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Copied!</span>';
        setTimeout(() => {
          btn.innerHTML = '<i class="fa-regular fa-copy"></i> <span>Copy</span>';
        }, 2000);
      });
    };
  });
}

/* ==========================================================================
   Model Selection
   ========================================================================== */
function setModel(modelId) {
  state.currentModel = modelId;
  const item = elements.modelMenu.querySelector(`[data-model="${modelId}"]`);
  if (item) {
    elements.modelMenu.querySelectorAll('.dropdown-item').forEach(el => el.classList.remove('active'));
    item.classList.add('active');
    const title = item.querySelector('.dropdown-item-title').textContent;
    elements.currentModelLabel.textContent = title;
  }
}

/* ==========================================================================
   Scroll Helpers
   ========================================================================== */
function scrollToBottom() {
  elements.chatViewport.scrollTo({
    top: elements.chatViewport.scrollHeight,
    behavior: 'smooth'
  });
}

function autoScrollNearBottom() {
  const threshold = 140;
  const isNear = elements.chatViewport.scrollHeight - elements.chatViewport.scrollTop - elements.chatViewport.clientHeight < threshold;
  if (isNear) {
    elements.chatViewport.scrollTop = elements.chatViewport.scrollHeight;
  }
}

/* ==========================================================================
   Event Listeners
   ========================================================================== */
function initEventListeners() {
  elements.newChatBtn.addEventListener('click', startNewChat);
  elements.topNewChatBtn.addEventListener('click', startNewChat);

  // Suggestions Grid
  elements.suggestionsGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.suggestion-card');
    if (!card) return;
    const prompt = card.getAttribute('data-prompt');
    if (prompt) sendMessage(prompt);
  });

  // Hero Buttons
  elements.heroStartBtn.addEventListener('click', () => {
    elements.promptInput.focus();
  });

  elements.heroExploreBtn.addEventListener('click', () => {
    const firstCard = elements.suggestionsGrid.querySelector('.suggestion-card');
    if (firstCard) {
      const prompt = firstCard.getAttribute('data-prompt');
      sendMessage(prompt);
    }
  });

  // Prompt Auto-expand & Send
  elements.promptInput.addEventListener('input', () => {
    elements.promptInput.style.height = 'auto';
    elements.promptInput.style.height = `${Math.min(elements.promptInput.scrollHeight, 160)}px`;
    updateSendButtonState();
  });

  elements.promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!elements.sendBtn.disabled) {
        sendMessage();
      }
    }
  });

  elements.sendBtn.addEventListener('click', () => sendMessage());
  elements.stopGeneratingBtn.addEventListener('click', stopGenerating);

  // Model Dropdown
  elements.modelSelectBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.modelDropdownWrapper.classList.toggle('open');
  });

  elements.modelMenu.addEventListener('click', (e) => {
    const item = e.target.closest('.dropdown-item');
    if (!item) return;
    const model = item.getAttribute('data-model');
    setModel(model);
    elements.modelDropdownWrapper.classList.remove('open');
  });

  window.addEventListener('click', () => {
    elements.modelDropdownWrapper.classList.remove('open');
  });

  // Scroll Bottom Button
  elements.chatViewport.addEventListener('scroll', () => {
    const isUp = elements.chatViewport.scrollHeight - elements.chatViewport.scrollTop - elements.chatViewport.clientHeight > 180;
    elements.scrollBottomBtn.style.display = isUp ? 'flex' : 'none';
  });

  elements.scrollBottomBtn.addEventListener('click', scrollToBottom);
}
