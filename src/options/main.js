// Store
let prompts = [];
let siteConfigs = {};
let currentPromptId = null;

// DOM Elements
const els = {
  promptList: document.getElementById('prompt-list'),
  siteRulesList: document.getElementById('site-rules-list'),
  editorContainer: document.getElementById('editor-container'),
  emptyState: document.getElementById('editor-empty-state'),
  titleInput: document.getElementById('prompt-title'),
  contentInput: document.getElementById('prompt-content'),
  saveBtn: document.getElementById('save-btn'),
  deleteBtn: document.getElementById('delete-btn'),
  addBtn: document.getElementById('add-prompt-btn')
};

// Init
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  renderPrompts();
  renderSiteRules();
  setupListeners();
});

// Data Operations
async function loadData() {
  const data = await chrome.storage.local.get(['prompts', 'siteConfigs']);
  prompts = data.prompts || [];
  siteConfigs = data.siteConfigs || {};
}

async function saveData() {
  await chrome.storage.local.set({ prompts, siteConfigs });
  // Notify user?
}

// Rendering
function renderPrompts() {
  els.promptList.innerHTML = '';
  prompts.forEach(prompt => {
    const item = document.createElement('div');
    item.className = `prompt-item ${currentPromptId === prompt.id ? 'active' : ''}`;
    item.onclick = () => selectPrompt(prompt.id);
    
    item.innerHTML = `
      <div class="prompt-item-title">${escapeHtml(prompt.title || 'Untitled')}</div>
      <div class="prompt-item-preview">${escapeHtml(prompt.content || 'No content')}</div>
    `;
    els.promptList.appendChild(item);
  });
}

function renderSiteRules() {
  els.siteRulesList.innerHTML = '';
  Object.entries(siteConfigs).forEach(([domain, config]) => {
    const item = document.createElement('div');
    item.className = 'site-rule-item';
    const status = config.enabled ? 'ON' : 'OFF';
    item.innerHTML = `
      <span>${domain}</span>
      <span style="font-weight:bold; color: ${config.enabled ? '#2563eb' : '#9ca3af'}">${status}</span>
    `;
    els.siteRulesList.appendChild(item);
  });
}

// Logic
function selectPrompt(id) {
  currentPromptId = id;
  const prompt = prompts.find(p => p.id === id);
  if (!prompt) return;

  els.titleInput.value = prompt.title;
  els.contentInput.value = prompt.content;
  
  els.emptyState.classList.add('hidden');
  els.editorContainer.classList.remove('hidden');
  renderPrompts(); // Update active state
}

function createPrompt() {
  const newPrompt = {
    id: crypto.randomUUID(),
    title: 'New Prompt',
    content: ''
  };
  prompts.push(newPrompt);
  saveData();
  selectPrompt(newPrompt.id);
  renderPrompts();
  els.titleInput.focus();
}

async function deleteCurrentPrompt() {
  if (!confirm('Are you sure you want to delete this prompt?')) return;
  
  prompts = prompts.filter(p => p.id !== currentPromptId);
  currentPromptId = null;
  
  await saveData();
  renderPrompts();
  els.editorContainer.classList.add('hidden');
  els.emptyState.classList.remove('hidden');
}

async function saveCurrentPrompt() {
  if (!currentPromptId) return;
  
  const prompt = prompts.find(p => p.id === currentPromptId);
  if (prompt) {
    prompt.title = els.titleInput.value;
    prompt.content = els.contentInput.value;
    await saveData();
    renderPrompts();
    
    // Visual feedback
    const originalText = els.saveBtn.textContent;
    els.saveBtn.textContent = 'Saved!';
    setTimeout(() => els.saveBtn.textContent = originalText, 2000);
  }
}

// Listeners
function setupListeners() {
  els.addBtn.addEventListener('click', createPrompt);
  els.deleteBtn.addEventListener('click', deleteCurrentPrompt);
  els.saveBtn.addEventListener('click', saveCurrentPrompt);
  
  // Auto-save on blur or periodic? Stick to manual save for now to avoid accidental overwrites of complex prompts
  // But Cmd+S override would be nice
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      saveCurrentPrompt();
    }
  });
}

// Utils
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
