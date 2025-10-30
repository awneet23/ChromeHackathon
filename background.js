/**
 * SyncUp Background Service Worker - Universal Version
 * Integrates Google Gemini for all AI features
 * Preserves existing Google Meet functionality
 */

// Import Gemini client (will be loaded via importScripts in service worker)
// importScripts('shared/gemini-client.js', 'shared/constants.js');

class SyncUpUniversal {
  constructor() {
    // Existing Google Meet state (PRESERVED)
    this.isRecording = false;
    this.currentStream = null;
    this.contextualCards = [];
    this.transcriptBuffer = '';
    this.lastProcessedTime = 0;
    this.processedTopics = new Set();
    this.audioContext = null;
    this.mediaRecorder = null;

    // New universal state
    this.geminiClient = null;
    this.activeTabContexts = new Map(); // Map<tabId, context>
    this.conversationHistory = [];
    this.actionItems = [];
    this.settings = null;

    // Prompt API state
    this.promptApiAvailable = false;
    this.promptApiStatus = 'unknown'; // 'readily', 'after-download', 'no', 'unknown'
    this.currentApiMode = 'gemini-api'; // 'prompt-api' or 'gemini-api'
    this.lastApiCheck = 0;
    this.apiCheckInterval = 60000; // Check every 60 seconds

    // Request queue for Prompt API (only one request at a time)
    this.promptApiQueue = [];
    this.promptApiProcessing = false;

    this.init();
  }

  async init() {
    console.log('🚀 SyncUp Universal initializing...');

    // Load settings and initialize Gemini
    await this.loadSettings();
    await this.initializeGemini();

    // Setup message listeners
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep channel open for async
    });

    // Setup command keyboard shortcut
    chrome.commands.onCommand.addListener((command) => {
      if (command === 'open-command-palette') {
        this.openCommandPalette();
      }
    });

    // Track active tab changes
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.handleTabActivated(activeInfo);
    });

    // Track tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete') {
        this.handleTabUpdated(tabId, tab);
      }
    });

    // Cleanup on startup
    chrome.runtime.onStartup.addListener(() => {
      this.cleanupOldData();
    });

    chrome.runtime.onInstalled.addListener(() => {
      console.log('✅ SyncUp Universal installed');
      this.showWelcomeNotification();
    });

    // Open side panel when extension icon is clicked
    chrome.action.onClicked.addListener((tab) => {
      this.openSidePanel(tab);
    });

    console.log('✅ SyncUp Universal ready');
  }

  /**
   * Load settings from storage
   */
  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['syncup_settings']);
      this.settings = result.syncup_settings || {
        geminiApiKey: '',
        enableUniversalContext: true,
        enableActionItems: true,
        autoDeleteHistory: true,
        historyRetentionHours: 24,
        excludedDomains: ['chrome://*', 'chrome-extension://*']
      };
      console.log('📋 Settings loaded');
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = {};
    }
  }

  /**
   * Initialize Gemini client with API key
   */
  async initializeGemini() {
    if (this.settings.geminiApiKey) {
      try {
        // Create new GeminiClient instance
        this.geminiClient = {
          apiKey: this.settings.geminiApiKey,
          baseURL: 'https://generativelanguage.googleapis.com/v1',
          model: 'gemini-2.5-flash',

          async generateContent(prompt, options = {}) {
            if (!this.apiKey) {
              throw new Error('Gemini API key not configured');
            }

            const endpoint = `${this.baseURL}/models/${this.model}:generateContent?key=${this.apiKey}`;

            const response = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: options.temperature || 0.5,
                  maxOutputTokens: options.maxOutputTokens || 800
                }
              })
            });

            if (!response.ok) {
              const errorText = await response.text();
              console.error('❌ Gemini API Error:', response.status);
              console.error('❌ Response:', errorText);
              console.error('❌ Endpoint:', endpoint);
              throw new Error(`Gemini API error: ${response.status} - ${errorText.substring(0, 200)}`);
            }

            const data = await response.json();
            console.log('✅ Gemini response received:', data);
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) {
              console.error('❌ No text in response:', data);
              throw new Error('No content in Gemini response');
            }

            console.log('✅ Gemini text extracted:', text.substring(0, 100));
            return text;
          },

          parseJSON(text) {
            try {
              // Remove markdown code blocks
              let cleanText = text.replace(/```json\n?|\n?```/g, '').trim();

              // Try to extract JSON if embedded in other text
              const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                cleanText = jsonMatch[0];
              }

              console.log('🔍 Attempting to parse JSON, length:', cleanText.length);

              // Attempt to parse
              return JSON.parse(cleanText);
            } catch (error) {
              console.error('❌ JSON Parse Error:', error.message);
              console.error('❌ Error position:', error.message);
              console.error('❌ Raw text (first 500 chars):', text.substring(0, 500));

              // Try to fix common issues and retry
              try {
                let cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
                const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  cleanText = jsonMatch[0];
                }

                // Replace unescaped newlines in strings (but not in JSON structure)
                // This is a simple fix - replace \n that aren't already escaped
                let fixed = cleanText.replace(/([^\\])\\n/g, '$1\\\\n');

                console.log('🔧 Trying fixed JSON...');
                return JSON.parse(fixed);
              } catch (retryError) {
                console.error('❌ Retry also failed:', retryError.message);
                console.error('❌ Full raw response:', text);

                // Final fallback: return structured error
                throw new Error(`Failed to parse Gemini JSON response: ${error.message}. Check console for full response.`);
              }
            }
          }
        };

        console.log('✅ Gemini client initialized');
      } catch (error) {
        console.error('Failed to initialize Gemini:', error);
      }
    } else {
      console.warn('⚠️ No Gemini API key configured');
    }
  }

  /**
   * Parse JSON response, handling markdown code blocks
   * Standalone utility that works regardless of which AI is used
   */
  parseJSON(text) {
    try {
      // Remove markdown code blocks
      let cleanText = text.replace(/```json\n?|\n?```/g, '').trim();

      // Try to extract JSON if embedded in other text
      const jsonMatch = cleanText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        cleanText = jsonMatch[0];
      }

      console.log('🔍 Attempting to parse JSON, length:', cleanText.length);

      // Attempt to parse
      return JSON.parse(cleanText);
    } catch (error) {
      console.error('❌ JSON Parse Error:', error.message);
      console.error('❌ Raw text (first 500 chars):', text.substring(0, 500));

      // Try to fix common issues and retry
      try {
        let cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
        const jsonMatch = cleanText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) {
          cleanText = jsonMatch[0];
        }

        // Replace unescaped newlines in strings
        let fixed = cleanText.replace(/([^\\])\\n/g, '$1\\\\n');

        console.log('🔧 Trying fixed JSON...');
        return JSON.parse(fixed);
      } catch (retryError) {
        console.error('❌ Retry also failed:', retryError.message);
        console.error('❌ Full raw response:', text);

        // Final fallback: return structured error
        throw new Error(`Failed to parse JSON response: ${error.message}. Check console for full response.`);
      }
    }
  }

  /**
   * Handle messages from content scripts and popup
   */
  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        // ==== EXISTING GOOGLE MEET MESSAGES (PRESERVED) ====
        case 'START_RECORDING':
          const startResult = await this.startRecording();
          sendResponse(startResult);
          break;

        case 'STOP_RECORDING':
          const stopResult = await this.stopRecording();
          sendResponse(stopResult);
          break;

        case 'GET_STATUS':
          sendResponse({
            isRecording: this.isRecording,
            cardsCount: this.contextualCards.length
          });
          break;

        case 'GET_CONTEXTUAL_CARDS':
          sendResponse({ cards: this.contextualCards });
          break;

        case 'CLEAR_CARDS':
          this.contextualCards = [];
          this.processedTopics.clear();
          this.broadcastToContentScript('CLEAR_CARDS');
          sendResponse({ success: true });
          break;

        case 'SIDEBAR_INJECTED':
          this.sendToContentScript(sender.tab.id, 'RECORDING_STATUS', {
            isRecording: this.isRecording
          });
          this.sendToContentScript(sender.tab.id, 'NEW_CARDS', {
            cards: this.contextualCards
          });
          break;

        case 'TRANSCRIPT_RECEIVED':
          if (message.transcript) {
            console.log('📥 Transcript received:', message.transcript.substring(0, 100));
            await this.processTranscriptWithGemini(message.transcript);
          }
          sendResponse({ success: true });
          break;

        case 'CHATBOX_QUESTION':
          console.log('💬 Chatbox question:', message.question);
          await this.handleChatboxQuestionWithGemini(
            message.question,
            message.meetingContext || ''
          );
          sendResponse({ success: true });
          break;

        // ==== NEW UNIVERSAL MESSAGES ====
        case 'TAB_CONTENT_DETECTED':
          await this.handleContentDetected(message, sender.tab);
          sendResponse({ success: true });
          break;

        case 'GEMINI_GENERATE_CONTEXT':
          const contextCard = await this.generateContextCard(message.topic);
          sendResponse({ success: true, card: contextCard });
          break;

        case 'OPEN_SIDE_PANEL':
          await this.openSidePanel(sender.tab);
          sendResponse({ success: true });
          break;

        case 'GET_SETTINGS':
          sendResponse({ settings: this.settings });
          break;

        case 'UPDATE_SETTINGS':
          await this.updateSettings(message.settings);
          sendResponse({ success: true });
          break;

        case 'TEST_API_KEY':
          const testResult = await this.testGeminiAPIKey(message.apiKey);
          sendResponse(testResult);
          break;

        case 'EXECUTE_COMMAND':
          // Handle command palette questions with context
          console.log('⚡ Command palette question:', message.command);
          await this.handleCommandPaletteQuestion(
            message.command,
            sender.tab,
            message.currentPageContext,
            message.currentPageUrl,
            message.currentPageTitle
          );
          sendResponse({ success: true });
          break;

        // ==== PROMPT API MESSAGES ====
        case 'PROMPT_API_STATUS':
          // Content script reporting Prompt API availability
          console.log('📊 [Background] Prompt API status from tab:', message.status);
          this.updatePromptApiStatus(message.status, message.available);
          sendResponse({ success: true });
          break;

        case 'PROMPT_API_RESULT':
          // Content script sending back Prompt API result
          console.log('✅ [Background] Prompt API result received from tab');
          // This will be handled by the promise waiting for it
          sendResponse({ success: true });
          break;

        case 'GET_API_STATUS':
          // Get current API mode and status
          sendResponse({
            currentApiMode: this.currentApiMode,
            promptApiAvailable: this.promptApiAvailable,
            promptApiStatus: this.promptApiStatus
          });
          break;

        case 'GET_STATE':
          // Side panel requesting current state
          sendResponse({
            success: true,
            data: {
              contextCards: this.contextualCards,
              actionItems: this.actionItems,
              activeContexts: Array.from(this.activeTabContexts.values())
            }
          });
          break;

        default:
          console.warn('Unknown message type:', message.type);
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Message handler error:', error);
      sendResponse({ error: error.message });
    }
  }

  /**
   * EXISTING: Start recording (PRESERVED)
   */
  async startRecording() {
    if (this.isRecording) {
      return { error: 'Already recording' };
    }

    try {
      const tabs = await chrome.tabs.query({ url: 'https://meet.google.com/*' });

      if (tabs.length === 0) {
        throw new Error('No Google Meet tab found');
      }

      this.isRecording = true;
      console.log('✅ Recording started');
      return { success: true };
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.isRecording = false;
      return { error: error.message };
    }
  }

  /**
   * EXISTING: Stop recording (PRESERVED)
   */
  async stopRecording() {
    if (!this.isRecording) {
      return { error: 'Not recording' };
    }

    try {
      if (this.currentStream) {
        this.currentStream.getTracks().forEach(track => track.stop());
        this.currentStream = null;
      }

      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
        this.mediaRecorder = null;
      }

      this.isRecording = false;
      this.broadcastToContentScript('RECORDING_STATUS', { isRecording: false });

      console.log('🛑 Recording stopped');
      return { success: true };
    } catch (error) {
      console.error('Failed to stop recording:', error);
      return { error: error.message };
    }
  }

  /**
   * NEW: Process transcript using AI (Prompt API or Gemini API)
   */
  async processTranscriptWithGemini(transcript) {
    if (!transcript.trim()) return;

    console.log('🤖 [Background] Processing transcript with AI...');
    console.log('🎯 [Background] Current API mode:', this.currentApiMode);

    try {
      // Step 1: Extract keywords
      const keywordsPrompt = `Extract 1-3 important keywords from: "${transcript}"
Return ONLY JSON array: ["keyword1", "keyword2"]`;

      const result = await this.generateContentUnified(keywordsPrompt);
      console.log('✅ [Background] Keywords extracted using:', result.source);

      const keywords = this.parseJSON(result.text);

      console.log('📋 Extracted keywords:', keywords);

      // Step 2: Generate context cards for new keywords
      for (const keyword of keywords) {
        if (!this.processedTopics.has(keyword.toLowerCase())) {
          await this.generateContextCardWithGemini(keyword);
          this.processedTopics.add(keyword.toLowerCase());
        }
      }

    } catch (error) {
      console.error('Failed to process transcript with Gemini:', error);
    }
  }

  /**
   * NEW: Generate context card using AI (Prompt API or Gemini API)
   */
  async generateContextCardWithGemini(keyword, tabId = null) {
    console.log('💡 [Background] Generating context card for:', keyword);
    console.log('🎯 [Background] Current API mode:', this.currentApiMode);

    try {
      const prompt = `Provide concise information about "${keyword}".

IMPORTANT: Return ONLY valid JSON (no markdown, no extra text). Keep all text short and avoid quotes or special characters that break JSON.

Return JSON:
{
  "explanation": "Clear explanation in 2-3 sentences",
  "keyPoints": ["point1", "point2", "point3"],
  "useCase": "When and why this is used",
  "learnMore": ["resource1", "resource2"]
}`;

      const result = await this.generateContentUnified(prompt, {}, tabId);
      console.log('✅ [Background] Context card generated using:', result.source);

      const response = this.parseJSON(result.text);

      const card = {
        id: Date.now() + Math.random(),
        topic: keyword,
        timestamp: new Date().toLocaleTimeString(),
        summary: response.explanation,
        keyPoints: response.keyPoints || [],
        useCase: response.useCase,
        resources: response.learnMore || [],
        expanded: false,
        isAutoGenerated: true
      };

      this.addCard(card);
      console.log('✅ Context card generated with Gemini:', keyword);

    } catch (error) {
      console.error('Failed to generate context card:', error);
    }
  }

  /**
   * NEW: Handle chatbox question using AI (Prompt API or Gemini API)
   */
  async handleChatboxQuestionWithGemini(question, meetingContext) {
    console.log('💬 [Background] Handling chatbox question:', question);
    console.log('🎯 [Background] Current API mode:', this.currentApiMode);

    try {
      const prompt = `You are a helpful AI assistant. Answer this question intelligently.

${meetingContext ? `Meeting Context Available: "${meetingContext}"\n` : 'No meeting context available.\n'}
Question: ${question}

IMPORTANT INSTRUCTIONS:
1. First, check if the question can be answered using the meeting context
2. If yes, provide an answer based on the meeting AND also provide general knowledge about the topic
3. If no meeting context or not relevant, provide a comprehensive general answer
4. ALWAYS provide helpful information regardless of whether meeting context exists
5. Keep answers concise (2-3 sentences each)
6. Avoid using quotes or special characters that break JSON formatting

Return ONLY valid JSON (no markdown, no extra text):
{
  "meetingAnswer": "Answer based on meeting context (or Not discussed in meeting if not applicable)",
  "generalAnswer": "Comprehensive general knowledge answer about this topic",
  "wasInMeeting": true,
  "additionalInfo": ["helpful point 1", "helpful point 2", "helpful point 3"]
}`;

      const result = await this.generateContentUnified(prompt);
      console.log('✅ [Background] Chatbox answer generated using:', result.source);

      const response = this.parseJSON(result.text);

      // Build comprehensive answer showing both meeting context and general knowledge
      let fullAnswer = '';

      if (response.wasInMeeting) {
        fullAnswer = `📍 **From the Meeting:**\n${response.meetingAnswer}\n\n`;
        fullAnswer += `📚 **General Knowledge:**\n${response.generalAnswer}`;
      } else {
        fullAnswer = `ℹ️ **Note:** This topic was not discussed in the meeting.\n\n`;
        fullAnswer += `📚 **General Answer:**\n${response.generalAnswer}`;
      }

      const card = {
        id: Date.now() + Math.random(),
        topic: `💬 ${question}`,
        timestamp: new Date().toLocaleTimeString(),
        summary: fullAnswer,
        keyPoints: response.additionalInfo || [],
        useCase: response.wasInMeeting
          ? '✅ Answered from meeting context + general knowledge'
          : '💡 General knowledge (not in meeting)',
        resources: ['Ask another question in the chatbox'],
        expanded: true,
        isChatboxAnswer: true
      };

      this.addCard(card);
      console.log('✅ Chatbox answered with Gemini (meeting:', response.wasInMeeting, ')');

    } catch (error) {
      console.error('Failed to answer question:', error);
      this.addErrorCard(question, error.message);
    }
  }

  /**
   * NEW: Handle command palette question using AI (Prompt API or Gemini API)
   * Now with current page context and cross-tab memory!
   */
  async handleCommandPaletteQuestion(question, tab, currentPageContext, currentPageUrl, currentPageTitle) {
    console.log('🎯 [Background] Answering command palette question:', question);
    console.log('📄 [Background] Current page:', currentPageTitle);
    console.log('🤖 [Background] Current API mode:', this.currentApiMode);

    try {
      // Store current page context for future use
      await this.storeTabContext(tab.id, currentPageUrl, currentPageTitle, currentPageContext);

      // Retrieve context from all recent tabs (cross-tab memory)
      const recentTabsContext = await this.getRecentTabsContext();
      console.log('🧠 [Background] Retrieved context from', recentTabsContext.length, 'recent tabs');

      // Build comprehensive context
      let contextString = '';

      // Add current page context
      if (currentPageContext) {
        contextString += `\n=== CURRENT PAGE CONTEXT ===\n${currentPageContext}\n`;
      }

      // Add recent tabs context
      if (recentTabsContext.length > 0) {
        contextString += `\n=== RECENTLY VIEWED PAGES ===\n`;
        recentTabsContext.forEach((ctx, index) => {
          // Show full content for recent tabs (already limited to 10000 chars when stored)
          contextString += `\nPage ${index + 1}: ${ctx.title}\nURL: ${ctx.url}\nContent: ${ctx.content}\n`;
        });
      }

      const prompt = `You are a helpful AI assistant with access to the user's browsing context.

USER'S CONTEXT:
${contextString}

Question: ${question}

IMPORTANT INSTRUCTIONS:
1. Use the context from the current page and recently viewed pages to answer the question
2. If the answer is in the context, refer to it specifically (e.g., "From the email you were reading...")
3. If not in context, provide general knowledge answer
4. Keep answer brief but informative (2-4 sentences)
5. Return ONLY valid JSON (no markdown, no extra text)

Return JSON:
{
  "answer": "Answer using context when available, otherwise general knowledge",
  "usedContext": true/false,
  "contextSource": "current page / previous tab / general knowledge",
  "additionalInfo": ["helpful point 1", "helpful point 2", "helpful point 3"]
}`;

      const result = await this.generateContentUnified(prompt, {
        temperature: 0.7,
        maxOutputTokens: 800
      });
      console.log('✅ [Background] Command palette answer generated using:', result.source);

      const response = this.geminiClient.parseJSON(result.text);

      console.log('✅ Command palette answer generated (used context:', response.usedContext, ')');

      // Send answer back to content script to display
      chrome.tabs.sendMessage(tab.id, {
        type: 'COMMAND_PALETTE_ANSWER',
        question: question,
        answer: response.answer,
        additionalInfo: response.additionalInfo || [],
        usedContext: response.usedContext,
        contextSource: response.contextSource
      });

    } catch (error) {
      console.error('Failed to answer command palette question:', error);

      // Send error back to content script
      chrome.tabs.sendMessage(tab.id, {
        type: 'COMMAND_PALETTE_ANSWER',
        question: question,
        answer: `Error: ${error.message}`,
        additionalInfo: []
      });
    }
  }

  /**
   * Store tab context for cross-tab memory
   */
  async storeTabContext(tabId, url, title, content) {
    try {
      const timestamp = Date.now();

      // Get existing contexts
      const result = await chrome.storage.local.get(['tab_contexts']);
      const contexts = result.tab_contexts || [];

      // Add new context
      contexts.push({
        tabId,
        url,
        title,
        content: content.substring(0, 10000), // Increased from 5000 to capture full emails
        timestamp
      });

      // Keep only last 10 tabs (to save storage)
      const recentContexts = contexts.slice(-10);

      // Save back to storage
      await chrome.storage.local.set({ tab_contexts: recentContexts });

      console.log('💾 Stored context for:', title);
    } catch (error) {
      console.error('Failed to store tab context:', error);
    }
  }

  /**
   * Get recent tabs context for cross-tab memory
   */
  async getRecentTabsContext() {
    try {
      const result = await chrome.storage.local.get(['tab_contexts']);
      const contexts = result.tab_contexts || [];

      // Return contexts from last 5 minutes, max 5 tabs
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      const recentContexts = contexts
        .filter(ctx => ctx.timestamp > fiveMinutesAgo)
        .slice(-5); // Last 5 tabs

      return recentContexts;
    } catch (error) {
      console.error('Failed to get recent tabs context:', error);
      return [];
    }
  }

  /**
   * NEW: Handle content detected from universal tabs
   * Now automatically generates context cards and action items
   */
  async handleContentDetected(message, tab) {
    if (!this.settings.enableUniversalContext) return;

    const { text, platform } = message;

    console.log('📄 [Background] Content detected from:', platform);
    console.log('📝 [Background] Text length:', text.length);

    // Update tab context
    this.activeTabContexts.set(tab.id, {
      tabId: tab.id,
      url: tab.url,
      platform,
      lastText: text,
      timestamp: Date.now()
    });

    // Check if we have ANY AI available before analyzing
    const hasGeminiAPI = this.geminiClient && this.geminiClient.apiKey;
    const hasPromptAPI = this.promptApiAvailable && this.currentApiMode === 'prompt-api';

    if (!hasGeminiAPI && !hasPromptAPI) {
      console.log('⏳ [Background] Waiting for AI to be available before analyzing...');

      // Wait a bit for Prompt API status to arrive, then retry
      setTimeout(async () => {
        const retryHasPromptAPI = this.promptApiAvailable && this.currentApiMode === 'prompt-api';
        if (retryHasPromptAPI) {
          console.log('✅ [Background] Prompt API now available, analyzing content...');
          await this.analyzePageContent(text, platform, tab);
          this.updateSidePanel();
        } else {
          console.warn('⚠️ [Background] No AI available (no Gemini API key and Prompt API not ready)');
        }
      }, 2000); // Wait 2 seconds for Prompt API initialization

      this.updateSidePanel();
      return;
    }

    // Automatically analyze content and generate cards
    await this.analyzePageContent(text, platform, tab);

    // Update side panel if open
    this.updateSidePanel();
  }

  /**
   * Helper: Sleep utility for rate limiting
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Automatically analyze page content and generate insights
   */
  async analyzePageContent(text, platform, tab) {
    console.log('🔍 [Background] Analyzing page content...');
    console.log('🤖 [Background] Using API mode:', this.currentApiMode);

    try {
      // Extract key topics/keywords
      const keywordsPrompt = `Analyze this ${platform} page content and extract 2-3 most important topics or keywords that would be useful to remember.

Content: "${text.substring(0, 3000)}"

Return ONLY a JSON array of keywords: ["keyword1", "keyword2", "keyword3"]`;

      const keywordsResult = await this.generateContentUnified(keywordsPrompt, {
        temperature: 0.3,
        maxOutputTokens: 200
      }, tab.id);

      const keywords = this.parseJSON(keywordsResult.text);
      console.log('📋 [Background] Extracted keywords:', keywords);

      // Generate context card for each keyword (queue handles sequential processing)
      for (const keyword of keywords.slice(0, 2)) {
        await this.generateContextCardWithGemini(keyword, tab.id);
      }

      // Extract action items if any
      const actionItemsPrompt = `Analyze this ${platform} page and extract any action items, tasks, or to-dos mentioned.

Content: "${text.substring(0, 3000)}"

Return ONLY valid JSON (no markdown):
{
  "hasActionItems": true/false,
  "items": [
    {"task": "description", "priority": "high/medium/low", "context": "where mentioned"}
  ]
}`;

      const actionResult = await this.generateContentUnified(actionItemsPrompt, {
        temperature: 0.3,
        maxOutputTokens: 300
      }, tab.id);

      const actionData = this.parseJSON(actionResult.text);
      console.log('✅ [Background] Action items:', actionData);

      if (actionData.hasActionItems && actionData.items) {
        actionData.items.forEach(item => {
          this.actionItems.push({
            ...item,
            source: platform,
            url: tab.url,
            timestamp: Date.now()
          });
        });
        console.log('📝 [Background] Added', actionData.items.length, 'action items');
      }

    } catch (error) {
      console.error('❌ [Background] Error analyzing content:', error);
    }
  }

  /**
   * NEW: Generate context card for any topic
   */
  async generateContextCard(topic) {
    return await this.generateContextCardWithGemini(topic);
  }

  /**
   * Add card and broadcast
   */
  addCard(card) {
    this.contextualCards.push(card);
    console.log('📦 Card added:', card.topic);
    this.broadcastToContentScript('NEW_CARDS', { cards: this.contextualCards });
    this.updateSidePanel();
  }

  /**
   * Add error card
   */
  addErrorCard(question, errorMessage) {
    const card = {
      id: Date.now(),
      topic: `💬 ${question}`,
      timestamp: new Date().toLocaleTimeString(),
      summary: `Error: ${errorMessage}`,
      keyPoints: ['Check API key configuration', 'Try again'],
      useCase: 'Error occurred',
      resources: [],
      expanded: true,
      isChatboxAnswer: true
    };
    this.addCard(card);
  }

  /**
   * EXISTING: Broadcast to Google Meet tabs (PRESERVED)
   */
  async broadcastToContentScript(type, data = {}) {
    try {
      const tabs = await chrome.tabs.query({ url: 'https://meet.google.com/*' });
      for (const tab of tabs) {
        this.sendToContentScript(tab.id, type, data);
      }
    } catch (error) {
      console.error('Failed to broadcast:', error);
    }
  }

  /**
   * Send message to content script
   */
  sendToContentScript(tabId, type, data = {}) {
    chrome.tabs.sendMessage(tabId, { type, ...data }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Send error:', chrome.runtime.lastError.message);
      }
    });
  }

  /**
   * NEW: Open command palette
   */
  async openCommandPalette() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'OPEN_COMMAND_PALETTE' });
    }
  }

  /**
   * NEW: Open side panel
   */
  async openSidePanel(tab) {
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch (error) {
      console.error('Failed to open side panel:', error);
    }
  }

  /**
   * NEW: Update side panel with latest data
   */
  updateSidePanel() {
    // Send update to side panel
    chrome.runtime.sendMessage({
      type: 'UPDATE_SIDE_PANEL',
      data: {
        contextCards: this.contextualCards,
        actionItems: this.actionItems,
        activeContexts: Array.from(this.activeTabContexts.values())
      }
    });
  }

  /**
   * NEW: Handle tab activated
   */
  async handleTabActivated(activeInfo) {
    // Could implement context switching logic here
    console.log('Tab activated:', activeInfo.tabId);
  }

  /**
   * NEW: Handle tab updated
   */
  async handleTabUpdated(tabId, tab) {
    console.log('Tab updated:', tab.url);
  }

  /**
   * NEW: Update settings
   */
  async updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    await chrome.storage.sync.set({ syncup_settings: this.settings });

    // Reinitialize Gemini if API key changed
    if (newSettings.geminiApiKey) {
      await this.initializeGemini();
    }

    console.log('⚙️ Settings updated');
  }

  /**
   * NEW: Test Gemini API key
   */
  async testGeminiAPIKey(apiKey) {
    try {
      const testClient = { ...this.geminiClient, apiKey };
      await testClient.generateContent('Say hello', { maxOutputTokens: 50 });
      return { valid: true, message: 'API key is valid' };
    } catch (error) {
      return { valid: false, message: error.message };
    }
  }

  /**
   * NEW: Cleanup old data
   */
  async cleanupOldData() {
    if (!this.settings.autoDeleteHistory) return;

    const cutoffTime = Date.now() - (this.settings.historyRetentionHours * 60 * 60 * 1000);

    // Clean up old conversation history
    this.conversationHistory = this.conversationHistory.filter(
      item => item.timestamp > cutoffTime
    );

    console.log('🗑️ Old data cleaned up');
  }

  /**
   * NEW: Show welcome notification
   */
  showWelcomeNotification() {
    try {
      if (chrome.notifications && chrome.notifications.create) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'SyncUp Universal Ready!',
          message: 'Press Ctrl+Shift+Space to open command palette. Prompt API will auto-detect on web pages.'
        });
      }
    } catch (error) {
      console.log('ℹ️ [Background] Notifications not available:', error.message);
    }
  }

  /**
   * PROMPT API: Update Prompt API availability status
   */
  updatePromptApiStatus(status, available) {
    console.log(`🔄 [Background] Updating Prompt API status: ${status}, available: ${available}`);

    this.promptApiStatus = status;
    this.promptApiAvailable = available;
    this.lastApiCheck = Date.now();

    // Update current API mode based on availability
    // Accept both 'readily' and 'available' as valid statuses
    if (available && (status === 'readily' || status === 'available')) {
      this.currentApiMode = 'prompt-api';
      console.log('✅ [Background] Switched to Prompt API mode (on-device Gemini Nano)');
    } else {
      this.currentApiMode = 'gemini-api';
      console.log('🌐 [Background] Using Gemini API mode (cloud)');
    }

    // Broadcast status update to all tabs and side panel
    this.broadcastApiStatus();
  }

  /**
   * PROMPT API: Broadcast API status to all listeners
   */
  async broadcastApiStatus() {
    const status = {
      type: 'API_STATUS_UPDATE',
      currentApiMode: this.currentApiMode,
      promptApiAvailable: this.promptApiAvailable,
      promptApiStatus: this.promptApiStatus
    };

    console.log('📡 [Background] Broadcasting API status:', status);

    // Send to all tabs
    try {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, status, () => {
          if (chrome.runtime.lastError) {
            // Ignore errors for tabs that don't have content script
          }
        });
      }
    } catch (error) {
      console.error('Error broadcasting to tabs:', error);
    }

    // Send to runtime (for side panel and popup)
    chrome.runtime.sendMessage(status, () => {
      if (chrome.runtime.lastError) {
        // Ignore if no listeners
      }
    });
  }

  /**
   * PROMPT API: Unified content generation - tries Prompt API first, falls back to Gemini API
   */
  async generateContentUnified(prompt, options = {}, tabId = null) {
    console.log('🎯 [Background] Unified content generation requested');
    console.log('📝 [Background] Prompt preview:', prompt.substring(0, 100) + '...');
    console.log('⚙️ [Background] Current API mode:', this.currentApiMode);

    // Try Prompt API if available
    if (this.promptApiAvailable && this.currentApiMode === 'prompt-api') {
      console.log('🚀 [Background] Attempting Prompt API...');

      try {
        // Use provided tabId or query for active tab
        let targetTabId = tabId;
        if (!targetTabId) {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          targetTabId = tabs[0]?.id;
        }

        if (targetTabId) {
          console.log('📍 [Background] Using tab ID:', targetTabId);
          const result = await this.sendPromptToContentScript(targetTabId, prompt, options);

          if (result.success) {
            console.log('✅ [Background] Prompt API successful!');
            return {
              text: result.response,
              source: 'prompt-api',
              duration: result.duration
            };
          } else {
            console.warn('⚠️ [Background] Prompt API failed, falling back to Gemini API:', result.error);
          }
        } else {
          console.warn('⚠️ [Background] No tab ID available for Prompt API');
        }
      } catch (error) {
        console.error('❌ [Background] Prompt API error, falling back to Gemini API:', error);
      }
    }

    // Fallback to Gemini API
    console.log('🌐 [Background] Using Gemini API (cloud)...');

    if (!this.geminiClient) {
      throw new Error('Neither Prompt API nor Gemini API available');
    }

    try {
      const text = await this.geminiClient.generateContent(prompt, options);
      console.log('✅ [Background] Gemini API successful!');

      return {
        text: text,
        source: 'gemini-api'
      };
    } catch (error) {
      console.error('❌ [Background] Gemini API failed:', error);
      throw error;
    }
  }

  /**
   * PROMPT API: Process request queue (one at a time)
   */
  async processPromptApiQueue() {
    if (this.promptApiProcessing || this.promptApiQueue.length === 0) {
      return;
    }

    this.promptApiProcessing = true;
    console.log(`🔄 [Background] Processing Prompt API queue (${this.promptApiQueue.length} items)`);

    while (this.promptApiQueue.length > 0) {
      const { tabId, prompt, options, resolve } = this.promptApiQueue.shift();

      try {
        const result = await this.sendPromptToContentScriptDirect(tabId, prompt, options);
        resolve(result);
      } catch (error) {
        resolve({ success: false, error: error.message });
      }

      // Small delay between requests to avoid overwhelming content script
      if (this.promptApiQueue.length > 0) {
        await this.sleep(500);
      }
    }

    this.promptApiProcessing = false;
    console.log('✅ [Background] Prompt API queue processed');
  }

  /**
   * PROMPT API: Send prompt to content script (queued)
   */
  async sendPromptToContentScript(tabId, prompt, options = {}) {
    return new Promise((resolve) => {
      this.promptApiQueue.push({ tabId, prompt, options, resolve });
      console.log(`📥 [Background] Added to Prompt API queue (position: ${this.promptApiQueue.length})`);
      this.processPromptApiQueue();
    });
  }

  /**
   * PROMPT API: Send prompt directly (used by queue processor)
   */
  async sendPromptToContentScriptDirect(tabId, prompt, options = {}) {
    console.log(`📤 [Background] Sending prompt to content script (tab ${tabId})`);

    return new Promise((resolve) => {
      const requestId = Date.now() + Math.random();
      let timeoutId;

      // Set up one-time listener for the response
      const responseListener = (message) => {
        if (message.type === 'PROMPT_API_RESULT' && message.requestId === requestId) {
          console.log('📥 [Background] Received Prompt API result');
          chrome.runtime.onMessage.removeListener(responseListener);
          clearTimeout(timeoutId);
          resolve(message.result);
        }
      };

      chrome.runtime.onMessage.addListener(responseListener);

      // Send request to content script
      chrome.tabs.sendMessage(tabId, {
        type: 'EXECUTE_PROMPT_API',
        requestId: requestId,
        prompt: prompt,
        options: options
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('❌ [Background] Error sending to content script:', chrome.runtime.lastError.message);
          chrome.runtime.onMessage.removeListener(responseListener);
          clearTimeout(timeoutId);
          resolve({ success: false, error: chrome.runtime.lastError.message });
        }
      });

      // Timeout after 30 seconds
      timeoutId = setTimeout(() => {
        chrome.runtime.onMessage.removeListener(responseListener);
        console.warn('⏱️ [Background] Prompt API request timed out');
        resolve({ success: false, error: 'Timeout' });
      }, 30000);
    });
  }
}

// Initialize
const syncup = new SyncUpUniversal();
