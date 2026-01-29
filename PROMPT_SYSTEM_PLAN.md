# Browser Extension Prompt System Implementation Plan

## 1. Overview
The goal is to upgrade the extension with a "Smart Prompt System" that allows users to manage and inject system prompts based on the current website. The system will handle sites differently based on their native support for system prompts (e.g., `aistudio.google.com` vs `gemini.google.com`).

## 2. Data Structure (Storage)

We will use `chrome.storage.local` to store two main datasets:

### A. Prompt Library (`prompts`)
A list of user-defined prompts.
```json
[
  {
    "id": "uuid-1",
    "title": "Coding Expert",
    "content": "You are a senior software engineer..."
  },
  {
    "id": "uuid-2",
    "title": "Translator",
    "content": "Translate the following text to Chinese..."
  }
]
```

### B. Site Configuration (`siteConfigs`)
Settings specific to each domain.
```json
{
  "gemini.google.com": {
    "enabled": true,        // Default: true (Needs system prompt)
    "promptId": "uuid-1"    // Selected prompt
  },
  "aistudio.google.com": {
    "enabled": false,       // Default: false (Native support exists)
    "promptId": null
  }
}
```

## 3. UI/UX Components

### A. Options Page (New)
A dedicated settings page for managing the Prompt Library and Site Rules.
*   **Prompt Manager**: Add, Edit, Delete prompts (Title, Content).
*   **Site Manager**: View and manage saved rules for different domains.

### B. Popup Interface (Updated)
The main extension popup will become context-aware.

*   **Top Bar (Context Indicator)**:
    *   Shows current domain (e.g., `gemini.google.com`).
    *   **Toggle Switch**: Enable/Disable System Prompt for this site.
*   **Prompt Selector**:
    *   Dropdown to choose which prompt to apply (syncs with `siteConfigs`).
    *   "Manage Prompts" link to open Options Page.
*   **Input Area (Existing)**:
    *   The existing input logic will be updated.
    *   **Logic**: If Prompt Mode is **ON**, the generated output/clipboard content will be: `[System Prompt Content] \n\n [User Input]`.
    *   If **OFF**, it passes user input as is.

## 4. Default Logic & Behavior

1.  **Detection**: When popup opens, get active tab URL.
2.  **Configuration Check**:
    *   If domain exists in `siteConfigs`, apply saved settings.
    *   If domain is new:
        *   User manually toggles logic in Popup.
        *   Extension saves this preference for next time.
3.  **Prompt Format**:
    *   The user requested `[title]:[content]` structure for management.
    *   Injection format will be `[content]`.

## 5. Implementation Steps

1.  **Manifest Update**:
    *   Add `options_page` entry.
    *   Ensure `permissions` include `storage`, `activeTab`.
2.  **Create Options Page**:
    *   `src/options/index.html`: UI for CRUD operations.
    *   `src/options/main.js`: Logic to save/load from `chrome.storage`.
    *   `src/options/style.css`: Styling.
3.  **Update Popup Logic**:
    *   Modify `src/popup/index.html` to add the "Prompt Controls" section at the top.
    *   Update `src/popup/main.js`:
        *   Load `prompts` and `siteConfigs` on init.
        *   Detect current URL.
        *   Handle Toggle/Dropdown changes (auto-save to `siteConfigs`).
        *   Modify `handleGenerate` (or equivalent) to prepend prompt text.

## 6. Questions for Review
*   **Injection Method**: Currently, the plan assumes the extension combines text *inside the popup* (e.g., for copying). Do you want it to *automatically insert* text into the webpage's chat box (requires Content Scripts)?
*   **Defaults**: Should we pre-populate some common AI sites with defaults (Gemini=ON, AI Studio=OFF), or start empty and learn from user toggles?
