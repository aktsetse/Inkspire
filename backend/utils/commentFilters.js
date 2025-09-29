// Import the bad-words package
const Filter = require('bad-words');

/**
 * Trie data structure for efficient bad word detection
 */
class TrieNode {
  constructor() {
    this.children = {};
    this.isEndOfWord = false;
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(word) {
    if (!word || typeof word !== 'string') return;

    let node = this.root;
    for (let char of word.toLowerCase()) {
      if (!node.children[char]) node.children[char] = new TrieNode();
      node = node.children[char];
    }
    node.isEndOfWord = true;
  }

  searchInText(text) {
    if (!text || typeof text !== 'string') return false;

    text = text.toLowerCase();
    for (let i = 0; i < text.length; i++) {
      let node = this.root;
      let j = i;
      while (j < text.length && node.children[text[j]]) {
        node = node.children[text[j]];
        if (node.isEndOfWord) return true;  // Found a bad word
        j++;
      }
    }
    return false;
  }
}

// Initialize the Trie with bad words from the bad-words module
const badWordsTrie = new Trie();
let filter;

try {
  // Create a filter instance to get the list of bad words
  filter = new Filter();

  // Add custom words to the filter
  const customBadWords = ['foolish', 'stupid', 'idiot'];
  customBadWords.forEach(word => filter.addWords(word));

  // Get the list of bad words from the filter
  const badWordsList = filter.list;

  // Insert all bad words into the Trie
  badWordsList.forEach(word => badWordsTrie.insert(word));

} catch (error) {
  console.error('Error initializing bad words Trie:', error);
}

/**
 * Checks if a comment contains bad words using Trie for efficient lookup
 * @param {string} text - The comment text to check
 * @returns {boolean} - True if the comment contains bad words
 */
const containsBadWords = (text) => {
  if (!text || typeof text !== 'string') return false;

  try {
    // First try with our Trie implementation for efficiency
    if (badWordsTrie.searchInText(text)) {
      return true;
    }

    // As a fallback, also check with the original filter
    // This ensures we catch any edge cases our Trie might miss
    if (filter && filter.isProfane(text)) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking for bad words:', error);

    // Fallback to the original filter if our Trie fails
    if (filter) {
      try {
        return filter.isProfane(text);
      } catch (filterError) {
        console.error('Error using filter fallback:', filterError);
      }
    }

    return false;
  }
};

/**
 * Counts the number of words in a text, excluding emojis
 * @param {string} text - The text to count words in
 * returns the number of words in the text, excluding emojis

 */
const countWords = (text) => {
  if (!text || typeof text !== 'string') return 0;

  // Remove emojis from the text
  // This regex pattern matches most common emoji characters
  const textWithoutEmojis = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');

  // Split by whitespace and filter out empty strings
  const words = textWithoutEmojis.trim().split(/\s+/).filter(word => word.length > 0);

  return words.length;
};

/**
 * Determines if a notification should be created for a comment
 * @param {string} text - The comment text
 * @param {number} minLength - Minimum word count required (default: 5)
 * @returns {boolean} - True if notification should be created, false otherwise
 */
const shouldCreateNotification = (text, minLength = 5) => {
  // Don't create notification if:
  // 1. The comment contains bad words, OR
  // 2. The comment has fewer than minLength words (excluding emojis)
  if (containsBadWords(text) || countWords(text) < minLength) {
    return false;
  }

  return true;
};

module.exports = {
  containsBadWords,
  countWords,
  shouldCreateNotification
};
