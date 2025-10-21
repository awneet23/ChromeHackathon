# 🔧 SyncUp Troubleshooting Guide

## Issues You're Experiencing

### 1. ❌ Command Palette Opens with Ctrl+K (old shortcut)
### 2. ❌ Ctrl+Shift+Space doesn't work (new shortcut)
### 3. ❌ No extension icon visible

---

## 🚀 IMMEDIATE FIX (Do This Now)

### Step 1: Complete Extension Reload
```
1. Go to chrome://extensions/
2. Find "SyncUp - Universal Context Intelligence"
3. Toggle it OFF (disable)
4. Wait 2 seconds
5. Toggle it ON (enable)
6. Click the reload button 🔄
7. Close ALL Chrome tabs
8. Reopen Chrome
```

### Step 2: Hard Reload Pages
```
1. Open a new tab (not Google Meet)
2. Go to any website (e.g., google.com)
3. Press Ctrl+Shift+F5 (hard reload)
4. Now try Ctrl+Shift+Space
```

### Step 3: Check Extension Icon
```
1. Look at Chrome toolbar (top right)
2. Should see SyncUp icon
3. If not, click the puzzle piece 🧩
4. Pin SyncUp to toolbar
5. Icon should appear
```

---

## 🐛 Detailed Troubleshooting

### Problem: Ctrl+K Still Opens Palette

**Cause:** Browser cached old content script

**Fix:**
```
Option 1: Clear Extension Cache
1. chrome://extensions/
2. Disable SyncUp
3. Enable SyncUp
4. Reload icon

Option 2: Check What's Loaded
1. Open any webpage
2. Press F12 (DevTools)
3. Go to Console
4. Look for: "⌨️ Command palette shortcuts registered"
5. Should say: "Ctrl+Shift+Space"
6. If says "Ctrl+K" - old script is cached

Option 3: Nuclear Option
1. chrome://extensions/
2. Remove SyncUp completely
3. Close all Chrome windows
4. Reopen Chrome
5. Load unpacked again
```

---

### Problem: Ctrl+Shift+Space Doesn't Work

**Possible Causes:**

#### Cause 1: Content Script Not Loaded
**Check:**
```
1. Open webpage
2. F12 → Console
3. Look for: "🌐 SyncUp Universal loaded"
4. If missing, script didn't load
```

**Fix:**
```
1. Reload extension
2. Reload webpage
3. Check console again
```

#### Cause 2: Testing on Wrong Page
**Note:** Command palette doesn't work on:
- chrome:// pages
- chrome://extensions/
- Chrome settings
- New Tab page (sometimes)

**Test on:**
- google.com
- gmail.com
- any normal website

#### Cause 3: Shortcut Conflict
**Check:**
```
1. chrome://extensions/shortcuts
2. Find "SyncUp"
3. Should show: Ctrl+Shift+Space
4. If shows: Ctrl+K - manifest didn't update
```

**Fix:**
```
1. Click in shortcut field
2. Press: Ctrl+Shift+Space
3. Click OK
4. Try again
```

---

### Problem: No Extension Icon

**Cause 1: Icon Not Pinned**
```
1. Look for puzzle piece 🧩 in toolbar
2. Click it
3. Find "SyncUp"
4. Click pin icon 📌
5. Icon appears in toolbar
```

**Cause 2: Manifest Issue**
```
Check manifest.json has:
"action": {
  "default_title": "SyncUp - Click to open side panel",
  "default_icon": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}

If missing, I just added it - reload extension!
```

**Cause 3: Icons Missing**
```
Check these files exist:
- icons/icon16.png
- icons/icon48.png
- icons/icon128.png

If missing, extension won't show icon
```

---

## ✅ Verification Steps

### Test 1: Extension Icon
```
Expected: Icon visible in Chrome toolbar
Test: Click puzzle piece 🧩, find SyncUp, pin it
Result: Should see icon
```

### Test 2: Side Panel
```
Expected: Click icon → Side panel opens
Test: Click the SyncUp icon
Result: Panel slides in from right
```

### Test 3: Command Palette (New Shortcut)
```
Expected: Ctrl+Shift+Space opens palette
Test:
  1. Go to google.com
  2. Press Ctrl+Shift+Space
  3. Palette appears
Result: Overlay with search box
```

### Test 4: Command Palette (Old Shortcut Disabled)
```
Expected: Ctrl+K does NOTHING
Test:
  1. Go to google.com
  2. Press Ctrl+K
  3. Nothing happens (or browser's own search)
Result: SyncUp palette should NOT open
```

---

## 🔍 Diagnostic Commands

### Check Content Script Loaded
Open webpage → F12 → Console → Type:
```javascript
// Should return true
console.log(!!document.querySelector('.syncup-command-palette'))
```

### Check Background Worker
```
1. chrome://extensions/
2. Find SyncUp
3. Click "service worker"
4. New DevTools opens
5. Check for: "✅ SyncUp Universal ready"
```

### Manually Open Palette
Console:
```javascript
// Should open palette
document.dispatchEvent(new KeyboardEvent('keydown', {
  key: ' ',
  ctrlKey: true,
  shiftKey: true
}))
```

### Check Shortcut Registration
```
chrome://extensions/shortcuts
Find: SyncUp
Should show: Ctrl+Shift+Space
```

---

## 🎯 Quick Fixes

### Fix 1: Extension Not Loading
```bash
# Reload everything
1. Disable extension
2. Enable extension
3. Reload extension
4. Close all tabs
5. Reopen tabs
```

### Fix 2: Icon Not Showing
```bash
# Pin icon manually
1. Click 🧩 (puzzle piece)
2. Find SyncUp
3. Click 📌 (pin icon)
4. Icon appears
```

### Fix 3: Old Shortcut Still Works
```bash
# Clear cache forcefully
1. Remove extension
2. Close Chrome completely
3. Reopen Chrome
4. Add extension again
5. Test Ctrl+Shift+Space
```

### Fix 4: New Shortcut Not Working
```bash
# Set shortcut manually
1. chrome://extensions/shortcuts
2. Find SyncUp command
3. Click in field
4. Press Ctrl+Shift+Space
5. Save
6. Test on google.com
```

---

## 📝 What Should Happen

### Correct Behavior:

1. **Extension Icon:** ✅ Visible in toolbar
2. **Click Icon:** ✅ Opens side panel
3. **Ctrl+Shift+Space:** ✅ Opens command palette
4. **Ctrl+K:** ❌ Does nothing (or browser default)
5. **Google Meet:** ✅ Original functionality preserved

---

## 🚨 Still Not Working?

### Debug Checklist:

- [ ] Extension is enabled in chrome://extensions/
- [ ] Extension reloaded after file changes
- [ ] All Chrome tabs closed and reopened
- [ ] Testing on valid website (not chrome://)
- [ ] Icons exist in icons/ folder
- [ ] manifest.json is valid JSON
- [ ] No errors in background worker console
- [ ] No errors in page console (F12)

### Get Logs:

**Background Worker:**
```
1. chrome://extensions/
2. Click "service worker" under SyncUp
3. Copy all console output
4. Look for errors
```

**Content Script:**
```
1. Open any webpage
2. F12 → Console
3. Look for "SyncUp" messages
4. Copy any errors
```

---

## 💡 Common Mistakes

### Mistake 1: Testing on Google Meet
- Command palette works on ALL pages
- But Google Meet has its own script
- Test on Gmail or google.com instead

### Mistake 2: Not Reloading Extension
- Changes require extension reload
- Yellow "Reload" button in chrome://extensions/
- Must reload after ANY file change

### Mistake 3: Not Hard Reloading Page
- Browser caches content scripts
- Use Ctrl+Shift+F5 to hard reload
- Or close tab and reopen

### Mistake 4: Chrome Extensions Page
- Command palette won't work on chrome://extensions/
- Can't inject scripts on chrome:// pages
- Test on normal websites

---

## 🎉 Success Indicators

When everything works:

1. **Icon appears** in toolbar
2. **Click icon** → Side panel opens smoothly
3. **Ctrl+Shift+Space** → Command palette appears
4. **Console shows:** "⌨️ Command palette shortcuts registered (Ctrl+Shift+Space)"
5. **Background shows:** "✅ SyncUp Universal ready"
6. **No errors** in any console

---

## 📞 Still Stuck?

### Check These Files:

1. **manifest.json** - Should have action.default_icon
2. **background.js** - Should have chrome.action.onClicked
3. **content/universal-content.js** - Should have Ctrl+Shift+Space listener
4. **icons/** - Should have all 3 PNG files

### Nuclear Reset:

```bash
# Complete fresh start
1. chrome://extensions/
2. Remove SyncUp
3. Close ALL Chrome windows
4. Delete these if they exist:
   - Any .cache files
   - Any .tmp files
5. Reopen Chrome
6. Load unpacked extension
7. Pin icon
8. Test Ctrl+Shift+Space on google.com
```

---

**Remember:**
- ✅ Reload extension after changes
- ✅ Test on normal websites
- ✅ Hard reload pages (Ctrl+Shift+F5)
- ✅ Check consoles for errors

**Good luck!** 🚀
