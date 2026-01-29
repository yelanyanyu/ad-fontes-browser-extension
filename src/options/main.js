// Store
let prompts = [];
let siteConfigs = {};
let currentPromptId = null;

// DOM Elements
const els = {
  promptList: document.getElementById('prompt-list'),
  siteRulesList: document.getElementById('site-rules-list'),
  clearSitesBtn: document.getElementById('clear-sites-btn'),
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
  const domains = Object.keys(siteConfigs);
  
  if (els.clearSitesBtn) {
    els.clearSitesBtn.style.display = domains.length > 0 ? 'flex' : 'none';
  }

  if (domains.length === 0) {
    els.siteRulesList.innerHTML = '<div style="padding:10px; text-align:center; color:#9ca3af; font-size:0.8rem;">No site rules yet</div>';
    return;
  }

  domains.sort().forEach(domain => {
    const config = siteConfigs[domain];
    const item = document.createElement('div');
    item.className = 'site-rule-item';
    
    item.innerHTML = `
      <div class="site-info">
        <div class="site-domain" title="${escapeHtml(domain)}">${escapeHtml(domain)}</div>
        <div class="site-status ${config.enabled ? 'on' : ''}">${config.enabled ? 'ON' : 'OFF'}</div>
      </div>
      <div class="site-actions">
        <button class="icon-btn danger delete-rule-btn" title="Delete Rule">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;
    
    const deleteBtn = item.querySelector('.delete-rule-btn');
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      deleteSiteRule(domain);
    };

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

async function deleteSiteRule(domain) {
  if (confirm(`Forget settings for ${domain}?`)) {
    delete siteConfigs[domain];
    await saveData();
    renderSiteRules();
  }
}

// Listeners
function setupListeners() {
  els.addBtn.addEventListener('click', createPrompt);
  els.deleteBtn.addEventListener('click', deleteCurrentPrompt);
  els.saveBtn.addEventListener('click', saveCurrentPrompt);
  
  if (els.clearSitesBtn) {
    els.clearSitesBtn.addEventListener('click', async () => {
      if (confirm('Clear ALL website settings? This action cannot be undone.')) {
        siteConfigs = {};
        await saveData();
        renderSiteRules();
      }
    });
  }
  
  // Shortcut
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
