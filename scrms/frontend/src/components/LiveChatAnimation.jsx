import React, { useEffect, useState, useRef } from 'react';

const LiveChatAnimation = () => {
  const [messages, setMessages] = useState([]);
  const [typingRole, setTypingRole] = useState(null);
  const [ctaIndex, setCtaIndex] = useState(0);
  const chatRef = useRef(null);

  const msgsData = [
    { id: 1, role: 'user', delay: 800, html: 'I need to print my mini project report — 24 pages, 2 copies, spiral binding.' },
    { id: 2, role: 'sys', delay: 1700, html: 'Got it! Here\'s your order summary.', extra: '<div class="anim2-chip"><div class="anim2-chip-dot"></div>A4 · 2 copies · spiral · ₹34</div>' },
    { id: 3, role: 'user', delay: 2800, html: 'Can I split the ₹34 with my friend Jennifer?' },
    { id: 4, role: 'sys', delay: 3700, html: 'Sure — split payment ready.', extra: '<div class="anim2-split"><div class="anim2-stag">You ₹17</div><div class="anim2-stag">Jennifer ₹17</div><div class="anim2-stag">Link sent ✓</div></div>' },
    { id: 5, role: 'user', delay: 4800, html: 'Paid! What\'s my queue position?' },
    { id: 6, role: 'sys', delay: 5600, html: 'You\'re <strong>#3 of 9</strong> — about 12 minutes.', extra: '<div class="anim2-qrow"><div class="anim2-qtrack"><div class="anim2-qfill anim2-fill-now"></div></div><div class="anim2-qlabel">#3 · ~12 min</div></div>' },
    { id: 7, role: 'user', delay: 7000, html: 'Can you compress the PDF before printing?' },
    { id: 8, role: 'sys', delay: 7900, html: 'Done — compressed from 8.4 MB to 1.2 MB, no quality loss.', extra: '<div class="anim2-chip"><div class="anim2-chip-dot" style="background:#10b981"></div>Saved 85% · ready to print</div>' },
    { id: 9, role: 'sys', delay: 10400, html: '🎉 Your prints are ready at Counter 2. Bring your ID!', extra: '<div class="anim2-chip"><div class="anim2-chip-dot" style="background:#10b981"></div>Token 3005-0047 · collected</div>' },
  ];

  const ctaTexts = [
    'Submit your first print job →',
    'Track your queue live →',
    'Split payment with friends →',
    'Chat with the AI assistant →',
    'Collect your prints →',
  ];

  useEffect(() => {
    let timeouts = [];

    const runLoop = () => {
      setMessages([]);
      setTypingRole(null);

      msgsData.forEach((m) => {
        const typDelay = m.delay - 600;
        if (typDelay >= 0) {
          timeouts.push(setTimeout(() => setTypingRole(m.role), typDelay));
        }

        timeouts.push(setTimeout(() => {
          setTypingRole(null);
          setMessages((prev) => [...prev, m]);
          setTimeout(() => {
            if (chatRef.current) {
              chatRef.current.scrollTop = chatRef.current.scrollHeight;
            }
          }, 50);
        }, m.delay));
      });

      const maxDelay = msgsData[msgsData.length - 1].delay;
      timeouts.push(setTimeout(() => {
        runLoop();
      }, maxDelay + 4000));
    };

    runLoop();

    const ctaInterval = setInterval(() => {
      setCtaIndex((prev) => (prev + 1) % ctaTexts.length);
    }, 2800);

    return () => {
      timeouts.forEach(clearTimeout);
      clearInterval(ctaInterval);
    };
  }, []);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <style>{`
        .anim2-page {
          width: 100%;
          min-height: 620px;
          background: #f8fafc;
          border-radius: 18px;
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          font-family: 'Inter', sans-serif;
          border: 1px solid #e2e8f0;
          box-shadow: 0 20px 40px rgba(0,0,0,0.05);
        }
        .anim2-o { position: absolute; border-radius: 50%; pointer-events: none; }
        .anim2-o1 {
          width: 500px; height: 500px; top: -180px; right: -120px;
          background: radial-gradient(circle at 40% 40%, #dbeafe 0%, #bfdbfe 45%, transparent 70%);
          opacity: 0.6; animation: anim2-oA 20s ease-in-out infinite alternate;
        }
        .anim2-o2 {
          width: 360px; height: 360px; bottom: -120px; left: -100px;
          background: radial-gradient(circle at 60% 60%, #93c5fd 0%, #60a5fa 50%, transparent 70%);
          opacity: 0.3; animation: anim2-oB 24s ease-in-out infinite alternate;
        }
        @keyframes anim2-oA { to { transform: translate(-30px,24px) scale(1.06); } }
        @keyframes anim2-oB { to { transform: translate(24px,-16px) scale(1.04); } }
        .anim2-hero { position: relative; z-index: 10; text-align: center; padding: 44px 24px 32px; display: flex; flex-direction: column; align-items: center; }
        .anim2-tag { font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #0047ab; margin-bottom: 18px; opacity: 0; animation: anim2-rise 0.7s ease 0.2s forwards; }
        .anim2-h1 { font-family: 'Instrument Serif', serif; font-size: 58px; font-weight: 400; line-height: 1.06; color: #0f172a; opacity: 0; animation: anim2-rise 0.9s ease 0.5s forwards; }
        .anim2-h1 em { font-style: italic; color: #0047ab; }
        .anim2-h1 .line2 { display: block; }
        @keyframes anim2-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        .anim2-chat-wrap { position: relative; z-index: 10; width: 100%; max-width: 480px; padding: 0 16px 20px; margin-top: 10px; display: flex; flex-direction: column; gap: 10px; flex: 1; overflow-y: hidden; }
        .anim2-msg { display: flex; align-items: flex-end; gap: 9px; animation: anim2-rise 0.5s ease forwards; }
        .anim2-msg.user { flex-direction: row-reverse; }
        .anim2-av { width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; }
        .anim2-av-user { background: #3b82f6; color: #ffffff; }
        .anim2-av-sys { background: #0f172a; color: #ffffff; }
        .anim2-av-sys svg { width: 13px; height: 13px; fill: none; stroke: #ffffff; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
        .anim2-bub { max-width: 82%; border-radius: 16px; padding: 10px 14px; font-size: 13px; line-height: 1.5; color: #0f172a; }
        .anim2-bub-user { background: #0047ab; color: #ffffff; border-radius: 16px 16px 4px 16px; box-shadow: 0 4px 12px rgba(0,71,171,0.15); }
        .anim2-bub-sys { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px 16px 16px 4px; color: #334155; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
        .anim2-chip { display: inline-flex; align-items: center; gap: 4px; background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.2); border-radius: 20px; padding: 3px 10px 3px 6px; font-size: 10.5px; font-weight: 600; color: #0047ab; margin-top: 6px; }
        .anim2-chip-dot { width: 5px; height: 5px; border-radius: 50%; background: #3b82f6; animation: anim2-p 1.8s ease infinite; }
        @keyframes anim2-p { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        .anim2-qrow { display: flex; align-items: center; gap: 8px; margin-top: 7px; }
        .anim2-qtrack { flex: 1; height: 4px; background: #e2e8f0; border-radius: 2px; overflow: hidden; }
        .anim2-qfill { height: 100%; border-radius: 2px; background: #3b82f6; width: 0; transition: width 1.6s cubic-bezier(0.4,0,0.2,1); }
        .anim2-qfill.anim2-fill-now { width: 33%; animation: anim2-fillw 1s ease forwards; }
        @keyframes anim2-fillw { from{ width:0; } to{ width:33%; } }
        .anim2-qlabel { font-size: 10.5px; color: #64748b; font-weight: 600; white-space: nowrap; }
        .anim2-split { display: flex; gap: 6px; margin-top: 7px; flex-wrap: wrap; }
        .anim2-stag { font-size: 10.5px; padding: 3px 10px; border-radius: 12px; background: rgba(59,130,246,0.1); color: #0047ab; border: 1px solid rgba(59,130,246,0.2); font-weight: 600; }
        .anim2-typing { display: flex; gap: 4px; padding: 10px 14px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px 16px 16px 4px; width: fit-content; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
        .anim2-typing span { width: 5px; height: 5px; border-radius: 50%; background: #94a3b8; animation: anim2-td 1.1s ease infinite; }
        .anim2-typing span:nth-child(2) { animation-delay: 0.18s; }
        .anim2-typing span:nth-child(3) { animation-delay: 0.36s; }
        @keyframes anim2-td { 0%, 80%, 100% { transform: translateY(0); opacity: 0.35; } 40% { transform: translateY(-5px); opacity: 1; } }
        .anim2-msg-typing { display: flex; align-items: flex-end; gap: 9px; animation: anim2-rise 0.4s ease forwards; }
        .anim2-msg-typing.user { flex-direction: row-reverse; }
        .anim2-cta { position: relative; z-index: 10; margin: 4px auto 24px; display: flex; align-items: center; gap: 10px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 28px; padding: 10px 20px; font-size: 12.5px; color: #334155; box-shadow: 0 4px 12px rgba(0,0,0,0.05); font-weight: 600; }
        .anim2-cta-dot { width: 6px; height: 6px; border-radius: 50%; background: #3b82f6; animation: anim2-p 2s ease infinite; }
        .anim2-cta-text { transition: opacity 0.3s ease; }
      `}</style>
      
      <div className="anim2-page">
        <div className="anim2-o anim2-o1"></div>
        <div className="anim2-o anim2-o2"></div>

        <div className="anim2-hero">
          <div className="anim2-tag">Reposys Campus Reprography</div>
          <div className="anim2-h1">Print smarter,<span className="line2">not <em>harder.</em></span></div>
        </div>

        <div className="anim2-chat-wrap" ref={chatRef}>
          {messages.map((m) => (
            <div key={m.id} className={`anim2-msg ${m.role === 'user' ? 'user' : ''}`}>
              <div className={`anim2-av ${m.role === 'user' ? 'anim2-av-user' : 'anim2-av-sys'}`}>
                {m.role === 'user' ? 'JF' : <svg viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="10" rx="1.5"/><path d="M5 14h6M8 12v2"/><path d="M5 5h6M5 8h4"/></svg>}
              </div>
              <div className={`anim2-bub ${m.role === 'user' ? 'anim2-bub-user' : 'anim2-bub-sys'}`}>
                <span dangerouslySetInnerHTML={{ __html: m.html }}></span>
                {m.extra && <div dangerouslySetInnerHTML={{ __html: m.extra }}></div>}
              </div>
            </div>
          ))}
          {typingRole && (
            <div className={`anim2-msg-typing ${typingRole === 'user' ? 'user' : ''}`}>
              <div className={`anim2-av ${typingRole === 'user' ? 'anim2-av-user' : 'anim2-av-sys'}`}>
                {typingRole === 'user' ? 'JF' : <svg viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="10" rx="1.5"/><path d="M5 14h6M8 12v2"/><path d="M5 5h6M5 8h4"/></svg>}
              </div>
              <div className="anim2-typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
        </div>

        <div className="anim2-cta">
          <div className="anim2-cta-dot"></div>
          <span className="anim2-cta-text" key={ctaIndex}>{ctaTexts[ctaIndex]}</span>
        </div>
      </div>
    </div>
  );
};

export default LiveChatAnimation;
