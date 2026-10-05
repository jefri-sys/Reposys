import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

const PrivacyProtocol = () => {
    return (
        <div className="bg-[#f8fafc] min-h-screen font-body text-slate-700 p-8 md:p-16">
            <div className="max-w-4xl mx-auto">
                <Link to="/" className="inline-flex items-center gap-2 text-[#0047ab] font-bold mb-12 hover:gap-3 transition-all">
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
                            <ShieldCheck className="w-6 h-6 text-[#0047ab]" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-navy-900 font-headline tracking-tight uppercase">Privacy Policy</h1>
                            <p className="text-sm text-slate-500 font-medium mt-1">Effective & Last Updated: 23 May 2026</p>
                        </div>
                    </div>

                    <div className="space-y-10 text-slate-600 font-light leading-relaxed">
                        <section>
                            <h2 className="text-xl font-bold text-navy-900 font-headline uppercase tracking-tight mb-3">1. Who We Are</h2>
                            <p>Reposys (Reposys Campus Reprography Automation System) is operated by Saintgits College of Engineering, Pathamuttom, Kottayam, Kerala, India. References to "we", "us", or "our" in this document refer to Saintgits College of Engineering acting as the operator of Reposys.</p>
                            <p className="mt-2">For any privacy-related queries, contact us at: <a href="mailto:scrms@saintgits.ac.in" className="text-[#0047ab] font-medium hover:underline">scrms@saintgits.ac.in</a></p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-navy-900 font-headline uppercase tracking-tight mb-3">2. Who This Policy Applies To</h2>
                            <p>This policy applies to all persons who access or use Reposys, including registered students and teaching faculty of Saintgits College of Engineering, counter staff accounts created by the system administrator, and guest users who access the system via the Kiosk Mode guest session without registering.</p>
                            <p className="mt-2">All users are expected to be 18 years of age or older. Reposys is an internal campus platform and is not directed at minors.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-navy-900 font-headline uppercase tracking-tight mb-3">3. What Data We Collect</h2>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-bold text-slate-800">3.1 Account Registration Data</h3>
                                    <p>When you register, we collect your full name, college email address, college ID number, department, role (Student or Faculty), and optionally your phone number. Passwords are never stored in plain text — they are hashed using Bcrypt with a salt factor of 12 before storage.</p>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">3.2 Order and Service Data</h3>
                                    <p>When you place an order we collect your chosen service parameters (service type, page count, copies, colour preference, paper size, binding type, print instructions, preferred pickup slot), the documents you upload, the token number assigned to your order, and a complete timestamped status history of your order from placement to completion.</p>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">3.3 Payment Data</h3>
                                    <p>Online payments are processed exclusively by Razorpay. Reposys never receives, stores, or has access to your card number, UPI PIN, net banking credentials, or wallet credentials. What Reposys stores is: the Razorpay order ID, Razorpay payment ID, payment method category (UPI / card / net banking / wallet / cash), payment amount, payment status, and timestamp. For Pay at Counter orders we store a cash-pending flag and the staff member's confirmation of collection.</p>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">3.4 Uploaded Documents</h3>
                                    <p>Documents you upload for printing, photocopying, scanning, or binding are stored on Cloudinary, a cloud storage service, under access-controlled signed URLs. Only you, counter staff, and the administrator can access your document URLs. Documents attached to orders are retained for the lifetime of the order record. Documents saved to your personal document library are retained until you delete them or your account is deactivated.</p>
                                    <p className="mt-2 text-sm italic">Documents uploaded through the free Document Tools utility (resize, compress, convert) are processed on the server and immediately deleted after your download. They are never stored on Cloudinary.</p>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">3.5 Complaint and Chat Data</h3>
                                    <p>If you raise a complaint, we store the complaint description, category, status history, and all messages exchanged in the complaint chat thread. File or image attachments sent in complaint threads are stored on Cloudinary under the complaint reference.</p>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">3.6 Notification History</h3>
                                    <p>We store a permanent record of every in-app notification sent to your account, including the event that triggered it, the message content, and your read status.</p>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">3.7 AI Chatbot Interactions</h3>
                                    <p>The AI chatbot is powered by Google's Gemini API. Your queries are sent to the Gemini API to generate responses. No conversation history is stored between sessions. Each query is stateless. You should not submit sensitive personal information through the chatbot.</p>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">3.8 Session and Security Data</h3>
                                    <p>We store session tokens (in httpOnly cookies), login event logs including IP address, timestamp, user agent, and outcome (success or failure), and active session information (device type and last active timestamp) accessible from your profile page.</p>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">3.9 Guest Session Data</h3>
                                    <p>Guest users authenticate via email OTP. We store the guest's email address, the guest session ID, the order record, payment record, and document references created during the session. These records are retained permanently for audit and financial reporting purposes and are accessible only to admin and counter staff. Guest users cannot access their session records after the session ends.</p>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">3.10 Activity and Audit Log Data</h3>
                                    <p>All sensitive administrative and staff actions — pricing changes, inventory updates, queue overrides, refund initiations, account changes — are recorded in an append-only audit log. These logs are accessible only to the administrator and cannot be modified or deleted.</p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-navy-900 font-headline uppercase tracking-tight mb-3">4. How We Use Your Data</h2>
                            <p>We use the data we collect for the following purposes:</p>
                            <ul className="list-disc pl-6 space-y-2 mt-3">
                                <li>To create and manage your account and verify your identity at login.</li>
                                <li>To process your service orders, calculate costs, assign queue positions, and track order status.</li>
                                <li>To send you order lifecycle notifications including confirmation, processing updates, ready for pickup alerts, OTP delivery, and cancellation notices.</li>
                                <li>To process and verify your payments and issue digital receipts.</li>
                                <li>To run AI document analysis — page count detection, blank page detection, and quality checks — on your uploaded files.</li>
                                <li>To provide real-time queue position and estimated wait time updates.</li>
                                <li>To operate the complaint and messaging system.</li>
                                <li>To generate reports and analytics for administrative use, aggregated and by department.</li>
                                <li>To enforce order size limits, coupon validity, and operating hours rules.</li>
                                <li>To maintain security audit logs and detect fraudulent or abnormal activity.</li>
                                <li>To forecast inventory demand and generate staff performance reports.</li>
                                <li>To comply with applicable Indian law.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-navy-900 font-headline uppercase tracking-tight mb-3">5. Third-Party Services We Use</h2>
                            <p>Reposys integrates with the following third-party services. Each has its own privacy policy that governs how they handle data passed to them.</p>
                            <ul className="list-disc pl-6 space-y-2 mt-3">
                                <li><strong>Razorpay</strong> handles payment processing. Order amount and user details for the payment flow are sent to Razorpay.</li>
                                <li><strong>Cloudinary</strong> handles cloud file storage and receives your uploaded documents and complaint attachments.</li>
                                <li><strong>Google Gemini API</strong> powers the AI chatbot and receives your chatbot query text.</li>
                                <li><strong>MongoDB Atlas</strong> hosts the database and stores all structured application data.</li>
                                <li><strong>Nodemailer</strong> and the associated email provider handle email notifications and OTP delivery, and receive your email address and notification content.</li>
                            </ul>
                            <p className="mt-4 text-sm font-semibold text-slate-700">Card details, UPI credentials, and banking information are handled exclusively by Razorpay and never pass through Reposys servers.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-navy-900 font-headline uppercase tracking-tight mb-3">6. Data Retention</h2>
                            <p>Account data is retained while your account exists. Deactivated accounts retain data but block login. Order records are permanent and cannot be deleted by any user. Payment records are permanent, including failed and refunded transactions. Documents attached to orders are retained for the lifetime of the order record. Documents in your personal library are retained until you delete them or your account is deactivated. Files processed through Document Tools are deleted immediately after download. Notification history is permanent unless individually deleted by the user. Complaint records and chat are permanent. Activity and audit logs are permanent, append-only, and cannot be deleted. Guest session order records are permanent and accessible to admin and staff only. Session tokens are cleared on logout or expiry.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-navy-900 font-headline uppercase tracking-tight mb-3">7. Data Security</h2>
                            <p>We implement the following security measures to protect your data:</p>
                            <ul className="list-disc pl-6 space-y-2 mt-3">
                                <li>Passwords are hashed using Bcrypt with a salt factor of 12 — plain text passwords are never stored.</li>
                                <li>JWT session tokens are stored in httpOnly cookies, inaccessible to browser-side JavaScript.</li>
                                <li>All API communication uses HTTPS and HTTP is redirected.</li>
                                <li>Cloudinary document URLs are signed and time-limited — unsigned access is rejected.</li>
                                <li>Razorpay payment confirmations are verified using HMAC-SHA256 signature comparison on our server.</li>
                                <li>File uploads are validated by actual MIME type, not file extension.</li>
                                <li>Rate limiting is applied to authentication and OTP endpoints.</li>
                                <li>MongoDB Atlas is configured to accept connections only from the application server's IP address.</li>
                                <li>All administrative and staff actions are logged in an append-only audit trail.</li>
                            </ul>
                            <p className="mt-4 text-sm text-slate-500">No system is completely immune to security risks. In the event of a data breach that affects your personal data, we will take appropriate steps in accordance with applicable Indian law.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-navy-900 font-headline uppercase tracking-tight mb-3">8. Your Rights</h2>
                            <p>Under the Digital Personal Data Protection Act 2023 (DPDP Act) and the Information Technology Act 2000, you have the following rights regarding your personal data:</p>
                            <ul className="list-disc pl-6 space-y-2 mt-3">
                                <li><strong>Right to access:</strong> You can view your personal information, order history, payment history, and notification history from your account at any time.</li>
                                <li><strong>Right to correction:</strong> You can update your name, department, and phone number from your profile page. Email changes require re-verification. College ID and role changes require administrator action.</li>
                                <li><strong>Right to withdraw consent:</strong> You may request account deactivation by contacting the administrator. Deactivated accounts cannot log in, but order and payment records are retained permanently for audit and legal compliance purposes.</li>
                                <li><strong>Right to grievance redressal:</strong> You may raise concerns about how your data is handled by contacting us at scrms@saintgits.ac.in.</li>
                            </ul>
                            <p className="mt-4 text-sm italic text-slate-500">Because Reposys is an internal institutional platform and order and payment records serve financial and audit purposes, we are not able to delete individual transaction records on request.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-navy-900 font-headline uppercase tracking-tight mb-3">9. Cookies</h2>
                            <p>Reposys uses a single httpOnly session cookie to store your JWT authentication token. This cookie is strictly necessary for the application to function. It is not used for advertising or tracking purposes. No third-party tracking cookies are placed by Reposys.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-navy-900 font-headline uppercase tracking-tight mb-3">10. Governing Law</h2>
                            <p>This Privacy Policy is governed by the laws of India, including the Information Technology Act 2000, the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules 2011, and the Digital Personal Data Protection Act 2023. Any disputes arising from this policy shall be subject to the jurisdiction of courts in Kottayam, Kerala, India.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-navy-900 font-headline uppercase tracking-tight mb-3">11. Changes to This Policy</h2>
                            <p>We may update this Privacy Policy from time to time. When we do, the Last Updated date at the top of this page will change. Continued use of Reposys after a policy update constitutes acceptance of the revised policy. For significant changes, we will send an in-app notification to registered users.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-navy-900 font-headline uppercase tracking-tight mb-3">12. Contact</h2>
                            <p>Email: <a href="mailto:scrms@saintgits.ac.in" className="text-[#0047ab] font-medium hover:underline">scrms@saintgits.ac.in</a></p>
                            <p>Address: Saintgits College of Engineering, Pathamuttom, Kottayam, Kerala — 686 532, India</p>
                        </section>

                    </div>

                    <div className="mt-16 pt-12 border-t border-slate-100 text-center">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Saintgits Reposys Security Division &copy; {new Date().getFullYear()}</p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default PrivacyProtocol;
