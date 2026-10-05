import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    ArrowLeft, 
    Clock, 
    ShieldCheck, 
    Bot, 
    Zap, 
    Smartphone,
    CreditCard,
    CheckCircle2,
    Sparkles,
    Users,
    MessageSquare
} from 'lucide-react';
import LiveChatAnimation from '../components/LiveChatAnimation';

const About = () => {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                duration: 0.5,
                ease: "easeOut"
            }
        }
    };

    return (
        <div className="bg-[#f8fafc] min-h-screen font-body text-slate-700 selection:bg-blue-100 overflow-x-hidden">
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-40">
                <motion.div 
                    animate={{ 
                        scale: [1, 1.1, 1],
                        opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{ duration: 15, repeat: Infinity }}
                    className="absolute top-0 -right-20 w-[600px] h-[600px] bg-blue-100 rounded-full blur-[100px]"
                ></motion.div>
            </div>

            {/* Navigation Header */}
            <div className="relative z-10 max-w-screen-xl mx-auto p-8 md:p-12">
                <Link to="/" className="inline-flex items-center gap-2 text-[#0047ab] font-bold hover:text-[#00327d] transition-all group">
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span>Back to Home</span>
                </Link>
            </div>

            <motion.main 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="relative z-10 max-w-6xl mx-auto px-8 pb-32"
            >
                {/* Hero section */}
                <motion.header variants={itemVariants} className="mb-32 text-center">

                    <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-8 tracking-tighter leading-tight font-headline">
                        How <span className="text-[#0047ab]">Reposys</span> <br/>
                        Powers Your <span className="text-[#0047ab] underline decoration-blue-200 decoration-8 underline-offset-4">Day</span>
                    </h1>
                    <p className="text-xl text-slate-500 font-light leading-relaxed max-w-2xl mx-auto mb-16">
                        Say goodbye to queues and manual forms. We've built a vibrant digital ecosystem to handle all your document needs instantly.
                    </p>
                    <div className="w-full max-w-4xl mx-auto shadow-2xl rounded-2xl overflow-hidden border border-slate-100">
                        <LiveChatAnimation />
                    </div>
                </motion.header>

                {/* Step-by-Step Workflow */}
                <motion.section variants={itemVariants} className="mb-40">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        {[
                            { icon: Smartphone, title: 'Submit', color: 'bg-blue-50 text-[#0047ab]', border: 'border-blue-100', desc: 'Upload your docs from your phone or laptop.' },
                            { icon: CreditCard, title: 'Pay', color: 'bg-blue-50 text-[#0047ab]', border: 'border-blue-100', desc: 'Securely pay via campus-linked digital nodes.' },
                            { icon: Clock, title: 'Track', color: 'bg-blue-50 text-[#0047ab]', border: 'border-blue-100', desc: 'Watch your order progress in real-time.' },
                            { icon: CheckCircle2, title: 'Collect', color: 'bg-blue-50 text-[#0047ab]', border: 'border-blue-100', desc: 'Grab your prints the moment they are ready.' }
                        ].map((step, i) => (
                            <motion.div 
                                whileHover={{ y: -10 }}
                                key={i} 
                                className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-500 group cursor-default"
                            >
                                <div className={`w-16 h-16 rounded-2xl ${step.color} ${step.border} border flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform`}>
                                    <step.icon className="w-7 h-7" />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 mb-3 font-headline uppercase tracking-tight">{step.title}</h3>
                                <p className="text-sm text-slate-500 font-light leading-relaxed">{step.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </motion.section>

                {/* Key Features Section */}
                <motion.section variants={itemVariants} className="mb-40">
                    <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
                        <div className="text-left">
                            <h2 className="text-4xl font-black text-slate-900 font-headline tracking-tight uppercase">Platform Superpowers</h2>
                            <p className="text-slate-500 font-light mt-2">Tools designed to make your academic life effortless.</p>
                        </div>
                        <div className="h-px flex-grow bg-slate-100 mx-8 hidden md:block"></div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Cards */}
                        {[
                            { icon: Clock, title: 'Available 24/7', desc: 'The physical shop has working hours, but Reposys is always awake. Submit your files at 2 AM and pick them up whenever you head to class.', color: 'emerald' },
                            { icon: ShieldCheck, title: 'Secure Payments', desc: 'No more carrying change. Pay securely via UPI, Cards, or Campus Wallets with instant digital receipts sent to your inbox.', color: 'blue' },
                            { icon: Bot, title: 'AI Assistant', desc: 'Not sure about paper weight or binding types? Our AI Chatbot provides instant layout advice and answers your system queries 24/7.', color: 'indigo' },
                            { icon: Zap, title: 'Express Guest Mode', desc: 'In a rush for an exam? Use our secure Guest Mode to print documents instantly with a one-time-password—no registration needed.', color: 'orange' },
                            { icon: MessageSquare, title: 'Campus Chat System', desc: 'Connect with classmates, share documents, and discuss print specifications in real-time using our secure campus chat.', color: 'purple' },
                            { icon: Users, title: 'Friends & Split Pay', desc: 'Add classmates as friends, place group orders, and split printing expenses dynamically using your digital campus wallets.', color: 'pink' }
                        ].map((feature, i) => (
                            <motion.div 
                                key={i}
                                whileHover={{ scale: 1.02 }}
                                className="group relative p-10 rounded-[3rem] bg-white border border-slate-100 overflow-hidden hover:border-blue-200 transition-all duration-500 shadow-sm hover:shadow-xl hover:shadow-blue-500/5"
                            >
                                <div className="relative z-10">
                                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center shadow-sm mb-8 group-hover:rotate-12 transition-transform">
                                        <feature.icon className="w-6 h-6 text-[#0047ab]" />
                                    </div>
                                    <h4 className="text-2xl font-black text-navy-900 mb-4 font-headline uppercase tracking-tight">{feature.title}</h4>
                                    <p className="text-slate-500 font-light leading-relaxed text-lg">
                                        {feature.desc}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.section>

                {/* Modern CTA */}
                <motion.footer variants={itemVariants} className="text-center">
                    <div className="bg-[#001d3d] p-16 rounded-[4rem] text-white shadow-2xl shadow-blue-900/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#0047ab]/20 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                        <Users className="w-12 h-12 text-[#0047ab] mx-auto mb-8 opacity-50" />
                        <h2 className="text-4xl font-black mb-6 font-headline tracking-tight">Ready for a faster campus?</h2>
                        <p className="text-blue-100/60 mb-10 max-w-md mx-auto font-light">Join thousands of students digitizing their academic workflow today.</p>
                        <div className="flex flex-wrap justify-center gap-6">
                            <Link to="/register" className="px-10 py-4 bg-[#0047ab] text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-[#00327d] transition-all shadow-lg active:scale-95">
                                Initialize Account
                            </Link>
                        </div>
                    </div>
                    <div className="mt-16 flex flex-col items-center">
                        <div className="w-12 h-1 bg-slate-100 rounded-full mb-8"></div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Reposys Logistics &copy; {new Date().getFullYear()}</p>
                    </div>
                </motion.footer>
            </motion.main>
        </div>
    );
};

export default About;
