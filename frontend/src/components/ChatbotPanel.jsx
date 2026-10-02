import { useState, useRef, useEffect } from 'react';

const API_BASE = 'http://127.0.0.1:8000';

async function sendMessage(message, history) {
  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
    });
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    return data.reply;
  } catch {
    // Graceful fallback if backend chat endpoint has temporary network issues
    return null;
  }
}

const STARTERS = [
  '📊 Check my project feasibility',
  '📐 Define my project scope',
  '💡 Give me project ideas for my skills',
  '🛠️ What tech stack should I use?',
  '📅 Help me plan my milestones',
];

const FALLBACKS = [
  "I'm your AI Project Mentor! Try asking about feasibility, scope, tech stack, or milestones for your project. 🚀",
  "Great question! To give you the best answer, could you share a bit more about your project idea and your tech skills?",
  "Based on what you've shared, I'd recommend starting by clearly defining your problem statement and MVP scope. Want me to help with that?",
  "For a student team, I always suggest keeping the scope tight for the first sprint. What's the core feature that makes your project unique?",
];

export default function ChatbotPanel({
  isOpen: externalOpen,
  onClose: externalClose,
  onOpen: externalOpenFn,
  onToggle: externalToggle,
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Sync internal open state if externalOpen changes
  useEffect(() => {
    if (externalOpen !== undefined) {
      setInternalOpen(externalOpen);
    }
  }, [externalOpen]);

  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;

  const handleClose = () => {
    if (externalClose) externalClose();
    setInternalOpen(false);
  };

  const handleOpen = () => {
    if (externalOpenFn) externalOpenFn();
    if (externalToggle) externalToggle();
    setInternalOpen(true);
  };

  const toggle = () => {
    if (externalToggle) {
      externalToggle();
    } else if (isOpen) {
      handleClose();
    } else {
      handleOpen();
    }
  };

  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: "👋 Hi! I'm your **AI Project Mentor**.\n\nI can help you with feasibility checks, scope definition, tech stack advice, and milestone planning. What are you working on?",
      ts: new Date(),
    },
  ]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const addMsg = (role, text) =>
    setMessages(prev => [...prev, { role, text, ts: new Date() }]);

  const handleSend = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    addMsg('user', msg);
    setLoading(true);

    const history = messages.slice(-8).map(m => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.text,
    }));
    const reply = await sendMessage(msg, history);

    setLoading(false);
    addMsg('ai', reply || FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)]);
  };

  const renderText = (text) => {
    return text
      .split('\n')
      .map((line, i) => (
        <span key={i}>
          {line.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
            part.startsWith('**') && part.endsWith('**')
              ? <strong key={j}>{part.slice(2, -2)}</strong>
              : part
          )}
          {i < text.split('\n').length - 1 && <br />}
        </span>
      ));
  };

  return (
    <>
      <style>{`
        /* ══ FLOATING BUTTON AT BOTTOM RIGHT ══ */
        .cp-fab-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .cp-fab-tooltip {
          background: rgba(15, 23, 42, 0.95);
          color: #e2e8f0;
          font-size: 0.8rem;
          font-weight: 600;
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid rgba(99, 102, 241, 0.35);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
          white-space: nowrap;
          pointer-events: none;
          display: flex;
          align-items: center;
          gap: 6px;
          animation: cpTooltipFade 0.2s ease-out;
        }

        .cp-fab-btn {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%);
          border: none;
          cursor: pointer;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.6rem;
          color: #ffffff;
          box-shadow: ${isOpen
            ? '0 10px 32px rgba(99, 102, 241, 0.65), 0 0 0 4px rgba(99, 102, 241, 0.25)'
            : '0 8px 28px rgba(99, 102, 241, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3)'};
          transform: ${isOpen ? 'rotate(90deg) scale(1.05)' : 'scale(1)'};
          transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
          outline: none;
        }

        .cp-fab-btn:hover {
          transform: ${isOpen ? 'rotate(90deg) scale(1.12)' : 'scale(1.1)'};
          box-shadow: 0 12px 36px rgba(99, 102, 241, 0.7);
        }

        .cp-fab-btn:active {
          transform: scale(0.95);
        }

        .cp-pulse-dot {
          position: absolute;
          top: 2px;
          right: 2px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #22c55e;
          border: 2.5px solid #0d1117;
          box-shadow: 0 0 8px #22c55e;
          animation: cpPulseRing 2s infinite;
        }

        @keyframes cpPulseRing {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
          70% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }

        @keyframes cpTooltipFade {
          from { opacity: 0; transform: translateX(8px); }
          to { opacity: 1; transform: translateX(0); }
        }

        /* ══ FLOATING CHAT WINDOW AT BOTTOM RIGHT ══ */
        .cp-window {
          position: fixed;
          bottom: 94px;
          right: 24px;
          width: 400px;
          max-width: calc(100vw - 32px);
          height: 580px;
          max-height: calc(100vh - 120px);
          z-index: 9998;
          background: rgba(13, 17, 23, 0.96);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.75), 0 0 35px rgba(99, 102, 241, 0.18);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transform-origin: bottom right;
          opacity: ${isOpen ? 1 : 0};
          transform: ${isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.92)'};
          pointer-events: ${isOpen ? 'all' : 'none'};
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Header */
        .cp-header {
          padding: 0.9rem 1.15rem;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.22), rgba(139, 92, 246, 0.14));
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .cp-header-icon {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          flex-shrink: 0;
          box-shadow: 0 0 14px rgba(99, 102, 241, 0.45);
        }

        .cp-header-info {
          flex: 1;
          min-width: 0;
        }

        .cp-header-name {
          font-size: 0.94rem;
          font-weight: 700;
          color: #f8fafc;
          letter-spacing: -0.01em;
        }

        .cp-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.7rem;
          color: #4ade80;
          margin-top: 2px;
        }

        .cp-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #4ade80;
          animation: cpStatusPulse 2s infinite;
        }

        @keyframes cpStatusPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }

        .cp-close-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.95rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.18s;
          flex-shrink: 0;
        }

        .cp-close-btn:hover {
          background: rgba(248, 113, 113, 0.2);
          color: #f87171;
          border-color: rgba(248, 113, 113, 0.35);
        }

        /* Messages area */
        .cp-messages {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .cp-messages::-webkit-scrollbar { width: 5px; }
        .cp-messages::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 99px;
        }

        .cp-bubble-wrap {
          display: flex;
          gap: 8px;
          align-items: flex-end;
        }

        .cp-bubble-wrap.user {
          flex-direction: row-reverse;
        }

        .cp-avatar {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.82rem;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
        }

        .cp-bubble {
          max-width: 82%;
          padding: 0.7rem 0.95rem;
          border-radius: 14px;
          font-size: 0.84rem;
          line-height: 1.55;
          color: #e2e8f0;
          word-break: break-word;
        }

        .cp-bubble.ai {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-bottom-left-radius: 4px;
        }

        .cp-bubble.user {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(99, 102, 241, 0.3));
          border: 1px solid rgba(99, 102, 241, 0.35);
          border-bottom-right-radius: 4px;
          color: #f1f5f9;
        }

        .cp-ts {
          font-size: 0.62rem;
          color: rgba(255, 255, 255, 0.25);
          margin-top: 3px;
          text-align: right;
        }

        .cp-thinking {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 0.65rem 0.95rem;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          border-bottom-left-radius: 4px;
          width: fit-content;
        }

        .cp-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #818cf8;
          animation: cpBounce 1.2s infinite ease-in-out;
        }

        .cp-dot:nth-child(2) { animation-delay: 0.2s; }
        .cp-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes cpBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }

        /* Starters */
        .cp-starters {
          padding: 0 1rem 0.75rem;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .cp-starter {
          font-size: 0.72rem;
          padding: 5px 10px;
          border-radius: 999px;
          background: rgba(99, 102, 241, 0.12);
          border: 1px solid rgba(99, 102, 241, 0.25);
          color: #a5b4fc;
          cursor: pointer;
          transition: all 0.18s;
          white-space: nowrap;
        }

        .cp-starter:hover {
          background: rgba(99, 102, 241, 0.25);
          border-color: rgba(99, 102, 241, 0.5);
          color: #e0e7ff;
        }

        /* Input bar */
        .cp-input-row {
          display: flex;
          gap: 8px;
          align-items: flex-end;
          padding: 0.85rem 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.25);
        }

        .cp-input {
          flex: 1;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 0.65rem 0.85rem;
          color: #f1f5f9;
          font-size: 0.85rem;
          resize: none;
          min-height: 42px;
          max-height: 110px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.18s;
        }

        .cp-input:focus {
          border-color: rgba(99, 102, 241, 0.6);
        }

        .cp-input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .cp-send {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          flex-shrink: 0;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          border: none;
          color: #ffffff;
          font-size: 1.05rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
        }

        .cp-send:hover:not(:disabled) {
          transform: scale(1.08);
          box-shadow: 0 6px 18px rgba(99, 102, 241, 0.55);
        }

        .cp-send:disabled {
          opacity: 0.35;
          cursor: not-allowed;
          transform: none;
        }
      `}</style>

      {/* ══ 1. FLOATING ACTION BUTTON AT BOTTOM RIGHT ══ */}
      <div className="cp-fab-container">
        {!isOpen && showTooltip && (
          <div className="cp-fab-tooltip">
            <span>Ask AI Mentor</span>
            <span>💬</span>
          </div>
        )}

        <button
          className="cp-fab-btn"
          onClick={toggle}
          title={isOpen ? 'Close AI Chat' : 'Chat with AI Project Mentor'}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          id="ai-chatbot-fab"
        >
          {isOpen ? (
            <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>✕</span>
          ) : (
            <>
              <span>🤖</span>
              <span className="cp-pulse-dot" />
            </>
          )}
        </button>
      </div>

      {/* ══ 2. FLOATING CHAT CARD POPPING UP AT BOTTOM RIGHT ══ */}
      <div className="cp-window" id="ai-chatbot-window">
        {/* Header */}
        <div className="cp-header">
          <div className="cp-header-icon">🤖</div>
          <div className="cp-header-info">
            <div className="cp-header-name">AI Project Mentor</div>
            <div className="cp-status">
              <span className="cp-status-dot" />
              Online · Powered by Groq LLM
            </div>
          </div>
          <button className="cp-close-btn" onClick={handleClose} title="Minimize">
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="cp-messages">
          {messages.map((m, i) => (
            <div key={i} className={`cp-bubble-wrap ${m.role === 'user' ? 'user' : ''}`}>
              {m.role === 'ai' && <div className="cp-avatar">🤖</div>}
              <div>
                <div className={`cp-bubble ${m.role}`}>{renderText(m.text)}</div>
                <div className="cp-ts">
                  {m.ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              {m.role === 'user' && (
                <div className="cp-avatar" style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)' }}>
                  👤
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="cp-bubble-wrap">
              <div className="cp-avatar">🤖</div>
              <div className="cp-thinking">
                <div className="cp-dot" />
                <div className="cp-dot" />
                <div className="cp-dot" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick starters (visible before first user message) */}
        {messages.length <= 1 && (
          <div className="cp-starters">
            {STARTERS.map((s, i) => (
              <button key={i} className="cp-starter" onClick={() => handleSend(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input row */}
        <div className="cp-input-row">
          <textarea
            ref={inputRef}
            className="cp-input"
            placeholder="Ask about feasibility, scope, tech stack..."
            value={input}
            rows={1}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            className="cp-send"
            disabled={!input.trim() || loading}
            onClick={() => handleSend()}
            title="Send Message"
          >
            ➤
          </button>
        </div>
      </div>
    </>
  );
}
