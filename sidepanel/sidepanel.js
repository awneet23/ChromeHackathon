/**
 * SyncUp Side Panel
 * Displays activity feed, action items, and context cards
 */

class SidePanelUI {
  constructor() {
    this.activityFeed = document.getElementById('activityFeed');
    this.actionItems = document.getElementById('actionItems');
    this.contextCards = document.getElementById('contextCards');
    this.cardsCount = document.getElementById('cardsCount');
    this.actionsCount = document.getElementById('actionsCount');

    this.init();
  }

  async init() {
    console.log('🎯 Side panel initialized');

    // Load initial data
    await this.loadData();

    // Listen for updates from background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message);
      sendResponse({ success: true });
      return true;
    });

    // Refresh every 5 seconds
    setInterval(() => {
      this.loadData();
    }, 5000);
  }

  async loadData() {
    try {
      // Get data from background
      chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
        if (response && response.data) {
          this.updateUI(response.data);
        }
      });

      // Also get context cards from Google Meet (preserve existing functionality)
      chrome.runtime.sendMessage({ type: 'GET_CONTEXTUAL_CARDS' }, (response) => {
        if (response && response.cards) {
          this.renderContextCards(response.cards);
        }
      });

    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  handleMessage(message) {
    switch (message.type) {
      case 'UPDATE_SIDE_PANEL':
        this.updateUI(message.data);
        break;

      case 'NEW_CARDS':
        this.renderContextCards(message.cards);
        break;
    }
  }

  updateUI(data) {
    // Update stats
    if (data.contextCards) {
      this.cardsCount.textContent = `${data.contextCards.length} cards`;
      this.renderContextCards(data.contextCards);
    }

    if (data.actionItems) {
      this.actionsCount.textContent = `${data.actionItems.length} actions`;
      this.renderActionItems(data.actionItems);
    }

    if (data.activeContexts) {
      this.renderActivityFeed(data.activeContexts);
    }
  }

  renderActivityFeed(contexts) {
    if (!contexts || contexts.length === 0) {
      this.activityFeed.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">👀</div>
          <div class="empty-text">
            Watching for activity across your tabs...<br>
            Visit Gmail, Slack, or any website to see context appear here.
          </div>
        </div>
      `;
      return;
    }

    this.activityFeed.innerHTML = contexts.map(context => `
      <div class="activity-item">
        <div class="activity-header">
          <span class="activity-icon">${this.getPlatformIcon(context.platform)}</span>
          <span class="activity-platform">${context.platform}</span>
          <span class="activity-time">${this.formatTime(context.timestamp)}</span>
        </div>
        <div class="activity-text">${this.escapeHtml(this.truncate(context.lastText, 100))}</div>
      </div>
    `).join('');
  }

  renderActionItems(items) {
    if (!items || items.length === 0) {
      this.actionItems.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <div class="empty-text">
            No action items yet.<br>
            Action items will be automatically extracted from conversations.
          </div>
        </div>
      `;
      return;
    }

    this.actionItems.innerHTML = items.map(item => `
      <div class="action-item">
        <div class="action-header">
          <div class="action-checkbox" onclick="this.style.background='rgba(52,168,83,0.5)'"></div>
          <div class="action-text">${this.escapeHtml(item.task)}</div>
        </div>
        <div class="action-meta">
          ${item.person ? `<span>👤 ${this.escapeHtml(item.person)}</span>` : ''}
          ${item.deadline ? `<span>📅 ${this.escapeHtml(item.deadline)}</span>` : ''}
          ${item.priority ? `<span class="priority-${item.priority}">⚡ ${item.priority}</span>` : ''}
        </div>
      </div>
    `).join('');
  }

  renderContextCards(cards) {
    if (!cards || cards.length === 0) {
      this.contextCards.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">💡</div>
          <div class="empty-text">
            Context cards will appear here.<br>
            Keywords from conversations will generate AI-powered context cards.
          </div>
        </div>
      `;
      return;
    }

    // Show most recent cards first
    const recentCards = cards.slice(-10).reverse();

    this.contextCards.innerHTML = recentCards.map(card => `
      <div class="context-card">
        <div class="card-topic">${this.escapeHtml(card.topic)}</div>
        <div class="card-summary">${this.escapeHtml(this.truncate(card.summary, 150))}</div>
      </div>
    `).join('');
  }

  getPlatformIcon(platform) {
    const icons = {
      'Gmail': '📧',
      'Slack': '💬',
      'Discord': '💬',
      'LinkedIn': '💼',
      'Twitter': '🐦',
      'X (Twitter)': '🐦',
      'Google Meet': '🎥',
      'Web': '🌐'
    };
    return icons[platform] || '🌐';
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString();
  }

  truncate(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize
new SidePanelUI();
