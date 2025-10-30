/**
 * Chrome Prompt API Handler
 * Manages Gemini Nano on-device AI through Chrome's Prompt API
 * Runs in content script context (not available in service workers)
 *
 * Documentation: https://developer.chrome.com/docs/ai/prompt-api
 */

class PromptAPIHandler {
  constructor() {
    this.session = null;
    this.isAvailable = false;
    this.availabilityStatus = 'unknown';
    this.sessionConfig = {
      temperature: 0.7,
      topK: 3
    };

    console.log('🤖 [Prompt API] Handler initialized');
  }

  /**
   * Check if Prompt API is available
   * Uses LanguageModel.availability() - global LanguageModel object
   */
  async checkAvailability() {
    console.log('🔍 [Prompt API] Checking availability...');

    try {
      // Check if LanguageModel exists (global object)
      if (typeof LanguageModel === 'undefined') {
        console.warn('⚠️ [Prompt API] LanguageModel not found - API not supported in this browser');
        console.warn('⚠️ [Prompt API] Make sure you are using Chrome 127+ with built-in AI enabled');
        this.availabilityStatus = 'no';
        this.isAvailable = false;
        return { available: false, status: 'no', reason: 'LanguageModel not found' };
      }

      // Check availability using LanguageModel.availability()
      console.log('📊 [Prompt API] Calling LanguageModel.availability()...');
      const availabilityStatus = await LanguageModel.availability();
      console.log('📊 [Prompt API] Availability result:', availabilityStatus);

      this.availabilityStatus = availabilityStatus;

      // Check if status is "available" (as per user's test)
      if (availabilityStatus === 'available') {
        console.log('✅ [Prompt API] Model is available!');
        this.isAvailable = true;
        return { available: true, status: availabilityStatus };
      } else if (availabilityStatus === 'after-download') {
        console.log('⏬ [Prompt API] Model available after download');
        this.isAvailable = false;
        return { available: false, status: 'after-download' };
      } else {
        console.log('❌ [Prompt API] Model not available:', availabilityStatus);
        this.isAvailable = false;
        return { available: false, status: availabilityStatus || 'unknown' };
      }
    } catch (error) {
      console.error('❌ [Prompt API] Error checking availability:', error);
      console.error('❌ [Prompt API] Error stack:', error.stack);
      this.availabilityStatus = 'error';
      this.isAvailable = false;
      return { available: false, status: 'error', error: error.message };
    }
  }

  /**
   * Create a new session with the on-device model
   * Uses LanguageModel.create() - global LanguageModel object
   */
  async createSession(options = {}) {
    console.log('🔧 [Prompt API] Creating session with options:', options);

    try {
      // Check availability first
      const availability = await this.checkAvailability();

      if (!availability.available) {
        throw new Error(`Prompt API not available: ${availability.status}`);
      }

      // Merge options with defaults
      const sessionOptions = {
        ...this.sessionConfig,
        ...options
      };

      console.log('⚙️ [Prompt API] Session configuration:', sessionOptions);

      // Create session using LanguageModel.create()
      console.log('📊 [Prompt API] Calling LanguageModel.create()...');
      this.session = await LanguageModel.create(sessionOptions);

      console.log('✅ [Prompt API] Session created successfully:', this.session);

      return { success: true, session: this.session };
    } catch (error) {
      console.error('❌ [Prompt API] Failed to create session:', error);
      console.error('❌ [Prompt API] Error stack:', error.stack);
      this.session = null;
      return { success: false, error: error.message };
    }
  }

  /**
   * Send a prompt to the on-device model (non-streaming)
   */
  async prompt(text, options = {}) {
    console.log('💬 [Prompt API] Sending prompt (non-streaming):', text.substring(0, 100) + '...');

    try {
      // Ensure we have a session
      if (!this.session) {
        console.log('🔄 [Prompt API] No active session, creating new one...');
        const result = await this.createSession();
        if (!result.success) {
          throw new Error('Failed to create session: ' + result.error);
        }
      }

      console.log('⏳ [Prompt API] Waiting for response...');
      const startTime = Date.now();

      // Send prompt using session.prompt()
      const response = await this.session.prompt(text);

      const duration = Date.now() - startTime;
      console.log(`✅ [Prompt API] Response received in ${duration}ms`);
      console.log('📝 [Prompt API] Response preview:', response.substring(0, 200) + '...');

      return {
        success: true,
        response: response,
        duration: duration,
        source: 'prompt-api'
      };
    } catch (error) {
      console.error('❌ [Prompt API] Prompt failed:', error);

      // If session was destroyed, try to recreate
      if (error.message?.includes('session') || error.message?.includes('destroyed')) {
        console.log('🔄 [Prompt API] Session may be destroyed, clearing reference...');
        this.session = null;
      }

      return {
        success: false,
        error: error.message,
        source: 'prompt-api'
      };
    }
  }

  /**
   * Send a prompt with streaming response
   * Uses session.promptStreaming() as per Chrome documentation
   */
  async promptStreaming(text, onChunk) {
    console.log('💬 [Prompt API] Sending prompt (streaming):', text.substring(0, 100) + '...');

    try {
      // Ensure we have a session
      if (!this.session) {
        console.log('🔄 [Prompt API] No active session, creating new one...');
        const result = await this.createSession();
        if (!result.success) {
          throw new Error('Failed to create session: ' + result.error);
        }
      }

      console.log('⏳ [Prompt API] Starting streaming...');
      const startTime = Date.now();

      // Get streaming response using session.promptStreaming()
      const stream = await this.session.promptStreaming(text);

      let fullResponse = '';
      let chunkCount = 0;

      // Process chunks using async iteration
      for await (const chunk of stream) {
        chunkCount++;
        fullResponse = chunk; // Each chunk contains the full response so far

        if (onChunk) {
          onChunk(chunk);
        }

        // Log every 5th chunk to avoid spam
        if (chunkCount % 5 === 0) {
          console.log(`📦 [Prompt API] Chunk ${chunkCount}:`, chunk.substring(0, 50) + '...');
        }
      }

      const duration = Date.now() - startTime;
      console.log(`✅ [Prompt API] Streaming complete in ${duration}ms (${chunkCount} chunks)`);
      console.log('📝 [Prompt API] Final response preview:', fullResponse.substring(0, 200) + '...');

      return {
        success: true,
        response: fullResponse,
        duration: duration,
        chunks: chunkCount,
        source: 'prompt-api'
      };
    } catch (error) {
      console.error('❌ [Prompt API] Streaming prompt failed:', error);

      // If session was destroyed, try to recreate
      if (error.message?.includes('session') || error.message?.includes('destroyed')) {
        console.log('🔄 [Prompt API] Session may be destroyed, clearing reference...');
        this.session = null;
      }

      return {
        success: false,
        error: error.message,
        source: 'prompt-api'
      };
    }
  }

  /**
   * Destroy the current session
   */
  async destroySession() {
    console.log('🗑️ [Prompt API] Destroying session...');

    try {
      if (this.session) {
        await this.session.destroy();
        this.session = null;
        console.log('✅ [Prompt API] Session destroyed');
      } else {
        console.log('ℹ️ [Prompt API] No active session to destroy');
      }

      return { success: true };
    } catch (error) {
      console.error('❌ [Prompt API] Error destroying session:', error);
      this.session = null; // Clear it anyway
      return { success: false, error: error.message };
    }
  }

  /**
   * Clone the current session
   */
  async cloneSession() {
    console.log('📋 [Prompt API] Cloning session...');

    try {
      if (!this.session) {
        throw new Error('No active session to clone');
      }

      const clonedSession = await this.session.clone();
      console.log('✅ [Prompt API] Session cloned successfully');

      return { success: true, session: clonedSession };
    } catch (error) {
      console.error('❌ [Prompt API] Error cloning session:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current session info
   */
  getSessionInfo() {
    return {
      hasSession: !!this.session,
      isAvailable: this.isAvailable,
      availabilityStatus: this.availabilityStatus,
      config: this.sessionConfig
    };
  }
}

// Export for use in content scripts
if (typeof window !== 'undefined') {
  window.PromptAPIHandler = PromptAPIHandler;
  console.log('✅ [Prompt API] Handler class exported to window');
}
