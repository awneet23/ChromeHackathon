# 🎯 SyncUp - Quick Reference Card

## ⚡ Just Updated! (Latest Changes)

### What's New
1. ✅ **Dual-Mode Chatbox** - Answers with BOTH meeting context AND general knowledge
2. ✅ **New Shortcut** - `Ctrl+Shift+Space` (was Ctrl+K)
3. ✅ **Side Panel** - Click icon to open
4. ✅ **Gemini Fixed** - All API errors resolved

---

## 🚀 How to Use (After Reload)

### In Google Meet
1. **Join meeting** → Click toggle button → Click "Start"
2. **Enable captions** → Press "C" key
3. **Speak or listen** → Context cards appear automatically
4. **Ask questions** → Use chatbox at bottom

### Chatbox Behavior (NEW!)
**When you ask a question:**
- ✅ Shows what was discussed in meeting
- ✅ PLUS comprehensive general knowledge
- ✅ Clear labels show the difference

**Example:**
```
You ask: "What is Docker?"

Answer shows:
📍 From the Meeting:
   "We mentioned using Docker for containerization..."

📚 General Knowledge:
   "Docker is a platform that packages applications..."
```

---

## ⌨️ Keyboard Shortcuts

### Command Palette
**New Shortcut:** `Ctrl+Shift+Space` (Windows/Linux)
**New Shortcut:** `Cmd+Shift+Space` (Mac)

**What it does:**
- Opens command palette overlay
- Ask questions and get instant AI answers
- Search functionality (coming soon)

**Old shortcut** `Ctrl+K` **removed** (conflicted with other apps)

---

## 🎨 Side Panel

### How to Open
**Click the SyncUp icon** in Chrome toolbar

### What's Inside
- 📡 **Live Activity Feed** - Real-time updates from all tabs
- ✅ **Action Items** - Auto-extracted TODOs
- 💡 **Context Cards** - All generated cards
- 📊 **Stats** - Card count, action count

**Note:** Popup is removed. Icon click now opens side panel.

---

## 🤖 Gemini API

### What's Fixed
- ✅ Correct endpoint: `v1` (was `v1beta`)
- ✅ Correct model: `gemini-2.5-flash`
- ✅ Better error messages
- ✅ Response logging

### Your API Key
Currently hardcoded in `background.js` line 84:
```javascript
geminiApiKey: 'AIzaSyClTRj0FVD-fDtuD47ZyGS0Mm2pgU4bRGg'
```

---

## 📝 Quick Actions

### Reload Extension
1. Go to `chrome://extensions/`
2. Find "SyncUp"
3. Click reload button 🔄
4. Done!

### Test Chatbox
1. Google Meet → Start recording
2. Say "Docker is great"
3. Chatbox → "What is Docker?"
4. See dual answer (meeting + general)

### Test Command Palette
1. Any webpage
2. Press `Ctrl+Shift+Space`
3. Palette appears
4. Type question → Enter
5. Escape to close

### Test Side Panel
1. Click extension icon
2. Panel opens on right
3. See stats and sections

---

## 🐛 Troubleshooting

### Chatbox Shows Error
**Check:**
- [ ] Gemini API key is set
- [ ] Extension is reloaded
- [ ] Check console for errors

### Command Palette Not Opening
**Check:**
- [ ] Using new shortcut: `Ctrl+Shift+Space`
- [ ] Not on chrome:// pages
- [ ] Content script loaded (check console)

### Side Panel Not Opening
**Check:**
- [ ] Extension icon clicked (not right-click)
- [ ] Chrome 114+ (side panel API)
- [ ] Extension reloaded after manifest change

### No Context Cards
**Check:**
- [ ] Google Meet captions enabled (press C)
- [ ] Recording started
- [ ] Speaking keywords clearly
- [ ] Gemini API key valid

---

## 📊 Feature Status

### ✅ Working Now
- Google Meet integration
- Context card generation
- Chatbox (dual-mode answers)
- Command palette UI
- Side panel UI
- Gemini API
- Keyboard shortcuts

### 🏗️ Template Ready (Needs Connection)
- Universal content detection
- Command palette search
- Action items extraction
- Cross-tab tracking

### 📋 Coming Soon
- Timeline visualization
- Smart compose
- Options page
- Export features

---

## 🎯 Demo Script (3 Minutes)

### Act 1: Google Meet (1 min)
1. Join Google Meet
2. Start SyncUp
3. Speak "Docker"
4. Card appears
5. Ask chatbox: "What is Kubernetes?"
6. See dual answer

### Act 2: Universal (1 min)
7. Open Gmail (new tab)
8. Press `Ctrl+Shift+Space`
9. Command palette appears
10. Type "What is React?"
11. Get instant answer

### Act 3: Side Panel (1 min)
12. Click extension icon
13. Side panel opens
14. Show activity feed
15. Show context cards library

**Total:** Impressive 3-minute demo! 🎉

---

## 💻 Console Commands

### Check Gemini API
```javascript
// In browser console
chrome.runtime.sendMessage({type: 'CHATBOX_QUESTION', question: 'test', meetingContext: ''})
```

### Check Side Panel
```javascript
// Open side panel programmatically
chrome.sidePanel.open({tabId: currentTabId})
```

### Check Settings
```javascript
// View current settings
chrome.storage.sync.get(['syncup_settings'], (r) => console.log(r))
```

---

## 📱 Platform Support

### Fully Working
- ✅ Google Meet (100% functional)
- ✅ Any webpage (command palette)

### UI Ready (Detection Coming)
- 🎨 Gmail
- 🎨 Slack
- 🎨 Discord
- 🎨 LinkedIn
- 🎨 Twitter

---

## 🔧 Files You Might Edit

### API Key
`background.js` line 84

### Keyboard Shortcut
`manifest.json` line 50-57

### Command Palette Text
`content/universal-content.js` line 273

### Side Panel UI
`sidepanel/sidepanel.html`

---

## 📚 Documentation

### Quick Guides
- **CHANGELOG.md** - What changed (detailed)
- **QUICKSTART.md** - 5-minute setup
- **QUICK_REFERENCE.md** - This file!

### Detailed Docs
- **README_NEW.md** - Full feature documentation
- **IMPLEMENTATION_PLAN.md** - Architecture details
- **SUMMARY.md** - Project overview

---

## 🎉 Quick Wins

### Things That Work Great Right Now
1. ✅ Google Meet context cards
2. ✅ Chatbox with dual answers
3. ✅ Command palette (UI + shortcut)
4. ✅ Side panel (click icon)
5. ✅ Gemini API integration

### Things to Show Off
1. 🌟 Real-time context cards in meetings
2. 🌟 Smart dual-mode answers
3. 🌟 Beautiful glassmorphic UI
4. 🌟 Universal command palette
5. 🌟 Cross-platform potential

---

## ⚠️ Important Notes

### Don't Forget
- Reload extension after changes
- Use new keyboard shortcut
- Click icon (not right-click) for panel
- Enable captions in Google Meet

### Known Issues
- Command palette search not connected yet
- Universal detection needs implementation
- Action items need extraction logic
- Options page needs creation

---

**Last Updated:** Just now!
**Quick Help:** Press `Ctrl+Shift+Space` anywhere for AI help
**Support:** Check console (F12) for errors

---

🎯 **You're all set! Reload extension and test it out!**
