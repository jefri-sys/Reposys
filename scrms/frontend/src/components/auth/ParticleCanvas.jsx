import { useEffect, useRef } from 'react';

const colors = {
  navy: '#0f172a',
  blue: '#2563eb',
  gold: '#eab308',
  slate: '#64748b',
  grid: 'rgba(37, 99, 235, 0.15)',
  beam: 'rgba(37, 99, 235, 0.2)',
  docBg: 'rgba(255, 255, 255, 0.95)',
  toner: 'rgba(15, 23, 42, 0.3)'
};

class CanvasDocument {
  constructor(width, height) {
    this.init(width, height);
    this.x = Math.random() * width;
    this.y = Math.random() * height;
  }

  init(width, height) {
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0) { this.x = -60; this.y = Math.random() * height; }
    else if (edge === 1) { this.x = width + 60; this.y = Math.random() * height; }
    else if (edge === 2) { this.x = Math.random() * width; this.y = -80; }
    else { this.x = Math.random() * width; this.y = height + 80; }

    this.width = 40 + Math.random() * 30;
    this.height = this.width * 1.4;
    this.vx = (Math.random() - 0.5) * 2.5;
    this.vy = (Math.random() - 0.5) * 2.5;
    this.angle = Math.random() * Math.PI * 2;
    this.vAngle = (Math.random() - 0.5) * 0.04;
    
    this.state = 'floating';
    this.stateTimer = 50 + Math.random() * 100;
    this.progress = 0;
  }

  update(width, height, createTonerBurst) {
    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.vAngle;

    this.stateTimer--;
    if (this.stateTimer <= 0) {
      this.state = this.state === 'floating' ? (Math.random() > 0.5 ? 'scanning' : 'printing') : 'floating';
      this.stateTimer = this.state === 'floating' ? 150 : 100;
      this.progress = 0;
      if (this.state === 'floating' && createTonerBurst) {
        createTonerBurst(this.x, this.y);
      }
    }

    if (this.state !== 'floating') {
      this.progress += 0.02;
      if (this.progress >= 1) this.stateTimer = 0;
    }

    if (this.x < -150 || this.x > width + 150 || this.y < -150 || this.y > height + 150) {
      this.init(width, height);
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.shadowColor = 'rgba(0,0,0,0.08)';
    ctx.shadowBlur = 15;

    ctx.fillStyle = colors.docBg;
    ctx.beginPath();
    ctx.roundRect(-this.width/2, -this.height/2, this.width, this.height, 4);
    ctx.fill();

    ctx.strokeStyle = 'rgba(15, 23, 42, 0.08)';
    ctx.lineWidth = 1.5;
    for (let i = -this.height/2 + 12; i < this.height/2 - 8; i += 8) {
      ctx.beginPath();
      ctx.moveTo(-this.width/2 + 10, i);
      ctx.lineTo(this.width/2 - (Math.random() * 10 + 10), i);
      ctx.stroke();
    }

    if (this.state === 'scanning') {
      const sy = -this.height/2 + this.progress * this.height;
      ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
      ctx.fillRect(-this.width/2, -this.height/2, this.width, this.progress * this.height);
      ctx.strokeStyle = colors.blue;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-this.width/2, sy);
      ctx.lineTo(this.width/2, sy);
      ctx.stroke();
    } else if (this.state === 'printing') {
      ctx.fillStyle = colors.gold;
      ctx.fillRect(-this.width/2 + 8, this.height/2 - 10, (this.width - 16) * this.progress, 3);
    }

    ctx.restore();
  }
}

class CanvasHub {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.pulse = 0;
    this.scanAngle = 0;
  }

  update() {
    this.pulse = (this.pulse + 0.02) % 1;
    this.scanAngle += 0.05;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    for (let i = 0; i < 3; i++) {
      const r = ((this.pulse + i/3) % 1) * 120;
      ctx.strokeStyle = `rgba(59, 130, 246, ${0.1 * (1 - r/120)})`;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(this.scanAngle) * 100, Math.sin(this.scanAngle) * 100);
    ctx.stroke();

    ctx.fillStyle = colors.blue;
    ctx.beginPath();
    ctx.arc(Math.cos(this.scanAngle) * 100, Math.sin(this.scanAngle) * 100, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

class CanvasTonerParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 1;
    this.vy = (Math.random() - 0.5) * 1;
    this.life = 1;
    this.decay = 0.005 + Math.random() * 0.01;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
  }

  draw(ctx) {
    ctx.fillStyle = `rgba(15, 23, 42, ${this.life * 0.2})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 1, 0, Math.PI * 2);
    ctx.fill();
  }
}

const ParticleCanvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width, height;

    let docs = [];
    let hubs = [];
    let toner = [];
    let scanLineY = 0;

    const createTonerBurst = (x, y) => {
      for (let i = 0; i < 4; i++) {
        toner.push(new CanvasTonerParticle(x, y));
      }
    };

    const init = () => {
      docs = Array.from({ length: 12 }, () => new CanvasDocument(width, height));
      hubs = [
        new CanvasHub(150, 150),
        new CanvasHub(width - 150, 150),
        new CanvasHub(150, height - 150),
        new CanvasHub(width - 150, height - 150)
      ];
      toner = [];
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      init();
    };

    const drawGrid = () => {
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 1;
      const step = 60;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }
    };

    const drawScannerBeam = () => {
      scanLineY = (scanLineY + 5) % height;
      const grad = ctx.createLinearGradient(0, scanLineY - 80, 0, scanLineY + 80);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.5, colors.beam);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, scanLineY - 80, width, 160);
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, width, height);

      drawGrid();
      drawScannerBeam();

      hubs.forEach(h => { 
        h.update(); 
        h.draw(ctx); 
      });
      
      toner = toner.filter(t => t.life > 0);
      if (toner.length > 30) toner = toner.slice(toner.length - 30);
      toner.forEach(t => { 
        t.update(); 
        t.draw(ctx); 
      });
      
      docs.forEach(d => { 
        d.update(width, height, createTonerBurst); 
        d.draw(ctx); 
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    resize();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
};

export default ParticleCanvas;
