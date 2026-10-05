import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    ArrowLeft, 
    FileText, 
    Scale, 
    ShieldAlert, 
    CheckCircle2
} from 'lucide-react';

const TermsOfService = () => {
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
                            <Scale className="w-6 h-6 text-[#0047ab]" />
                        </div>
                        <h1 className="text-4xl font-black text-navy-900 font-headline tracking-tight uppercase">Terms of Service</h1>
                    </div>

                    <p className="text-lg text-slate-500 font-light leading-relaxed mb-12 italic border-l-4 border-blue-100 pl-6">
                        Effective Date: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}. <br/>
                        By accessing the Reposys platform, you agree to comply with the following operational protocols.
                    </p>

                    <div className="space-y-12">
                        <section>
                            <div className="flex items-center gap-3 mb-4 text-navy-900">
                                <CheckCircle2 className="w-5 h-5 text-[#0047ab]" />
                                <h2 className="text-xl font-bold font-headline uppercase tracking-tight">Service Agreement</h2>
                            </div>
                            <p className="text-slate-500 font-light leading-relaxed pl-8">
                                Reposys provides digital reprography management for academic purposes. Users are responsible for ensuring that all documents uploaded comply with campus copyright policies and academic integrity standards.
                            </p>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-4 text-navy-900">
                                <FileText className="w-5 h-5 text-[#0047ab]" />
                                <h2 className="text-xl font-bold font-headline uppercase tracking-tight">Order Responsibility & Cancellation</h2>
                            </div>
                            <p className="text-slate-500 font-light leading-relaxed pl-8">
                                <strong>⚠️ Cancellation Notice:</strong> Orders can only be cancelled within 1 minute of placement. After that, cancellation is unavailable. Users are billed based on the parameters specified at the time of digital submission.
                            </p>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-4 text-navy-900">
                                <FileText className="w-5 h-5 text-[#0047ab]" />
                                <h2 className="text-xl font-bold font-headline uppercase tracking-tight">Payment Protocols</h2>
                            </div>
                            <p className="text-slate-500 font-light leading-relaxed pl-8">
                                For Cash on Delivery or Pay at Counter orders, payment must be completed at the counter before any document processing begins.
                            </p>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-4 text-navy-900">
                                <ShieldAlert className="w-5 h-5 text-[#0047ab]" />
                                <h2 className="text-xl font-bold font-headline uppercase tracking-tight">Liability Limitation</h2>
                            </div>
                            <p className="text-slate-500 font-light leading-relaxed pl-8">
                                While we strive for 100% system uptime, Reposys is not liable for production delays caused by hardware failure at the physical node or network interruptions during document transmission.
                            </p>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-4 text-navy-900">
                                <ShieldAlert className="w-5 h-5 text-[#0047ab]" />
                                <h2 className="text-xl font-bold font-headline uppercase tracking-tight">Account Termination</h2>
                            </div>
                            <p className="text-slate-500 font-light leading-relaxed pl-8">
                                We reserve the right to suspend or terminate access for any user found attempting to bypass system security or engage in fraudulent payment activities.
                            </p>
                        </section>
                    </div>

                    <div className="mt-16 pt-12 border-t border-slate-100 text-center">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Saintgits Reposys Legal Division &copy; {new Date().getFullYear()}</p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default TermsOfService;
