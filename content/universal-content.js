/**
 * SyncUp Universal Content Script
 * Runs on ALL tabs to provide contextual intelligence
 */

class UniversalSyncUp {
  constructor() {
    this.platform = this.detectPlatform();
    this.commandPalette = null;
    this.isCommandPaletteOpen = false;
    this.lastProcessedTexts = new Set();
    this.contentObserver = null;

    // Prompt API integration
    this.promptApiHandler = null;
    this.currentApiMode = 'gemini-api'; // Will be updated from background
    this.promptApiStatus = 'unknown';

    console.log('🌐 SyncUp Universal loaded on:', this.platform?.name || 'Unknown platform');

    this.init();
  }

  init() {
    // Don't run on Google Meet (has its own script)
    if (window.location.hostname === 'meet.google.com') {
      console.log('⏭️ Skipping universal features on Google Meet');
      return;
    }

    // Don't run on excluded domains
    if (this.isExcludedDomain()) {
      console.log('⏭️ Domain excluded from SyncUp');
      return;
    }

    // Setup floating side panel button
    this.setupFloatingButton();

    // Setup command palette
    this.setupCommandPalette();

    // Setup content detection
    this.setupContentDetection();

    // Setup message listener
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
    });

    // Initialize Prompt API handler
    this.initializePromptAPI();

    // Setup smart compose (optional feature)
    // this.setupSmartCompose();

    console.log('✅ SyncUp Universal initialized');
  }

  /**
   * Initialize Prompt API handler and check availability
   */
  async initializePromptAPI() {
    console.log('🔍 [Universal Content] Initializing Prompt API...');

    try {
      // Load the Prompt API handler if available
      if (typeof PromptAPIHandler !== 'undefined') {
        this.promptApiHandler = new PromptAPIHandler();
        console.log('✅ [Universal Content] Prompt API handler created');

        // Check availability
        const availability = await this.promptApiHandler.checkAvailability();
        console.log('📊 [Universal Content] Prompt API availability:', availability);

        // Report status to background
        chrome.runtime.sendMessage({
          type: 'PROMPT_API_STATUS',
          status: availability.status,
          available: availability.available
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('ℹ️ [Universal Content] Background not ready yet:', chrome.runtime.lastError.message);
          } else {
            console.log('✅ [Universal Content] Prompt API status sent to background');
          }
        });
      } else {
        console.warn('⚠️ [Universal Content] PromptAPIHandler not loaded - will use fallback');

        // Report unavailable status to background
        chrome.runtime.sendMessage({
          type: 'PROMPT_API_STATUS',
          status: 'no',
          available: false
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('ℹ️ [Universal Content] Background not ready yet');
          }
        });
      }
    } catch (error) {
      console.error('❌ [Universal Content] Error initializing Prompt API:', error);

      // Report error to background
      chrome.runtime.sendMessage({
        type: 'PROMPT_API_STATUS',
        status: 'error',
        available: false
      });
    }
  }

  /**
   * Detect which platform we're on
   */
  detectPlatform() {
    const hostname = window.location.hostname;

    const platforms = {
      'mail.google.com': {
        name: 'Gmail',
        icon: '📧',
        color: '#ea4335',
        selectors: {
          messages: '.a3s, [data-message-id]',
          input: '[role="textbox"]'
        }
      },
      'slack.com': {
        name: 'Slack',
        icon: '💬',
        color: '#4a154b',
        selectors: {
          messages: '[data-qa="message_content"]',
          input: '[data-qa="message_input"]'
        }
      },
      'discord.com': {
        name: 'Discord',
        icon: '💬',
        color: '#5865f2',
        selectors: {
          messages: '[class*="messageContent"]',
          input: '[class*="textArea"]'
        }
      },
      'linkedin.com': {
        name: 'LinkedIn',
        icon: '💼',
        color: '#0077b5',
        selectors: {
          messages: '[data-id]',
          input: '[role="textbox"]'
        }
      },
      'twitter.com': {
        name: 'Twitter',
        icon: '🐦',
        color: '#1da1f2',
        selectors: {
          messages: '[data-testid="tweet"]',
          input: '[data-testid="tweetTextarea"]'
        }
      },
      'x.com': {
        name: 'X (Twitter)',
        icon: '🐦',
        color: '#000000',
        selectors: {
          messages: '[data-testid="tweet"]',
          input: '[data-testid="tweetTextarea"]'
        }
      }
    };

    for (const [domain, platform] of Object.entries(platforms)) {
      if (hostname.includes(domain)) {
        return platform;
      }
    }

    // Generic fallback
    return {
      name: 'Web',
      icon: '🌐',
      color: '#8ab4f8',
      selectors: {
        messages: 'p, div[class*="message"], div[class*="post"]',
        input: 'input[type="text"], textarea, [contenteditable="true"]'
      }
    };
  }

  /**
   * Check if current domain is excluded
   */
  isExcludedDomain() {
    const hostname = window.location.hostname;
    const excludedPatterns = [
      'chrome://',
      'chrome-extension://',
      'accounts.google.com',
      'passwords.google.com'
    ];

    return excludedPatterns.some(pattern => hostname.includes(pattern));
  }

  /**
   * Setup content detection with MutationObserver
   */
  setupContentDetection() {
    // Initial detection
    this.detectContent();

    // Setup observer for dynamic content
    this.contentObserver = new MutationObserver(
      this.debounce(() => {
        this.detectContent();
      }, 2000) // Debounce to 2 seconds
    );

    this.contentObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    console.log('👀 Content detection started');
  }

  /**
   * Detect and process new content
   */
  detectContent() {
    if (!this.platform || !this.platform.selectors) return;

    try {
      const messageElements = document.querySelectorAll(this.platform.selectors.messages);

      // Extract text from elements
      const texts = [];
      messageElements.forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.length > 20 && text.length < 1000) {
          const hash = this.hashText(text);
          if (!this.lastProcessedTexts.has(hash)) {
            texts.push(text);
            this.lastProcessedTexts.add(hash);

            // Limit cache size
            if (this.lastProcessedTexts.size > 100) {
              const firstHash = this.lastProcessedTexts.values().next().value;
              this.lastProcessedTexts.delete(firstHash);
            }
          }
        }
      });

      // Send to background if we found new content
      if (texts.length > 0) {
        console.log('📝 Detected new content:', texts.length, 'items');

        // Combine texts and extract keywords
        const combinedText = texts.join(' ').substring(0, 2000); // Limit length

        chrome.runtime.sendMessage({
          type: 'TAB_CONTENT_DETECTED',
          text: combinedText,
          platform: this.platform.name
        });
      }

    } catch (error) {
      console.error('Content detection error:', error);
    }
  }

  /**
   * Simple text hash for deduplication
   */
  hashText(text) {
    return text.substring(0, 100); // Simple approach
  }

  /**
   * Setup floating button for side panel access
   */
  setupFloatingButton() {
    // Create floating button
    const floatingBtn = document.createElement('div');
    floatingBtn.id = 'syncup-floating-button';
    floatingBtn.innerHTML = `
      <div class="syncup-float-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor"/>
          <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2"/>
          <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2"/>
        </svg>
      </div>
      <div class="syncup-float-tooltip">Open SyncUp Panel</div>
    `;

    // Add click handler
    floatingBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
      console.log('🎯 Side panel requested');
    });

    // Add to page
    document.body.appendChild(floatingBtn);
    console.log('🔘 Floating button added');
  }

  /**
   * Setup command palette (Cmd/Ctrl+K)
   */
  setupCommandPalette() {
    // Listen for keyboard shortcut: Ctrl+Shift+Space (or Cmd+Shift+Space on Mac)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === ' ') {
        e.preventDefault();
        this.toggleCommandPalette();
      }

      // Close on Escape
      if (e.key === 'Escape' && this.isCommandPaletteOpen) {
        this.closeCommandPalette();
      }
    });

    console.log('⌨️ Command palette shortcuts registered (Ctrl+Shift+Space)');
  }

  /**
   * Toggle command palette
   */
  toggleCommandPalette() {
    if (this.isCommandPaletteOpen) {
      this.closeCommandPalette();
    } else {
      this.openCommandPalette();
    }
  }

  /**
   * Open command palette
   */
  openCommandPalette() {
    if (this.commandPalette) {
      this.commandPalette.style.display = 'flex';
      this.commandPalette.querySelector('input')?.focus();
      this.isCommandPaletteOpen = true;
      return;
    }

    // Create command palette UI
    this.commandPalette = document.createElement('div');
    this.commandPalette.className = 'syncup-command-palette';
    this.commandPalette.innerHTML = `
      <div class="syncup-palette-backdrop"></div>
      <div class="syncup-palette-modal">
        <input type="text"
               class="syncup-palette-input"
               placeholder="🔍 Ask anything... (Ctrl+Shift+Space to open)"
               autocomplete="off">
        <div class="syncup-palette-results">
          <div class="syncup-palette-hint">
            💡 Try: "summarize tab", "what is docker?", "show action items"
          </div>
        </div>
        <div class="syncup-palette-footer">
          <span>Ctrl+Shift+Space Open</span>
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>Esc Close</span>
        </div>
      </div>
    `;

    document.body.appendChild(this.commandPalette);

    // Setup input handler
    const input = this.commandPalette.querySelector('input');
    input.addEventListener('input', this.debounce((e) => {
      this.handleCommandSearch(e.target.value);
    }, 300));

    // Setup keyboard navigation
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.executeCommand(input.value);
      }
    });

    // Close on backdrop click
    this.commandPalette.querySelector('.syncup-palette-backdrop').addEventListener('click', () => {
      this.closeCommandPalette();
    });

    input.focus();
    this.isCommandPaletteOpen = true;

    console.log('🎯 Command palette opened');
  }

  /**
   * Close command palette
   */
  closeCommandPalette() {
    if (this.commandPalette) {
      this.commandPalette.style.display = 'none';
    }
    this.isCommandPaletteOpen = false;
  }

  /**
   * Handle command search
   */
  handleCommandSearch(query) {
    const resultsContainer = this.commandPalette.querySelector('.syncup-palette-results');

    if (!query.trim()) {
      resultsContainer.innerHTML = `
        <div class="syncup-palette-hint">
          💡 Try: "summarize tab", "what is docker?", "show action items"
        </div>
      `;
      return;
    }

    // Show loading
    resultsContainer.innerHTML = `
      <div class="syncup-palette-loading">🔄 Searching...</div>
    `;

    // Send search request to background
    chrome.runtime.sendMessage({
      type: 'SEARCH_HISTORY',
      query: query
    }, (response) => {
      if (response && response.results) {
        this.displaySearchResults(response.results);
      }
    });
  }

  /**
   * Display search results
   */
  displaySearchResults(results) {
    const resultsContainer = this.commandPalette.querySelector('.syncup-palette-results');

    if (results.length === 0) {
      resultsContainer.innerHTML = `
        <div class="syncup-palette-no-results">
          No results found. Try a different search.
        </div>
      `;
      return;
    }

    resultsContainer.innerHTML = results.map(result => `
      <div class="syncup-palette-result" data-action="${result.action}">
        <div class="syncup-result-icon">${result.icon}</div>
        <div class="syncup-result-content">
          <div class="syncup-result-title">${this.escapeHtml(result.title)}</div>
          <div class="syncup-result-subtitle">${this.escapeHtml(result.subtitle)}</div>
        </div>
      </div>
    `).join('');

    // Add click handlers
    resultsContainer.querySelectorAll('.syncup-palette-result').forEach(el => {
      el.addEventListener('click', () => {
        this.executeCommand(el.dataset.action);
      });
    });
  }

  /**
   * Execute command
   */
  async executeCommand(command) {
    console.log('⚡ Executing command:', command);

    // Show loading state immediately
    this.showLoadingState(command);

    // Capture current page content
    const currentPageContext = this.capturePageContent();
    console.log('📸 Captured page context, length:', currentPageContext.length);

    // Set timeout to show error if no response in 30 seconds
    const timeoutId = setTimeout(() => {
      console.error('❌ Timeout: No response from background');
      this.showErrorState('Request timed out. The AI might be taking too long to respond. Please try again.');
    }, 30000);

    // Clear timeout when we get response
    this.currentTimeout = timeoutId;

    // Send to background with current page context
    chrome.runtime.sendMessage({
      type: 'EXECUTE_COMMAND',
      command: command,
      currentPageContext: currentPageContext,
      currentPageUrl: window.location.href,
      currentPageTitle: document.title
    }, (response) => {
      if (chrome.runtime.lastError) {
        clearTimeout(timeoutId);
        console.error('❌ Message send error:', chrome.runtime.lastError);
        this.showErrorState('Failed to send question. Please try again.');
      } else {
        console.log('✅ Question sent to background');
        // Note: Answer will come via COMMAND_PALETTE_ANSWER message, not this callback
      }
    });

    // Don't close palette - wait for answer
  }

  /**
   * Show loading state while waiting for answer
   */
  showLoadingState(question) {
    if (!this.commandPalette) return;

    const resultsContainer = this.commandPalette.querySelector('.syncup-palette-results');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = `
      <div class="syncup-palette-answer syncup-loading">
        <div class="syncup-answer-question">
          <strong>Q:</strong> ${this.escapeHtml(question)}
        </div>
        <div class="syncup-answer-loading">
          <div class="syncup-spinner"></div>
          <div>Analyzing context and generating answer...</div>
        </div>
      </div>
    `;
  }

  /**
   * Show error state
   */
  showErrorState(errorMessage) {
    if (!this.commandPalette) return;

    const resultsContainer = this.commandPalette.querySelector('.syncup-palette-results');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = `
      <div class="syncup-palette-answer syncup-error">
        <div class="syncup-answer-text">
          <strong>Error:</strong> ${this.escapeHtml(errorMessage)}
        </div>
        <div style="margin-top: 8px; font-size: 12px; color: #9aa0a6;">
          Check console (F12) for more details.
        </div>
      </div>
    `;
  }

  /**
   * Capture current page content for context
   */
  capturePageContent() {
    try {
      const url = window.location.href;
      let content = '';

      // Platform-specific content extraction
      if (url.includes('mail.google.com')) {
        // Gmail: Get email content
        content = this.captureGmailContent();
      } else if (url.includes('outlook.')) {
        // Outlook: Get email content
        content = this.captureOutlookContent();
      } else if (url.includes('slack.com')) {
        // Slack: Get conversation
        content = this.captureSlackContent();
      } else {
        // Generic page: Get all content
        content = this.captureGenericContent();
      }

      return content;
    } catch (error) {
      console.error('Error capturing page content:', error);
      return `Page: ${document.title} at ${window.location.href}`;
    }
  }

  /**
   * Capture Gmail email content
   */
  captureGmailContent() {
    // Gmail email body selectors
    const emailBody = document.querySelector('.a3s.aiL') || // Email body
                     document.querySelector('[role="listitem"]') || // Email thread
                     document.querySelector('.ii.gt'); // Alternative email body

    const emailSubject = document.querySelector('.hP') || // Subject
                        document.querySelector('h2.hP');

    const emailFrom = document.querySelector('.gD') || // From
                     document.querySelector('.go');

    const emailDate = document.querySelector('.g3') || // Date
                     document.querySelector('.gH');

    let content = `Page: Gmail\n`;
    content += `Subject: ${emailSubject?.innerText || document.title}\n`;
    content += `From: ${emailFrom?.innerText || 'Unknown'}\n`;
    content += `Date: ${emailDate?.getAttribute('title') || emailDate?.innerText || 'Unknown'}\n\n`;

    // Get email body - use full text, not just 3000 chars
    if (emailBody) {
      content += `Email Content:\n${emailBody.innerText}\n`;
    } else {
      // Fallback: get all visible text
      content += `Content:\n${document.body.innerText.substring(0, 8000)}\n`;
    }

    return content.substring(0, 10000); // Increased limit
  }

  /**
   * Capture Outlook email content
   */
  captureOutlookContent() {
    const emailBody = document.querySelector('[role="document"]') ||
                     document.querySelector('.rps_1d47');

    let content = `Page: Outlook\n`;
    content += `Title: ${document.title}\n\n`;

    if (emailBody) {
      content += `Email Content:\n${emailBody.innerText}\n`;
    } else {
      content += `Content:\n${document.body.innerText.substring(0, 8000)}\n`;
    }

    return content.substring(0, 10000);
  }

  /**
   * Capture Slack conversation
   */
  captureSlackContent() {
    const messages = document.querySelectorAll('[role="listitem"]');

    let content = `Page: Slack\n`;
    content += `Channel: ${document.title}\n\n`;
    content += `Recent Messages:\n`;

    messages.forEach((msg, i) => {
      if (i < 20) { // Last 20 messages
        content += `${msg.innerText}\n---\n`;
      }
    });

    return content.substring(0, 10000);
  }

  /**
   * Capture generic page content
   */
  captureGenericContent() {
    const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
    const h1Texts = Array.from(document.querySelectorAll('h1')).map(h => h.innerText).join(' ');
    const h2Texts = Array.from(document.querySelectorAll('h2')).map(h => h.innerText).join(' ');

    // Get main content areas (common selectors)
    const mainContent = document.querySelector('main')?.innerText ||
                       document.querySelector('article')?.innerText ||
                       document.querySelector('[role="main"]')?.innerText ||
                       document.querySelector('.content')?.innerText ||
                       document.querySelector('#content')?.innerText ||
                       '';

    let content = `Page Title: ${document.title}\n`;
    content += `URL: ${window.location.href}\n`;
    if (metaDescription) content += `Meta Description: ${metaDescription}\n`;
    if (h1Texts) content += `Main Headings: ${h1Texts} ${h2Texts}\n\n`;

    // Use main content if available, otherwise get more body text
    if (mainContent) {
      content += `Main Content:\n${mainContent.substring(0, 8000)}`;
    } else {
      content += `Page Content:\n${document.body.innerText.substring(0, 8000)}`;
    }

    return content.substring(0, 10000); // Increased from 3000
  }

  /**
   * Handle messages from background
   */
  handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'OPEN_COMMAND_PALETTE':
        this.openCommandPalette();
        sendResponse({ success: true });
        break;

      case 'CLOSE_COMMAND_PALETTE':
        this.closeCommandPalette();
        sendResponse({ success: true });
        break;

      case 'COMMAND_PALETTE_ANSWER':
        this.displayCommandPaletteAnswer(message);
        sendResponse({ success: true });
        break;

      case 'EXECUTE_PROMPT_API':
        // Background is requesting us to execute a prompt using Prompt API
        console.log('📥 [Universal Content] Received EXECUTE_PROMPT_API request');
        this.executePromptAPI(message).then((result) => {
          // Send result back to background
          chrome.runtime.sendMessage({
            type: 'PROMPT_API_RESULT',
            requestId: message.requestId,
            result: result
          });
        });
        sendResponse({ success: true });
        break;

      case 'API_STATUS_UPDATE':
        // Background is broadcasting API status update
        console.log('📊 [Universal Content] API status update:', message.currentApiMode);
        this.currentApiMode = message.currentApiMode;
        this.promptApiStatus = message.promptApiStatus;
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  }

  /**
   * Execute prompt using Prompt API
   */
  async executePromptAPI(request) {
    console.log('🚀 [Universal Content] Executing Prompt API request');
    console.log('📝 [Universal Content] Prompt preview:', request.prompt.substring(0, 100) + '...');

    try {
      // Check if we have a Prompt API handler
      if (!this.promptApiHandler) {
        console.warn('⚠️ [Universal Content] No Prompt API handler available');
        return { success: false, error: 'Prompt API handler not initialized' };
      }

      // Execute the prompt
      const result = await this.promptApiHandler.prompt(request.prompt, request.options);

      if (result.success) {
        console.log('✅ [Universal Content] Prompt API execution successful');
        return result;
      } else {
        console.error('❌ [Universal Content] Prompt API execution failed:', result.error);
        return result;
      }
    } catch (error) {
      console.error('❌ [Universal Content] Error executing Prompt API:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Display answer in command palette
   */
  displayCommandPaletteAnswer(data) {
    // Clear timeout if set
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }

    if (!this.commandPalette) return;

    const resultsContainer = this.commandPalette.querySelector('.syncup-palette-results');
    if (!resultsContainer) return;

    // Clear previous results
    resultsContainer.innerHTML = '';

    // Determine context badge
    let contextBadge = '';
    if (data.usedContext) {
      const icon = data.contextSource?.includes('current') ? '📄' :
                   data.contextSource?.includes('previous') ? '🔄' : '🧠';
      contextBadge = `<span class="syncup-context-badge">${icon} Used ${data.contextSource || 'context'}</span>`;
    } else {
      contextBadge = `<span class="syncup-context-badge general">💡 General knowledge</span>`;
    }

    // Create answer display
    const answerHTML = `
      <div class="syncup-palette-answer">
        <div class="syncup-answer-question">
          <strong>Q:</strong> ${this.escapeHtml(data.question)}
          ${contextBadge}
        </div>
        <div class="syncup-answer-text">
          <strong>A:</strong> ${this.escapeHtml(data.answer)}
        </div>
        ${data.additionalInfo && data.additionalInfo.length > 0 ? `
          <div class="syncup-answer-points">
            <strong>Key Points:</strong>
            <ul>
              ${data.additionalInfo.map(point => `<li>${this.escapeHtml(point)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;

    resultsContainer.innerHTML = answerHTML;
    console.log('✅ Answer displayed in command palette (context:', data.usedContext, ')');
  }

  /**
   * Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Debounce helper
   */
  debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new UniversalSyncUp();
  });
} else {
  new UniversalSyncUp();
}
