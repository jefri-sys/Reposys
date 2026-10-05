import React, { useEffect, useContext, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    ArrowRight,
    BookCopy,
    Bot,
    Building2,
    ChartColumn,
    CreditCard,
    Moon,
    Printer,
    ScanText,
    Sun,
    UserRoundX,
    Zap,
    Layers,
    FileText,
    FileSpreadsheet,
    FileCheck,
    Mail,
    Clock,
    ShieldCheck,
    MousePointer2,
    CheckCircle2,
    ChevronRight,
    AlertCircle,
    MessageSquare,
    Coins,
    X,
    Check,
    Wallet,
    Info
} from 'lucide-react';
import { AuthContext } from '../context/AuthContextObject';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import StudentExperienceAnimation from '../components/StudentExperienceAnimation';

const HeroCanvasAnimation = () => {
    const canvasRef = useRef(null);
    const mouseRef = useRef({ x: -1000, y: -1000 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animId;

        const resize = () => {
            const container = canvas.parentElement;
            if (container) {
                const dpr = window.devicePixelRatio || 1;
                const rect = container.getBoundingClientRect();
                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                canvas.style.width = `${rect.width}px`;
                canvas.style.height = `${rect.height}px`;
            }
        };

        window.addEventListener('resize', resize);
        resize();

        const colors = {
            primary: '#0047ab',
            ready: '#ff3b30',
            processing: '#007aff',
            printing: '#34c759',
            industrial: '#1e293b'
        };

        const docTypes = [
            { type: 'PDF', color: '#ef4444' },
            { type: 'PNG', color: '#3b82f6' },
            { type: 'DOCX', color: '#10b981' },
            { type: 'JPG', color: '#f59e0b' }
        ];
        const documents = [];
        class Document {
            constructor(startX, startY) {
                this.w = 42 + Math.random() * 8;
                this.h = 58 + Math.random() * 10;
                this.x = startX;
                this.y = startY;
                this.targetY = startY + 45; // Drift point below the printer

                // Three-Phase Physics
                this.phase = 'EMERGING';
                this.age = 0;
                this.maxAge = 1500 + Math.random() * 500;

                this.exitSpeed = 0.7 + Math.random() * 0.5; // Medium exit speed
                this.vx = 0;
                this.vy = 0;
                this.rot = 0;
                this.rotV = 0;

                this.alpha = 0;
                const dt = docTypes[Math.floor(Math.random() * docTypes.length)];
                this.type = dt.type;
                this.color = dt.color;
            }
            update(W, H) {
                this.age++;

                if (this.phase === 'EMERGING') {
                    this.y += this.exitSpeed;
                    this.alpha = Math.min(0.95, this.age / 20);
                    if (this.y > this.targetY) {
                        this.phase = 'FLOATING';
                        this.floatTimer = 0;
                    }
                } else if (this.phase === 'FLOATING') {
                    this.floatTimer++;
                    this.y += Math.sin(this.floatTimer * 0.05) * 0.2;
                    this.rot += Math.sin(this.floatTimer * 0.03) * 0.005;
                    if (this.floatTimer > 80) { // Shorter float for medium speed
                        this.phase = 'SCATTERING';
                        // Medium Scattering Speed
                        this.vx = -2.5 - Math.random() * 3.5;
                        this.vy = -0.3 + (Math.random() - 0.5) * 1.5;
                        this.rotV = (Math.random() - 0.5) * 0.02;
                    }
                } else {
                    // SCATTERING Phase (Drifting through Headings)
                    this.x += this.vx + Math.sin(this.age * 0.015) * 0.8;
                    this.y += this.vy + Math.cos(this.age * 0.01) * 0.3;
                    this.rot += this.rotV;

                    // Natural air physics to keep them in the text zone
                    this.vy += (Math.random() - 0.5) * 0.002; // Very light turbulence
                    this.vx *= 0.9995; // Extreme low friction to reach the far left
                }

                // Final Fade - persist longer over the text
                if (this.age > this.maxAge - 400) {
                    this.alpha *= 0.985;
                }

                return this.x > -this.w && this.y < H + this.h && this.alpha > 0.01;
            }
            draw(ctx) {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rot);
                ctx.globalAlpha = this.alpha;

                // Main Sheet
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.roundRect(-this.w / 2, -this.h / 2, this.w, this.h, 3);
                ctx.fill();
                ctx.strokeStyle = '#e2e8f0';
                ctx.stroke();

                // Color Badge (Top)
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.roundRect(-this.w / 2 + 3, -this.h / 2 + 3, this.w - 6, 12, 2);
                ctx.fill();

                // Type Label
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 7px Inter';
                ctx.textAlign = 'center';
                ctx.fillText(this.type, 0, -this.h / 2 + 11.5);

                // Content Lines
                ctx.fillStyle = '#f1f5f9';
                for (let i = 0; i < 3; i++) {
                    ctx.fillRect(-this.w / 2 + 8, -this.h / 2 + 22 + i * 8, this.w - 16, 1.5);
                }

                ctx.restore();
            }
        }

        const printer = {
            w: 260, h: 110,
            x: 0, y: 0,
            timer: 0,
            state: 'READY',
            update(W, H) {
                this.x = W * 0.70;
                this.y = H * 0.35; // Position for optimal visibility
                this.timer++;

                if (this.timer % 150 < 40) this.state = 'READY';
                else if (this.timer % 150 < 80) this.state = 'PROCESSING';
                else this.state = 'PRINTING';

                // Increased Generation Frequency
                if (this.state === 'PRINTING' && this.timer % (25 + Math.floor(Math.random() * 20)) === 0) {
                    const exitX = this.x + 30 + Math.random() * (this.w - 60);
                    const exitY = this.y + 60; // Start at output slot
                    documents.push(new Document(exitX, exitY));
                }
            },
            drawChassis(ctx) {
                const { x, y, w, h } = this;
                ctx.save();

                // Main Shadow
                ctx.shadowColor = 'rgba(0,0,0,0.2)';
                ctx.shadowBlur = 35; ctx.shadowOffsetY = 15;

                // 1. TOP ADF/SCANNER UNIT
                // Upper Lid
                const lidGrad = ctx.createLinearGradient(x, y - 20, x, y + 10);
                lidGrad.addColorStop(0, '#ffffff'); lidGrad.addColorStop(1, '#f1f5f9');
                ctx.fillStyle = lidGrad;
                ctx.beginPath(); ctx.roundRect(x + 10, y - 20, w - 20, 30, [6, 6, 2, 2]); ctx.fill();
                ctx.strokeStyle = '#e2e8f0'; ctx.stroke();

                // Scanner Bed (The "Gap" under the lid)
                ctx.fillStyle = '#cbd5e1';
                ctx.fillRect(x + 12, y + 8, w - 24, 6);
                // Scanner Glass Glow (Light Blue)
                ctx.fillStyle = 'rgba(186, 230, 253, 0.3)';
                ctx.fillRect(x + 15, y + 9, w - 30, 4);

                // ADF Top Tray (Where you put paper to scan)
                ctx.fillStyle = '#94a3b8';
                ctx.beginPath(); ctx.roundRect(x + 40, y - 35, w - 80, 15, [4, 4, 0, 0]); ctx.fill();
                // Paper Guides on top
                ctx.fillStyle = '#64748b';
                ctx.fillRect(x + 45, y - 35, 2, 15);
                ctx.fillRect(x + w - 47, y - 35, 2, 15);

                // 2. LOWER CHASSIS (The big block)
                const chassisGrad = ctx.createLinearGradient(x, y + 60, x, y + h);
                chassisGrad.addColorStop(0, '#f8fafc'); chassisGrad.addColorStop(1, '#e2e8f0');
                ctx.fillStyle = chassisGrad;
                ctx.beginPath(); ctx.roundRect(x + 5, y + 60, w - 10, h - 20, [2, 2, 8, 8]); ctx.fill();
                ctx.strokeStyle = '#cbd5e1'; ctx.stroke();

                // Side Ventilation Grills
                ctx.fillStyle = 'rgba(0,0,0,0.05)';
                for (let i = 0; i < 6; i++) {
                    ctx.fillRect(x + 12, y + 85 + (i * 4), 15, 2);
                    ctx.fillRect(x + w - 27, y + 85 + (i * 4), 15, 2);
                }

                // 3. OUTPUT AREA
                // Inner Dark Cavity
                ctx.fillStyle = '#020617';
                ctx.beginPath(); ctx.roundRect(x + 15, y + 55, w - 30, 18, 2); ctx.fill();

                // Internal Paper Guides (Small vertical lines inside slot)
                ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                ctx.lineWidth = 1;
                for (let i = 1; i < 8; i++) {
                    ctx.beginPath(); ctx.moveTo(x + 20 + (i * (w - 40) / 8), y + 55); ctx.lineTo(x + 20 + (i * (w - 40) / 8), y + 73); ctx.stroke();
                }

                // 4. FRONT PAPER TRAY DETAIL
                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.roundRect(x + 30, y + 85, w - 60, 40, 4); ctx.fill();
                ctx.stroke();
                // Tray Handle
                ctx.fillStyle = '#f1f5f9';
                ctx.beginPath(); ctx.roundRect(x + w / 2 - 20, y + 90, 40, 6, 2); ctx.fill();

                ctx.restore();
            },
            drawPanel(ctx) {
                const { x, y, w, h } = this;
                const panelY = y + 18; // Moved up slightly to cover scanner gap
                const panelH = 42;
                ctx.save();

                // Panel Body (Charcoal Metallic)
                const panelGrad = ctx.createLinearGradient(x, panelY, x, panelY + panelH);
                panelGrad.addColorStop(0, '#1e293b'); panelGrad.addColorStop(1, '#0f172a');
                ctx.fillStyle = panelGrad;
                ctx.beginPath(); ctx.roundRect(x, panelY, w, panelH, 4); ctx.fill();

                // High-tech panel border
                ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                ctx.lineWidth = 1;
                ctx.stroke();

                // LCD Screen area
                ctx.fillStyle = '#000000';
                ctx.beginPath(); ctx.roundRect(x + w - 85, panelY + 8, 70, 26, 2); ctx.fill();
                ctx.strokeStyle = '#334155'; ctx.stroke();
                // Screen Glow
                if (this.state === 'PRINTING') {
                    ctx.fillStyle = 'rgba(52, 199, 89, 0.05)';
                    ctx.fillRect(x + w - 83, panelY + 10, 66, 22);
                }

                const drawIndicator = (ix, iy, label, color, isActive) => {
                    ctx.save();
                    // LED Glow
                    if (isActive) {
                        ctx.shadowColor = color; ctx.shadowBlur = 12;
                        ctx.fillStyle = color;
                    } else {
                        ctx.fillStyle = 'rgba(255,255,255,0.1)';
                    }
                    ctx.beginPath(); ctx.arc(ix, iy, 4, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();

                    // Text
                    ctx.fillStyle = isActive ? '#ffffff' : 'rgba(255,255,255,0.3)';
                    ctx.font = 'bold 7px Inter';
                    ctx.textAlign = 'center';
                    ctx.fillText(label, ix, iy + 14);
                };

                const startX = x + 30;
                const spacing = 45;
                drawIndicator(startX, panelY + 16, 'READY', colors.ready, this.state === 'READY');
                drawIndicator(startX + spacing, panelY + 16, 'BUSY', colors.processing, this.state === 'PROCESSING');
                drawIndicator(startX + spacing * 2, panelY + 16, 'PRINT', colors.printing, this.state === 'PRINTING');

                // Small control buttons (Numeric pad feel)
                ctx.fillStyle = 'rgba(255,255,255,0.1)';
                for (let r = 0; r < 2; r++) {
                    for (let c = 0; c < 4; c++) {
                        ctx.beginPath(); ctx.arc(startX + (spacing * 2) + 25 + (c * 8), panelY + 12 + (r * 10), 3, 0, Math.PI * 2); ctx.fill();
                    }
                }

                ctx.restore();
            }
        };

        // Pre-populate with background documents for instant immersion
        const initBgDocs = () => {
            const W = canvas.width / (window.devicePixelRatio || 1);
            const H = canvas.height / (window.devicePixelRatio || 1);
            for (let i = 0; i < 12; i++) {
                const doc = new Document(Math.random() * W, H * 0.2 + Math.random() * H * 0.4);
                doc.phase = 'SCATTERING';
                doc.age = Math.floor(Math.random() * 800);
                doc.alpha = 0.95;
                doc.vx = -1.5 - Math.random() * 3.5;
                doc.vy = (Math.random() - 0.5) * 0.8;
                doc.rot = Math.random() * Math.PI * 2;
                doc.rotV = (Math.random() - 0.5) * 0.02;
                documents.push(doc);
            }
        };
        initBgDocs();

        const animate = () => {
            const W = canvas.width / (window.devicePixelRatio || 1);
            const H = canvas.height / (window.devicePixelRatio || 1);
            ctx.clearRect(0, 0, W, H);

            printer.update(W, H);
            printer.drawChassis(ctx); // Draw back part

            for (let i = documents.length - 1; i >= 0; i--) {
                if (!documents[i].update(W, H)) {
                    documents.splice(i, 1);
                } else {
                    documents[i].draw(ctx);
                }
            }

            printer.drawPanel(ctx); // Draw front panel
            animId = requestAnimationFrame(animate);
        };
        animate();

        const handleMouseMove = (e) => {
            const rect = canvas.getBoundingClientRect();
            mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        };
        canvas.addEventListener('mousemove', handleMouseMove);
        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
            canvas.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0 opacity-100" style={{ pointerEvents: 'auto' }} />;
};








const Home = () => {
    const { user } = useContext(AuthContext);
    const { isDark, toggleTheme } = useTheme();
    const [shopStatus, setShopStatus] = useState({ isOpen: true, waitTime: 0, activeOrders: 0 });
    const [activeModalFeature, setActiveModalFeature] = useState(null);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await api.get('/config/shop-status');
                setShopStatus(response.data);
            } catch (err) {
                console.error('Failed to fetch shop status', err);
            }
        };
        fetchStatus();
        const interval = setInterval(fetchStatus, 60000);
        return () => clearInterval(interval);
    }, []);
    const primaryButtonClass =
        "px-6 py-2.5 rounded-lg font-bold text-sm transition-all active:scale-95 font-headline inline-flex items-center justify-center";
    const primaryButtonStyle = {
        backgroundColor: "#0047ab",
        color: "#ffffff",
        boxShadow: "0 10px 24px rgba(0, 71, 171, 0.22)",
    };
    const heroPrimaryClass =
        "px-10 py-5 rounded-xl font-bold text-lg transition-all flex items-center gap-3 font-headline inline-flex justify-center";
    const heroPrimaryStyle = {
        backgroundColor: "#0047ab",
        color: "#ffffff",
        boxShadow: "0 16px 32px rgba(0, 71, 171, 0.28)",
    };
    const secondaryButtonStyle = {
        backgroundColor: "#ffffff",
        color: "#334155",
        border: "1px solid #cbd5e1",
    };
    const stepBadgeStyle = {
        background: "linear-gradient(135deg, #0047ab 0%, #2563eb 100%)",
        color: "#ffffff",
        boxShadow: "0 18px 40px rgba(0, 71, 171, 0.24)",
    };
    const guestSectionStyle = {
        background: "linear-gradient(135deg, #000814 0%, #001d3d 55%, #0b2447 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 30px 80px rgba(0, 8, 20, 0.35)",
    };
    const guestActionStyle = {
        backgroundColor: "#ffffff",
        color: "#001d3d",
        boxShadow: "0 18px 40px rgba(255,255,255,0.12)",
    };
    const guestCardStyle = {
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.12)",
    };
    const printerShellStyle = {
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
    };
    const features = [
        {
            icon: Printer,
            title: 'High-Volume Printing',
            text: 'Massive throughput capabilities for standard A4 documents down to large-format plots.',
            details: [
                'Industrial-grade high-speed queue processing for fast physical document output.',
                'Supported formats include high-resolution PDF, DOCX, and image formats.',
                'Configure paper size, color mode, duplex printing, and custom instructions.',
                'Automated scaling and paper orientation matching.'
            ]
        },
        {
            icon: ScanText,
            title: 'Professional Scanning',
            text: 'High-resolution OCR-enabled digital conversion for archives and coursework.',
            details: [
                'High-speed scanner beds for rapid document digitization.',
                'OCR text-recognition to generate search-accessible PDFs and editable text files.',
                'Automatic skew correction and page brightness/contrast normalization.',
                'Secure instant email delivery and cloud storage export.'
            ]
        },
        {
            icon: BookCopy,
            title: 'Premium Binding',
            text: 'Professional spiral, wire, and thermal finishing options for official theses.',
            details: [
                'Heavy-duty binding options: Spiral, Wire-O, and thermal soft/hard covers.',
                'Ideal for academic theses, research papers, custom portfolios, and business briefs.',
                'Includes front transparent protective sheets and thick cardstock back covers.',
                'Quick-turnaround finishing directly at our service desk.'
            ]
        },
        {
            icon: Bot,
            title: 'AI Layout Analysis',
            text: 'Smart optimization to minimize paper waste and ensure perfect alignment.',
            details: [
                'Machine learning pre-flight checks on margins, fonts, and page borders.',
                'Automatic detection of overlapping text and low-resolution image assets.',
                'Intelligent cost-reduction suggestions (e.g. converting margins to save paper).',
                'Visual print preview matching the physical output.'
            ]
        },
        {
            icon: Zap,
            title: 'Express Guest Mode',
            text: 'Instant access for quick document processing without the need for a full account.',
            details: [
                'No registration required for urgent or one-time printing tasks.',
                'Instant secure session authorization via One-Time-Password (OTP).',
                'Secure payment and document pickup using temporary pin codes.',
                'Automatic data wiping post-pickup for maximum privacy.'
            ]
        },
        {
            icon: CreditCard,
            title: 'Flexible Payments',
            text: 'Secure online processing or campus-integrated payment nodes with digital receipts.',
            details: [
                'Accepts major debit/credit cards, UPI, and campus-integrated RFID card points.',
                'Real-time transaction history tracking and downloadable PDF receipts.',
                'Secure refund management protocols and instant wallet settlement.',
                'End-to-end payment encryption matching banking security standards.'
            ]
        },
        {
            icon: Coins,
            title: 'Interactive Peer Split',
            text: 'Request, share, and track custom and group splits dynamically with friends.',
            details: [
                'Dynamic Equal Split: Automatically divides order costs equally among selected friends + creator.',
                'Custom Split Modes: Customize exact percentages, specific share numbers, or custom amounts.',
                'Direct Wallet Settlement: Friends receive payment requests and can settle them in one click.',
                'Live Financial Breakdown: Track payment statuses (Paid/Pending/Declined) live on order details.'
            ]
        },
        {
            icon: MessageSquare,
            title: 'Real-time Chat Portal',
            text: 'Engage with friends in secure direct and group chats with integrated payment triggers.',
            details: [
                'Seamless direct messaging and group chat creation with real-time socket updates.',
                'In-Chat Split Cards: Trigger custom split payments directly inside a chat room.',
                'Instant Payment Interactivity: Recipients click the in-chat split card to pay instantly.',
                'Read receipts, friend status indicators, and typing status telemetry.'
            ]
        },
        {
            icon: Wallet,
            title: 'Secure Digital Wallet',
            text: 'Manage personal funds, execute instant split settlement, and monitor transaction telemetry.',
            details: [
                'Real-time balance tracking with support for fast top-ups.',
                'One-click split payment execution for instant peer-to-peer settlement.',
                'Full audit logs detailing transaction history and printable PDF receipts.',
                'Multi-layer security encryption with automated fraud protection.'
            ]
        }
    ];

    useEffect(() => {
        // Reveal animation on scroll
        const observerOptions = { threshold: 0.1 };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        document.querySelectorAll('.reveal-on-scroll').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'all 1s cubic-bezier(0.16, 1, 0.3, 1)';
            observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);

    return (
        <div className="bg-surface font-body text-on-surface selection:bg-primary/20">
            {/* Top Navigation Bar */}
            <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
                <div className="flex justify-between items-center px-8 py-4 max-w-screen-2xl mx-auto">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2.5 group cursor-pointer">
                            <div className="w-10 h-10 bg-[#0047ab]/5 rounded-xl flex items-center justify-center transition-colors group-hover:bg-[#0047ab]/10">
                                <Printer className="w-6 h-6 text-[#0047ab]" strokeWidth={2.5} />
                            </div>
                            <span className="text-2xl font-black text-[#0047ab] tracking-tighter font-headline">Reposys</span>
                        </div>
                        <div className="hidden lg:flex items-center px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full gap-2">
                            <span className={`w-2 h-2 ${shopStatus.isOpen ? 'bg-emerald-500' : 'bg-red-500'} rounded-full animate-pulse`}></span>
                            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider font-headline">
                                {shopStatus.isOpen ? `Systems Operational — Wait Time: ${shopStatus.waitTime} mins` : 'Systems Offline — Check back soon'}
                            </span>
                        </div>
                    </div>
                    {/* Desktop Links */}
                    <div className="hidden md:flex items-center gap-10 font-headline font-bold tracking-tight text-slate-600 text-sm">
                        <a className="hover:text-primary transition-colors" href="#features">Features</a>
                        <a className="hover:text-primary transition-colors" href="#how-it-works">How it Works</a>
                        <Link className="hover:text-primary transition-colors" to="/contact">Contact Us</Link>
                        <Link className="hover:text-primary transition-colors" to="/guest">Guest Mode</Link>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-4">
                        {/* Dark Mode Toggle */}
                        <button
                            type="button"
                            onClick={toggleTheme}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                            aria-label="Toggle dark mode"
                            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>
                        {!user ? (
                            <>
                                <Link to="/login" className="px-5 py-2 text-slate-600 hover:text-primary transition-all font-bold text-sm font-headline">Sign In</Link>
                                <Link to="/login" className={primaryButtonClass} style={primaryButtonStyle}>Login</Link>
                            </>
                        ) : (
                            <Link to={user.role === 'Admin' ? '/admin' : '/dashboard'} className={primaryButtonClass} style={primaryButtonStyle}>Dashboard</Link>
                        )}
                    </div>
                </div>
            </nav>

            <main className="pt-12">
                {/* Hero Section */}
                <section className="relative px-8 pt-12 pb-24 md:pt-16 md:pb-32 max-w-screen-2xl mx-auto overflow-hidden">
                    <HeroCanvasAnimation />

                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className="z-10 reveal-on-scroll relative">
                            <h1 className="font-headline text-5xl md:text-7xl font-extrabold text-navy-900 tracking-tight leading-[1.05] mb-8">
                                Reposys Campus <br /><span className="text-gradient">Reprography</span> Automation System
                            </h1>
                            <p className="text-lg md:text-xl text-slate-500 mb-10 max-w-xl leading-relaxed font-light">
                                Upload, Print, Track — No Waiting. A premium digital ecosystem designed for the modern academic workflow with industrial-grade precision.
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <Link to="/register" className={heroPrimaryClass} style={heroPrimaryStyle}>
                                    Register <ArrowRight className="w-5 h-5" strokeWidth={2.4} />
                                </Link>
                                <Link to="/about" className="px-10 py-5 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all font-headline flex items-center justify-center" style={secondaryButtonStyle}>
                                    Learn More
                                </Link>
                            </div>
                        </div>
                        {/* Right side spacer for canvas printer placement */}
                        <div className="hidden lg:block relative h-[400px] w-full pointer-events-none"></div>
                    </div>
                </section>

                <section className="px-8 max-w-screen-2xl mx-auto">
                    <StudentExperienceAnimation />
                </section>

                {/* Features Section */}
                <section className="px-8 py-32 bg-slate-50" id="features">
                    <div className="max-w-screen-2xl mx-auto">
                        <div className="text-center mb-20 reveal-on-scroll">
                            <h2 className="font-headline text-4xl md:text-5xl font-extrabold text-navy-900 mb-6 tracking-tight">Precision-Engineered Services</h2>
                            <p className="text-slate-500 text-xl font-light max-w-2xl mx-auto">Industrial-grade document management tailored for the rigorous demands of modern academia.</p>
                        </div>
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-100px" }}
                            variants={{
                                visible: { transition: { staggerChildren: 0.1 } }
                            }}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                        >
                            {features.map((feature, idx) => {
                                const FeatureIcon = feature.icon;
                                return (
                                    <motion.div
                                        key={idx}
                                        variants={{
                                            hidden: { opacity: 0, y: 20 },
                                            visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
                                        }}
                                        whileHover={{ y: -10, transition: { duration: 0.3 } }}
                                        onClick={() => setActiveModalFeature(feature)}
                                        className="bg-white p-10 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all group relative overflow-hidden cursor-pointer flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="absolute top-0 left-0 w-1 h-0 bg-[#0047ab] group-hover:h-full transition-all duration-500"></div>
                                            <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-8 group-hover:bg-[#0047ab] transition-colors duration-300">
                                                <FeatureIcon className="w-7 h-7 text-[#0047ab] group-hover:text-white" strokeWidth={2.2} />
                                            </div>
                                            <h3 className="text-xl font-extrabold text-navy-900 mb-4 font-headline flex items-center gap-2">
                                                {feature.title}
                                                {(feature.title === 'Interactive Peer Split' || feature.title === 'Real-time Chat Portal' || feature.title === 'Secure Digital Wallet') && (
                                                    <span className="inline-block py-0.5 px-2 bg-blue-100 text-blue-800 rounded-full text-[9px] font-black uppercase tracking-wider">
                                                        New
                                                    </span>
                                                )}
                                            </h3>
                                            <p className="text-slate-500 leading-relaxed text-sm font-light mb-6">{feature.text}</p>
                                        </div>
                                        <div className="flex items-center text-xs font-bold text-[#0047ab] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <span>Explore Details</span>
                                            <ChevronRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </motion.div>
                    </div>
                </section>

                {/* How It Works Section */}
                <section className="px-8 py-40 max-w-screen-2xl mx-auto relative overflow-hidden" id="how-it-works">
                    {/* Background Decorative Element */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] pointer-events-none select-none overflow-hidden flex items-center justify-center">
                        <span className="text-[30rem] font-black font-headline leading-none">PROTOCOL</span>
                    </div>

                    <div className="text-center mb-24 relative z-10">
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="font-headline text-4xl md:text-5xl font-black text-navy-900 mb-6 tracking-tighter uppercase"
                        >
                            The Precision <span className="text-primary">Workflow</span>
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="text-slate-500 text-xl font-light"
                        >
                            Industrial-grade logistics from source to output.
                        </motion.p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-16 relative z-10">
                        {/* Connecting Line (Desktop) */}
                        <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-[2px] bg-slate-100 z-0">
                            <motion.div
                                initial={{ width: 0 }}
                                whileInView={{ width: '100%' }}
                                viewport={{ once: true }}
                                transition={{ duration: 1.5, ease: "easeInOut", delay: 0.5 }}
                                className="h-full bg-gradient-to-r from-primary to-blue-400"
                            ></motion.div>
                        </div>

                        {[
                            { num: '01', title: 'Digital Submission', text: 'Securely transmit high-resolution source files through our encrypted terminal.' },
                            { num: '02', title: 'System Processing', text: 'Our AI-assisted node verifies layout parameters and optimizes production logic.' },
                            { num: '03', title: 'Secure Fulfillment', text: 'Track production telemetry until notified for secure counter-node pickup.' }
                        ].map((step, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.2, duration: 0.5 }}
                                className="relative flex flex-col items-center text-center group"
                            >
                                <div
                                    className="w-24 h-24 rounded-[2rem] flex items-center justify-center mb-10 font-headline text-3xl font-black shadow-2xl relative z-10 group-hover:rotate-6 transition-transform duration-500"
                                    style={{
                                        background: "linear-gradient(135deg, #001d3d 0%, #0047ab 100%)",
                                        color: "#ffffff",
                                        boxShadow: "0 20px 40px rgba(0, 71, 171, 0.25)"
                                    }}
                                >
                                    {step.num}
                                    <div className="absolute inset-0 rounded-[2rem] bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
                                </div>
                                <h3 className="text-2xl font-black text-navy-900 mb-4 font-headline uppercase tracking-tight">{step.title}</h3>
                                <p className="text-slate-500 leading-relaxed text-sm font-light max-w-xs">{step.text}</p>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* Guest Mode Section */}
                <section className="px-8 py-32" id="guest-mode">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
                        className="max-w-screen-xl mx-auto rounded-[3rem] p-12 md:p-20 flex flex-col lg:flex-row items-center gap-20 overflow-hidden relative"
                        style={guestSectionStyle}
                    >
                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
                        <div className="lg:w-1/2 relative z-10 text-left">
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 1, 0.5, 1] }}
                            >
                                <h2 className="font-headline text-4xl md:text-5xl font-extrabold text-white mb-8 tracking-tight">Need a Quick Print?<br />Try Guest Mode.</h2>
                                <p className="text-slate-400 text-lg leading-relaxed mb-12 font-light">
                                    No account required for critical sessions. Access industrial-grade tools instantly via secure one-time-password clearance.
                                </p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.3, ease: [0.25, 1, 0.5, 1] }}
                                className="space-y-8 mb-12"
                            >
                                <div className="flex items-start gap-5">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={guestCardStyle}>
                                        <Zap className="w-6 h-6 text-primary" strokeWidth={2.2} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white mb-1 font-headline">Instant Access</h4>
                                        <p className="text-slate-500 text-sm font-light">Provision a secure session immediately with OTP verification.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-5">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={guestCardStyle}>
                                        <UserRoundX className="w-6 h-6 text-primary" strokeWidth={2.2} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white mb-1 font-headline">No Registration Required</h4>
                                        <p className="text-slate-500 text-sm font-light">Perfect for visitors or urgent academic deadlines.</p>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.45, ease: [0.25, 1, 0.5, 1] }}
                            >
                                <Link to="/guest" className="px-10 py-5 rounded-xl font-extrabold text-sm tracking-widest uppercase transition-all shadow-xl font-headline inline-flex items-center justify-center" style={guestActionStyle}>
                                    Start Guest Session
                                </Link>
                            </motion.div>
                        </div>
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 1, 0.5, 1] }}
                            className="lg:w-1/2 w-full relative z-10"
                        >
                            <div className="aspect-video rounded-2xl flex items-center justify-center p-8" style={printerShellStyle}>
                                <div className="relative w-full h-full flex items-center justify-center pt-8">
                                    <div className="relative w-64 h-56 flex flex-col items-center justify-end z-20">

                                        {/* Background Paper (Going IN - Blank) */}
                                        <div className="absolute top-[10px] left-1/2 -translate-x-1/2 z-10 w-20 h-28 bg-slate-100 rounded-sm border border-slate-200 shadow-sm animate-paper-in flex items-center justify-center">
                                            <FileText className="w-8 h-8 text-slate-300 opacity-50" />
                                        </div>

                                        {/* The Printer Structure (z-20) */}
                                        <div className="relative z-20 w-56 flex flex-col items-center">
                                            {/* Top Paper Support/Tray */}
                                            <div className="w-32 h-10 bg-slate-800 rounded-t-xl -mb-3 z-0 border-t border-slate-700/50 flex justify-center">
                                                <div className="w-20 h-1 bg-black/40 rounded-full mt-2"></div>
                                            </div>

                                            {/* Printer Top Section */}
                                            <div className="w-48 h-12 bg-slate-900 rounded-t-2xl shadow-xl flex items-start justify-center border-t border-slate-700 relative z-10">
                                                {/* Paper Entry Slot */}
                                                <div className="w-28 h-1.5 bg-black/80 rounded-full mt-1.5 shadow-inner"></div>
                                            </div>

                                            {/* Printer Main Body */}
                                            <div className="w-full h-28 rounded-xl shadow-2xl relative z-20 border-t border-white/10 flex flex-col justify-between p-4 pb-6"
                                                style={{ background: "linear-gradient(135deg, #0f172a 0%, #020617 100%)" }}>
                                                {/* Control Panel Area */}
                                                <div className="w-full flex justify-between items-start">
                                                    <div className="flex gap-1.5">
                                                        <div className="w-2 h-2 rounded-full bg-slate-700 shadow-inner"></div>
                                                        <div className="w-2 h-2 rounded-full bg-slate-700 shadow-inner"></div>
                                                    </div>

                                                    {/* Embedded Progress Bar */}
                                                    <div className="w-20 h-6 bg-black rounded flex items-center px-1.5 shadow-inner border border-slate-800">
                                                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                            <div className="h-full bg-emerald-400 animate-progress-infinite" style={{ background: "linear-gradient(90deg, #10b981, #34d399)" }}></div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Glowing Status Light & Brand */}
                                                <div className="flex justify-between items-end w-full mb-1">
                                                    <Printer className="w-6 h-6 text-slate-700" />
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Active</span>
                                                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                                                    </div>
                                                </div>

                                                {/* Output Slot Cavity */}
                                                <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 w-44 h-3 bg-black/90 rounded-sm shadow-inner flex justify-center items-center">
                                                    <div className="w-32 h-[1px] bg-white/5"></div>
                                                </div>
                                            </div>

                                            {/* Bottom Output Tray */}
                                            <div className="w-48 h-5 bg-slate-800 rounded-b-xl shadow-[0_10px_20px_rgba(0,0,0,0.5)] -mt-1 relative z-10 flex justify-center">
                                                <div className="w-16 h-1 bg-black/30 rounded-full mt-2"></div>
                                            </div>
                                        </div>

                                        {/* Foreground Paper (Coming OUT - Printed) */}
                                        <div className="absolute bottom-[24px] left-1/2 -translate-x-1/2 z-10 w-20 h-28 bg-white rounded-b-md shadow-xl border border-slate-200 p-2 space-y-2 animate-paper-out">
                                            {/* Printed Content */}
                                            <div className="w-full h-2 bg-blue-600/30 rounded"></div>
                                            <div className="w-3/4 h-1.5 bg-slate-300 rounded mt-3"></div>
                                            <div className="w-full h-1.5 bg-slate-200 rounded"></div>
                                            <div className="w-5/6 h-1.5 bg-slate-300 rounded"></div>
                                            <div className="w-full h-1.5 bg-slate-200 rounded"></div>
                                            <div className="w-2/3 h-1.5 bg-slate-300 rounded mt-2"></div>
                                            <div className="w-4 h-4 bg-emerald-500/20 rounded-full absolute bottom-2 right-2 flex items-center justify-center"><Check className="w-2.5 h-2.5 text-emerald-600" strokeWidth={3} /></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </section>

            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-100 pt-24 pb-12">
                <div className="max-w-screen-2xl mx-auto px-8 grid grid-cols-1 md:grid-cols-4 gap-16 mb-24 text-left">
                    <div className="col-span-1 md:col-span-1">
                        <Link to="/dashboard" className="flex items-center gap-3 group">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700 transition-colors group-hover:bg-sky-100">
                                <Printer className="h-6 w-6" strokeWidth={2.5} />
                            </div>
                            <div className="flex items-center gap-3">
                                <p className="text-xl font-black tracking-tighter text-sky-700">Reposys</p>
                                <p className="text-xs uppercase tracking-[0.18em] text-slate-400 border-l border-slate-200 pl-3 hidden sm:block">{user?.role || 'User'}</p>
                            </div>
                        </Link>
                        <p className="text-slate-500 text-sm leading-relaxed max-w-xs font-light mt-4">
                            The Reposys Campus Reprography Automation System. Precision architecture for academic document lifecycles.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-navy-900 font-bold mb-6 text-sm tracking-wider uppercase">Platform</h4>
                        <ul className="space-y-4 text-slate-500 text-sm font-light">
                            <li><a href="#features" className="hover:text-primary transition-colors">Features</a></li>
                            <li><a href="#how-it-works" className="hover:text-primary transition-colors">How it Works</a></li>
                            <li><Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
                            <li><Link to="/guest" className="hover:text-primary transition-colors">Guest Mode</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-navy-900 font-bold mb-6 text-sm tracking-wider uppercase font-headline">Support</h4>
                        <ul className="space-y-4 text-sm text-slate-500">
                            <li><Link className="hover:text-primary transition-colors" to="/help">Technical Help</Link></li>
                            <li><Link className="hover:text-primary transition-colors" to="/contact">Contact Us</Link></li>
                            <li><Link className="hover:text-primary transition-colors" to="/privacy">Privacy Protocol</Link></li>
                        </ul>
                    </div>
                    <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
                        <h4 className="text-navy-900 font-bold mb-4 text-sm font-headline">System Status</h4>
                        <div className="flex items-center gap-3 mb-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${shopStatus.isOpen ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                            <span className="text-xs text-slate-700 font-bold tracking-tight">
                                {shopStatus.isOpen ? 'Main Grid Operational' : 'Main Grid Offline'}
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight uppercase tracking-wider font-semibold">
                            {shopStatus.isOpen ? `Average wait: ${shopStatus.waitTime} minutes` : 'Closed for production'}
                        </p>
                    </div>
                </div>
                <div className="max-w-screen-2xl mx-auto px-8 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">© 2026 Reposys. All rights reserved.</p>
                    <div className="flex gap-8 text-[10px] font-black text-navy-900 uppercase tracking-widest">
                        <Link className="hover:text-primary" to="/terms">Terms of Service</Link>
                        <Link className="hover:text-primary" to="/cookies">Cookie Policy</Link>
                    </div>
                </div>
            </footer>

            <AnimatePresence>
                {activeModalFeature && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setActiveModalFeature(null)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        />

                        {/* Modal Panel */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                            className="bg-white dark:bg-slate-900 rounded-[2.5rem] max-w-2xl w-full p-8 md:p-10 shadow-2xl relative overflow-hidden border border-slate-100 dark:border-slate-800 z-10 max-h-[90vh] flex flex-col"
                        >
                            {/* Decorative gradient corner */}
                            <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl" />
                            <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl" />

                            {/* Close Button */}
                            <button
                                onClick={() => setActiveModalFeature(null)}
                                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Header */}
                            <div className="flex items-start gap-5 mb-8">
                                <div className="w-16 h-16 bg-blue-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center shrink-0">
                                    {React.createElement(activeModalFeature.icon, {
                                        className: "w-8 h-8 text-[#0047ab]"
                                    })}
                                </div>
                                <div>
                                    <span className="inline-block py-0.5 px-3 bg-blue-50 dark:bg-blue-950/50 text-[#0047ab] rounded-full text-[10px] font-bold uppercase tracking-widest mb-1.5 font-headline">
                                        Service Spotlight
                                    </span>
                                    <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white font-headline">
                                        {activeModalFeature.title}
                                    </h3>
                                </div>
                            </div>

                            {/* Description */}
                            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                                {activeModalFeature.text}
                            </p>

                            {/* Details List */}
                            <div className="flex-1 overflow-y-auto mb-8 pr-2">
                                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">
                                    Key Capabilities
                                </h4>
                                <div className="space-y-4">
                                    {activeModalFeature.details?.map((detail, idx) => (
                                        <div key={idx} className="flex items-start gap-3.5">
                                            <div className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0 mt-0.5">
                                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                                            </div>
                                            <p className="text-sm text-slate-650 dark:text-slate-350 leading-relaxed font-light font-body">
                                                {detail}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Action Button */}
                            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                                <button
                                    onClick={() => setActiveModalFeature(null)}
                                    className="px-6 py-3 bg-[#0047ab] text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all font-headline"
                                >
                                    Dismiss Detail
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Home;
