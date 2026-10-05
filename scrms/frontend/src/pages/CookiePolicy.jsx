import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    ArrowLeft, 
    Cookie, 
    ShieldCheck, 
    Database, 
    Settings
} from 'lucide-react';

const CookiePolicy = () => {
    return (
        <div className="bg-[#f8fafc] min-h-screen font-body text-slate-700 p-8 md:p-16">
            <div className="max-w-4xl mx-auto">
                <Link to="/" className="inline-flex items-center gap-2 text-[#0047ab] font-bold mb-12 hover:gap-3 transition-all group">
                    <ArrowLeft className="w-5 h-5" />
                    <span>Back to Home</span>
                </Link>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-blue-500/5 p-10 md:p-16"
                >
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                            <Cookie className="w-6 h-6 text-[#0047ab]" />
                        </div>
                        <h1 className="text-4xl font-black text-navy-900 font-headline tracking-tight uppercase">Cookie Policy</h1>
                    </div>

                    <p className="text-lg text-slate-500 font-light leading-relaxed mb-12 italic border-l-4 border-blue-100 pl-6">
                        We use technical cookies to ensure the high-fidelity performance of our document management terminal.
                    </p>

                    <div className="space-y-12">
                        <section>
                            <div className="flex items-center gap-3 mb-4 text-navy-900">
                                <ShieldCheck className="w-5 h-5 text-[#0047ab]" />
                                <h2 className="text-xl font-bold font-headline uppercase tracking-tight">Essential Authentication</h2>
                            </div>
                            <p className="text-slate-500 font-light leading-relaxed pl-8">
                                These cookies are mandatory for the system to recognize your session and maintain a secure connection between your device and the campus server during document uploads.
                            </p>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-4 text-navy-900">
                                <Settings className="w-5 h-5 text-[#0047ab]" />
                                <h2 className="text-xl font-bold font-headline uppercase tracking-tight">Functional Cookies</h2>
                            </div>
                            <p className="text-slate-500 font-light leading-relaxed pl-8">
                                We store temporary preferences such as your preferred document configurations and UI settings to streamline your subsequent ordering sessions.
                            </p>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-4 text-navy-900">
                                <Database className="w-5 h-5 text-[#0047ab]" />
                                <h2 className="text-xl font-bold font-headline uppercase tracking-tight">Telemetry Data</h2>
                            </div>
                            <p className="text-slate-500 font-light leading-relaxed pl-8">
                                Minimal data is collected to monitor system performance and detect production bottlenecks at the physical print node. This data is anonymized and used only for architectural optimization.
                            </p>
                        </section>

                        <div className="p-8 rounded-3xl bg-blue-50 border border-blue-100">
                            <h3 className="font-bold text-navy-900 mb-2">How to manage?</h3>
                            <p className="text-sm text-slate-600 font-light">
                                You can disable non-essential cookies via your browser settings, but please note that the document tracking terminal requires essential cookies to function correctly.
                            </p>
                        </div>
                    </div>

                    <div className="mt-16 pt-12 border-t border-slate-100 text-center">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Saintgits Reposys Engineering Division &copy; {new Date().getFullYear()}</p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default CookiePolicy;
