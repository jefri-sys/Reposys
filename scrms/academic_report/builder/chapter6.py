def get_chapter6():
    return r"""% =========================================================================
% CHAPTER 6: IMPLEMENTATION AND TESTING
% =========================================================================
\chapter{IMPLEMENTATION AND TESTING}

\section{6.1 IMPLEMENTATION PROCEDURE}
The implementation of REPOSYS translates the architectural specifications into production-grade software across backend services, client interfaces, and native desktop utilities.

\subsection{6.1.1 Codebase Architecture and Directory Layout}
The repository is organised into decoupled, independently maintainable modules:
\begin{itemize}[leftmargin=0.35in, itemsep=2pt]
  \item \texttt{backend/src/}: Express.js application layer comprising \texttt{controllers/}, \texttt{models/}, \texttt{routes/}, \texttt{middleware/}, \texttt{services/}, \texttt{socket/}, and \texttt{utils/}.
  \item \texttt{frontend/src/}: React 19 Single Page Application structured into \texttt{components/}, \texttt{pages/}, \texttt{context/}, \texttt{hooks/}, and \texttt{services/}.
  \item \texttt{print-agent-desktop/}: Electron-based native Windows application managing hardware discovery, signed document downloads, and spooling via \texttt{pdf-to-printer}.
  \item \texttt{selenium-tests/}: Automated quality assurance harness containing end-to-end operational and security test cases.
\end{itemize}

\subsection{6.1.2 Feature Verification and Implementation Matrix}
Table 6.1 documents the implementation status of all 39 audited system features, verified through comprehensive source code inspection.

\begin{table}[H]
\centering
\small
\begin{tabularx}{\textwidth}{|p{0.55in}|p{1.9in}|X|}
\hline
\textbf{Ref} & \textbf{Feature Title} & \textbf{Verified Implementation Status} \\ \hline
C01 & JWT Authentication \& Bcrypt & \textbf{IMPLEMENTED} (Salt factor 12, httpOnly cookies) \\ \hline
C02 & Three-Tier Priority Queue & \textbf{IMPLEMENTED} (Aging deduction, role weights) \\ \hline
C03 & Document Upload \& Analysis & \textbf{IMPLEMENTED} (pdf-lib parsing, blank page detection) \\ \hline
C04 & Document Processing Services & \textbf{IMPLEMENTED} (Print parameters, binding options) \\ \hline
C05 & Document Utility Suite & \textbf{PARTIALLY IMPLEMENTED} (Merge/split functional) \\ \hline
C06 & Multi-Document Orders & \textbf{IMPLEMENTED} (Batch upload, combined estimate) \\ \hline
C07 & Smart Cost Estimation & \textbf{PARTIALLY IMPLEMENTED} (Algorithmic pricing active) \\ \hline
C08 & Payment Gateway \& Receipts & \textbf{IMPLEMENTED} (Razorpay, Wallet, PAC, PDF receipts) \\ \hline
C09 & Order Editing \& Cancellation & \textbf{PARTIALLY IMPLEMENTED} (Cancel in Pending state) \\ \hline
C10 & Real-Time Order Tracking & \textbf{IMPLEMENTED} (Socket.IO timeline progression) \\ \hline
C11 & Partial Order Handling & \textbf{IMPLEMENTED} (Multi-file individual status flags) \\ \hline
C12 & Slot Booking \& Pickup Times & \textbf{IMPLEMENTED} (Custom pickup slot selection) \\ \hline
C13 & Counter Staff Dashboard & \textbf{IMPLEMENTED} (Queue table, status controls, PAC) \\ \hline
C14 & Admin Dashboard & \textbf{IMPLEMENTED} (Tariffs, user roles, system configs) \\ \hline
C15 & Append-Only Audit Trail & \textbf{IMPLEMENTED} (ActivityLog collection logging) \\ \hline
C16 & Inventory Tracker & \textbf{IMPLEMENTED} (Paper/toner stock, low-stock alerts) \\ \hline
C17 & Operational Reporting & \textbf{IMPLEMENTED} (Daily financial summaries, exports) \\ \hline
C18 & Notification System & \textbf{IMPLEMENTED} (In-app alerts, Web Push, Nodemailer) \\ \hline
C19 & Order History \& Invoicing & \textbf{IMPLEMENTED} (PDF generation via pdfkit) \\ \hline
C20 & Complaints \& Real-Time Chat & \textbf{IMPLEMENTED} (Socket.IO complaint chat rooms) \\ \hline
C21 & AI Chatbot Assistant & \textbf{PARTIALLY IMPLEMENTED} (Rule-based FAQ active) \\ \hline
C22 & Search \& System Filtering & \textbf{IMPLEMENTED} (MongoDB regex filtering) \\ \hline
C23 & User Rating \& Feedback & \textbf{IMPLEMENTED} (5-star rating with staff reviews) \\ \hline
C24 & Backup \& Recovery Strategy & \textbf{UNCLEAR} (Cloud database automated snapshots) \\ \hline
C25 & Operating Hours \& Schedule & \textbf{IMPLEMENTED} (Automated IST cron, shop banners) \\ \hline
C26 & Reorder Functionality & \textbf{IMPLEMENTED} (Single-click reorder cloning) \\ \hline
C27 & Document Preview & \textbf{IMPLEMENTED} (Canvas-based PDF page rendering) \\ \hline
C28 & Pickup Verification via OTP & \textbf{IMPLEMENTED} (4-digit numeric code validation) \\ \hline
C29 & Maximum Order Limits & \textbf{IMPLEMENTED} (Page and file-size threshold guards) \\ \hline
C30 & User Profile Management & \textbf{IMPLEMENTED} (Session management, security settings) \\ \hline
C31 & Registration Verification & \textbf{IMPLEMENTED} (Email confirmation link tokens) \\ \hline
C32 & Pay at Counter Lifecycle & \textbf{PARTIALLY IMPLEMENTED} (24h/48h/72h timeout alerts) \\ \hline
C33 & Staff Incident Reports & \textbf{IMPLEMENTED} (Operational malfunction logging) \\ \hline
C34 & Security Controls & \textbf{PARTIALLY IMPLEMENTED} (Helmet, rate limits, CORS) \\ \hline
C35 & Smart Kiosk Mode & \textbf{IMPLEMENTED} (Guest sessions, QR code tracking) \\ \hline
C36 & PWA Architecture & \textbf{PARTIALLY IMPLEMENTED} (Service worker, manifest) \\ \hline
C37 & Friend Chat Subsystem & \textbf{IMPLEMENTED} (Direct/group messaging, media sharing) \\ \hline
C38 & Group Split Requests & \textbf{IMPLEMENTED} (Atomic multi-wallet deductions) \\ \hline
C39 & Desktop Print Agent & \textbf{IMPLEMENTED} (Electron tray, Windows spooler) \\ \hline
\end{tabularx}
\caption{Verified Feature Implementation Matrix across REPOSYS}
\label{tab:feature_matrix}
\end{table}

\section{6.2 TESTING METHODS AND RESULTS}
Quality assurance was executed through the automated Selenium WebDriver test suite, verifying authentication, document flows, payment webhooks, queue sorting, and administrative access controls.

\subsection{6.2.1 Test Suite Execution Summary}
The complete automated test suite was executed against a running staging instance. The generated test execution report (\texttt{scrms\_test\_report.html}) established:
\begin{itemize}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{Total Test Cases Executed:} 120 tests.
  \item \textbf{Passed Tests:} 114 tests (95.0\% passing rate).
  \item \textbf{Failed Tests:} 6 tests (5.0\% failure rate).
  \item \textbf{Errors / Exceptions:} 0 runtime errors.
  \item \textbf{Total Execution Duration:} 7 minutes and 2 seconds.
\end{itemize}

\subsection{6.2.2 Verified Test Cases and Results}
Table 6.2 enumerates representative test cases executed across core subsystem workflows.

\begin{table}[H]
\centering
\small
\begin{tabularx}{\textwidth}{|p{0.55in}|p{1.2in}|X|p{0.6in}|}
\hline
\textbf{Test ID} & \textbf{Feature Area} & \textbf{Condition, Action, and Verified Output} & \textbf{Result} \\ \hline
\textbf{TC-001} & Authentication & Valid student login with correct credentials yields 200 OK and sets secure httpOnly JWT cookie. & \textbf{Passed} \\ \hline
\textbf{TC-002} & Authentication & Login attempt with invalid password returns 401 Unauthorized with generic error message. & \textbf{Passed} \\ \hline
\textbf{TC-003} & Role Guard & Student attempting to navigate to \texttt{/api/admin/*} is intercepted by middleware returning 403 Forbidden. & \textbf{Passed} \\ \hline
\textbf{TC-004} & Role Guard & Staff attempting to access \texttt{/admin} routes is denied access and redirected to staff dashboard. & \textbf{Passed} \\ \hline
\textbf{TC-005} & Role Guard & Administrator credentials grant authenticated access across all administrative and staff endpoints. & \textbf{Passed} \\ \hline
\textbf{TC-006} & File Upload & Uploading valid PDF document extracts correct page count and generates signed Cloudinary URL. & \textbf{Passed} \\ \hline
\textbf{TC-007} & File Upload & Uploading non-document executable (.exe) is rejected by MIME inspection returning 400 Bad Request. & \textbf{Passed} \\ \hline
\textbf{TC-008} & Blank Detection & Uploading PDF with blank pages flags specific page numbers and alerts user in pre-flight dialog. & \textbf{Passed} \\ \hline
\textbf{TC-009} & Cost Calculation & Ordering 10 double-sided B/W pages correctly computes discount ($10 \times 1.50 \times 0.85 = \text{\rupee}12.75$). & \textbf{Passed} \\ \hline
\textbf{TC-010} & Wallet Payment & Order placement with sufficient wallet balance atomically deducts funds and sets status to \texttt{In\_Queue}. & \textbf{Passed} \\ \hline
\textbf{TC-011} & Wallet Deficit & Order placement with insufficient balance prevents debit and prompts user to top up or select Razorpay. & \textbf{Passed} \\ \hline
\textbf{TC-012} & Priority Queue & Faculty order created with base priority 100 is positioned ahead of student order with base priority 200. & \textbf{Passed} \\ \hline
\textbf{TC-013} & Queue Aging & Student order waiting beyond 60 minutes receives 20-point deduction, advancing its relative queue position. & \textbf{Passed} \\ \hline
\textbf{TC-014} & OTP Handover & Counter staff entering valid 4-digit customer OTP successfully transitions order to \texttt{Completed}. & \textbf{Passed} \\ \hline
\textbf{TC-015} & OTP Security & Submitting incorrect OTP prevents handover, returns 400 Error, and retains order in \texttt{ReadyForPickup}. & \textbf{Passed} \\ \hline
\textbf{TC-016} & Shop Scheduler & Visiting order wizard during Sunday closure shows active shop-closed banner and disables checkout. & \textbf{Passed} \\ \hline
\textbf{TC-017} & Print Agent & Desktop agent polls Socket.IO, receives print payload, and invokes \texttt{pdf-to-printer} on default spooler. & \textbf{Passed} \\ \hline
\textbf{TC-018} & Kiosk Mode & Guest session token expires after 2 hours; inactive kiosk terminal automatically logs out after timeout. & \textbf{Passed} \\ \hline
\end{tabularx}
\caption{Representative Automated and Functional Test Results}
\label{tab:test_cases}
\end{table}

\subsection{6.2.3 Analysis of Failed Test Cases and Remediation}
The 6 failing test cases in the test suite were systematically analysed:
\begin{itemize}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{Mobile Wizard Drag-and-Drop (2 failures):} On certain mobile browser viewports, native HTML5 drag-and-drop events failed to trigger the upload handler. \textit{Remediation:} Implemented an explicit fallback file input button with touch listeners.
  \item \textbf{Razorpay Webhook Timing Latency (2 failures):} Under heavy network latency simulation, the webhook notification arrived slightly after the frontend polling timeout. \textit{Remediation:} Added a resilient Socket.IO fallback listener for instant payment confirmation.
  \item \textbf{Print Agent ASAR Test File Extraction (2 failures):} In packaged Electron production builds, \texttt{pdf-to-printer} could not read test files embedded inside the read-only ASAR archive. \textit{Remediation:} Extracted temporary test PDF files to the local user data directory prior to spooler invocation (Git commit \texttt{4fd6368}).
\end{itemize}
"""
