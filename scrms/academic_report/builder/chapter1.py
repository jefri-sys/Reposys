def get_chapter1():
    return r"""% =========================================================================
% CHAPTER 1: INTRODUCTION
% =========================================================================
\clearpage
\pagenumbering{arabic}
\setcounter{page}{1}

\chapter{INTRODUCTION}

\section{1.1 INTRODUCTION}
In contemporary tertiary educational institutions, academic reprography and document management centres represent indispensable utility hubs. Every working day, students, research scholars, teaching faculty, and administrative personnel generate substantial demands for printing lecture notes, laboratory observation manuals, seminar presentations, dissertations, project documentation, question papers, and institutional circulars. Despite rapid campus digitisation across learning management systems (LMS) and enterprise resource planning (ERP) portals, the reprography service tier has remained an acute operational bottleneck, heavily entrenched in legacy manual practices.

In the conventional manual operating model, students are required to physically travel to the campus reprography centre, often enduring long queues during morning peak hours and pre-examination submission deadlines. Submitting electronic files frequently relies on unstandardised, insecure workarounds: students either transfer documents using uninspected USB flash drives---introducing significant malware vectors into counter workstations---or transmit files over consumer messaging platforms such as WhatsApp or Telegram. These manual practices give rise to critical vulnerabilities:
\begin{enumerate}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{Privacy Infringement and Data Exposure:} Submitting personal assignment files, identity cards, or research papers over personal mobile messaging channels exposes phone numbers and personal documents to counter staff and third-party chat databases without institutional access auditing.
  \item \textbf{Physical Counter Congestion:} Students must remain physically co-located at the reprography counter throughout the entire processing duration---from file retrieval and configuration to printing, binding, and billing---resulting in lobby overcrowding and lost instructional time.
  \item \textbf{Transaction and Billing Inefficiencies:} Cash-based counter transactions encounter persistent friction due to shortages of low-denomination physical currency notes and coins. Manual calculation of complex multi-page, double-sided, and binding combinations frequently results in billing inaccuracies and revenue leakage.
  \item \textbf{Paper Waste and Abandoned Output:} Due to communication disconnects, print operators frequently print jobs that users subsequently fail to collect, or produce incorrect orientations and color modes, leading to high volumes of abandoned paper waste and unrecoverable toner expenditure.
  \item \textbf{Absence of Prioritisation for Academic Emergencies:} Urgent examination-related printing requisitions from academic faculty are subjected to identical physical First-In, First-Out (FIFO) queue bottlenecks alongside routine student printouts, compromising institutional timeliness.
\end{enumerate}

To decisively resolve these systemic challenges, \textbf{REPOSYS (Reprography Automation System)} was conceptualised, designed, and implemented as a comprehensive, cloud-native web platform and hardware-interfaced automation ecosystem. Developed as an Integrated Master of Computer Applications (IMCA) capstone initiative at Saintgits College of Engineering (Autonomous), REPOSYS bridges academic document creators, reprography staff, institutional administrators, and physical printing machinery through an auditable, cashless, and highly responsive operational framework.

REPOSYS leverages modern software engineering standards, employing a three-tier role-based operational architecture built on the MongoDB, Express.js, React 19, and Node.js (MERN) stack. It incorporates cloud object storage via Cloudinary, secure cryptographic transaction validation with Razorpay and internal digital wallets, bi-directional event distribution via Socket.IO, an automated Progressive Web App (PWA) client, and an autonomous desktop Print Agent communicating with Windows spooler sub-systems.

\section{1.2 OBJECTIVES OF THE PROJECT}
The overarching mission of REPOSYS is to replace error-prone, manual campus document handling with a modern, dependable, and user-centric digital reprography platform. To realise this vision, the engineering objectives are classified across four functional domains:

\subsection{1.2.1 Operational and Workflow Objectives}
\begin{enumerate}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{Decoupled Document Submission:} To enable authenticated campus users and temporary kiosk guests to upload documents remotely from any browser, smartphone, or terminal, eliminating physical presence during job queuing.
  \item \textbf{Automated Document Analysis and Pre-flight Inspection:} To implement automated server-side file analysis that extracts page counts, detects color profiles, validates MIME signatures, and identifies blank pages prior to job confirmation, eliminating user error and incorrect billing.
  \item \textbf{Dynamic Priority Queue Scheduling:} To establish an equitable, multi-factor priority queue engine that balances urgent faculty requirements against student fairness through an automated aging deduction algorithm, preventing job starvation.
  \item \textbf{Secure Two-Factor Physical Handover:} To implement One-Time Password (OTP) verification and QR-based collection mechanisms at the counter, ensuring that documents are delivered exclusively to authorised owners.
\end{enumerate}

\subsection{1.2.2 Financial and Transactional Objectives}
\begin{enumerate}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{Unified Multi-Modal Payments:} To support online UPI/Card transactions via Razorpay, an internal pre-funded student digital wallet with ACID guarantees, and regulated Pay at Counter (PAC) cash workflows.
  \item \textbf{Collaborative Cost Sharing:} To provide an integrated split-payment mechanism enabling group members to disburse printing costs for shared academic projects atomically across individual student wallets.
  \item \textbf{Automated Financial Ledgering and Auditing:} To maintain an immutable, append-only transaction ledger and exportable financial reports for institutional administrative reconciliation.
\end{enumerate}

\subsection{1.2.3 Hardware and Architectural Integration Objectives}
\begin{enumerate}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{Autonomous Physical Spooling via Print Agent:} To bridge cloud backend dispatchers with local counter hardware through a specialised Electron-based Windows Print Agent that automates driver selection and document spooling.
  \item \textbf{Real-Time Operational Transparency:} To broadcast bi-directional lifecycle events (e.g., job placement, printing progress, completion notifications, queue wait-time adjustments) to connected clients without browser polling.
  \item \textbf{Automated Shop Scheduling:} To run background cron services enforcing campus operational hours (9:00 AM to 5:00 PM IST) while managing payment timeouts and uncollected order archival.
\end{enumerate}

\subsection{1.2.4 Sustainability and Security Objectives}
\begin{enumerate}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{Resource Conservation and Green Computing:} To reduce paper and toner wastage through pre-print configuration summaries, blank-page warnings, and optimized double-sided layout incentives.
  \item \textbf{End-to-End Cryptographic Security:} To enforce strict role-based access control (RBAC), JSON Web Token (JWT) session security, Cloudinary signed URL access, and data protection against unauthorized document disclosures.
\end{enumerate}

\section{1.3 SCOPE AND AVAILABILITY}
The operational scope of REPOSYS encompasses all primary document processing, queue organisation, financial settlement, physical printing, and administrative reporting requirements of an academic campus.

\subsection{1.3.1 User Roles and Stakeholder Scope}
The system establishes clearly demarcated functional boundaries for five distinct user personas:
\begin{enumerate}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{Student Persona:} Access to multi-document upload wizards, real-time cost estimation, wallet balance management, friend lists, split billing, live queue tracking, complaint lodgement, and PDF receipt downloads.
  \item \textbf{Faculty Persona:} Priority submission channels for academic and examination materials, customized delivery notes, departmental billing allocation, and direct counter priority.
  \item \textbf{Counter Staff Persona:} Operational terminal displaying active priority queues, manual cash collection controls, physical print dispatch triggers, stock inventory updates, and OTP-based pickup validation.
  \item \textbf{Administrator Persona:} Institutional oversight including dynamic price-per-page configuration, user account activation/restriction, system configuration, audit log inspection, and aggregate financial reporting.
  \item \textbf{Guest / Kiosk Persona:} Frictionless, registration-free terminal access via time-bound guest tokens and QR code tracking, with automated session expiration for campus visitors and parents.
\end{enumerate}

\subsection{1.3.2 Physical and Hardware Scope}
REPOSYS is designed to interface with standard multi-function commercial printers (MFPs), heavy-duty laser printers, and comb/spiral binding stations installed within the institutional reprography facility. Network connectivity encompasses the campus local area network (LAN), Wi-Fi, and public Internet access for remote student submissions.

\subsection{1.3.3 Operational Availability and Scheduling Boundaries}
The operational envelope of REPOSYS is governed by an automated scheduling sub-system aligned with institutional working rules:
\begin{enumerate}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{Core Operating Hours:} The reprography service automatically opens at 09:00 IST and closes at 17:00 IST, Monday through Saturday. An internal scheduler running at one-minute cron intervals evaluates Indian Standard Time (UTC+05:30) and synchronises the operational state across all active client interfaces.
  \item \textbf{Sunday and Holiday Closures:} The scheduler automatically prevents new order placement on Sundays (\texttt{day === 0}) and scheduled institutional holidays, while allowing counter staff to finish existing in-flight jobs.
  \item \textbf{Administrative Overrides:} Administrators maintain explicit supervisory privilege to trigger ``Force Open'' or ``Force Close'' modes during unscheduled maintenance, special academic workshops, or counter emergencies.
  \item \textbf{PWA Offline Availability:} When internet connectivity is temporarily interrupted, the Progressive Web App service worker provides cached access to previously retrieved order statuses and historical receipts.
\end{enumerate}
"""
