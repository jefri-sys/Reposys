import React, { useEffect, useState } from 'react';

const StudentExperienceAnimation = () => {
  const [cur, setCur] = useState(0);
  const [opacity, setOpacity] = useState(1);

  const scenes = [
    { h: <>Meet <em>Reposys.</em></>, s: 'Your campus print shop — submit, track and collect without leaving your seat.' },
    { h: <><em>Upload</em> anything.</>, s: 'PDF, Word, images — drag, drop and your order is placed in seconds.' },
    { h: <>Track it <em>live.</em></>, s: 'Real-time queue position and printing progress, pushed to you as it happens.' },
    { h: <>Split the <em>bill.</em></>, s: 'Printing with friends? Split the cost instantly before you pay.' },
    { h: <>Ask the <em>AI.</em></>, s: 'Compress, convert or fix your document — right inside Reposys, for free.' },
    { h: <><em>Ready.</em> Collect.</>, s: 'Get notified the moment your prints are done. Walk in, pick up, walk out.' },
  ];
  const tips = [
    'Uploading your document…',
    'Generating your token…',
    'Checking queue position…',
    'Splitting payment…',
    'Compressing PDF — AI at work…',
    'Printing page 18 of 48…',
    'Order ready — notifying you…',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setOpacity(0);
      setTimeout(() => {
        setCur((prev) => (prev + 1) % scenes.length);
        setOpacity(1);
      }, 420);
    }, 2400);
    return () => clearInterval(interval);
  }, [scenes.length]);

  return (
    <>
      <style>{`
        .anim1-wrap {
          width: 100%;
          min-height: 600px;
          background: #f8fafc;
          border-radius: 20px;
          overflow: hidden;
          position: relative;
          font-family: 'Inter', sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin-bottom: 2rem;
          border: 1px solid #e2e8f0;
          box-shadow: 0 20px 40px rgba(0,0,0,0.05);
        }
        .anim1-orb { position: absolute; border-radius: 50%; pointer-events: none; }
        .anim1-orb1 {
          width: 440px; height: 440px;
          background: radial-gradient(circle at 40% 40%, #dbeafe 0%, #bfdbfe 40%, transparent 70%);
          top: -130px; right: -90px; opacity: 0.6;
          animation: anim1-dA 18s ease-in-out infinite alternate;
        }
        .anim1-orb2 {
          width: 320px; height: 320px;
          background: radial-gradient(circle at 60% 60%, #93c5fd 0%, #60a5fa 40%, transparent 70%);
          bottom: -90px; left: -70px; opacity: 0.3;
          animation: anim1-dB 22s ease-in-out infinite alternate;
        }
        .anim1-orb3 {
          width: 180px; height: 180px;
          background: radial-gradient(circle, #eff6ff 0%, #dbeafe 50%, transparent 70%);
          top: 38%; left: 8%; opacity: 0.5;
          animation: anim1-dC 16s ease-in-out infinite alternate;
        }
        @keyframes anim1-dA { from { transform: translate(0,0) scale(1); } to { transform: translate(-40px,28px) scale(1.07); } }
        @keyframes anim1-dB { from { transform: translate(0,0); } to { transform: translate(28px,-18px) scale(1.05); } }
        @keyframes anim1-dC { from { transform: translate(0,0); } to { transform: translate(18px,28px); } }
        .anim1-wrap::after {
          content: ''; position: absolute; inset: 0;
          background-image: radial-gradient(circle, rgba(0,0,0,0.03) 1px, transparent 1px);
          background-size: 28px 28px; pointer-events: none; z-index: 1;
        }
        .anim1-inds {
          position: absolute; top: 22px; right: 22px; z-index: 20; display: flex; gap: 5px;
          opacity: 0; animation: anim1-fU 1s ease 0.5s forwards;
        }
        .anim1-ind {
          width: 5px; height: 5px; border-radius: 50%; background: rgba(0,71,171,0.2);
          transition: background 0.4s, width 0.4s;
        }
        .anim1-ind.on { background: #0047ab; width: 16px; border-radius: 3px; }
        .anim1-hero { position: relative; z-index: 10; text-align: center; padding: 0 24px; margin-bottom: 32px; }
        .anim1-headline {
          font-family: 'Instrument Serif', serif; font-size: 54px; font-weight: 400; line-height: 1.08;
          color: #0f172a; margin-bottom: 12px; opacity: 0; animation: anim1-fU 0.9s ease 0.2s forwards;
          min-height: 64px; transition: opacity 0.45s;
        }
        .anim1-headline em { font-style: italic; color: #0047ab; }
        .anim1-subline {
          font-size: 13.5px; font-weight: 400; color: #64748b; line-height: 1.6; max-width: 340px;
          margin: 0 auto; opacity: 0; animation: anim1-fU 0.9s ease 0.8s forwards; min-height: 44px; transition: opacity 0.45s;
        }
        @keyframes anim1-fU { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .anim1-bubbles { position: relative; z-index: 10; width: 100%; max-width: 620px; height: 210px; padding: 0 12px; }
        .anim1-bubble {
          position: absolute; background: rgba(255,255,255,0.9); border: 1px solid #e2e8f0;
          border-radius: 18px; padding: 10px 15px; font-size: 12px; color: #0f172a; line-height: 1.45;
          opacity: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }
        .anim1-bubble .brow {
          font-size: 10px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase;
          color: #64748b; margin-bottom: 3px;
        }
        .anim1-b1 { left: 2%; bottom: 30px; animation: anim1-fUp 2s ease 0.8s forwards, anim1-bob 6s ease-in-out 2.8s infinite; }
        .anim1-b2 { left: 27%; bottom: 10px; animation: anim1-fUp 2s ease 2.0s forwards, anim1-bob 7s ease-in-out 4.0s infinite; }
        .anim1-b3 { right: 22%; bottom: 50px; animation: anim1-fUp 2s ease 3.2s forwards, anim1-bob 5.8s ease-in-out 5.2s infinite; }
        .anim1-b4 { right: 1%; bottom: 5px; animation: anim1-fUp 2s ease 4.4s forwards, anim1-bob 6.4s ease-in-out 6.4s infinite; }
        .anim1-b5 { left: 17%; bottom: 105px; animation: anim1-fUp 2s ease 5.6s forwards, anim1-bob 7.2s ease-in-out 7.6s infinite; }
        .anim1-b6 { right: 26%; bottom: 110px; animation: anim1-fUp 2s ease 6.8s forwards, anim1-bob 6.6s ease-in-out 8.8s infinite; }
        .anim1-b7 { left: 44%; bottom: 70px; animation: anim1-fUp 2s ease 8.0s forwards, anim1-bob 5.5s ease-in-out 10.0s infinite; }
        @keyframes anim1-fUp { 0% { opacity: 0; transform: translateY(28px); } 30% { opacity: 1; } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes anim1-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
        .anim1-pill {
          display: inline-flex; align-items: center; gap: 5px; background: rgba(59,130,246,0.1);
          border: 1px solid rgba(59,130,246,0.2); border-radius: 20px; padding: 2px 9px 2px 5px;
          font-size: 10px; font-weight: 600; color: #0047ab; margin-top: 5px;
        }
        .anim1-dot-live { width: 5px; height: 5px; border-radius: 50%; background: #3b82f6; animation: anim1-pulse 2s ease infinite; flex-shrink: 0; }
        .anim1-dot-green { width: 5px; height: 5px; border-radius: 50%; background: #10b981; animation: anim1-pulse 2.5s ease infinite; flex-shrink: 0; }
        @keyframes anim1-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.75); } }
        .anim1-status-row { display: flex; align-items: center; gap: 5px; margin-top: 4px; font-size: 10.5px; color: #64748b; font-weight: 500; }
        .anim1-qbar { width: 120px; height: 4px; background: #e2e8f0; border-radius: 2px; margin-top: 5px; overflow: hidden; }
        .anim1-qfill { height: 100%; border-radius: 2px; background: #3b82f6; animation: anim1-fillBar 1.8s ease 5s forwards; width: 0; }
        @keyframes anim1-fillBar { to { width: 33%; } }
        .anim1-split-row { display: flex; gap: 6px; margin-top: 5px; }
        .anim1-split-chip {
          font-size: 10px; padding: 2px 7px; border-radius: 10px; background: rgba(59,130,246,0.1);
          color: #0047ab; border: 1px solid rgba(59,130,246,0.2); font-weight: 600;
        }
        .anim1-typing-bar {
          position: relative; z-index: 10; display: flex; align-items: center; gap: 10px;
          background: #ffffff; border: 1px solid #e2e8f0; border-radius: 30px;
          padding: 9px 18px; font-size: 12px; color: #334155; opacity: 0; animation: anim1-fU 1s ease 2.0s forwards;
          margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); font-weight: 600;
        }
        .anim1-ttext { font-size: 12px; color: #334155; transition: opacity 0.35s; }
        .anim1-tdots span {
          display: inline-block; width: 4px; height: 4px; border-radius: 50%; background: #94a3b8;
          margin: 0 1.5px; animation: anim1-bounce 1.2s ease infinite;
        }
        .anim1-tdots span:nth-child(2) { animation-delay: 0.2s; }
        .anim1-tdots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes anim1-bounce { 0%, 80%, 100% { transform: translateY(0); opacity: 0.35; } 40% { transform: translateY(-4px); opacity: 1; } }
      `}</style>
      <div className="anim1-wrap">
        <div className="anim1-orb anim1-orb1"></div>
        <div className="anim1-orb anim1-orb2"></div>
        <div className="anim1-orb anim1-orb3"></div>

        <div className="anim1-inds">
          {scenes.map((_, i) => (
            <div key={i} className={`anim1-ind ${i === cur ? 'on' : ''}`}></div>
          ))}
        </div>

        <div className="anim1-hero">
          <div className="anim1-headline" style={{ opacity }}>{scenes[cur].h}</div>
          <div className="anim1-subline" style={{ opacity }}>{scenes[cur].s}</div>
        </div>

        <div className="anim1-typing-bar">
          <span className="anim1-ttext" style={{ opacity }}>{tips[cur % tips.length]}</span>
          <div className="anim1-tdots"><span></span><span></span><span></span></div>
        </div>

        <div className="anim1-bubbles">
          <div className="anim1-bubble anim1-b1">
            <div className="brow">Upload</div>
            Mini_Project_Report.pdf · 24 pages
            <div className="anim1-pill"><div className="anim1-dot-live"></div>Uploading…</div>
          </div>
          <div className="anim1-bubble anim1-b2">
            <div className="brow">Your token</div>
            3005 2026 — 0047
            <div className="anim1-status-row"><div className="anim1-dot-green"></div>Confirmed &amp; queued</div>
          </div>
          <div className="anim1-bubble anim1-b3">
            <div className="brow">Live queue</div>
            You're <strong>#3</strong> · est. 12 min
            <div className="anim1-qbar"><div className="anim1-qfill"></div></div>
          </div>
          <div className="anim1-bubble anim1-b4">
            <div className="brow">Split payment</div>
            ₹34 total
            <div className="anim1-split-row">
              <div className="anim1-split-chip">You ₹17</div>
              <div className="anim1-split-chip">Jenifer ₹17</div>
            </div>
          </div>
          <div className="anim1-bubble anim1-b5">
            <div className="brow">AI assistant</div>
            "Compress my PDF before printing?"
            <div className="anim1-status-row"><div className="anim1-dot-green"></div>Done — saved 40%</div>
          </div>
          <div className="anim1-bubble anim1-b6">
            <div className="brow">Order status</div>
            Printing now · page 18 of 48
            <div className="anim1-pill"><div className="anim1-dot-live"></div>Live via socket</div>
          </div>
          <div className="anim1-bubble anim1-b7">
            <div className="brow">Notification</div>
            Your prints are ready for pickup ✓
          </div>
        </div>
      </div>
    </>
  );
};

export default StudentExperienceAnimation;
