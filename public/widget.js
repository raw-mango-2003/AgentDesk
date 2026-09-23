/**
 * AgentDesk Embeddable AI Receptionist & Sales Agent Widget
 * Version: 2.0.0
 * Universal Standalone Client Script
 */
(function () {
  'use strict';

  // Prevent multiple initializations on the same page
  if (window.__AGENTDESK_WIDGET_LOADED__) return;
  window.__AGENTDESK_WIDGET_LOADED__ = true;

  // 1. Locate current script element and extract configuration attributes
  var scriptTag = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var s = scripts[i];
      if (s.src && (s.src.indexOf('widget.js') !== -1 || s.src.indexOf('agentdesk-widget.js') !== -1)) {
        return s;
      }
    }
    return null;
  })();

  var scriptSrc = scriptTag ? scriptTag.src : '';
  var defaultOrigin = window.location.origin;
  try {
    if (scriptSrc) {
      var parsedUrl = new URL(scriptSrc, window.location.href);
      defaultOrigin = parsedUrl.origin;
    }
  } catch (e) {
    defaultOrigin = window.location.origin;
  }

  var agentId = (scriptTag && (scriptTag.getAttribute('data-agent-id') || scriptTag.getAttribute('data-agent'))) || '';
  var businessId = (scriptTag && (scriptTag.getAttribute('data-business-id') || scriptTag.getAttribute('data-tenant-id'))) || '';
  var initialTarget = agentId || businessId || '';
  var position = (scriptTag && scriptTag.getAttribute('data-position')) || 'right'; // 'right' | 'left'
  var themeColor = (scriptTag && scriptTag.getAttribute('data-theme')) || '';
  var autoOpenDelay = parseInt(scriptTag && scriptTag.getAttribute('data-delay') || '0', 10);

  // State
  var state = {
    origin: defaultOrigin,
    targetId: initialTarget,
    isOpen: false,
    agent: null,
    business: null,
    conversationId: 'wconv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
    messages: [],
    isTyping: false,
    leadCaptured: false,
    showLeadForm: false
  };

  // 2. Inject CSS Styles
  function injectStyles() {
    if (document.getElementById('agentdesk-widget-styles')) return;
    var style = document.createElement('style');
    style.id = 'agentdesk-widget-styles';
    style.textContent = [
      '#agentdesk-container { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }',
      '#agentdesk-launcher { position: fixed; bottom: 24px; ' + (position === 'left' ? 'left: 24px;' : 'right: 24px;') + ' z-index: 999998; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; cursor: pointer; box-shadow: 0 8px 24px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.1); transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease; border: none; outline: none; }',
      '#agentdesk-launcher:hover { transform: scale(1.06); box-shadow: 0 12px 30px rgba(0,0,0,0.24); }',
      '#agentdesk-launcher:active { transform: scale(0.96); }',
      '#agentdesk-badge { position: absolute; top: -2px; right: -2px; width: 14px; height: 14px; background: #10b981; border: 2px solid #fff; border-radius: 50%; }',
      '#agentdesk-window { position: fixed; bottom: 96px; ' + (position === 'left' ? 'left: 24px;' : 'right: 24px;') + ' z-index: 999999; width: 380px; max-width: calc(100vw - 32px); height: 580px; max-height: calc(100vh - 120px); background: #ffffff; border-radius: 20px; box-shadow: 0 16px 40px rgba(0,0,0,0.16), 0 4px 12px rgba(0,0,0,0.08); display: flex; flex-direction: column; overflow: hidden; border: 1px solid rgba(0,0,0,0.08); opacity: 0; pointer-events: none; transform: translateY(20px) scale(0.96); transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1); }',
      '#agentdesk-window.agentdesk-open { opacity: 1; pointer-events: auto; transform: translateY(0) scale(1); }',
      '@media (max-width: 480px) { #agentdesk-window { bottom: 0 !important; left: 0 !important; right: 0 !important; width: 100vw !important; max-width: 100vw !important; height: 100vh !important; max-height: 100vh !important; border-radius: 0 !important; } #agentdesk-launcher { bottom: 16px; ' + (position === 'left' ? 'left: 16px;' : 'right: 16px;') + ' } }',
      '.agentdesk-header { padding: 16px; color: #ffffff; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }',
      '.agentdesk-header-info { display: flex; align-items: center; gap: 12px; }',
      '.agentdesk-avatar { width: 38px; height: 38px; border-radius: 12px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; flex-shrink: 0; }',
      '.agentdesk-header-title { font-weight: 700; font-size: 15px; line-height: 1.2; }',
      '.agentdesk-header-sub { font-size: 11px; opacity: 0.85; margin-top: 2px; }',
      '.agentdesk-header-btn { background: transparent; border: none; color: #fff; cursor: pointer; padding: 6px; border-radius: 8px; opacity: 0.8; transition: opacity 0.15s, background 0.15s; }',
      '.agentdesk-header-btn:hover { opacity: 1; background: rgba(255,255,255,0.15); }',
      '.agentdesk-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; background: #f8fafc; }',
      '.agentdesk-msg { display: flex; flex-direction: column; max-width: 82%; font-size: 13.5px; line-height: 1.45; word-break: break-word; }',
      '.agentdesk-msg.agent { align-self: flex-start; }',
      '.agentdesk-msg.user { align-self: flex-end; }',
      '.agentdesk-bubble { padding: 10px 14px; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }',
      '.agentdesk-msg.agent .agentdesk-bubble { background: #ffffff; color: #1e293b; border: 1px solid #e2e8f0; border-bottom-left-radius: 4px; }',
      '.agentdesk-msg.user .agentdesk-bubble { color: #ffffff; border-bottom-right-radius: 4px; }',
      '.agentdesk-time { font-size: 10px; color: #94a3b8; margin-top: 4px; align-self: flex-end; }',
      '.agentdesk-typing { display: flex; gap: 4px; padding: 10px 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; border-bottom-left-radius: 4px; width: fit-content; align-self: flex-start; }',
      '.agentdesk-dot { width: 6px; height: 6px; border-radius: 50%; background: #94a3b8; animation: agentdesk-bounce 1.4s infinite ease-in-out both; }',
      '.agentdesk-dot:nth-child(1) { animation-delay: -0.32s; }',
      '.agentdesk-dot:nth-child(2) { animation-delay: -0.16s; }',
      '@keyframes agentdesk-bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1.0); } }',
      '.agentdesk-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }',
      '.agentdesk-chip { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 6px 10px; font-size: 11.5px; font-weight: 500; color: #334155; cursor: pointer; transition: all 0.15s; text-align: left; }',
      '.agentdesk-chip:hover { background: #f1f5f9; border-color: #94a3b8; transform: translateY(-1px); }',
      '.agentdesk-lead-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px; margin-top: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.04); }',
      '.agentdesk-lead-title { font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }',
      '.agentdesk-lead-input { width: 100%; box-sizing: border-box; padding: 7px 10px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 6px; outline: none; }',
      '.agentdesk-lead-input:focus { border-color: #2563eb; ring: 2px; }',
      '.agentdesk-lead-btn { width: 100%; padding: 8px; font-size: 12px; font-weight: 600; color: #fff; border: none; border-radius: 8px; cursor: pointer; transition: opacity 0.15s; }',
      '.agentdesk-lead-btn:hover { opacity: 0.9; }',
      '.agentdesk-footer { padding: 12px; background: #ffffff; border-top: 1px solid #e2e8f0; display: flex; gap: 8px; align-items: center; }',
      '.agentdesk-input { flex: 1; border: 1px solid #cbd5e1; border-radius: 12px; padding: 9px 12px; font-size: 13px; outline: none; background: #f8fafc; transition: border-color 0.15s, background 0.15s; }',
      '.agentdesk-input:focus { border-color: #2563eb; background: #ffffff; }',
      '.agentdesk-send-btn { border: none; width: 38px; height: 38px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #ffffff; cursor: pointer; transition: opacity 0.15s, transform 0.1s; }',
      '.agentdesk-send-btn:hover { opacity: 0.92; }',
      '.agentdesk-send-btn:active { transform: scale(0.95); }',
      '.agentdesk-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }',
      '.agentdesk-brand-tag { text-align: center; font-size: 10px; color: #94a3b8; padding-top: 4px; padding-bottom: 2px; }',
      '.agentdesk-brand-tag a { color: #64748b; text-decoration: none; font-weight: 600; }'
    ].join('\n');
    document.head.appendChild(style);
  }

  // 3. Build UI Elements
  function createDOM() {
    injectStyles();

    var container = document.createElement('div');
    container.id = 'agentdesk-container';

    // Launcher Button
    var candidatePrimaryBg = themeColor || (state.agent && state.agent.primaryColor) || '#2563eb';
    var primaryBg = /^#[0-9a-f]{3,6}$/i.test(candidatePrimaryBg) ? candidatePrimaryBg : '#2563eb';
    var launcher = document.createElement('button');
    launcher.id = 'agentdesk-launcher';
    launcher.style.backgroundColor = primaryBg;
    launcher.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg><div id="agentdesk-badge"></div>';
    launcher.onclick = toggleChat;

    // Chat Window
    var win = document.createElement('div');
    win.id = 'agentdesk-window';
    win.innerHTML = [
      '<div class="agentdesk-header" id="agentdesk-hdr" style="background-color: ' + primaryBg + ';">',
      '  <div class="agentdesk-header-info">',
      '    <div class="agentdesk-avatar" id="agentdesk-av">AI</div>',
      '    <div>',
      '      <div class="agentdesk-header-title" id="agentdesk-name">AI Assistant</div>',
      '      <div class="agentdesk-header-sub" id="agentdesk-sub">Online • 24/7 Support</div>',
      '    </div>',
      '  </div>',
      '  <div style="display: flex; gap: 4px;">',
      '    <button class="agentdesk-header-btn" id="agentdesk-reset-btn" title="Reset Conversation">',
      '      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>',
      '    </button>',
      '    <button class="agentdesk-header-btn" id="agentdesk-close-btn" title="Close">',
      '      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
      '    </button>',
      '  </div>',
      '</div>',
      '<div class="agentdesk-messages" id="agentdesk-msg-list"></div>',
      '<div class="agentdesk-footer">',
      '  <input type="text" class="agentdesk-input" id="agentdesk-input" placeholder="Type your question..." />',
      '  <button class="agentdesk-send-btn" id="agentdesk-send" style="background-color: ' + primaryBg + ';">',
      '    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>',
      '  </button>',
      '</div>',
      '<div class="agentdesk-brand-tag">Powered by <a href="' + state.origin + '" target="_blank" rel="noopener">AgentDesk AI</a></div>'
    ].join('\n');

    container.appendChild(launcher);
    container.appendChild(win);
    document.body.appendChild(container);

    // Event Listeners
    document.getElementById('agentdesk-close-btn').onclick = closeChat;
    document.getElementById('agentdesk-reset-btn').onclick = resetChat;
    document.getElementById('agentdesk-send').onclick = sendCurrentInput;
    document.getElementById('agentdesk-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendCurrentInput();
      }
    });
  }

  // 4. Fetch Public Widget Configuration
  function loadConfig(targetId) {
    var resolvedTarget = targetId || state.targetId;
    if (!resolvedTarget) {
      console.error('[AgentDesk Widget] Missing data-agent-id or data-business-id. Widget initialization stopped.');
      return;
    }
    var url = state.origin + '/api/widget/config?agentId=' + encodeURIComponent(resolvedTarget);
    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.success) {
          state.agent = data.agent;
          state.business = data.business;
          applyConfig();
          dispatchCustomEvent('ready', { agent: data.agent, business: data.business });
        }
      })
      .catch(function (err) {
        console.warn('[AgentDesk Widget] Failed to load config:', err);
      });
  }

  // 5. Update UI with Agent Specs
  function applyConfig() {
    var agent = state.agent || {};
    var biz = state.business || {};
    var color = themeColor || agent.primaryColor || '#2563eb';

    var launcher = document.getElementById('agentdesk-launcher');
    if (launcher) launcher.style.backgroundColor = color;

    var header = document.getElementById('agentdesk-hdr');
    if (header) header.style.backgroundColor = color;

    var sendBtn = document.getElementById('agentdesk-send');
    if (sendBtn) sendBtn.style.backgroundColor = color;

    var nameEl = document.getElementById('agentdesk-name');
    if (nameEl) nameEl.textContent = agent.name || (biz.name ? biz.name + ' AI' : 'AgentDesk AI');

    var subEl = document.getElementById('agentdesk-sub');
    if (subEl) subEl.textContent = agent.role || (biz.name ? 'Official ' + biz.name + ' Assistant' : 'Online • 24/7');

    var avEl = document.getElementById('agentdesk-av');
    if (avEl) {
      var initial = (agent.name || biz.name || 'AI').charAt(0).toUpperCase();
      avEl.textContent = initial;
    }

    // Add Welcome Message if list is empty
    if (state.messages.length === 0) {
      var welcomeText = agent.welcomeMessage || 'Hello! How can I help you today?';
      addMessage('agent', welcomeText, agent.suggestedQuestions);
    }
  }

  // 6. Message Rendering
  function addMessage(sender, text, chips) {
    var now = new Date();
    var timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    var msgObj = { id: 'm_' + Date.now(), sender: sender, text: text, time: timeStr, chips: chips };
    state.messages.push(msgObj);

    var list = document.getElementById('agentdesk-msg-list');
    if (!list) return;

    var color = themeColor || (state.agent && state.agent.primaryColor) || '#2563eb';

    var msgDiv = document.createElement('div');
    msgDiv.className = 'agentdesk-msg ' + sender;

    var bubble = document.createElement('div');
    bubble.className = 'agentdesk-bubble';
    if (sender === 'user') {
      bubble.style.backgroundColor = color;
    }
    bubble.textContent = text;

    msgDiv.appendChild(bubble);

    // Suggested questions chips
    if (sender === 'agent' && Array.isArray(chips) && chips.length > 0) {
      var chipsDiv = document.createElement('div');
      chipsDiv.className = 'agentdesk-chips';
      chips.forEach(function (q) {
        var chip = document.createElement('button');
        chip.className = 'agentdesk-chip';
        chip.textContent = q;
        chip.onclick = function () {
          sendMessage(q);
        };
        chipsDiv.appendChild(chip);
      });
      msgDiv.appendChild(chipsDiv);
    }

    // Lead capture card trigger if qualification asks for contact
    if (sender === 'agent' && !state.leadCaptured && (text.toLowerCase().indexOf('contact') !== -1 || text.toLowerCase().indexOf('email') !== -1 || text.toLowerCase().indexOf('phone') !== -1 || text.toLowerCase().indexOf('schedule') !== -1)) {
      renderLeadForm(msgDiv);
    }

    var timeDiv = document.createElement('div');
    timeDiv.className = 'agentdesk-time';
    timeDiv.textContent = timeStr;
    msgDiv.appendChild(timeDiv);

    list.appendChild(msgDiv);
    list.scrollTop = list.scrollHeight;

    dispatchCustomEvent('message', msgObj);
  }

  function renderLeadForm(parentDiv) {
    var card = document.createElement('div');
    card.className = 'agentdesk-lead-card';
    card.innerHTML = [
      '<div class="agentdesk-lead-title">',
      '  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
      '  <span>Leave your contact info:</span>',
      '</div>',
      '<input type="text" id="agentdesk-lead-name" class="agentdesk-lead-input" placeholder="Your Name" />',
      '<input type="email" id="agentdesk-lead-email" class="agentdesk-lead-input" placeholder="Your Email (Optional)" />',
      '<input type="tel" id="agentdesk-lead-phone" class="agentdesk-lead-input" placeholder="Phone Number (Optional)" />',
      '<button id="agentdesk-lead-submit" class="agentdesk-lead-btn">Request a Callback</button>'
    ].join('\n');

    parentDiv.appendChild(card);

    var submitBtn = card.querySelector('#agentdesk-lead-submit');
    var leadColor = themeColor || (state.agent && state.agent.primaryColor) || '#2563eb';
    if (/^#[0-9a-f]{6}$/i.test(leadColor) || /^#[0-9a-f]{3}$/i.test(leadColor)) {
      submitBtn.style.backgroundColor = leadColor;
    }
    submitBtn.onclick = function () {
      var name = (card.querySelector('#agentdesk-lead-name').value || '').trim();
      var email = (card.querySelector('#agentdesk-lead-email').value || '').trim();
      var phone = (card.querySelector('#agentdesk-lead-phone').value || '').trim();

      if (!name) {
        alert('Please provide your name.');
        return;
      }
      if (!email && !phone) {
        alert('Please provide an email or phone number.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
      submitLead({ name: name, email: email, phone: phone }, card);
    };
  }

  function submitLead(leadData, formContainer) {
    var targetId = state.targetId || (state.agent && state.agent.id) || (state.business && state.business.id);
    fetch(state.origin + '/api/widget/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: state.agent ? state.agent.id : targetId,
        businessId: state.business ? state.business.id : targetId,
        tenantId: state.business ? state.business.id : targetId,
        conversationId: state.conversationId,
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone,
        notes: 'Captured via AgentDesk embed widget'
      })
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok || !data || !data.success) {
            throw new Error((data && data.error) || 'Unable to submit your request.');
          }
          return data;
        });
      })
      .then(function (data) {
        state.leadCaptured = true;
        formContainer.innerHTML = '<div style="color: #16a34a; font-size: 12px; font-weight: 600; padding: 6px 0; display: flex; align-items: center; gap: 6px;">Details received! Our team will reach out shortly.</div>';
        dispatchCustomEvent('lead', data.lead || leadData);
      })
      .catch(function (err) {
        console.error('Lead submit error:', err);
        var button = formContainer.querySelector('#agentdesk-lead-submit');
        if (button) {
          button.disabled = false;
          button.textContent = 'Request a Callback';
        }
        var errorEl = formContainer.querySelector('.agentdesk-lead-error');
        if (!errorEl) {
          errorEl = document.createElement('div');
          errorEl.className = 'agentdesk-lead-error';
          errorEl.style.cssText = 'color:#dc2626;font-size:11px;margin-top:5px;';
          formContainer.appendChild(errorEl);
        }
        errorEl.textContent = err.message || 'Unable to submit your request. Please try again.';
      });;
  }

  function setTyping(isTyping) {
    state.isTyping = isTyping;
    var list = document.getElementById('agentdesk-msg-list');
    var existing = document.getElementById('agentdesk-typing-indicator');

    if (isTyping && !existing && list) {
      var typingDiv = document.createElement('div');
      typingDiv.id = 'agentdesk-typing-indicator';
      typingDiv.className = 'agentdesk-typing';
      typingDiv.innerHTML = '<div class="agentdesk-dot"></div><div class="agentdesk-dot"></div><div class="agentdesk-dot"></div>';
      list.appendChild(typingDiv);
      list.scrollTop = list.scrollHeight;
    } else if (!isTyping && existing) {
      existing.remove();
    }
  }

  // 7. Chat Actions
  function sendCurrentInput() {
    var input = document.getElementById('agentdesk-input');
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    sendMessage(text);
  }

  function sendMessage(text) {
    addMessage('user', text);
    setTyping(true);

    var targetId = state.targetId || (state.agent && state.agent.id) || (state.business && state.business.id);

    fetch(state.origin + '/api/widget/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: state.agent ? state.agent.id : targetId,
        businessId: state.business ? state.business.id : targetId,
        tenantId: state.business ? state.business.id : targetId,
        conversationId: state.conversationId,
        message: text,
        conversationHistory: state.messages
      })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        setTyping(false);
        if (data && data.reply) {
          addMessage('agent', data.reply, data.suggestedActions);
        } else {
          addMessage('agent', "I'm having a slight connection issue. How else can I assist you?");
        }
      })
      .catch(function (err) {
        setTyping(false);
        console.error('Chat error:', err);
        addMessage('agent', "Sorry, I couldn't connect to the server. Please check your internet connection.");
      });
  }

  function toggleChat() {
    if (state.isOpen) {
      closeChat();
    } else {
      openChat();
    }
  }

  function openChat() {
    state.isOpen = true;
    var win = document.getElementById('agentdesk-window');
    if (win) win.classList.add('agentdesk-open');
    var badge = document.getElementById('agentdesk-badge');
    if (badge) badge.style.display = 'none';
    var input = document.getElementById('agentdesk-input');
    if (input) setTimeout(function () { input.focus(); }, 200);
    dispatchCustomEvent('opened', { conversationId: state.conversationId });
  }

  function closeChat() {
    state.isOpen = false;
    var win = document.getElementById('agentdesk-window');
    if (win) win.classList.remove('agentdesk-open');
    dispatchCustomEvent('closed', { conversationId: state.conversationId });
  }

  function resetChat() {
    state.conversationId = 'wconv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    state.messages = [];
    state.leadCaptured = false;
    var list = document.getElementById('agentdesk-msg-list');
    if (list) list.innerHTML = '';
    var welcomeText = (state.agent && state.agent.welcomeMessage) || 'Hello! How can I help you today?';
    var chips = (state.agent && state.agent.suggestedQuestions) || [];
    addMessage('agent', welcomeText, chips);
  }

  function dispatchCustomEvent(name, detail) {
    try {
      var evt = new CustomEvent('AgentDesk:' + name, { detail: detail });
      window.dispatchEvent(evt);
    } catch (e) {}
  }

  // 8. Initialize on DOM Ready
  function init() {
    createDOM();
    loadConfig(state.targetId);

    if (autoOpenDelay > 0) {
      setTimeout(openChat, autoOpenDelay * 1000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 9. Expose Global Public API for External Pages
  window.AgentDesk = {
    open: openChat,
    close: closeChat,
    toggle: toggleChat,
    sendMessage: sendMessage,
    reset: resetChat,
    setAgent: function (newAgentId) {
      state.targetId = newAgentId;
      loadConfig(newAgentId);
      resetChat();
    },
    getState: function () {
      return {
        isOpen: state.isOpen,
        agent: state.agent,
        business: state.business,
        conversationId: state.conversationId
      };
    }
  };

})();
