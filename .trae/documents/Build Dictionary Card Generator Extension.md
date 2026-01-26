# Browser Extension Development Plan

I will build a Chrome extension that generates structured vocabulary cards using `comprise` for NLP and the Free Dictionary API.

## 1. Project Setup
- Initialize a **Vite** project for efficient bundling (required for using the `comprise` NPM package).
- Structure:
  - `src/popup/`: UI and Logic
  - `manifest.json`: Extension configuration (MV3)
  - `package.json`: Dependencies (`comprise`, `vite`)

## 2. Core Functionality (`src/popup/main.js`)
- **NLP Processing**: Use `comprise` to extract the lemma (root form) of the input word (e.g., "took" -> "take").
- **Dictionary Lookup**: Query `https://api.dictionaryapi.dev/api/v2/entries/en/{lemma}`.
- **Data Formatting**: Parse the JSON response to extract meanings and parts of speech, formatting it into the requested template.
- **Clipboard Automation**: Automatically copy the result to the clipboard upon generation.

## 3. User Interface (`src/popup/index.html` & `style.css`)
- **Design**: Clean, modern popup interface following `frontend-design` principles.
- **Inputs**: Fields for `Word`, `Context`, and `Other Message`.
- **Controls**: "Generate" (Auto-copy) and manual "Copy" buttons.
- **Feedback**: Visual indicators for loading states and successful copying.

## 4. Build & Delivery
- Configure `vite` to output a production-ready extension in the `dist/` folder.
- Generate a `CHANGELOG.md` using the `changelog-generator` skill to document the initial release.

## Verification
- I will verify the build process runs without errors.
- You will need to load the `dist/` folder into Chrome (`chrome://extensions` -> "Load unpacked") to test the final functionality.
