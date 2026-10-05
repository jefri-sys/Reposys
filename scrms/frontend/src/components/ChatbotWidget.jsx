import { useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot, MessageCircle, SendHorizontal, X } from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContextObject';

const MAX_MESSAGES = 50;
const DEFAULT_WIDTH  = 320;
const DEFAULT_HEIGHT = 480;
const MIN_WIDTH  = 260;
const MIN_HEIGHT = 340;
const MAX_WIDTH  = 600;
const MAX_HEIGHT = 700;

/* ─── helpers ─────────────────────────────────────────────── */

const createMessage = (role, text) => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  role,
  text,
  timestamp: new Date().toISOString(),
});

const trimMessages = (msgs) => msgs.slice(-MAX_MESSAGES);

const formatTimestamp = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
};

/**
 * Renders assistant text as clean paragraphs — no markdown symbols.
 */
const MessageText = ({ text }) => {
  if (!text) return null;
  const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length <= 1) {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length <= 1) return <span>{text}</span>;
    return (
      <>
        {lines.map((line, i) => (
          <span key={i}>{line}{i < lines.length - 1 && <br />}</span>
        ))}
      </>
    );
  }
  return (
    <>
      {paragraphs.map((para, i) => (
        <p key={i} style={{ margin: i === 0 ? 0 : '6px 0 0' }}>
          {para.split('\n').map((line, j, arr) => (
            <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
          ))}
        </p>
      ))}
    </>
  );
};

const TypingIndicator = () => (
  <div className="max-w-[85%] rounded-[22px] rounded-bl-md border border-slate-200 bg-slate-100 px-4 py-3 text-slate-600 shadow-sm">
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
          style={{ animationDelay: `${i * 0.12}s` }} />
      ))}
    </div>
  </div>
);

/* ─── widget ──────────────────────────────────────────────── */

const ChatbotWidget = () => {
  const { user } = useContext(AuthContext);
  const location  = useLocation();

  const [isOpen,      setIsOpen]      = useState(false);
  const [messages,    setMessages]    = useState([]);
  const [draft,       setDraft]       = useState('');
  const [isSending,   setIsSending]   = useState(false);
  const [hasWelcomed, setHasWelcomed] = useState(false);
  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });

  const messageEndRef = useRef(null);

  /* ── hide on chat pages ── */
  if (
    location.pathname === '/chat' ||
    location.pathname.startsWith('/chat/') ||
    location.pathname === '/chats' ||
    location.pathname.startsWith('/chats/')
  ) return null;

  /* ── welcome message ── */
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (isOpen && !hasWelcomed) {
      setMessages([createMessage('assistant',
        "Hi! I'm the Reposys Assistant. Ask me about pricing, services, queue status, or how to use the system."
      )]);
      setHasWelcomed(true);
    }
  }, [hasWelcomed, isOpen]);

  /* ── auto scroll ── */
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!isOpen) return;
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [isOpen, isSending, messages]);

  if (!user) return null;

  /* ── resize handle (top-left corner of panel) ── */
  const onResizeMouseDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const startX  = e.clientX;
    const startY  = e.clientY;
    const startW  = size.width;
    const startH  = size.height;

    const onMove = (ev) => {
      // Dragging left  → wider   (panel anchored to right edge)
      // Dragging up    → taller  (panel anchored to bottom edge)
      const newW = Math.min(MAX_WIDTH,  Math.max(MIN_WIDTH,  startW + (startX - ev.clientX)));
      const newH = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startH + (startY - ev.clientY)));
      setSize({ width: newW, height: newH });
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
  };

  /* ── send ── */
  const handleSend = async (event) => {
    event.preventDefault();
    const question = draft.trim();
    if (!question || isSending) return;

    setMessages((cur) => trimMessages([...cur, createMessage('user', question)]));
    setDraft('');
    setIsSending(true);

    try {
      const response = await api.post('/chatbot/ask', {
        message: question,
        history: messages.slice(-5).map((m) => ({ role: m.role, text: m.text })),
      });
      const replyText = response.data?.reply ||
        'I am having trouble connecting right now. Please try again shortly.';
      setMessages((cur) => trimMessages([...cur, createMessage('assistant', replyText)]));
    } catch (error) {
      setMessages((cur) =>
        trimMessages([...cur, createMessage('assistant',
          error.response?.data?.reply ||
          error.response?.data?.message ||
          'I am having trouble connecting right now. Please try again shortly.'
        )])
      );
    } finally {
      setIsSending(false);
    }
  };

  const HEADER_H = 64;
  const INPUT_H  = 64; // form area

  return (
    /* Fixed anchor — bottom-right, same as before */
    <div className="pointer-events-none fixed bottom-24 md:bottom-6 right-6 z-50">

      {/* ── Chat panel ── */}
      <div
        className={[
          'pointer-events-auto relative mb-4 origin-bottom-right overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_90px_-32px_rgba(15,23,42,0.45)] transition-[opacity,transform] duration-300',
          isOpen
            ? 'translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none translate-y-6 scale-95 opacity-0',
        ].join(' ')}
        style={{ width: size.width, height: size.height }}
      >
        {/* Resize grip — top-left corner ↖ */}
        {isOpen && (
          <div
            onMouseDown={onResizeMouseDown}
            title="Drag to resize"
            style={{
              position:  'absolute',
              top:       0,
              left:      0,
              width:     22,
              height:    22,
              cursor:    'nwse-resize',
              zIndex:    20,
              display:   'flex',
              alignItems:'flex-start',
              justifyContent: 'flex-start',
              padding:   4,
            }}
          >
            {/* 6-dot diagonal grid = standard resize indicator */}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="2"  cy="2"  r="1.4" fill="#94a3b8" />
              <circle cx="7"  cy="2"  r="1.4" fill="#94a3b8" />
              <circle cx="12" cy="2"  r="1.4" fill="#94a3b8" />
              <circle cx="2"  cy="7"  r="1.4" fill="#94a3b8" />
              <circle cx="7"  cy="7"  r="1.4" fill="#94a3b8" />
              <circle cx="2"  cy="12" r="1.4" fill="#94a3b8" />
            </svg>
          </div>
        )}

        {/* Header */}
        <div
          className="flex items-center justify-between border-b border-slate-200 bg-[linear-gradient(135deg,_#0f6dff,_#38bdf8)] px-4 py-3 text-white"
          style={{ height: HEADER_H }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Reposys Assistant</p>
              <p className="text-xs text-white/80">Live queue and pricing help</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-full p-2 text-white/85 transition hover:bg-white/10 hover:text-white"
            aria-label="Close chatbot"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col" style={{ height: size.height - HEADER_H }}>
          {/* Messages */}
          <div className="flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(180deg,_#f8fbff,_#f4f7fb)] px-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={['flex', message.role === 'user' ? 'justify-end' : 'justify-start'].join(' ')}
              >
                <div className={message.role === 'user' ? 'items-end' : 'items-start'}>
                  <div
                    className={[
                      'max-w-[85%] rounded-[22px] px-4 py-3 text-sm leading-6 shadow-sm',
                      message.role === 'user'
                        ? 'rounded-br-md bg-sky-600 text-white'
                        : 'rounded-bl-md border border-slate-200 bg-slate-100 text-slate-700',
                    ].join(' ')}
                  >
                    <MessageText text={message.text} />
                  </div>
                  <p
                    className={[
                      'mt-1 px-1 text-[11px]',
                      message.role === 'user' ? 'text-right text-slate-400' : 'text-left text-slate-500',
                    ].join(' ')}
                  >
                    {formatTimestamp(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex justify-start">
                <div>
                  <TypingIndicator />
                  <p className="mt-1 px-1 text-left text-[11px] text-slate-500">Thinking...</p>
                </div>
              </div>
            )}
            <div ref={messageEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="border-t border-slate-200 bg-white p-3" style={{ minHeight: INPUT_H }}>
            <div className="flex items-end gap-2 rounded-[22px] border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-sky-400 focus-within:bg-white">
              <input
                type="text"
                maxLength={500}
                value={draft}
                disabled={isSending}
                placeholder="Ask a question..."
                onChange={(e) => setDraft(e.target.value)}
                className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-slate-950 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={isSending || !draft.trim()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sky-600 text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                aria-label="Send message"
              >
                <SendHorizontal className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── FAB toggle ── */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsOpen((cur) => !cur)}
          className="pointer-events-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,_#0f6dff,_#38bdf8)] text-white shadow-[0_20px_45px_-20px_rgba(14,116,255,0.9)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_55px_-18px_rgba(14,116,255,0.95)]"
          aria-label={isOpen ? 'Hide chatbot' : 'Open chatbot'}
        >
          <MessageCircle className="h-7 w-7" />
        </button>
      </div>
    </div>
  );
};

export default ChatbotWidget;
