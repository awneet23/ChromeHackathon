# SyncUp Universal - Implementation Plan

## ✅ Completed

### 1. Core Infrastructure
- ✅ Updated `manifest.json` for universal access (`<all_urls>`)
- ✅ Added side panel support
- ✅ Added command palette keyboard shortcut (Cmd/Ctrl+K)
- ✅ Created directory structure for modular code

### 2. Gemini Integration
- ✅ Created `shared/gemini-client.js` - Complete Gemini API client
  - Context card generation
  - Keyword extraction
  - Action item extraction
  - Smart compose suggestions
  - Conversation summarization
  - Question answering with context awareness
  - Caching and rate limiting

- ✅ Created `shared/constants.js` - Shared utilities and constants
  - Message types for inter-component communication
  - Storage keys
  - Default settings
  - Platform configurations (Gmail, Slack, Discord, etc.)
  - Utility functions (debounce, throttle, etc.)

### 3. Background Service Worker
- ✅ Created `background-new.js` - Refactored with Gemini
  - **PRESERVES all existing Google Meet functionality**
  - Integrated Gemini for all AI operations
  - Replaces Cerebras API with Gemini
  - Cross-tab state management
  - Settings management
  - Side panel communication

### 4. File Organization
- ✅ Moved `content_script.js` → `content/meet-content.js` (preserves Google Meet)
- ✅ Created folder structure:
  ```
  Syncup/
  ├── shared/           # Shared utilities
  │   ├── gemini-client.js
  │   └── constants.js
  ├── content/          # Content scripts
  │   ├── meet-content.js (existing Google Meet - PRESERVED)
  │   ├── universal-content.js (NEW - for all tabs)
  │   └── universal-styles.css (NEW)
  ├── sidepanel/        # Side panel UI
  ├── options/          # Settings page
  └── background.js     # Service worker
  ```

## 🚧 To Be Implemented

### 5. Universal Content Script (`content/universal-content.js`)
Create a content script that runs on ALL tabs (not just Google Meet):

**Features to implement:**
```javascript
class UniversalContextDetector {
  constructor() {
    this.platform = detectPlatform(window.location.hostname);
    this.textDetector = new TextDetector();
    this.commandPalette = null;
  }

  // Detect new content on the page
  detectContent() {
    // Use MutationObserver to watch for new text
    // Extract keywords from visible text
    // Send to background for context card generation
  }

  // Inject command palette overlay
  injectCommandPalette() {
    // Create overlay UI
    // Listen for Cmd/Ctrl+K
    // Implement fuzzy search
    // Display results
  }

  // Detect chat inputs for smart compose
  detectInputFields() {
    // Find text inputs/contenteditable
    // Add AI suggestion button
    // Generate contextual suggestions
  }
}
```

**Implementation steps:**
1. Create `TextDetector` class to intelligently extract text from different platforms
2. Implement MutationObserver with debouncing (avoid overwhelming API)
3. Build command palette overlay component
4. Add smart action buttons to detected inputs
5. Integrate with background service worker

### 6. Side Panel UI (`sidepanel/sidepanel.html` + `.js` + `.css`)
Create a persistent side panel UI:

**Features to implement:**
```html
<!-- sidepanel/sidepanel.html -->
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="sidepanel.css">
</head>
<body>
  <div class="sidepanel-container">
    <!-- Header -->
    <div class="header">
      <h1>SyncUp</h1>
      <button id="settingsBtn">⚙️</button>
    </div>

    <!-- Activity Feed -->
    <section class="activity-feed">
      <h2>Live Activity</h2>
      <div id="activityList"></div>
    </section>

    <!-- Action Items -->
    <section class="action-items">
      <h2>Action Items</h2>
      <div id="actionItemsList"></div>
    </section>

    <!-- Context Cards -->
    <section class="context-cards">
      <h2>Context Cards</h2>
      <div id="contextCardsList"></div>
    </section>

    <!-- Timeline View -->
    <section class="timeline">
      <h2>Timeline</h2>
      <div id="timelineView"></div>
    </section>
  </div>
  <script src="sidepanel.js"></script>
</body>
</html>
```

**Implementation steps:**
1. Create HTML structure with sections
2. Implement real-time activity feed (shows what's happening across tabs)
3. Build action items tracker with one-click actions
4. Display context cards in a clean card layout
5. Create timeline visualization
6. Add dark mode support
7. Implement auto-scroll and animations

### 7. Options Page (`options/options.html`)
Create settings page for user configuration:

**Features to implement:**
```html
<!-- options/options.html -->
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="options.css">
</head>
<body>
  <div class="options-container">
    <h1>SyncUp Settings</h1>

    <!-- API Key Configuration -->
    <section class="api-settings">
      <h2>🤖 Gemini API Key</h2>
      <p>Get your free API key from <a href="https://makersuite.google.com/app/apikey" target="_blank">Google AI Studio</a></p>
      <input type="password" id="geminiApiKey" placeholder="Enter your Gemini API key">
      <button id="testApiKey">Test API Key</button>
      <button id="saveApiKey">Save</button>
      <div id="apiKeyStatus"></div>
    </section>

    <!-- Privacy Settings -->
    <section class="privacy-settings">
      <h2>🔒 Privacy</h2>
      <label>
        <input type="checkbox" id="autoDeleteHistory">
        Auto-delete history after
        <input type="number" id="retentionHours" value="24"> hours
      </label>
      <label>
        <input type="checkbox" id="privacyMode">
        Privacy mode (local processing only)
      </label>
    </section>

    <!-- Feature Toggles -->
    <section class="feature-settings">
      <h2>✨ Features</h2>
      <label><input type="checkbox" id="enableUniversalContext"> Universal Context Cards</label>
      <label><input type="checkbox" id="enableActionItems"> Action Item Tracking</label>
      <label><input type="checkbox" id="enableSmartCompose"> Smart Compose</label>
    </section>

    <!-- Excluded Domains -->
    <section class="excluded-domains">
      <h2>🚫 Excluded Domains</h2>
      <textarea id="excludedDomains" placeholder="One domain per line"></textarea>
      <button id="saveExcluded">Save</button>
    </section>
  </div>
  <script src="options.js"></script>
</body>
</html>
```

**Implementation steps:**
1. Create HTML form with all settings
2. Implement API key validation
3. Save/load settings from chrome.storage
4. Add instructions for getting Gemini API key
5. Implement domain exclusion list
6. Add export/import settings feature

### 8. Command Palette Component
Inject an overlay that appears on Cmd/Ctrl+K:

**Features:**
- Fuzzy search across conversation history
- Quick actions (summarize, create card, etc.)
- Navigate between tabs with active conversations
- Keyboard navigation (arrow keys, Enter)

**HTML Structure:**
```html
<div id="syncup-command-palette" class="command-palette" style="display:none;">
  <div class="command-palette-backdrop"></div>
  <div class="command-palette-modal">
    <input type="text" id="commandSearch" placeholder="Search or type a command...">
    <div class="results-list">
      <!-- Dynamically populated results -->
    </div>
    <div class="hints">
      <span>↑↓ Navigate</span>
      <span>↵ Select</span>
      <span>Esc Close</span>
    </div>
  </div>
</div>
```

### 9. Text Detection Service
Intelligently detect and extract text from various platforms:

**Platform-specific selectors (already defined in `constants.js`):**
- Gmail: `.a3s, [data-message-id]`
- Slack: `[data-qa="message_content"]`
- Discord: `[class*="messageContent"]`
- LinkedIn: `[data-id]`
- Twitter: `[data-testid="tweet"]`

**Implementation approach:**
```javascript
class TextDetector {
  constructor(platform) {
    this.platform = platform;
    this.lastProcessed = new Set();
  }

  detectNewContent() {
    const selectors = this.platform.selectors;
    const elements = document.querySelectorAll(selectors.messages);

    const newTexts = [];
    elements.forEach(el => {
      const text = el.textContent.trim();
      const hash = this.hashText(text);

      if (!this.lastProcessed.has(hash) && text.length > 20) {
        newTexts.push(text);
        this.lastProcessed.add(hash);
      }
    });

    return newTexts;
  }

  hashText(text) {
    // Simple hash to avoid duplicates
    return text.substring(0, 50);
  }
}
```

### 10. Smart Compose Integration
Add AI suggestion buttons to input fields:

```javascript
class SmartCompose {
  injectButtons() {
    // Find all text inputs
    const inputs = document.querySelectorAll('input[type="text"], textarea, [contenteditable="true"]');

    inputs.forEach(input => {
      if (!input.dataset.syncupInjected) {
        const btn = this.createAIButton();
        input.parentElement.appendChild(btn);
        input.dataset.syncupInjected = 'true';
      }
    });
  }

  createAIButton() {
    const btn = document.createElement('button');
    btn.className = 'syncup-ai-btn';
    btn.innerHTML = '✨ AI';
    btn.onclick = () => this.generateSuggestions();
    return btn;
  }

  async generateSuggestions() {
    // Get context from current tab
    // Call Gemini to generate suggestions
    // Display in popup menu
  }
}
```

## 🔧 Integration Steps

### Step 1: Replace background.js
```bash
# Backup current background.js
mv background.js background-old.js

# Use new background with Gemini
mv background-new.js background.js
```

### Step 2: Test Google Meet Functionality
1. Load extension in Chrome
2. Join a Google Meet
3. Verify existing sidebar works
4. Verify context cards generate
5. Verify chatbox works

### Step 3: Implement Universal Content Script
1. Create `content/universal-content.js`
2. Test on Gmail, Slack, Discord
3. Verify context card generation works on all platforms

### Step 4: Build Side Panel
1. Create `sidepanel/sidepanel.html`
2. Implement activity feed
3. Test side panel opens with keyboard shortcut

### Step 5: Create Options Page
1. Build settings UI
2. Implement API key management
3. Add instructions for users

### Step 6: Polish and Test
1. Test across all supported platforms
2. Fix bugs
3. Add error handling
4. Optimize performance

## 📝 API Key Setup Instructions

Users need to get a Gemini API key:

1. Go to https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key
4. Open extension options
5. Paste key and click "Test" then "Save"

## 🎨 Design Consistency

All new components should follow the existing glassmorphic design:
- Background: `rgba(26, 26, 26, 0.4)` with `backdrop-filter: blur(40px)`
- Borders: `rgba(138, 180, 248, 0.3)`
- Colors: Google blue theme (`#8ab4f8`, `#aecbfa`)
- Animations: Smooth transitions with `cubic-bezier(0.68, -0.55, 0.265, 1.55)`

## 🚀 Demo Scenario

Perfect flow for hackathon demo:

1. **Start in Google Meet** → Show existing context cards working
2. **Switch to Gmail** → Context cards appear from email content
3. **Open side panel** (Ctrl+K) → Show activity feed with both Meet and Gmail
4. **Type in Gmail compose** → Show smart compose suggestions
5. **Press Cmd+K** → Command palette appears, search conversation history
6. **Switch to Slack** → Show context automatically adapts
7. **Open timeline view** → Beautiful visualization of entire conversation flow

## 🐛 Known Issues to Address

1. Need to handle rate limiting for Gemini API
2. Need to implement proper error UI when API key is missing
3. Need to add loading states for all AI operations
4. Need to implement conversation history storage
5. Need to add proper TypeScript types (optional but recommended)

## 📚 Resources

- Gemini API docs: https://ai.google.dev/tutorials/web_quickstart
- Chrome Extension Side Panel: https://developer.chrome.com/docs/extensions/reference/sidePanel/
- Chrome Commands API: https://developer.chrome.com/docs/extensions/reference/commands/

## ✨ Future Enhancements

- Export conversation summaries as PDF
- Integration with Google Calendar for action items
- Voice commands ("Hey SyncUp...")
- Mobile app companion
- Team collaboration features
- Plugin system for custom integrations
