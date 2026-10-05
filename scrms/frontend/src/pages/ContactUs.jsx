import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Mail,
    Building2,
    FileCheck,
    ArrowLeft,
    Sparkles,
    Send
} from 'lucide-react';
import api from '../services/api';

const ContactUs = () => {
    const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
    const [contactLoading, setContactLoading] = useState(false);
    const [contactSuccess, setContactSuccess] = useState('');
    const [contactError, setContactError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setContactLoading(true);
        setContactError('');
        try {
            const response = await api.post('/contact', contactForm);
            setContactSuccess(response.data.message);
            setContactForm({ name: '', email: '', subject: '', message: '' });
        } catch (err) {
            setContactError(err.response?.data?.message || 'Failed to transmit message.');
        } finally {
            setContactLoading(false);
        }
    };

    return (
        <div className="bg-[#f8fafc] min-h-screen font-body text-slate-700 selection:bg-blue-100 p-8 md:p-16 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl -mr-32 -mt-32"></div>

            {/* Back to Home Link */}
            <div className="max-w-screen-xl mx-auto mb-12 relative z-10">
                <Link to="/" className="inline-flex items-center gap-2 text-[#0047ab] font-bold hover:gap-3 transition-all group">
                    <ArrowLeft className="w-5 h-5" />
                    <span>Back to Home</span>
                </Link>
            </div>

            {/* Contact Protocol Section */}
            <main className="max-w-screen-xl mx-auto relative z-10">
                <div className="flex flex-col lg:flex-row gap-20 items-start">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:w-1/2 text-left"
                    >
                        <h1 className="font-headline text-5xl md:text-6xl font-black text-[#001d3d] mb-8 tracking-tighter leading-[1.1]">
                            Support & <br /> <span className="text-[#0047ab]">Inquiries</span>
                        </h1>
                        <p className="text-slate-500 text-lg leading-relaxed mb-12 font-light max-w-md">
                            Have questions or need assistance? Our specialized support team is here to help you navigate your document workflow.
                        </p>

                        <div className="space-y-10">
                            <div className="flex items-start gap-6 group">
                                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100 group-hover:bg-[#0047ab] group-hover:text-white transition-all duration-300">
                                    <Mail className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-[#001d3d] mb-1 font-headline">Digital Transmission</h4>
                                    <p className="text-slate-500 text-sm font-light">Direct support via our secured inquiry channel.</p>
                                    <p className="text-[#0047ab] font-bold text-sm mt-2 tracking-wide">scrms@saintgits.ac.in</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-6 group">
                                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100 group-hover:bg-[#0047ab] group-hover:text-white transition-all duration-300">
                                    <Building2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-[#001d3d] mb-1 font-headline">Campus Node</h4>
                                    <p className="text-slate-500 text-sm font-light pr-4">Saintgits College of Engineering, Pathamuttom, Kottayam, Kerala — 686 532, India</p>
                                    <p className="text-[#0047ab] font-bold text-sm mt-2 uppercase tracking-wide">Reprography Centre</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:w-1/2 w-full"
                    >
                        <div className="rounded-[2.5rem] border border-slate-100 bg-white p-8 md:p-12 shadow-2xl shadow-blue-500/10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-50 rounded-full -mr-24 -mt-24 blur-3xl"></div>

                            {contactSuccess ? (
                                <div className="text-center py-12 animate-in zoom-in duration-500">
                                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <FileCheck className="w-10 h-10" />
                                    </div>
                                    <h3 className="text-3xl font-black text-navy-900 mb-4 font-headline tracking-tighter">Transmission Successful</h3>
                                    <p className="text-slate-500 font-light mb-10 max-w-xs mx-auto">{contactSuccess}</p>
                                    <button
                                        onClick={() => setContactSuccess('')}
                                        className="px-10 py-4 bg-[#0047ab] text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-[#00327d] transition-all shadow-lg"
                                    >
                                        Send Another Message
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Full Name</label>
                                            <input
                                                type="text"
                                                required
                                                value={contactForm.name}
                                                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}

                                                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#0047ab] transition-all font-light"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Email Address</label>
                                            <input
                                                type="email"
                                                required
                                                value={contactForm.email}
                                                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}

                                                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#0047ab] transition-all font-light"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Service Inquiry</label>
                                        <input
                                            type="text"
                                            required
                                            value={contactForm.subject}
                                            onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                                            placeholder="Subject Matter"
                                            className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#0047ab] transition-all font-light"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Message</label>
                                        <textarea
                                            rows="5"
                                            required
                                            value={contactForm.message}
                                            onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                                            placeholder="Detailed Protocol"
                                            className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#0047ab] transition-all resize-none font-light"
                                        ></textarea>
                                    </div>

                                    {contactError && (
                                        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl border border-red-100 animate-in fade-in">
                                            <span className="text-xs font-bold">{contactError}</span>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={contactLoading}
                                        className="w-full py-5 bg-[#0047ab] text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-[#00327d] transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-3"
                                    >
                                        {contactLoading ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                Transmitting...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-4 h-4" />
                                                Send Message
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>
                    </motion.div>
                </div>
            </main>
        </div>
    );
};

export default ContactUs;
