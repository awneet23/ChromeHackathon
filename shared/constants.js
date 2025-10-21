/**
 * SyncUp Constants and Shared Utilities
 */

// Message types for chrome.runtime messaging
const MESSAGE_TYPES = {
  // Gemini API
  GEMINI_GENERATE_CONTEXT: 'GEMINI_GENERATE_CONTEXT',
  GEMINI_EXTRACT_KEYWORDS: 'GEMINI_EXTRACT_KEYWORDS',
  GEMINI_ANSWER_QUESTION: 'GEMINI_ANSWER_QUESTION',
  GEMINI_EXTRACT_ACTION_ITEMS: 'GEMINI_EXTRACT_ACTION_ITEMS',
  GEMINI_SUMMARIZE: 'GEMINI_SUMMARIZE',

  // State management
  GET_STATE: 'GET_STATE',
  UPDATE_STATE: 'UPDATE_STATE',
  ADD_CONTEXT_CARD: 'ADD_CONTEXT_CARD',
  ADD_ACTION_ITEM: 'ADD_ACTION_ITEM',

  // Tab communication
  TAB_CONTEXT_UPDATE: 'TAB_CONTEXT_UPDATE',
  TAB_CONTENT_DETECTED: 'TAB_CONTENT_DETECTED',

  // Command palette
  OPEN_COMMAND_PALETTE: 'OPEN_COMMAND_PALETTE',
  CLOSE_COMMAND_PALETTE: 'CLOSE_COMMAND_PALETTE',
  SEARCH_HISTORY: 'SEARCH_HISTORY',

  // Side panel
  OPEN_SIDE_PANEL: 'OPEN_SIDE_PANEL',
  UPDATE_ACTIVITY_FEED: 'UPDATE_ACTIVITY_FEED',

  // Settings
  GET_SETTINGS: 'GET_SETTINGS',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  TEST_API_KEY: 'TEST_API_KEY',

  // Google Meet (preserve existing)
  START_RECORDING: 'START_RECORDING',
  STOP_RECORDING: 'STOP_RECORDING',
  GET_STATUS: 'GET_STATUS',
  GET_CONTEXTUAL_CARDS: 'GET_CONTEXTUAL_CARDS',
  CLEAR_CARDS: 'CLEAR_CARDS',
  SIDEBAR_INJECTED: 'SIDEBAR_INJECTED',
  TRANSCRIPT_RECEIVED: 'TRANSCRIPT_RECEIVED',
  CHATBOX_QUESTION: 'CHATBOX_QUESTION',
  NEW_CARDS: 'NEW_CARDS',
  RECORDING_STATUS: 'RECORDING_STATUS'
};

// Storage keys
const STORAGE_KEYS = {
  GEMINI_API_KEY: 'gemini_api_key',
  SETTINGS: 'syncup_settings',
  CONVERSATION_HISTORY: 'conversation_history',
  ACTION_ITEMS: 'action_items',
  CONTEXT_CARDS: 'context_cards',
  EXCLUDED_DOMAINS: 'excluded_domains'
};

// Default settings
const DEFAULT_SETTINGS = {
  geminiApiKey: '',
  enableUniversalContext: true,
  enableActionItems: true,
  enableSmartCompose: false,
  autoDeleteHistory: true,
  historyRetentionHours: 24,
  excludedDomains: [
    'chrome://*',
    'chrome-extension://*',
    'accounts.google.com',
    'passwords.google.com'
  ],
  privacyMode: false
};

// Platforms configuration
const PLATFORMS = {
  GOOGLE_MEET: {
    name: 'Google Meet',
    domain: 'meet.google.com',
    color: '#00897b',
    icon: '🎥',
    selectors: {
      captions: '[aria-live="polite"]',
      chatInput: 'input[placeholder*="message"]'
    }
  },
  GMAIL: {
    name: 'Gmail',
    domain: 'mail.google.com',
    color: '#ea4335',
    icon: '📧',
    selectors: {
      emailBody: '.a3s, [data-message-id]',
      composeBox: '[role="textbox"]'
    }
  },
  SLACK: {
    name: 'Slack',
    domain: 'slack.com',
    color: '#4a154b',
    icon: '💬',
    selectors: {
      messages: '[data-qa="message_content"]',
      messageInput: '[data-qa="message_input"]'
    }
  },
  DISCORD: {
    name: 'Discord',
    domain: 'discord.com',
    color: '#5865f2',
    icon: '💬',
    selectors: {
      messages: '[class*="messageContent"]',
      messageInput: '[class*="textArea"]'
    }
  },
  LINKEDIN: {
    name: 'LinkedIn',
    domain: 'linkedin.com',
    color: '#0077b5',
    icon: '💼',
    selectors: {
      posts: '[data-id]',
      messageInput: '[role="textbox"]'
    }
  },
  TWITTER: {
    name: 'Twitter/X',
    domain: 'twitter.com',
    color: '#1da1f2',
    icon: '🐦',
    selectors: {
      tweets: '[data-testid="tweet"]',
      composeBox: '[data-testid="tweetTextarea"]'
    }
  }
};

// Utility functions
const Utils = {
  /**
   * Debounce function calls
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Throttle function calls
   */
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * Get current platform from hostname
   */
  getPlatform(hostname) {
    for (const [key, platform] of Object.entries(PLATFORMS)) {
      if (hostname.includes(platform.domain)) {
        return platform;
      }
    }
    return null;
  },

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Format timestamp
   */
  formatTimestamp(date) {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Check if domain is excluded
   */
  isExcludedDomain(hostname, excludedDomains) {
    return excludedDomains.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(hostname);
      }
      return hostname.includes(pattern);
    });
  },

  /**
   * Truncate text
   */
  truncate(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MESSAGE_TYPES,
    STORAGE_KEYS,
    DEFAULT_SETTINGS,
    PLATFORMS,
    Utils
  };
}
