import { useState, useRef, useEffect } from 'react';
import { Store } from '../utils/store';
import { showToast } from '../utils/toast';
import { API_BASE } from '../utils/api';

async function sendMessage(message, history, projectContext) {
  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, projectContext }),
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
  '📐 Define clear scope & avoid scope creep',
  '🛠️ Recommend modern tech stack',
  '📅 Generate sprint roadmap & milestones',
  '⚠️ Identify key project bottlenecks',
];

const FALLBACKS = [
  "I'm your AI Project Mentor! Try asking about feasibility, scope boundaries, tech stack architecture, or sprint milestones for your project. 🚀",
  "Great question! To give you the best guidance, ensure your skills and idea details are set in the dashboard so I can tailor my recommendations.",
  "Based on best software engineering practices, keep your core MVP features lean for Phase 1 and defer complex extras to Phase 2. What's the core problem your project solves?",
  "For academic projects, focus on high execution quality on 3-4 solid features rather than spreading thin across 10 unpolished ones.",
];

/* ── Rich Markdown Renderer for AI Mentor Answers ── */
function FormattedMessage({ text }) {
  const [copiedCodeIdx, setCopiedCodeIdx] = useState(null);

  if (!text) return null;

  const handleCopyCode = (code, idx) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIdx(idx);
    showToast('Code copied to clipboard!', '📋');
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  // Render inline formatting (bold, italic, code, link)
  const renderInline = (inlineText) => {
    if (!inlineText) return null;

    // Pattern for inline code, bold, link, italic
    const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
    const parts = inlineText.split(regex);

    return parts.map((part, i) => {
      if (!part) return null;
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        return (
          <code key={i} style={{
            background: 'rgba(99,102,241,0.18)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 4,
            padding: '1px 5px',
            fontSize: '0.82em',
            fontFamily: 'Consolas, Monaco, monospace',
            color: '#c4b5fd',
          }}>
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return (
          <strong key={i} style={{ color: '#f8fafc', fontWeight: 700 }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return <em key={i} style={{ color: '#cbd5e1' }}>{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
        const label = part.slice(1, part.indexOf(']('));
        const url = part.slice(part.indexOf('](') + 2, -1);
        return (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#60a5fa', textDecoration: 'underline' }}
          >
            {label}
          </a>
        );
      }
      return part;
    });
  };

  // Parse lines into structured blocks
  const lines = text.split('\n');
  const blocks = [];
  let inCode = false;
  let codeLang = '';
  let codeBuffer = [];
  let inTable = false;
  let tableRows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced code block detection
    if (line.trim().startsWith('```')) {
      if (inCode) {
        blocks.push({ type: 'code', lang: codeLang, content: codeBuffer.join('\n') });
        codeBuffer = [];
        inCode = false;
        codeLang = '';
      } else {
        inCode = true;
        codeLang = line.trim().slice(3).trim() || 'text';
      }
      continue;
    }

    if (inCode) {
      codeBuffer.push(line);
      continue;
    }

    // Markdown Table detection (| a | b |)
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      inTable = true;
      // Skip separator rows (|---|---|)
      if (!line.includes('---')) {
        const cells = line.trim().slice(1, -1).split('|').map(c => c.trim());
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      if (tableRows.length > 0) {
        blocks.push({ type: 'table', rows: tableRows });
        tableRows = [];
      }
      inTable = false;
    }

    // Headings
    if (line.startsWith('#### ')) {
      blocks.push({ type: 'h4', text: line.replace('#### ', '') });
    } else if (line.startsWith('### ')) {
      blocks.push({ type: 'h3', text: line.replace('### ', '') });
    } else if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', text: line.replace('## ', '') });
    } else if (line.startsWith('# ')) {
      blocks.push({ type: 'h1', text: line.replace('# ', '') });
    }
    // Blockquote
    else if (line.startsWith('> ')) {
      blocks.push({ type: 'quote', text: line.replace('> ', '') });
    }
    // Numbered step (e.g. "1. ", "2. ")
    else if (/^\d+\.\s+/.test(line.trim())) {
      const match = line.trim().match(/^(\d+)\.\s+(.*)/);
      if (match) {
        blocks.push({ type: 'ordered', num: match[1], text: match[2] });
      } else {
        blocks.push({ type: 'p', text: line });
      }
    }
    // Bullet list item (e.g. "- ", "* ", "• ")
    else if (/^[-*•]\s+/.test(line.trim())) {
      blocks.push({ type: 'bullet', text: line.trim().replace(/^[-*•]\s+/, '') });
    }
    // Empty line
    else if (!line.trim()) {
      blocks.push({ type: 'spacer' });
    }
    // Standard paragraph line
    else {
      blocks.push({ type: 'p', text: line });
    }
  }

  if (inCode && codeBuffer.length > 0) {
    blocks.push({ type: 'code', lang: codeLang, content: codeBuffer.join('\n') });
  }
  if (inTable && tableRows.length > 0) {
    blocks.push({ type: 'table', rows: tableRows });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.84rem', lineHeight: 1.6 }}>
      {blocks.map((b, idx) => {
        if (b.type === 'spacer') {
          return <div key={idx} style={{ height: 4 }} />;
        }

        if (b.type === 'h1' || b.type === 'h2' || b.type === 'h3' || b.type === 'h4') {
          const size = b.type === 'h1' ? '1.05rem' : b.type === 'h2' ? '0.98rem' : '0.92rem';
          const color = b.type === 'h1' ? '#a5b4fc' : b.type === 'h2' ? '#93c5fd' : '#c4b5fd';
          return (
            <div key={idx} style={{
              fontSize: size,
              fontWeight: 800,
              color,
              marginTop: 4,
              marginBottom: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span>✦</span>
              <span>{renderInline(b.text)}</span>
            </div>
          );
        }

        if (b.type === 'quote') {
          return (
            <div key={idx} style={{
              background: 'rgba(99,102,241,0.08)',
              borderLeft: '3px solid #6366f1',
              padding: '6px 10px',
              borderRadius: '0 8px 8px 0',
              color: '#cbd5e1',
              fontStyle: 'italic',
              margin: '2px 0',
            }}>
              {renderInline(b.text)}
            </div>
          );
        }

        if (b.type === 'bullet') {
          return (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              paddingLeft: 4,
            }}>
              <span style={{ color: '#818cf8', fontWeight: 800, flexShrink: 0, marginTop: 1 }}>•</span>
              <span style={{ color: '#e2e8f0', flex: 1 }}>{renderInline(b.text)}</span>
            </div>
          );
        }

        if (b.type === 'ordered') {
          return (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              paddingLeft: 2,
            }}>
              <span style={{
                background: 'rgba(99,102,241,0.25)',
                border: '1px solid rgba(99,102,241,0.4)',
                color: '#a5b4fc',
                borderRadius: '50%',
                width: 18,
                height: 18,
                fontSize: '0.68rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: 2,
              }}>
                {b.num}
              </span>
              <span style={{ color: '#e2e8f0', flex: 1 }}>{renderInline(b.text)}</span>
            </div>
          );
        }

        if (b.type === 'code') {
          return (
            <div key={idx} style={{
              background: '#090d16',
              border: '1px solid rgba(99,102,241,0.25)',
              borderRadius: 8,
              overflow: 'hidden',
              margin: '6px 0',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 10px',
                background: 'rgba(255,255,255,0.04)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                fontSize: '0.68rem',
                color: '#94a3b8',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}>
                <span>{b.lang || 'code'}</span>
                <button
                  onClick={() => handleCopyCode(b.content, idx)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: copiedCodeIdx === idx ? '#4ade80' : '#818cf8',
                    cursor: 'pointer',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                  }}
                >
                  {copiedCodeIdx === idx ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <pre style={{
                margin: 0,
                padding: '8px 10px',
                fontSize: '0.78rem',
                fontFamily: 'Consolas, Monaco, monospace',
                color: '#e2e8f0',
                overflowX: 'auto',
                lineHeight: 1.45,
              }}>
                <code>{b.content}</code>
              </pre>
            </div>
          );
        }

        if (b.type === 'table') {
          const [header, ...bodyRows] = b.rows;
          return (
            <div key={idx} style={{ overflowX: 'auto', margin: '6px 0' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.76rem',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 8,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                {header && (
                  <thead>
                    <tr style={{ background: 'rgba(99,102,241,0.15)', borderBottom: '1px solid rgba(99,102,241,0.3)' }}>
                      {header.map((cell, cIdx) => (
                        <th key={cIdx} style={{ padding: '6px 8px', textAlign: 'left', color: '#c4b5fd', fontWeight: 700 }}>
                          {renderInline(cell)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {bodyRows.map((row, rIdx) => (
                    <tr key={rIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} style={{ padding: '5px 8px', color: '#cbd5e1' }}>
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return (
          <p key={idx} style={{ margin: 0, color: '#e2e8f0' }}>
            {renderInline(b.text)}
          </p>
        );
      })}
    </div>
  );
}

export default function ChatbotPanel({
  isOpen: externalOpen,
  onClose: externalClose,
  onOpen: externalOpenFn,
  onToggle: externalToggle,
  activeProject = null,
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

  // Get active project context from prop or Store
  const user = Store.get('currentUser');
  const userProjects = user?.email ? Store.getUserProjects(user.email) : [];
  const selectedProj = activeProject || userProjects[0] || null;

  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: selectedProj
        ? `👋 Hi! I'm your **AI Project Mentor**.\n\nI'm loaded with context for **"${selectedProj.title}"** (${(selectedProj.domain || 'web').toUpperCase()}). Ask me anything about feasibility, scope boundaries, tech stack, or milestone planning!`
        : "👋 Hi! I'm your **AI Project Mentor**.\n\nI can help you with feasibility checks, scope definition, tech stack advice, and sprint roadmap planning. What project are you working on?",
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

    const projectContext = selectedProj ? {
      title: selectedProj.title,
      domain: selectedProj.domain,
      desc: selectedProj.desc,
      teamSize: selectedProj.teamSize,
      durationDays: selectedProj.durationDays,
      techIdeas: selectedProj.techIdeas,
      feasibilityScore: selectedProj.feasibility || selectedProj.feasibilityReport?.overallScore,
      studentSkills: Store.get('profile')?.skills || {},
    } : null;

    const reply = await sendMessage(msg, history, projectContext);

    setLoading(false);
    addMsg('ai', reply || FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)]);
  };

  const handleCopyMessage = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Answer copied to clipboard!', '📋');
  };

  const handleClearChat = () => {
    setMessages([
      {
        role: 'ai',
        text: "Chat cleared! How can I assist you with your academic project?",
        ts: new Date(),
      }
    ]);
    showToast('Chat history cleared', '🧹');
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
          width: 440px;
          max-width: calc(100vw - 32px);
          height: 600px;
          max-height: calc(100vh - 120px);
          z-index: 9998;
          background: rgba(13, 17, 23, 0.98);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(99, 102, 241, 0.35);
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(99, 102, 241, 0.2);
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
          padding: 0.85rem 1.15rem;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(139, 92, 246, 0.16));
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .cp-header-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          flex-shrink: 0;
          box-shadow: 0 0 14px rgba(99, 102, 241, 0.45);
        }

        .cp-header-info {
          flex: 1;
          min-width: 0;
        }

        .cp-header-name {
          font-size: 0.92rem;
          font-weight: 700;
          color: #f8fafc;
          letter-spacing: -0.01em;
        }

        .cp-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.68rem;
          color: #4ade80;
          margin-top: 1px;
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

        .cp-header-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .cp-icon-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.8rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.18s;
        }

        .cp-icon-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          color: #fff;
        }

        /* Project context banner */
        .cp-context-banner {
          padding: 5px 12px;
          background: rgba(99, 102, 241, 0.1);
          border-bottom: 1px solid rgba(99, 102, 241, 0.18);
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.72rem;
          color: #c4b5fd;
        }

        /* Messages area */
        .cp-messages {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
        }

        .cp-messages::-webkit-scrollbar { width: 5px; }
        .cp-messages::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.12);
          border-radius: 99px;
        }

        .cp-bubble-wrap {
          display: flex;
          gap: 8px;
          align-items: flex-start;
        }

        .cp-bubble-wrap.user {
          flex-direction: row-reverse;
        }

        .cp-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.82rem;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          margin-top: 2px;
        }

        .cp-bubble-container {
          max-width: 86%;
          display: flex;
          flex-direction: column;
        }

        .cp-bubble {
          padding: 0.75rem 0.95rem;
          border-radius: 14px;
          font-size: 0.84rem;
          line-height: 1.55;
          color: #e2e8f0;
          word-break: break-word;
        }

        .cp-bubble.ai {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-bottom-left-radius: 4px;
        }

        .cp-bubble.user {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.35), rgba(99, 102, 241, 0.35));
          border: 1px solid rgba(99, 102, 241, 0.4);
          border-bottom-right-radius: 4px;
          color: #f1f5f9;
        }

        .cp-msg-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 4px;
          padding: 0 4px;
        }

        .cp-copy-btn {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.35);
          font-size: 0.68rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 3px;
          padding: 2px 4px;
          border-radius: 4px;
          transition: all 0.15s;
        }

        .cp-copy-btn:hover {
          color: #a5b4fc;
          background: rgba(255, 255, 255, 0.06);
        }

        .cp-ts {
          font-size: 0.62rem;
          color: rgba(255, 255, 255, 0.3);
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
              Online · Groq LLM Assistant
            </div>
          </div>
          <div className="cp-header-actions">
            <button className="cp-icon-btn" onClick={handleClearChat} title="Clear Chat">
              🧹
            </button>
            <button className="cp-icon-btn" onClick={handleClose} title="Minimize">
              ✕
            </button>
          </div>
        </div>

        {/* Project Context Badge */}
        {selectedProj && (
          <div className="cp-context-banner">
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span>📁</span>
              <strong style={{ color: '#e2e8f0' }}>{selectedProj.title}</strong>
              <span style={{ opacity: 0.7 }}>({(selectedProj.domain || 'web').toUpperCase()})</span>
            </span>
            {selectedProj.feasibility && (
              <span style={{ fontWeight: 700, color: '#4ade80' }}>
                {selectedProj.feasibility}%
              </span>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="cp-messages">
          {messages.map((m, i) => (
            <div key={i} className={`cp-bubble-wrap ${m.role === 'user' ? 'user' : ''}`}>
              {m.role === 'ai' && <div className="cp-avatar">🤖</div>}
              <div className="cp-bubble-container">
                <div className={`cp-bubble ${m.role}`}>
                  {m.role === 'ai' ? (
                    <FormattedMessage text={m.text} />
                  ) : (
                    <span>{m.text}</span>
                  )}
                </div>
                <div className="cp-msg-footer">
                  {m.role === 'ai' ? (
                    <button
                      className="cp-copy-btn"
                      onClick={() => handleCopyMessage(m.text)}
                      title="Copy Answer"
                    >
                      📋 Copy
                    </button>
                  ) : <div />}
                  <span className="cp-ts">
                    {m.ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
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
        {messages.length <= 2 && (
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
            placeholder={
              selectedProj
                ? `Ask about "${selectedProj.title.slice(0, 20)}..."`
                : "Ask about feasibility, scope, tech stack..."
            }
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
