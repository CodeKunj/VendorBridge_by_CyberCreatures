import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Maximize2, Minimize2, Minus, Send, Sparkles, X } from 'lucide-react';
import { aiApi } from '../../api/aiApi';
import { useAuth } from '../../context/AuthContext';
import './ai-assistant.css';

const QUICK_ACTIONS_BY_ROLE = {
  admin: [
    'Dashboard Summary',
    'Pending RFQs',
    'Pending Approvals',
    'Top Vendors',
    'Monthly Procurement Report',
    'Open Purchase Orders',
    'Pending Invoices',
    'Vendor Performance',
    'Spending Analytics',
    'Generate Report',
  ],
  procurement_officer: [
    'Dashboard Summary',
    'Pending RFQs',
    'Top Vendors',
    'Open Purchase Orders',
    'Pending Invoices',
    'Spending Analytics',
    'Generate Report',
  ],
  manager: [
    'Dashboard Summary',
    'Pending Approvals',
    'Top Vendors',
    'Vendor Performance',
    'Monthly Procurement Report',
    'Spending Analytics',
  ],
  vendor: [
    'Show my assigned RFQs',
    'My quotation status',
    'Open purchase orders',
    'Dashboard Summary',
  ],
};

const PROMPT_MAP = {
  'Dashboard Summary': 'Show dashboard summary',
  'Pending RFQs': 'Show pending RFQs',
  'Pending Approvals': 'Show pending approvals',
  'Top Vendors': 'List top performing vendors',
  'Monthly Procurement Report': 'Generate monthly procurement report',
  'Open Purchase Orders': 'Show open purchase orders',
  'Pending Invoices': 'How many invoices are unpaid?',
  'Vendor Performance': 'Show vendor performance analytics',
  'Spending Analytics': 'How much did we spend this month?',
  'Generate Report': 'Generate monthly procurement report',
  'Show my assigned RFQs': 'Show my assigned RFQs',
  'My quotation status': 'Show my quotation status',
  'Open purchase orders': 'Show my open purchase orders',
};

const ProcurementAssistant = () => {
  const { user, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [enabled, setEnabled] = useState(true);
  const messagesEndRef = useRef(null);

  const quickActions = useMemo(
    () => QUICK_ACTIONS_BY_ROLE[user?.role] || QUICK_ACTIONS_BY_ROLE.procurement_officer,
    [user?.role],
  );

  const suggestedPrompts = useMemo(() => {
    if (user?.role === 'vendor') {
      return ['What RFQs am I assigned to?', 'Show my purchase orders', 'Help with quotations'];
    }
    return [
      'Show pending approvals',
      'Compare quotations for RFQ-2026-SEED-003',
      'How much did we spend this month?',
    ];
  }, [user?.role]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadHistory = useCallback(async (search = '') => {
    try {
      const res = await aiApi.history({ limit: 40, search });
      const rows = (res.data || []).slice().reverse();
      const flattened = rows.flatMap((row) => [
        { id: `${row.id}-u`, role: 'user', text: row.message, created_at: row.created_at },
        { id: `${row.id}-a`, role: 'assistant', text: row.response, created_at: row.created_at },
      ]);
      setMessages(flattened);
    } catch (err) {
      console.warn('AI history load failed:', err.message);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    aiApi.status()
      .then((res) => setEnabled(res.data?.enabled !== false))
      .catch(() => setEnabled(true));
  }, [isAuthenticated]);

  useEffect(() => {
    if (open && isAuthenticated) {
      loadHistory(historySearch);
    }
  }, [open, isAuthenticated, historySearch, loadHistory]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, open]);

  const sendMessage = async (text) => {
    const message = (text || input).trim();
    if (!message || loading) return;

    setError('');
    setInput('');
    setMessages((prev) => [...prev, { id: `local-u-${Date.now()}`, role: 'user', text: message }]);
    setLoading(true);

    try {
      const res = await aiApi.chat(message);
      const reply = res.data?.reply || res.reply || 'No response received.';
      setMessages((prev) => [...prev, { id: `local-a-${Date.now()}`, role: 'assistant', text: reply }]);
    } catch (err) {
      setError(err.message || 'Failed to reach AI assistant');
      setMessages((prev) => [...prev, {
        id: `local-e-${Date.now()}`,
        role: 'assistant',
        text: 'Sorry, I could not process that request. Please ensure the AI service is running and configured.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  if (!isAuthenticated || !enabled) {
    return null;
  }

  const panelClass = [
    'ai-assistant-panel',
    minimized ? 'is-minimized' : '',
    maximized ? 'is-maximized' : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      {!open ? (
        <button
          type="button"
          className="ai-assistant-fab"
          onClick={() => setOpen(true)}
          aria-label="Open procurement assistant"
        >
          <Sparkles size={22} />
        </button>
      ) : (
        <section className={panelClass} aria-label="Procurement AI Assistant">
          <header className="ai-assistant-header">
            <div>
              <h2 className="ai-assistant-header__title">Procurement Assistant</h2>
              <p className="ai-assistant-header__subtitle">VendorBridge ERP Copilot</p>
            </div>
            <div className="ai-assistant-header__actions">
              <button type="button" className="ai-assistant-icon-btn" onClick={() => setMinimized((v) => !v)} aria-label="Minimize">
                <Minus size={16} />
              </button>
              <button type="button" className="ai-assistant-icon-btn" onClick={() => setMaximized((v) => !v)} aria-label="Maximize">
                {maximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button type="button" className="ai-assistant-icon-btn" onClick={() => { setOpen(false); setMinimized(false); }} aria-label="Close">
                <X size={16} />
              </button>
            </div>
          </header>

          {!minimized && (
            <div className="ai-assistant-body">
              <div className="ai-assistant-history-toggle">
                <input
                  className="ai-assistant-history-search"
                  placeholder="Search chat history..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
              </div>

              {error ? <div className="ai-assistant-error">{error}</div> : null}

              <div className="ai-assistant-messages">
                {messages.length === 0 && (
                  <div className="ai-assistant-suggestions">
                    {suggestedPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        className="ai-assistant-suggestion"
                        onClick={() => sendMessage(prompt)}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}

                {messages.map((msg) => (
                  <div key={msg.id} className={`ai-assistant-bubble ${msg.role === 'user' ? 'is-user' : 'is-ai'}`}>
                    <div className={`ai-assistant-avatar ${msg.role === 'user' ? 'is-user' : 'is-ai'}`}>
                      {msg.role === 'user' ? (user?.name?.[0] || 'U') : <Bot size={16} />}
                    </div>
                    <div className="ai-assistant-bubble__content">{msg.text}</div>
                  </div>
                ))}

                {loading && (
                  <div className="ai-assistant-bubble is-ai">
                    <div className="ai-assistant-avatar is-ai"><Bot size={16} /></div>
                    <div className="ai-assistant-typing" aria-label="Assistant is typing">
                      <span /><span /><span />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="ai-assistant-quick-actions">
                {quickActions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    className="ai-assistant-quick-action"
                    onClick={() => sendMessage(PROMPT_MAP[action] || action)}
                    disabled={loading}
                  >
                    {action}
                  </button>
                ))}
              </div>

              <div className="ai-assistant-input-row">
                <textarea
                  className="ai-assistant-input"
                  placeholder="Ask about RFQs, vendors, approvals, POs, invoices..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  rows={1}
                />
                <button
                  type="button"
                  className="ai-assistant-send"
                  onClick={() => sendMessage()}
                  disabled={loading || !input.trim()}
                  aria-label="Send message"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </>
  );
};

export default ProcurementAssistant;
