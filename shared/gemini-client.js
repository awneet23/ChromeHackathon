/**
 * SyncUp Gemini Client - Google Gemini API Integration
 * Handles all AI-powered features using Google Gemini
 */

class GeminiClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://generativelanguage.googleapis.com/v1beta';
    this.model = 'gemini-1.5-flash'; // Fast model for real-time responses
    this.cache = new Map(); // Simple response cache
    this.requestQueue = [];
    this.isProcessing = false;
  }

  /**
   * Generate context card for a topic/keyword
   */
  async generateContextCard(topic) {
    const cacheKey = `context:${topic.toLowerCase()}`;
    if (this.cache.has(cacheKey)) {
      console.log('📦 Using cached context for:', topic);
      return this.cache.get(cacheKey);
    }

    try {
      const prompt = `You are a helpful AI assistant. Provide comprehensive information about "${topic}".

Format your response as JSON:
{
  "explanation": "Clear, comprehensive explanation (2-3 sentences)",
  "keyPoints": [
    "Important point 1",
    "Important point 2",
    "Important point 3"
  ],
  "useCase": "When and why this is used, with examples",
  "learnMore": [
    "Specific resource 1",
    "Specific resource 2"
  ]
}

Be informative, accurate, and helpful. Return ONLY valid JSON.`;

      const response = await this.generateContent(prompt);

      // Cache the response
      this.cache.set(cacheKey, response);

      // Limit cache size
      if (this.cache.size > 100) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }

      return response;
    } catch (error) {
      console.error('Failed to generate context card:', error);
      throw error;
    }
  }

  /**
   * Extract keywords/topics from conversation text
   */
  async extractKeywords(text) {
    try {
      const prompt = `Extract 1-3 most important keywords, topics, or concepts from this conversation that someone might want to learn more about.

Focus on:
- Technical terms (e.g., "Docker", "Kubernetes")
- Technologies, tools, frameworks
- Concepts, methodologies
- Products, services, companies
- Specific terms that need explanation

Text: "${text}"

Return ONLY a JSON array of keyword strings.
Example: ["docker", "kubernetes", "react hooks"]

Do NOT include common words. Only meaningful keywords.`;

      const response = await this.generateContent(prompt);
      return this.parseJSON(response);
    } catch (error) {
      console.error('Failed to extract keywords:', error);
      return [];
    }
  }

  /**
   * Extract action items from conversation
   */
  async extractActionItems(conversationText) {
    try {
      const prompt = `Extract action items, TODOs, and follow-up tasks from this conversation.

Conversation: "${conversationText}"

Return JSON:
{
  "actionItems": [
    {
      "task": "What needs to be done",
      "person": "Who should do it (if mentioned)",
      "deadline": "When it's due (if mentioned)",
      "priority": "high/medium/low"
    }
  ]
}

Return ONLY valid JSON. If no action items, return empty array.`;

      const response = await this.generateContent(prompt);
      return this.parseJSON(response);
    } catch (error) {
      console.error('Failed to extract action items:', error);
      return { actionItems: [] };
    }
  }

  /**
   * Generate smart compose suggestion
   */
  async generateSmartReply(context, messageHistory = []) {
    try {
      const prompt = `Generate a helpful, context-aware response suggestion.

Context: ${context}

${messageHistory.length > 0 ? `Previous messages:\n${messageHistory.join('\n')}` : ''}

Generate 2-3 short response suggestions that are:
- Professional and helpful
- Contextually appropriate
- Natural and conversational

Return JSON:
{
  "suggestions": [
    "Suggestion 1",
    "Suggestion 2",
    "Suggestion 3"
  ]
}

Return ONLY valid JSON.`;

      const response = await this.generateContent(prompt);
      return this.parseJSON(response);
    } catch (error) {
      console.error('Failed to generate smart reply:', error);
      return { suggestions: [] };
    }
  }

  /**
   * Summarize conversation
   */
  async summarizeConversation(conversationText) {
    try {
      const prompt = `Summarize this conversation in a concise, informative way.

Conversation: "${conversationText}"

Return JSON:
{
  "summary": "Main points discussed (2-3 sentences)",
  "keyTopics": ["topic1", "topic2", "topic3"],
  "decisions": ["decision1", "decision2"],
  "nextSteps": ["step1", "step2"]
}

Return ONLY valid JSON.`;

      const response = await this.generateContent(prompt);
      return this.parseJSON(response);
    } catch (error) {
      console.error('Failed to summarize conversation:', error);
      return null;
    }
  }

  /**
   * Answer question with context awareness
   */
  async answerQuestion(question, context = '') {
    try {
      const prompt = `You are a helpful AI assistant. Answer this question intelligently.

${context ? `Context: "${context}"\n` : ''}

Question: ${question}

${context ? 'If the question relates to the context, use it. Otherwise, answer generally.' : 'Answer this question comprehensively.'}

Return JSON:
{
  "answer": "Direct, comprehensive answer",
  "usedContext": ${!!context},
  "additionalInfo": ["Related point 1", "Related point 2"]
}

Return ONLY valid JSON.`;

      const response = await this.generateContent(prompt);
      return this.parseJSON(response);
    } catch (error) {
      console.error('Failed to answer question:', error);
      throw error;
    }
  }

  /**
   * Detect topics being discussed across tabs
   */
  async detectTopics(texts) {
    try {
      const combinedText = texts.join(' ');
      const prompt = `Analyze these text snippets and identify the main topics being discussed.

Texts: ${combinedText}

Return JSON:
{
  "topics": [
    {
      "name": "Topic name",
      "relevance": "high/medium/low",
      "context": "Brief context"
    }
  ]
}

Return ONLY valid JSON.`;

      const response = await this.generateContent(prompt);
      return this.parseJSON(response);
    } catch (error) {
      console.error('Failed to detect topics:', error);
      return { topics: [] };
    }
  }

  /**
   * Find connections between discussions across tabs
   */
  async findConnections(conversations) {
    try {
      const conversationText = conversations.map((c, i) =>
        `Tab ${i + 1} (${c.platform}): ${c.text}`
      ).join('\n\n');

      const prompt = `Find connections and common themes across these conversations from different tabs.

${conversationText}

Return JSON:
{
  "connections": [
    {
      "theme": "Common theme",
      "relatedTabs": [1, 2],
      "insight": "Why this connection matters"
    }
  ]
}

Return ONLY valid JSON.`;

      const response = await this.generateContent(prompt);
      return this.parseJSON(response);
    } catch (error) {
      console.error('Failed to find connections:', error);
      return { connections: [] };
    }
  }

  /**
   * Core method to generate content using Gemini API
   */
  async generateContent(prompt, options = {}) {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured. Please add your API key in the extension options.');
    }

    try {
      const endpoint = `${this.baseURL}/models/${this.model}:generateContent?key=${this.apiKey}`;

      const requestBody = {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: options.temperature || 0.5,
          topK: options.topK || 40,
          topP: options.topP || 0.95,
          maxOutputTokens: options.maxOutputTokens || 800,
        }
      };

      console.log('🤖 Calling Gemini API...');

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', response.status, errorText);
        throw new Error(`Gemini API error: ${response.status} - ${errorText.substring(0, 100)}`);
      }

      const data = await response.json();

      // Extract text from response
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        console.error('No text in Gemini response:', data);
        throw new Error('No content in Gemini response');
      }

      console.log('✅ Gemini response received:', text.substring(0, 100) + '...');
      return text;

    } catch (error) {
      console.error('Gemini API call failed:', error);
      throw error;
    }
  }

  /**
   * Parse JSON response, handling markdown code blocks
   */
  parseJSON(text) {
    try {
      // Remove markdown code blocks if present
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanText);
    } catch (error) {
      console.error('Failed to parse JSON:', text);
      throw new Error('Failed to parse Gemini response as JSON');
    }
  }

  /**
   * Test API key validity
   */
  async testAPIKey() {
    try {
      await this.generateContent('Say hello', { maxOutputTokens: 50 });
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ Gemini cache cleared');
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GeminiClient;
}
