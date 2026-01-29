import nlp from 'compromise';

// DOM Elements - Lazy loaded to ensure safety
const getElements = () => ({
  word: document.getElementById('word'),
  context: document.getElementById('context'),
  other: document.getElementById('other'),
  generateBtn: document.getElementById('generateBtn'),
  copyBtn: document.getElementById('copyBtn'),
  status: document.getElementById('status'),
  loader: document.querySelector('.loader'),
  btnText: document.querySelector('.btn-text'),
  previewContainer: document.getElementById('preview-container'),
  preview: document.getElementById('preview'),
  // New Elements
  domainLabel: document.getElementById('current-domain'),
  promptToggle: document.getElementById('prompt-toggle'),
  promptSelect: document.getElementById('prompt-select'),
  promptSelectionArea: document.getElementById('prompt-selection-area'),
  openOptionsBtn: document.getElementById('open-options-btn')
});

let lastGeneratedText = '';
let currentDomain = '';
let prompts = [];
let siteConfigs = {};
let lastActivePromptId = null;

const KNOWN_SITE_DEFAULTS = {
  'gemini.google.com': true,
  'chatgpt.com': true,
  'claude.ai': true,
  'aistudio.google.com': false
};

function resolveConfig(domain) {
  if (siteConfigs[domain]) return siteConfigs[domain];
  return {
    enabled: KNOWN_SITE_DEFAULTS[domain] ?? false,
    promptId: lastActivePromptId
  };
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Ad Fontes: Extension loaded');
  await initializeContext();
  await loadFromStorage();
  setupEventListeners();
});

async function initializeContext() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0] && tabs[0].url) {
      const url = new URL(tabs[0].url);
      currentDomain = url.hostname;
      const elements = getElements();
      if (elements.domainLabel) {
        elements.domainLabel.textContent = currentDomain;
        elements.domainLabel.title = currentDomain; // Tooltip for long domains
      }
      
      // Load config for this domain
      await loadSiteConfig();
    }
  } catch (e) {
    console.error('Failed to get current tab:', e);
    const elements = getElements();
    if (elements.domainLabel) elements.domainLabel.textContent = 'Unknown Site';
  }
}

async function loadSiteConfig() {
  const data = await chrome.storage.local.get(['prompts', 'siteConfigs', 'lastActivePromptId']);
  prompts = data.prompts || [];
  siteConfigs = data.siteConfigs || {};
  lastActivePromptId = data.lastActivePromptId || null;
  
  // Validate lastActivePromptId
  if (lastActivePromptId && !prompts.find(p => p.id === lastActivePromptId)) {
    lastActivePromptId = null;
  }
  
  const elements = getElements();
  
  const config = resolveConfig(currentDomain);
  
  // Populate Select
  elements.promptSelect.innerHTML = '<option value="">Select a prompt...</option>';
  prompts.forEach(p => {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = p.title || 'Untitled';
    elements.promptSelect.appendChild(option);
  });
  
  // Set State
  elements.promptToggle.checked = config.enabled;
  if (config.promptId) {
    elements.promptSelect.value = config.promptId;
  }
  
  updatePromptUI(config.enabled);
}

function updatePromptUI(enabled) {
  const elements = getElements();
  if (enabled) {
    elements.promptSelectionArea.classList.remove('hidden');
  } else {
    elements.promptSelectionArea.classList.add('hidden');
  }
}

async function saveSiteConfig() {
  const elements = getElements();
  const enabled = elements.promptToggle.checked;
  const promptId = elements.promptSelect.value;
  
  siteConfigs[currentDomain] = { enabled, promptId };
  
  // Update global last used
  if (promptId) {
    lastActivePromptId = promptId;
  }
  
  await chrome.storage.local.set({ siteConfigs, lastActivePromptId });
  updatePromptUI(enabled);
}

function setupEventListeners() {
  const elements = getElements();
  if (!elements.word) return;

  elements.generateBtn.addEventListener('click', handleGenerate);
  elements.copyBtn.addEventListener('click', handleCopy);

  // Handle Enter key in word input
  elements.word.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleGenerate();
    }
  });

  // Auto-save inputs with debounce
  const debouncedSave = debounce(saveToStorage, 500);
  ['input', 'change'].forEach(event => {
    elements.word.addEventListener(event, debouncedSave);
    elements.context.addEventListener(event, debouncedSave);
    elements.other.addEventListener(event, debouncedSave);
  });
  
  // New Listeners
  elements.promptToggle.addEventListener('change', saveSiteConfig);
  elements.promptSelect.addEventListener('change', saveSiteConfig);
  elements.openOptionsBtn.addEventListener('click', () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('src/options/index.html'));
    }
  });
}

// Storage Functions
async function loadFromStorage() {
  try {
    const elements = getElements();
    const data = await chrome.storage.local.get(['word', 'context', 'other']);
    
    if (data.word) elements.word.value = data.word;
    if (data.context) elements.context.value = data.context;
    if (data.other) elements.other.value = data.other;
  } catch (err) {
    console.error('Ad Fontes: Failed to load from storage:', err);
  }
}

function saveToStorage() {
  const elements = getElements();
  const data = {
    word: elements.word.value,
    context: elements.context.value,
    other: elements.other.value
  };
  
  chrome.storage.local.set(data).catch(err => {
    console.error('Ad Fontes: Failed to save to storage:', err);
  });
}

async function handleGenerate() {
  const elements = getElements();
  const word = elements.word.value.trim();
  const context = elements.context.value.trim();
  const other = elements.other.value.trim();

  if (!word) {
    showStatus('Please enter a word', 'error');
    return;
  }

  setLoading(true);
  hideStatus();

  try {
    // 1. Get Lemma (Root form)
    const lemma = getLemma(word);
    console.log(`【DEBUG】NLP Result - Original: "${word}", Lemma: "${lemma}"`);

    // 2. Fetch Data from Dictionary API
    const definitions = await fetchDefinitions(lemma);
    
    // 3. Format Data
    let formattedText = formatOutput(lemma, context, definitions, other);
    
    // 4. Prepend System Prompt if Enabled
    const config = resolveConfig(currentDomain);
    if (config && config.enabled && config.promptId) {
      const prompt = prompts.find(p => p.id === config.promptId);
      if (prompt && prompt.content) {
        formattedText = `${prompt.content}\n\n${formattedText}`;
      }
    }

    lastGeneratedText = formattedText;

    // 5. Update Preview
    elements.preview.value = formattedText;
    elements.previewContainer.classList.remove('hidden');

    // 6. Copy to Clipboard
    await copyToClipboard(formattedText);
    
    showStatus('Copied to clipboard!', 'success');
    elements.copyBtn.disabled = false;
  } catch (err) {
    console.error(err);
    showStatus(err.message || 'Failed to generate', 'error');
  } finally {
    setLoading(false);
  }
}

async function handleCopy() {
  if (!lastGeneratedText) return;
  try {
    await copyToClipboard(lastGeneratedText);
    showStatus('Copied to clipboard!', 'success');
  } catch (err) {
    showStatus('Failed to copy', 'error');
  }
}

function getLemma(text) {
  try {
    const doc = nlp(text);
    doc.compute('root');
    const json = doc.json();
    
    if (json && json[0] && json[0].terms && json[0].terms[0]) {
      const term = json[0].terms[0];
      return term.root || term.normal || text;
    }
    return text;
  } catch (e) {
    console.warn('NLP processing failed, using original text', e);
    return text;
  }
}

async function fetchDefinitions(word) {
  try {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Word "${word}" not found in dictionary.`);
      }
      throw new Error(`API Error: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    throw error;
  }
}

function formatOutput(lemma, userContext, apiData, otherMessage) {
  const meaningsList = [];
  
  if (Array.isArray(apiData)) {
    apiData.forEach(entry => {
      if (entry.meanings) {
        entry.meanings.forEach(m => {
          const pos = m.partOfSpeech;
          m.definitions.forEach(d => {
            meaningsList.push(`[${pos}] ${d.definition}`);
          });
        });
      }
    });
  }

  const uniqueMeanings = [...new Set(meaningsList)];

  let text = `word: ${lemma}\n`;
  text += `context: ${userContext}\n`;
  text += `meanings:\n`;
  
  if (uniqueMeanings.length > 0) {
    uniqueMeanings.forEach(m => {
      text += `- ${m}\n`;
    });
  } else {
    text += `- No definitions found\n`;
  }
  
  text += `other_message: ${otherMessage}`;

  return text;
}

async function copyToClipboard(text) {
  await navigator.clipboard.writeText(text);
}

function setLoading(isLoading) {
  const elements = getElements();
  if (isLoading) {
    elements.generateBtn.disabled = true;
    elements.loader.classList.remove('hidden');
    elements.btnText.textContent = 'Processing...';
  } else {
    elements.generateBtn.disabled = false;
    elements.loader.classList.add('hidden');
    elements.btnText.textContent = 'Generate & Copy';
  }
}

function showStatus(msg, type) {
  const elements = getElements();
  elements.status.textContent = msg;
  elements.status.className = `status ${type}`;
  elements.status.classList.remove('hidden');
  
  if (type === 'success') {
    setTimeout(() => {
      elements.status.classList.add('hidden');
    }, 3000);
  }
}

function hideStatus() {
  const elements = getElements();
  elements.status.classList.add('hidden');
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
