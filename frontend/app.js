/**
 * NEXA AI - Futuristic 3D Reactive AI Engine & Application Controller
 * Features: Instant 3D Robot State Engine, Cosmic Orbital Universe Hub,
 * Real-time SSE Streaming with Gemini, Multimodal PC File Upload,
 * Markdown Parsing, Code Highlighting, Voice Dictation, Speech Synthesis,
 * and Automatic Quota Failover.
 */

// Determine API Base URL (Safe for Cloud Deployment, Render, Railway, and Localhost)
// When served by FastAPI, use same origin (''). Only fallback to local port 8000 if using Live Server (port 5500)
const API_BASE_URL = (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin !== 'null' && !['5500', '3000', '5173'].includes(window.location.port))
  ? ''
  : 'http://127.0.0.1:8000';

// System Personas
const PERSONA_PROMPTS = {
  default: "You are NEXA AI, an advanced, highly intelligent futuristic AI assistant. Provide structured, insightful, elegant, and actionable answers with clear formatting and code where helpful.",
  coder: "You are NEXA AI Principal Systems Architect and Software Engineer. Write production-grade, performant, elegant code with thorough explanations, clean architecture, and modern best practices.",
  concise: "You are NEXA AI Concise Mode. Provide direct, razor-sharp, high-density answers without pleasantries or unnecessary filler words.",
  creative: "You are NEXA AI Creative Engine. Provide evocative descriptions, visionary ideas, deep metaphors, and compelling storytelling."
};

// Application State
const state = {
  currentConversationId: null,
  conversations: [],
  currentModel: 'gemini-3.5-flash',
  currentPersona: 'default',
  currentView: 'split', // 'split' | 'robot' | 'universe'
  visualMode: 'robot', // 'robot' | 'universe'
  robotState: 'idle', // 'idle' | 'thinking' | 'answering'
  isStreaming: false,
  abortController: null,
  speechSynth: window.speechSynthesis || null,
  speechRecognition: null,
  isListening: false,
  currentlySpeakingBtn: null,
  idleReturnTimer: null,
  attachedFiles: [] // Array of { name, type, content, size, isImage, previewUrl }
};

// DOM Elements
const elements = {
  // Bezel & Layout
  consoleBezel: document.getElementById('consoleBezel'),
  dashboardContainer: document.getElementById('dashboardContainer'),
  sidebar: document.getElementById('sidebar'),
  mobileSidebarClose: document.getElementById('mobileSidebarClose'),
  mobileMenuTrigger: document.getElementById('mobileMenuTrigger'),
  workspaceStage: document.getElementById('workspaceStage'),
  
  // Navigation
  navHome: document.getElementById('navHome'),
  navChat: document.getElementById('navChat'),
  navExplore: document.getElementById('navExplore'),
  navTools: document.getElementById('navTools'),
  navLibrary: document.getElementById('navLibrary'),
  navSettings: document.getElementById('navSettings'),
  sidebarHistoryPanel: document.getElementById('sidebarHistoryPanel'),
  conversationsList: document.getElementById('conversationsList'),
  emptyHistoryNotice: document.getElementById('emptyHistoryNotice'),
  newChatBtn: document.getElementById('newChatBtn'),
  newChatIconBtn: document.getElementById('newChatIconBtn'),
  clearAllBtn: document.getElementById('clearAllBtn'),
  sidebarExploreCard: document.getElementById('sidebarExploreCard'),
  exploreCardActionBtn: document.getElementById('exploreCardActionBtn'),

  // View Mode Tabs
  tabSplitView: document.getElementById('tabSplitView'),
  tabRobotView: document.getElementById('tabRobotView'),
  tabUniverseView: document.getElementById('tabUniverseView'),

  // Dropdowns & Indicators
  modelDropdownWrapper: document.getElementById('modelDropdownWrapper'),
  modelSelectBtn: document.getElementById('modelSelectBtn'),
  modelMenu: document.getElementById('modelMenu'),
  currentModelLabel: document.getElementById('currentModelLabel'),
  currentModelBadge: document.getElementById('currentModelBadge'),

  personaDropdownWrapper: document.getElementById('personaDropdownWrapper'),
  personaSelectBtn: document.getElementById('personaSelectBtn'),
  personaMenu: document.getElementById('personaMenu'),
  currentPersonaLabel: document.getElementById('currentPersonaLabel'),
  connectionIndicator: document.getElementById('connectionIndicator'),

  // Visual Hub Stage
  visualHubStage: document.getElementById('visualHubStage'),
  universeOrbitalSystem: document.getElementById('universeOrbitalSystem'),
  orbitalCenterCore: document.getElementById('orbitalCenterCore'),
  robot3dStage: document.getElementById('robot3dStage'),
  robotViewport: document.getElementById('robotViewport'),
  robotLayerIdle: document.getElementById('robotLayerIdle'),
  robotLayerThinking: document.getElementById('robotLayerThinking'),
  robotLayerAnswering: document.getElementById('robotLayerAnswering'),
  robotStateLabel: document.getElementById('robotStateLabel'),
  btnTestIdle: document.getElementById('btnTestIdle'),
  btnTestThinking: document.getElementById('btnTestThinking'),
  btnTestAnswering: document.getElementById('btnTestAnswering'),

  // Chat Stream Stage
  chatStreamStage: document.getElementById('chatStreamStage'),
  chatViewport: document.getElementById('chatViewport'),
  welcomeHero: document.getElementById('welcomeHero'),
  suggestionChips: document.getElementById('suggestionChips'),
  messagesContainer: document.getElementById('messagesContainer'),
  scrollBottomBtn: document.getElementById('scrollBottomBtn'),

  // Input & File Controls
  streamingControlBar: document.getElementById('streamingControlBar'),
  stopGeneratingBtn: document.getElementById('stopGeneratingBtn'),
  promptInput: document.getElementById('promptInput'),
  sendBtn: document.getElementById('sendBtn'),
  attachmentBtn: document.getElementById('attachmentBtn'),
  fileUploadInput: document.getElementById('fileUploadInput'),
  attachedFilesContainer: document.getElementById('attachedFilesContainer'),
  voiceMicBtn: document.getElementById('voiceMicBtn')
};

/* ==========================================================================
   Boot & Asset Preloader
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  preload3DAssets();
  initRobotStateEngine();
  initViewModes();
  initFileUpload();
  initVoiceRecognition();
  initEventListeners();
  checkBackendHealth();
  loadConversations();
});

function preload3DAssets() {
  const assets = [
    'assets/robot_idle.jpg',
    'assets/robot_thinking.jpg',
    'assets/robot_answering.jpg',
    'assets/planet_explore.jpg'
  ];
  assets.forEach(src => {
    const img = new Image();
    img.src = src;
  });
}

/* ==========================================================================
   PC File Upload Engine (Supports Images, Code, PDFs, CSV, Text)
   ========================================================================== */
function initFileUpload() {
  if (!elements.attachmentBtn || !elements.fileUploadInput) return;

  // Open native PC file explorer on click
  elements.attachmentBtn.addEventListener('click', () => {
    elements.fileUploadInput.click();
  });

  // Handle files selected from PC
  elements.fileUploadInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      // Max 20MB per file
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
      // Code, text, csv, json, md
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

    const sizeKb = (file.size / 1024).toFixed(1);
    
    let iconOrThumb = '';
    if (file.isImage && file.previewUrl) {
      iconOrThumb = `<img src="${file.previewUrl}" class="file-chip-thumb" alt="${escapeHtml(file.name)}">`;
    } else if (file.name.endsWith('.py')) {
      iconOrThumb = `<div class="file-chip-icon"><i class="fa-brands fa-python"></i></div>`;
    } else if (file.name.endsWith('.js') || file.name.endsWith('.ts')) {
      iconOrThumb = `<div class="file-chip-icon"><i class="fa-brands fa-js"></i></div>`;
    } else if (file.name.endsWith('.pdf')) {
      iconOrThumb = `<div class="file-chip-icon"><i class="fa-solid fa-file-pdf"></i></div>`;
    } else if (file.name.endsWith('.json') || file.name.endsWith('.csv')) {
      iconOrThumb = `<div class="file-chip-icon"><i class="fa-solid fa-table"></i></div>`;
    } else {
      iconOrThumb = `<div class="file-chip-icon"><i class="fa-solid fa-file-code"></i></div>`;
    }

    chip.innerHTML = `
      ${iconOrThumb}
      <div class="file-chip-meta">
        <span class="file-chip-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
        <span class="file-chip-size">${sizeKb} KB</span>
      </div>
      <button class="file-chip-remove" data-index="${index}" title="Remove file">
        <i class="fa-solid fa-xmark"></i>
      </button>
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
   Fast 3D Robot State Machine
   ========================================================================== */
function initRobotStateEngine() {
  setRobotState('idle');

  if (elements.btnTestIdle) elements.btnTestIdle.addEventListener('click', () => setRobotState('idle'));
  if (elements.btnTestThinking) elements.btnTestThinking.addEventListener('click', () => setRobotState('thinking'));
  if (elements.btnTestAnswering) elements.btnTestAnswering.addEventListener('click', () => setRobotState('answering'));
}

function setRobotState(newState) {
  state.robotState = newState;

  if (state.idleReturnTimer) {
    clearTimeout(state.idleReturnTimer);
    state.idleReturnTimer = null;
  }

  // Clear active classes
  elements.robotLayerIdle.classList.remove('active');
  elements.robotLayerThinking.classList.remove('active');
  elements.robotLayerAnswering.classList.remove('active');

  elements.robot3dStage.classList.remove('state-idle', 'state-thinking', 'state-answering');

  [elements.btnTestIdle, elements.btnTestThinking, elements.btnTestAnswering].forEach(btn => {
    if (btn) btn.classList.remove('active');
  });

  if (newState === 'thinking') {
    elements.robotLayerThinking.classList.add('active');
    elements.robot3dStage.classList.add('state-thinking');
    if (elements.btnTestThinking) elements.btnTestThinking.classList.add('active');
    elements.robotStateLabel.textContent = "Status: Analyzing & Reasoning";
    showRobotViewport();

  } else if (newState === 'answering') {
    elements.robotLayerAnswering.classList.add('active');
    elements.robot3dStage.classList.add('state-answering');
    if (elements.btnTestAnswering) elements.btnTestAnswering.classList.add('active');
    elements.robotStateLabel.textContent = "Status: Transmitting Solution";
    showRobotViewport();

  } else {
    // Idle
    elements.robotLayerIdle.classList.add('active');
    elements.robot3dStage.classList.add('state-idle');
    if (elements.btnTestIdle) elements.btnTestIdle.classList.add('active');
    elements.robotStateLabel.textContent = "Mode: 3D Assistant Ready";
  }
}

function showRobotViewport() {
  state.visualMode = 'robot';
  elements.robot3dStage.classList.remove('hidden');
  elements.universeOrbitalSystem.classList.add('hidden');
}

function showUniverseViewport() {
  state.visualMode = 'universe';
  elements.universeOrbitalSystem.classList.remove('hidden');
  elements.robot3dStage.classList.add('hidden');
}

/* ==========================================================================
   View Mode Management
   ========================================================================== */
function initViewModes() {
  elements.tabSplitView.addEventListener('click', () => setViewMode('split'));
  elements.tabRobotView.addEventListener('click', () => setViewMode('robot'));
  elements.tabUniverseView.addEventListener('click', () => setViewMode('universe'));

  elements.orbitalCenterCore.addEventListener('click', () => {
    showRobotViewport();
  });
}

function setViewMode(mode) {
  state.currentView = mode;
  elements.tabSplitView.classList.toggle('active', mode === 'split');
  elements.tabRobotView.classList.toggle('active', mode === 'robot');
  elements.tabUniverseView.classList.toggle('active', mode === 'universe');

  elements.workspaceStage.classList.remove('view-robot-only', 'view-universe-only');

  if (mode === 'robot') {
    elements.workspaceStage.classList.add('view-robot-only');
    showRobotViewport();
  } else if (mode === 'universe') {
    elements.workspaceStage.classList.add('view-universe-only');
    showUniverseViewport();
  } else {
    // Split View
    if (state.visualMode === 'universe') {
      showUniverseViewport();
    } else {
      showRobotViewport();
    }
  }
}

/* ==========================================================================
   Backend Health Check
   ========================================================================== */
async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    if (res.ok) {
      const data = await res.json();
      elements.connectionIndicator.innerHTML = `
        <span class="status-pulse-dot"></span>
        <span class="status-text">${data.status === 'online' ? 'Gemini Active' : 'Connected'}</span>
      `;
    } else {
      throw new Error("API error");
    }
  } catch (err) {
    elements.connectionIndicator.innerHTML = `
      <span class="status-pulse-dot" style="background: #ef4444; box-shadow: 0 0 8px #ef4444;"></span>
      <span class="status-text" style="color: #f87171;">Offline</span>
    `;
  }
}

/* ==========================================================================
   Conversation Management
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
      <i class="fa-regular fa-message"></i>
      <span class="conv-title" title="${escapeHtml(conv.title)}">${escapeHtml(conv.title)}</span>
      <button class="delete-conv-btn" title="Delete"><i class="fa-solid fa-xmark"></i></button>
    `;

    item.addEventListener('click', (e) => {
      if (e.target.closest('.delete-conv-btn')) return;
      selectConversation(conv.id);
      if (window.innerWidth <= 860) {
        elements.sidebar.classList.remove('mobile-open');
      }
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
    console.error("Failed to load conversation detail:", err);
  }
}

function startNewChat() {
  if (state.isStreaming) return;
  state.currentConversationId = null;
  elements.messagesContainer.innerHTML = '';
  elements.welcomeHero.style.display = 'block';
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
  if (!confirm("Delete this transmission transcript?")) return;
  try {
    const res = await fetch(`${API_BASE_URL}/api/conversations/${convId}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      if (state.currentConversationId === convId) {
        startNewChat();
      }
      await loadConversations();
    }
  } catch (err) {
    console.error("Delete conversation failed:", err);
  }
}

async function clearAllConversations() {
  if (!confirm("Purge all conversation transcripts? This cannot be undone.")) return;
  try {
    const res = await fetch(`${API_BASE_URL}/api/conversations`, {
      method: 'DELETE'
    });
    if (res.ok) {
      startNewChat();
      await loadConversations();
    }
  } catch (err) {
    console.error("Clear all failed:", err);
  }
}

/* ==========================================================================
   Chat Message Rendering & Layout
   ========================================================================== */
function renderMessages(messages) {
  elements.messagesContainer.innerHTML = '';
  if (!messages || messages.length === 0) {
    elements.welcomeHero.style.display = 'block';
    setRobotState('idle');
    return;
  }
  elements.welcomeHero.style.display = 'none';

  messages.forEach(msg => {
    appendMessageCard(msg.role, msg.content, msg.id, false);
  });

  scrollToBottom();
}

function appendMessageCard(role, content, msgId = null, isStreaming = false, files = null) {
  elements.welcomeHero.style.display = 'none';

  const row = document.createElement('div');
  row.className = `message-row ${role}`;
  if (msgId) row.id = `msg-${msgId}`;

  // Avatar
  if (role === 'assistant') {
    const starEmblem = document.createElement('div');
    starEmblem.className = 'assistant-star-emblem';
    starEmblem.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"/>
      </svg>
    `;
    row.appendChild(starEmblem);
  }

  const bodyWrapper = document.createElement('div');
  bodyWrapper.className = 'message-body-wrapper';

  if (role === 'user') {
    const userTag = document.createElement('div');
    userTag.className = 'user-avatar-tag';
    userTag.innerHTML = '<i class="fa-solid fa-user"></i>';
    bodyWrapper.appendChild(userTag);
  }

  // Attached files badges inside user message
  if (role === 'user' && files && files.length > 0) {
    const filesWrap = document.createElement('div');
    filesWrap.className = 'message-attached-files';
    filesWrap.style.display = 'flex';
    filesWrap.style.flexWrap = 'wrap';
    filesWrap.style.gap = '6px';
    filesWrap.style.marginBottom = '8px';

    files.forEach(f => {
      if (f.isImage && f.previewUrl) {
        const img = document.createElement('img');
        img.src = f.previewUrl;
        img.style.maxWidth = '180px';
        img.style.maxHeight = '140px';
        img.style.borderRadius = '8px';
        img.style.border = '1px solid rgba(255,255,255,0.2)';
        filesWrap.appendChild(img);
      } else {
        const badge = document.createElement('span');
        badge.style.fontSize = '0.72rem';
        badge.style.padding = '3px 8px';
        badge.style.borderRadius = '6px';
        badge.style.background = 'rgba(56, 189, 248, 0.2)';
        badge.style.border = '1px solid rgba(56, 189, 248, 0.4)';
        badge.style.color = '#38bdf8';
        badge.innerHTML = `<i class="fa-solid fa-paperclip"></i> ${escapeHtml(f.name)}`;
        filesWrap.appendChild(badge);
      }
    });
    bodyWrapper.appendChild(filesWrap);
  }

  const contentBox = document.createElement('div');
  contentBox.className = 'message-content';

  if (role === 'assistant') {
    contentBox.innerHTML = renderMarkdown(content) + (isStreaming ? '<span class="streaming-cursor"></span>' : '');
  } else {
    contentBox.textContent = content;
  }

  bodyWrapper.appendChild(contentBox);

  // Assistant actions
  if (role === 'assistant' && !isStreaming && content) {
    const actions = createMessageActions(content);
    bodyWrapper.appendChild(actions);
  }

  row.appendChild(bodyWrapper);
  elements.messagesContainer.appendChild(row);

  attachCodeBlockEvents(contentBox);
  return { row, contentBox, bodyWrapper };
}

function createMessageActions(text) {
  const actions = document.createElement('div');
  actions.className = 'message-actions';

  const copyBtn = document.createElement('button');
  copyBtn.className = 'action-btn';
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
  speakBtn.className = 'action-btn';
  speakBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i> Read';
  speakBtn.addEventListener('click', () => {
    toggleSpeech(text, speakBtn);
  });

  actions.appendChild(copyBtn);
  actions.appendChild(speakBtn);
  return actions;
}

/* ==========================================================================
   Real-Time Streaming Engine with 3D Robot State Reactivity & File Upload
   ========================================================================== */
async function sendMessage(textToSend = null) {
  let text = textToSend || elements.promptInput.value.trim();
  const attachedFiles = [...state.attachedFiles];

  // If user only uploaded files without text, provide standard prompt
  if (!text && attachedFiles.length > 0) {
    text = "Please analyze and explain the attached files.";
  }

  if (!text || state.isStreaming) return;

  // Reset input field & attached files
  elements.promptInput.value = '';
  elements.promptInput.style.height = 'auto';
  state.attachedFiles = [];
  renderAttachedFilesPreview();
  updateSendButtonState();

  // Append user message with attached files
  appendMessageCard('user', text, null, false, attachedFiles);
  scrollToBottom();

  // 1. Trigger Instant 3D Robot THINKING State (0ms latency)
  setRobotState('thinking');

  state.isStreaming = true;
  elements.streamingControlBar.style.display = 'flex';
  state.abortController = new AbortController();

  const { contentBox, bodyWrapper } = appendMessageCard('assistant', '', null, true);
  scrollToBottom();

  let accumulatedText = '';
  let hasTransitionedToAnswering = false;

  try {
    const systemPrompt = PERSONA_PROMPTS[state.currentPersona] || '';

    // Prepare payload with files
    const payload = {
      conversation_id: state.currentConversationId,
      message: text,
      model: state.currentModel,
      system_prompt: systemPrompt,
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

            // 2. As soon as answers begin streaming, trigger 3D Robot ANSWERING State!
            if (!hasTransitionedToAnswering) {
              hasTransitionedToAnswering = true;
              setRobotState('answering');
            }

            contentBox.innerHTML = renderMarkdown(accumulatedText) + '<span class="streaming-cursor"></span>';
            attachCodeBlockEvents(contentBox);
            autoScrollNearBottom();
          } else if (event.type === 'done') {
            state.currentConversationId = event.conversation_id;
            loadConversations();
          } else if (event.type === 'error') {
            accumulatedText += `\n\n> ⚠️ **Error:** ${event.error}`;
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
    bodyWrapper.appendChild(actions);

  } catch (err) {
    if (err.name === 'AbortError') {
      contentBox.innerHTML = renderMarkdown(accumulatedText + '\n\n*(Transmission halted)*');
    } else {
      contentBox.innerHTML = renderMarkdown(`> ⚠️ **Notice:** ${err.message}`);
    }
  } finally {
    state.isStreaming = false;
    state.abortController = null;
    elements.streamingControlBar.style.display = 'none';
    elements.promptInput.focus();
    scrollToBottom();

    state.idleReturnTimer = setTimeout(() => {
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
   Voice Dictation
   ========================================================================== */
function initVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    if (elements.voiceMicBtn) elements.voiceMicBtn.title = "Voice dictation not supported in this browser";
    return;
  }

  state.speechRecognition = new SpeechRecognition();
  state.speechRecognition.continuous = false;
  state.speechRecognition.interimResults = false;
  state.speechRecognition.lang = 'en-US';

  state.speechRecognition.onstart = () => {
    state.isListening = true;
    elements.voiceMicBtn.classList.add('listening');
    elements.promptInput.placeholder = "Listening... Speak your transmission";
  };

  state.speechRecognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    elements.promptInput.value = transcript;
    elements.promptInput.style.height = 'auto';
    elements.promptInput.style.height = `${Math.min(elements.promptInput.scrollHeight, 120)}px`;
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
  elements.promptInput.placeholder = "Ask anything...";
}

/* ==========================================================================
   Speech Synthesis
   ========================================================================== */
function toggleSpeech(text, buttonElement) {
  if (!state.speechSynth) {
    alert("Speech Synthesis is not supported in this browser.");
    return;
  }

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
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
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
        <div class="code-block-header">
          <span class="code-language-tag">${escapeHtml(block.lang)}</span>
          <button class="copy-code-btn" data-code="${encodeURIComponent(block.code)}">
            <i class="fa-regular fa-copy"></i>
            <span>Copy code</span>
          </button>
        </div>
        <pre><code class="language-${escapeHtml(block.lang)}">${escapedCode}</code></pre>
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
        btn.classList.add('copied');
        btn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Copied!</span>';
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = '<i class="fa-regular fa-copy"></i> <span>Copy code</span>';
        }, 2000);
      });
    };
  });
}

/* ==========================================================================
   Model & Persona Selection
   ========================================================================== */
function setModel(modelId) {
  state.currentModel = modelId;
  const item = elements.modelMenu.querySelector(`[data-model="${modelId}"]`);
  if (item) {
    elements.modelMenu.querySelectorAll('.dropdown-item').forEach(el => el.classList.remove('active'));
    item.classList.add('active');
    
    const strongTitle = item.querySelector('strong').textContent;
    elements.currentModelLabel.textContent = strongTitle;

    const badge = item.querySelector('.tag-rec, .tag-std, .tag-pro');
    if (badge) {
      elements.currentModelBadge.textContent = badge.textContent;
    }
  }
}

function setPersona(personaId) {
  state.currentPersona = personaId;
  const item = elements.personaMenu.querySelector(`[data-persona="${personaId}"]`);
  if (item) {
    elements.personaMenu.querySelectorAll('.dropdown-item').forEach(el => el.classList.remove('active'));
    item.classList.add('active');
    elements.currentPersonaLabel.textContent = item.querySelector('strong').textContent;
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
  elements.newChatIconBtn.addEventListener('click', startNewChat);

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      startNewChat();
    }
  });

  elements.mobileMenuTrigger.addEventListener('click', () => {
    elements.sidebar.classList.add('mobile-open');
  });

  elements.mobileSidebarClose.addEventListener('click', () => {
    elements.sidebar.classList.remove('mobile-open');
  });

  elements.clearAllBtn.addEventListener('click', clearAllConversations);

  elements.promptInput.addEventListener('input', () => {
    elements.promptInput.style.height = 'auto';
    elements.promptInput.style.height = `${Math.min(elements.promptInput.scrollHeight, 120)}px`;
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

  elements.suggestionChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.suggestion-chip');
    if (!chip) return;
    const prompt = chip.getAttribute('data-prompt');
    if (prompt) sendMessage(prompt);
  });

  const orbitNodes = document.querySelectorAll('.orbit-node');
  orbitNodes.forEach(node => {
    node.addEventListener('click', () => {
      const prompt = node.getAttribute('data-prompt');
      if (prompt) {
        sendMessage(prompt);
      }
    });
  });

  elements.sidebarExploreCard.addEventListener('click', () => {
    setViewMode('universe');
  });

  elements.scrollBottomBtn.addEventListener('click', scrollToBottom);

  elements.modelSelectBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.modelDropdownWrapper.classList.toggle('open');
    elements.personaDropdownWrapper.classList.remove('open');
  });

  elements.modelMenu.addEventListener('click', (e) => {
    const item = e.target.closest('.dropdown-item');
    if (!item) return;
    const model = item.getAttribute('data-model');
    setModel(model);
    elements.modelDropdownWrapper.classList.remove('open');
  });

  elements.personaSelectBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.personaDropdownWrapper.classList.toggle('open');
    elements.modelDropdownWrapper.classList.remove('open');
  });

  elements.personaMenu.addEventListener('click', (e) => {
    const item = e.target.closest('.dropdown-item');
    if (!item) return;
    const persona = item.getAttribute('data-persona');
    setPersona(persona);
    elements.personaDropdownWrapper.classList.remove('open');
  });

  window.addEventListener('click', () => {
    elements.modelDropdownWrapper.classList.remove('open');
    elements.personaDropdownWrapper.classList.remove('open');
  });
}
