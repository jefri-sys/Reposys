import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ArrowLeft, 
    LifeBuoy, 
    HelpCircle, 
    Search,
    ChevronDown,
    Mail,
    BookOpen
} from 'lucide-react';

const FAQ_DATA = [
  {
    category: "Getting Started",
    items: [
      {
        question: "How do I register?",
        answer: "Click Register on the login page. Fill in your full name, college email address, college ID, department, and select your role — Student or Faculty. After submitting, a verification email will be sent to your college email address. Click the link in that email to verify your account. Until verification is complete you can log in but cannot place orders or upload documents.\n\nIf you did not receive the verification email, check your spam folder. If it is not there, log in and click Resend Verification Email from the banner on your dashboard."
      },
      {
        question: "I forgot my password.",
        answer: "Click Forgot Password on the login page, enter your registered email address, and you will receive a time-limited password reset link. The link expires after 24 hours. If it expires before you use it, repeat the process to receive a new one."
      },
      {
        question: "My account has been deactivated.",
        answer: "Account deactivation is performed by the Administrator. Contact the reprography centre administrator at scrms@saintgits.ac.in for assistance. Your order history and payment records are preserved even when an account is deactivated."
      },
      {
        question: "I am logged in on a device I no longer have access to.",
        answer: "Go to your Profile page and click Logout from All Devices. This immediately invalidates all active sessions across all devices. You will need to log in again on your current device."
      }
    ]
  },
  {
    category: "Placing an Order",
    items: [
      {
        question: "What services are available?",
        answer: "Reposys offers four paid services — Printing, Photocopying, Scanning, and Binding — and one free service: Document Conversion (PDF to Word or Word to PDF). All four paid services enter the processing queue. Document Conversion is instant and does not enter the queue."
      },
      {
        question: "How do I place an order?",
        answer: "All paid services use a 3-step wizard.\n\nStep 1 — Upload your document. Click the upload area or drag and drop your file. Accepted formats are PDF, DOC, DOCX, JPG, and PNG. Maximum file size is 25 MB. After upload, the system automatically detects your page count, checks for blank pages, and checks document quality. This takes approximately 3 to 5 seconds. Review the analysis summary before proceeding.\n\nStep 2 — Configure your order. Select all relevant parameters for your chosen service such as copies, colour, paper size, DPI, and binding type. For Printing and Photocopying, you can optionally enter free-text print instructions — for example: Page 1 colour, pages 2 to 10 black and white. Do not staple. These instructions are shown prominently to counter staff when they process your order. Instructions cannot exceed 500 characters.\n\nStep 3 — Review and pay. The full itemised cost breakdown is shown. If you have a coupon code, enter it here. Choose between online payment via Razorpay (UPI, card, net banking, wallet) or Pay at Counter. Confirm to place your order."
      },
      {
        question: "Can I upload multiple files in one order?",
        answer: "Yes. Multi-document orders are supported, most commonly used for binding jobs and batch printing. Each file is analysed individually and page counts are summed automatically. All files must be within the 25 MB individual file size limit."
      },
      {
        question: "What is the AI cost optimisation suggestion?",
        answer: "If your document has a mix of colour-heavy pages and text-only pages, the system may suggest printing colour pages in colour and text pages in black and white, and show the estimated saving. Click Apply to use the suggestion, or ignore it and proceed with your original settings."
      },
      {
        question: "My document was flagged for blank pages or quality issues. Can I still proceed?",
        answer: "Yes. All AI analysis warnings are informational only. You can proceed with your order regardless. The warnings are shown so you can make an informed decision before paying, not to block your order."
      },
      {
        question: "What are the order size limits?",
        answer: "Default limits are 500 pages and 10 copies per order for Printing and Photocopying, 100 pages for Scanning, and 5 sets (up to 500 pages per set) for Binding. If your order exceeds these limits, the Proceed button will be disabled with a message explaining the limit. Contact the administrator at scrms@saintgits.ac.in for bulk arrangements."
      }
    ]
  },
  {
    category: "Tracking Your Order",
    items: [
      {
        question: "How do I track my order?",
        answer: "Go to My Orders from your dashboard. Click any order to see its full status timeline with timestamps and the actor who made each change. While your order is In Queue, your current queue position and estimated wait time are shown and update in real time — you do not need to refresh the page."
      },
      {
        question: "What do the order statuses mean?",
        answer: "Pending means the order was placed but payment has not yet been confirmed. In Queue means payment is confirmed and the order is waiting to be processed. Processing means counter staff has started your job. Ready for Pickup means your output is ready at the counter. Completed means you have collected your order. Cancelled means the order was cancelled by you, staff, or admin. Partial means the job was partially completed due to equipment failure. Expired means a Pay at Counter order was not collected and paid within 48 hours. Uncollected means a paid order was not collected within 72 hours. Payment Disputed means the amount was disputed at the counter and the order is under admin review."
      },
      {
        question: "What is my token number?",
        answer: "Every confirmed order is assigned a formatted token number — PR1001 for Printing, SC1001 for Scanning, PH1001 for Photocopying, BD1001 for Binding. Your token number is shown on the order tracking page, in notifications, and on your digital receipt. Present your token number at the counter when collecting."
      },
      {
        question: "How is the estimated wait time calculated?",
        answer: "The estimated wait time is calculated by summing the processing duration of every order currently ahead of yours in the same service queue. It is not an average — it reflects the actual workload ahead of your order. It updates in real time whenever an order ahead of you is completed, cancelled, or repositioned."
      }
    ]
  },
  {
    category: "Payments and Receipts",
    items: [
      {
        question: "What payment methods are available?",
        answer: "Online payment via Razorpay supports UPI, debit card, credit card, net banking, and mobile wallets. You can also choose Pay at Counter to pay in cash when you collect your order."
      },
      {
        question: "My payment failed partway through. What happens?",
        answer: "Your order is held in payment-pending status for 15 minutes. A Retry Payment button will appear on the order page. You can attempt payment again without re-entering your order details. You will receive a 2-minute warning notification before the hold expires. If payment is not completed within 15 minutes, the order is automatically cancelled and you will be notified."
      },
      {
        question: "How do I apply a coupon code?",
        answer: "Enter your coupon code in the coupon field at Step 3 of the order wizard before confirming. The cost breakdown will update immediately to reflect the discount. Coupons cannot be applied after an order is confirmed."
      },
      {
        question: "How do I get my receipt?",
        answer: "After a successful payment, a digital receipt is immediately available for download. For any completed order, go to My Orders, click the order, and click Download Receipt. The receipt is a formatted PDF containing your order ID, token number, service specifications, cost breakdown, payment method, transaction ID, and timestamp."
      },
      {
        question: "How do refunds work?",
        answer: "If you cancel an online-paid order before processing begins, the refund is initiated automatically through Razorpay. Refund processing time is typically 5 to 7 business days depending on your payment method, and is determined by Razorpay, not Reposys. You will receive in-app notifications as the refund status progresses through Initiated, Processing, and Completed stages. For cash payments, refunds are handled manually — contact the administrator."
      }
    ]
  },
  {
    category: "Collecting Your Order",
    items: [
      {
        question: "How does pickup verification work?",
        answer: "When your order is Ready for Pickup, a 4-digit OTP is sent to your registered email address and as an in-app notification. Present this OTP to the counter staff member when you arrive. The staff member enters it to verify your identity and mark your order as Completed. The OTP is valid for 24 hours. If it expires, you can request a new one from the order tracking page, which invalidates the previous OTP."
      },
      {
        question: "I have a Pay at Counter order. What do I bring?",
        answer: "Bring your token number (visible on your order tracking page and in your notification) and the payment amount shown on your order. The counter staff will collect your payment and verify your OTP in one step."
      },
      {
        question: "My order has been ready for a long time and I cannot collect it.",
        answer: "If a Pay at Counter order is not collected and paid within 48 hours, it will be automatically expired. If an online-paid order is not collected within 72 hours, it will be marked Uncollected. In both cases, contact the administrator at scrms@saintgits.ac.in. For uncollected online-paid orders, the administrator will determine whether a refund is applicable."
      }
    ]
  },
  {
    category: "Editing and Cancelling Orders",
    items: [
      {
        question: "Can I change my order after placing it?",
        answer: "Yes, up until a counter staff member clicks Start Processing on your order. Once processing begins, the order is locked. To edit an In Queue order, go to My Orders, click the order, and use the edit option."
      },
      {
        question: "Can I cancel my order?",
        answer: "Yes, up until processing begins. For online-paid orders, cancellation triggers an automatic refund through Razorpay. For Pay at Counter orders, no charge applies."
      }
    ]
  },
  {
    category: "Document Tools",
    items: [
      {
        question: "What free tools are available?",
        answer: "The Document Tools page, accessible from the main navigation, provides four free utilities available to all registered users at any time. PDF to Word / Word to PDF performs instant document format conversion. Image Resize changes image dimensions to specific pixel values and supports JPG, PNG, and WEBP. Image Compress reduces file size by setting an output quality percentage and supports JPG, PNG, and WEBP. PDF Page Resize scales all PDF pages to A4, A3, Legal, or custom dimensions.\n\nAll Document Tools processing is instant. Files are not stored — they are processed on the server and immediately returned to you for download. Maximum file size is 25 MB."
      },
      {
        question: "How do I convert a document?",
        answer: "On the Document Tools page, select the conversion you need, upload your file, and click Convert. The output file is available for download immediately. No payment, no queue, no token."
      }
    ]
  },
  {
    category: "Notifications",
    items: [
      {
        question: "Where do I see my notifications?",
        answer: "Click the bell icon in the navigation bar. A badge shows your unread count. The dropdown shows your five most recent notifications. For the full notification history, click View All to open the Notifications History page, where you can mark items as read or delete individual entries."
      },
      {
        question: "What events trigger notifications?",
        answer: "You will receive notifications for: order confirmed (with token number and queue position), order In Processing, order Ready for Pickup (with OTP), order cancelled (with reason if provided), payment retry window expiring (2-minute warning), and when a complaint you raised receives a reply or status change."
      }
    ]
  },
  {
    category: "Complaints",
    items: [
      {
        question: "How do I raise a complaint?",
        answer: "Go to My Orders, click the order the complaint relates to, and click Raise a Complaint. Select a category — Print Quality, Binding Quality, Wrong Output, Delay, Payment Issue, or Other — describe the issue, and optionally attach a photo or file as evidence. On submission, a unique complaint token (CMP1001, CMP1002, etc.) is assigned and counter staff and the administrator are notified."
      },
      {
        question: "How do I track my complaint?",
        answer: "Go to My Complaints from the navigation menu. Each complaint shows its token, category, current status, and the full message thread. You can send additional messages at any time. If your complaint is marked Resolved, you have 48 hours to reopen it if the issue was not adequately addressed."
      }
    ]
  },
  {
    category: "Guest Sessions",
    items: [
      {
        question: "Can I use Reposys without registering?",
        answer: "Yes. Click Use as Guest on the homepage. Enter your email address and you will receive a 6-digit OTP. Enter the OTP to start a guest session. You can upload documents, use the full AI analysis, configure any service, and place an order — with cash payment at the counter.\n\nGuest sessions do not support online payment, order history from previous sessions, the document library, complaint raising, or Faculty priority."
      },
      {
        question: "I closed the browser after placing a guest order. Can I still track it?",
        answer: "Yes. Click Use as Guest again, enter the same email address, and complete OTP verification. Your active guest session and order status screen will be restored. This works only while your guest session is still active. Completed or expired guest sessions cannot be re-accessed."
      },
      {
        question: "How will I receive notifications as a guest?",
        answer: "All order lifecycle notifications — confirmation, processing started, ready for pickup (including your OTP), and cancellation — are sent to the email address you used to authenticate your guest session. You will not receive in-app notifications. If you keep your browser tab open after placing your order, live queue position and wait time updates are visible on the order confirmation screen."
      }
    ]
  }
];

const TechnicalHelp = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(FAQ_DATA[0].category);
    const [activeFaqIndex, setActiveFaqIndex] = useState(null);

    const categories = useMemo(() => FAQ_DATA.map(cat => cat.category), []);

    const filteredResults = useMemo(() => {
        if (!searchQuery.trim()) {
            return FAQ_DATA.find(cat => cat.category === selectedCategory)?.items || [];
        }
        
        const results = [];
        const query = searchQuery.toLowerCase();
        FAQ_DATA.forEach(cat => {
            cat.items.forEach(item => {
                if (item.question.toLowerCase().includes(query) || item.answer.toLowerCase().includes(query)) {
                    results.push(item);
                }
            });
        });
        return results;
    }, [searchQuery, selectedCategory]);

    const handleCategoryClick = (category) => {
        setSearchQuery('');
        setSelectedCategory(category);
        setActiveFaqIndex(null);
    };

    return (
        <div className="bg-[#f8fafc] min-h-screen font-body text-slate-700 p-6 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#0047ab] to-[#001d3d]"></div>
            
            <div className="max-w-6xl mx-auto relative z-10">
                <Link to="/" className="inline-flex items-center gap-2 text-[#0047ab] font-bold mb-8 md:mb-12 hover:gap-3 transition-all">
                    <ArrowLeft className="w-5 h-5" />
                    <span>Back to Home</span>
                </Link>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[2.5rem] md:rounded-[3rem] border border-slate-100 shadow-2xl shadow-blue-500/5 overflow-hidden"
                >
                    <div className="p-8 md:p-12 bg-blue-50/50 border-b border-blue-100/70">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-blue-100 shrink-0">
                                    <LifeBuoy className="w-7 h-7 text-[#0047ab]" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-black text-slate-900 font-headline tracking-tight uppercase leading-none">Technical Help</h1>
                                    <div className="flex items-center gap-2 mt-2">
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Support Portal Online</span>
                                    </div>
                                </div>
                            </div>

                            <div className="relative w-full md:w-80">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                                    <Search className="w-4 h-4" />
                                </span>
                                <input 
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search help topics..."
                                    className="w-full pl-11 pr-4 py-3 bg-white rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0047ab] transition-all"
                                />
                            </div>
                        </div>
                        <p className="text-lg text-slate-500 font-light leading-relaxed">
                            Find detailed procedures, requirements, and answers for all Reposys Campus Reprography features.
                        </p>
                    </div>

                    <div className="flex flex-col lg:flex-row min-h-[500px]">
                        {!searchQuery && (
                            <div className="lg:w-1/4 bg-slate-50/50 border-r border-slate-100 p-6 flex lg:flex-col overflow-x-auto lg:overflow-x-visible gap-2 shrink-0 scrollbar-none">
                                {categories.map((category) => (
                                    <button
                                        key={category}
                                        onClick={() => handleCategoryClick(category)}
                                        className={`px-4 py-3.5 rounded-xl font-bold text-[11px] uppercase tracking-wider text-left transition-all shrink-0 ${
                                            selectedCategory === category 
                                            ? 'bg-[#0047ab] text-white shadow-md' 
                                            : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-100'
                                        }`}
                                    >
                                        {category}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="flex-grow p-6 md:p-10">
                            <div className="flex items-center gap-3 mb-8">
                                <BookOpen className="w-5 h-5 text-[#0047ab]" />
                                <h2 className="text-xl font-bold font-headline uppercase tracking-tight text-slate-800">
                                    {searchQuery ? `Search Results (${filteredResults.length})` : selectedCategory}
                                </h2>
                            </div>

                            {filteredResults.length === 0 ? (
                                <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                                    <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                    <h4 className="text-lg font-bold text-slate-700 font-headline mb-1">No matching topics found</h4>
                                    <p className="text-sm text-slate-400 font-light max-w-xs mx-auto">Try checking your spelling or search for general terms like 'payment' or 'order'.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <AnimatePresence mode="popLayout">
                                        {filteredResults.map((faq, index) => {
                                            const isActive = activeFaqIndex === index;
                                            return (
                                                <motion.div
                                                    layout
                                                    key={faq.question}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className={`border rounded-2xl overflow-hidden bg-white transition-all duration-300 ${isActive ? 'border-blue-200 shadow-md shadow-blue-500/5' : 'border-slate-100 hover:border-blue-100 shadow-sm'}`}
                                                >
                                                    <button
                                                        onClick={() => setActiveFaqIndex(isActive ? null : index)}
                                                        className="w-full px-6 py-5 flex justify-between items-center text-left"
                                                    >
                                                        <span className={`font-bold text-sm tracking-tight pr-4 leading-snug ${isActive ? 'text-[#0047ab]' : 'text-slate-800'}`}>
                                                            {faq.question}
                                                        </span>
                                                        <ChevronDown className={`w-5 h-5 shrink-0 transition-transform duration-300 ${isActive ? 'rotate-180 text-[#0047ab]' : 'text-slate-400'}`} />
                                                    </button>
                                                    <AnimatePresence>
                                                        {isActive && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                className="px-6 pb-6"
                                                            >
                                                                <div className="pt-4 text-slate-600 font-light text-sm leading-relaxed border-t border-slate-100 whitespace-pre-line">
                                                                    {faq.answer}
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-6 md:p-10 bg-slate-50 border-t border-slate-100/70">
                        <div className="bg-[#001d3d] p-8 md:p-10 rounded-[2rem] text-white flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-xl">
                            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full -mr-40 -mt-40 blur-3xl"></div>
                            
                            <div className="flex items-center gap-6 relative z-10">
                                <div className="w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 shrink-0">
                                    <Mail className="w-6 h-6 text-[#0047ab]" />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-xl font-black font-headline uppercase mb-1">Still Need Help?</h3>
                                    <p className="text-sm text-blue-100/70 font-light leading-relaxed max-w-lg">
                                        Contact support at <strong className="text-white font-bold">scrms@saintgits.ac.in</strong> with your token number. <br/>
                                        For urgent issues, speak to counter staff at the reprography centre.
                                    </p>
                                </div>
                            </div>
                            
                            <Link to="/contact" className="w-full md:w-auto px-8 py-4 bg-[#0047ab] text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#00327d] transition-all shadow-lg active:scale-95 text-center shrink-0 relative z-10">
                                Contact Support
                            </Link>
                        </div>
                    </div>

                    <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Saintgits College of Engineering &copy; {new Date().getFullYear()}</p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default TechnicalHelp;
