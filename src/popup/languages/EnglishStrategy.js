import nlp from 'compromise';

export default class EnglishStrategy {
  constructor() {
    this.name = 'English';
  }

  /**
   * Get the lemma (root form) of a word using NLP.
   * @param {string} text - The input word.
   * @returns {string} - The lemma or original text.
   */
  getLemma(text) {
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

  /**
   * Fetch definitions from the Free Dictionary API.
   * @param {string} word - The word to look up.
   * @returns {Promise<any>} - The API response.
   */
  async fetchDefinitions(word) {
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

  /**
   * Format the output text for the card.
   * @param {string} lemma - The word/lemma.
   * @param {string} userContext - The user provided context.
   * @param {any} apiData - The data from the dictionary API.
   * @param {string} otherMessage - Additional notes.
   * @returns {string} - The formatted text.
   */
  formatOutput(lemma, userContext, apiData, otherMessage) {
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
}
