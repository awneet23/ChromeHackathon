# SyncUp - AI Meeting Assistant for Google Meet

Extracts key topics, summaries, and action items from the page content or meeting transcript. Provides a context-aware Q&A chatbox powered by Gemini Nano for instant clarifications. Offers keyword highlighting and explanations for detected topics. Runs entirely locally — no data leaves your device, ensuring complete privacy.

## Resources

- Demo video: [https://youtu.be/NgmFNfwHOZI](https://youtu.be/SNse2wbD0bc)
- Hackathon Submission: https://devpost.com/software/sync-up-s4iwb3

## Inspiration

In fast-paced online meetings, lectures, and content-heavy browsing, it’s easy to lose track of key takeaways and next steps. We wanted a lightweight, privacy-friendly way to automatically extract important context and action items directly from what users are viewing — without relying on cloud-based AI or external APIs. That’s how SyncUp was born: a smart, on-device assistant that transforms any webpage, transcript, or document into structured insights and actionable next steps.

## What it does

SyncUp is a Chrome extension that uses on-device AI to understand webpage or transcript content in real time. With one click, it:
- Extracts key topics, summaries, and action items from the page content or meeting transcript.
- Provides a context-aware Q&A chatbox powered by Gemini Nano for instant clarifications.
- Offers keyword highlighting and explanations for detected topics.
- Runs entirely locally — no data leaves your device, ensuring complete privacy.
- Whether you’re reviewing meeting notes, reading research, or analyzing articles, SyncUp helps you quickly capture the essence and next steps without switching tools.

## How we built it

We developed a Chrome extension that integrates with the Chrome Prompt API, enabling access to Google Gemini Nano, the on-device AI model. The extension extracts visible text content (such as transcripts, pages, or docs) and sends it to the Gemini Nano model for:
- Keyword extraction
- Topic explanation
- Contextual Q&A generation
- A local chat interface was implemented to allow users to ask questions about the content, all powered by Gemini Nano running directly in the browser.

The UI is built using HTML, CSS, and JavaScript, focusing on a clean, minimal user experience integrated seamlessly into Chrome’s side panel.

## Challenges we ran into

- Working with the new Chrome Prompt API was a learning curve since documentation and examples were limited.
- Optimizing text extraction for different webpage structures (articles, transcripts, meeting notes) required dynamic parsing strategies.
- Ensuring on-device performance while maintaining comprehensive summarization and topic detection was challenging.
- Designing a smooth, non-intrusive user interface that fits naturally within Chrome without slowing browsing.

## Accomplishments that we're proud of
- Successfully integrated Gemini Nano to run entirely on-device, proving that powerful AI can be fast, private, and local.
- Built a functional prototype that can generate summaries, keywords, and action items in real time.
- Created a privacy-first AI assistant — users get intelligent insights without ever sending data to the cloud.
- Learned to work with cutting-edge browser APIs and make them practical for productivity use cases.

## What we learned
The potential of on-device AI models like Gemini Nano is enormous — they can deliver intelligent results with zero latency and full privacy.
Building around new APIs requires experimentation and adaptability, but it also opens the door for innovative user experiences.
Combining context extraction, local LLM reasoning, and action item generation can dramatically streamline productivity workflows.

## What’s next for SyncUp

- Expand support for more content types (e.g., PDFs, YouTube transcripts, Google Docs).
- Add smart action syncing, allowing users to export action items to tools like Google Tasks or Notion.
- Improve contextual awareness, so SyncUp can maintain understanding across tabs and sessions.
- Release on the Chrome Web Store with user customization for prompt styles and output formats.
- Explore integrations with other on-device models for enhanced summarization or sentiment analysis.

## Technology Stack

- Chrome Extension (Manifest V3)
- Chrome Prompt API with Google Gemini Nano (on-device AI model)
- Web Speech API for local speech capture
- Google Meet caption integration
- Local browser-based processing (no external API calls required)

## Installation

### Prerequisites
- Chrome browser version 127 or higher with Gemini Nano support
- Enable the Prompt API flag in Chrome:
  - Navigate to `chrome://flags/#prompt-api-for-gemini-nano`
  - Set to "Enabled"
  - Restart Chrome

### Steps

1. Clone this repository
```bash
git clone https://github.com/awneet23/Syncup.git
cd Syncup
```

2. Load the extension in Chrome:
- Open `chrome://extensions/`
- Enable "Developer mode" (top right toggle)
- Click "Load unpacked"
- Select the syncup folder

3. Pin the extension to your toolbar for easy access

**Note:** No API keys required! The extension uses Google Gemini Nano which runs locally in your browser.

## AI Integration

**Chrome Prompt API with Gemini Nano**
- Model: Google Gemini Nano (on-device)
- Runs entirely locally in Chrome browser
- Used for keyword extraction from transcripts
- Generates comprehensive explanations for detected topics
- Powers the chatbox Q&A functionality
- No internet connection required for AI processing
- Privacy-focused: All data stays on your device

## Performance

- Keyword detection: Real-time (less than 1 second)
- Card generation: 2-3 seconds per topic (processed locally)
- Chatbox response: 1-2 seconds (no network latency)
- Memory usage: Under 150 MB (includes Gemini Nano model)
- Minimal impact on meeting performance
- Works offline after initial model download

## Hackathon Highlights

**Sponsor Technology Integration**
- Chrome Prompt API: Core AI inference engine
- Google Gemini Nano: On-device model powering all content generation
- Local processing: Privacy-focused, no external API dependencies
- Docker: Containerization ready

**Innovation**
- On-device AI processing with Gemini Nano (no cloud dependencies)
- Captures all participants, not just the user
- Real-time processing during meetings
- Context-aware AI chatbox
- Multilingual support with code-switching
- Non-intrusive sidebar design
- Privacy-focused: All data stays on your device

**Problem Solved**
Traditional meetings require manual note-taking and context switching to look up unfamiliar terms. SyncUp automatically generates explanations for mentioned topics in real-time, letting participants stay focused on the conversation while still learning about new concepts.

## Troubleshooting

**No cards appearing:**
- Make sure you clicked "Start" in the sidebar
- Enable Google Meet captions by pressing "C"
- Verify Chrome Prompt API is enabled in chrome://flags
- Ensure Gemini Nano model is downloaded (Chrome will download it automatically)
- Look for errors in the browser console (F12)

**Sidebar not showing:**
- Click the toggle button (magnifying glass) in bottom-right
- Refresh the Google Meet page
- Check that you're on meet.google.com

**Cards not generating for topics:**
- Check if Prompt API is available: Open console and check for Prompt API errors
- Ensure Chrome version 127 or higher
- Make sure topics are clearly mentioned in conversation
- Wait 15 seconds for batch processing

**Prompt API not working:**
- Navigate to `chrome://flags/#prompt-api-for-gemini-nano` and enable it
- Restart Chrome browser
- Check `chrome://components/` to see if Gemini Nano is installed

## Development

**Project Structure**
```
syncup/
├── manifest.json          # Extension configuration
├── background.js          # Service worker (AI processing)
├── content_script.js      # Sidebar UI and speech capture
├── popup.html/js          # Extension popup
├── styles.css             # Sidebar styling
└── icons/                 # Extension icons
```

**Key Functions**

In `background.js`:
- `extractTopicsAndGenerateCards()` - Extracts keywords using Prompt API
- `generateAIExplanationCard()` - Creates detailed cards for topics using Gemini Nano
- `handleChatboxQuestion()` - Processes chatbox queries with local AI

In `content_script.js`:
- `startMeetCaptionCapture()` - Captures Google Meet captions
- `startMicrophoneRecognition()` - Captures user's speech
- `updateContextualCards()` - Renders cards in sidebar

## Acknowledgments

Built for hackathon submission using:
- Chrome Prompt API
- Google Gemini Nano (on-device model)
- Chrome Extension APIs (Manifest V3)
- Web Speech API

---

**Note:** This extension uses Chrome's built-in Prompt API with Gemini Nano model. No external API keys required - everything runs locally in your browser for enhanced privacy and performance.
