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
  preview: document.getElementById('preview')
});

let lastGeneratedText = '';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('Ad Fontes: Extension loaded');
  loadFromStorage();
  setupEventListeners();
});

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
}

// Storage Functions
async function loadFromStorage() {
  try {
    const elements = getElements();
    const data = await chrome.storage.local.get(['word', 'context', 'other']);
    console.log('【DEBUG】Loaded from storage:', data);
    
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
  
  console.log('【DEBUG】Saving to storage:', data);
  chrome.storage.local.set(data).then(() => {
     console.log('Ad Fontes: Saved to storage');
  }).catch(err => {
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
    // Use lemma for lookup
    const definitions = await fetchDefinitions(lemma);
    
    // 3. Format Data
    // Use lemma in output as requested
    const formattedText = formatOutput(lemma, context, definitions, other);
    lastGeneratedText = formattedText;

    // 4. Update Preview
    elements.preview.value = formattedText;
    elements.previewContainer.classList.remove('hidden');

    // 5. Copy to Clipboard
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
    
    // Detailed log for debugging internal NLP state
    console.log('【DEBUG】NLP Internal State:', JSON.stringify(json, null, 2));
    
    if (json && json[0] && json[0].terms && json[0].terms[0]) {
      const term = json[0].terms[0];
      // Prioritize root, then normal, then text
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
    console.log(`【DEBUG】Fetching URL: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Word "${word}" not found in dictionary.`);
      }
      throw new Error(`API Error: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('【DEBUG】API Response:', data);
    return data;
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
