def get_chapter2():
    return r"""% =========================================================================
% CHAPTER 2: REQUIREMENTS AND ANALYSIS
% =========================================================================
\chapter{REQUIREMENTS AND ANALYSIS}

\section{2.1 EXISTING SYSTEM / PROBLEM STATEMENT}
To formulate a technically sound software solution, a comprehensive field analysis of the prevailing reprography system at Saintgits College of Engineering and comparable tertiary educational campuses was undertaken. The investigation revealed that document printing, duplication, and finishing services rely heavily on manual, disorganised procedures.

Figure 2.1 illustrates the operational bottlenecks and structural inefficiencies characteristic of the legacy manual workflow.

\begin{figure}[H]
\centering
\begin{tikzpicture}[node distance=1.2cm, auto,
  block/.style={rectangle, draw, fill=blue!5, text width=2.8in, text centered, rounded corners, minimum height=0.45in, font=\small},
  line/.style={draw, -{Latex[length=2.5mm]}, thick}]
  \node [block] (step1) {1. Student arrives at counter and waits in physical queue};
  \node [block, below of=step1] (step2) {2. File transferred via USB drive or personal WhatsApp};
  \node [block, below of=step2] (step3) {3. Operator opens file, checks pages, calculates price manually};
  \node [block, below of=step3] (step4) {4. Student makes cash payment (change shortage issues)};
  \node [block, below of=step4] (step5) {5. Operator manually triggers print job on local computer};
  \node [block, below of=step5] (step6) {6. Student waits at lobby until output is sorted and handed over};
  \path [line] (step1) -- (step2);
  \path [line] (step2) -- (step3);
  \path [line] (step3) -- (step4);
  \path [line] (step4) -- (step5);
  \path [line] (step5) -- (step6);
\end{tikzpicture}
\caption{Process Flow and Bottlenecks of the Existing Manual System}
\label{fig:existing_flow}
\end{figure}

The principal deficiencies and operational failure modes identified in the existing system are categorised as follows:
\begin{enumerate}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{High Latency and Lost Academic Hours:} During peak academic submission periods (continuous assessment tests, end-semester project reviews), physical queues exceed 30--40 students. Each transaction requires approximately 4 to 8 minutes of counter negotiation, consuming substantial student study time and creating severe lobby congestion.
  \item \textbf{Endpoint Security Risks and Malware Propagation:} The indiscriminate insertion of unverified USB flash drives into counter workstations exposes campus IT infrastructure to autorun trojans, ransomware, and virus infections, frequently causing workstation operating system crashes.
  \item \textbf{Privacy Breaches and Unregulated Data Sprawl:} When students share documents via personal WhatsApp numbers, their phone numbers, profile images, and private academic submissions remain stored in unmanaged personal mobile device caches and chat histories without deletion policies.
  \item \textbf{Financial Leakage and Cash Reconciliation Disputes:} Counter operators manually tally page counts across mixed single-sided, double-sided, color, and monochrome ranges. In the rush of peak hours, calculation errors occur frequently. Furthermore, lack of exact currency change creates disputes and delays.
  \item \textbf{Paper and Consumable Wastage:} Due to miscommunication regarding page ranges, color expectations, or paper orientations, unintended prints are frequently produced. Moreover, students occasionally abandon prints due to extensive wait times, resulting in uncollected paper that represents total financial and ecological loss.
  \item \textbf{Complete Lack of Operational Visibility:} Students have no mechanism to determine counter queue length, machine operational status, or estimated turnaround times before traveling to the physical facility.
\end{enumerate}

\section{2.2 PROPOSED SYSTEM / SOLUTION OVERVIEW}
\textbf{REPOSYS} resolves these systemic problems by introducing a centralised, cloud-connected digital reprography platform that decouples job submission from physical collection.

Table 2.1 summarizes the architectural and operational contrast between the existing manual process and the proposed REPOSYS solution.

\begin{table}[H]
\centering
\small
\begin{tabularx}{\textwidth}{|p{1.3in}|X|X|}
\hline
\textbf{Feature Dimension} & \textbf{Existing Manual System} & \textbf{Proposed REPOSYS} \\ \hline
\textbf{Job Submission} & Physical presence; USB drives or WhatsApp sharing & Remote web/PWA upload with pre-flight file validation \\ \hline
\textbf{Cost Calculation} & Manual operator estimation; prone to human error & Real-time algorithmic calculation with dynamic discounts \\ \hline
\textbf{Payment Methods} & Strictly physical cash; change shortages & Razorpay UPI/Cards, internal student digital wallet, regulated PAC \\ \hline
\textbf{Queue Mechanism} & Physical, unmonitored FIFO queue & Composite priority queue with dynamic anti-starvation aging \\ \hline
\textbf{Hardware Bridge} & Manual operator file opening and printer dialogs & Autonomous Electron Print Agent with background spooling \\ \hline
\textbf{Handover Security} & Open counter pickup; prone to misplacement & Two-factor OTP and QR-code collection verification \\ \hline
\textbf{Operating Hours} & Ad-hoc counter opening; unpredictable closures & Automated IST cron scheduler with real-time UI banners \\ \hline
\textbf{Audit and Logs} & Paper registers or absent record-keeping & Append-only MongoDB activity logs and automated analytics \\ \hline
\end{tabularx}
\caption{System Comparison: Existing Manual System vs. Proposed REPOSYS}
\label{tab:comparison}
\end{table}

The proposed system enforces an asynchronous, transparent document workflow:
\begin{enumerate}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{Remote Multi-Document Upload:} Users upload PDF, Word, or image documents from mobile or desktop browsers. The backend extracts structural metadata, counts pages, and performs blank-page detection.
  \item \textbf{Transparent Algorithmic Pricing:} The user customises printing parameters (color mode, copies, duplexing, binding, paper size) and receives a deterministic price quotation calculated from admin-configured rates.
  \item \textbf{Frictionless Settlement:} The user completes payment using Razorpay, wallet balance, or cash at counter, triggering immediate queue assignment.
  \item \textbf{Dynamic Priority Queue Placement:} The order enters the processing queue with an effective priority score combining role priority, complexity, and wait-time aging.
  \item \textbf{Automated Spooling and Production:} The counter staff or automated Print Agent spools the validated job to the assigned physical printer.
  \item \textbf{Secure Handover via OTP:} Upon completion, the customer receives a pickup alert and presents a 4-digit OTP or QR code to claim the output.
\end{enumerate}

\section{2.3 FEASIBILITY STUDY}
Before commencing technical development, a comprehensive feasibility study was conducted to evaluate the viability of REPOSYS across four key engineering dimensions.

\subsection{2.3.1 Technical Feasibility}
The technical feasibility evaluates whether the available hardware, software stacks, and cloud infrastructure can support the target system requirements:
\begin{itemize}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{Technology Stack Maturity:} The MERN stack (MongoDB, Express.js, React 19, Node.js) represents an industry-standard, battle-tested software architecture. Node.js provides non-blocking, asynchronous I/O ideal for handling concurrent upload streams and WebSocket events.
  \item \textbf{Cloud Storage and Processing:} Cloudinary provides reliable cloud object storage with signed secure URLs, while client-side \texttt{pdfjs-dist} and server-side \texttt{pdf-lib} provide robust programmatic document parsing.
  \item \textbf{Real-Time Communication:} Socket.IO enables low-latency, full-duplex bi-directional communication between connected clients, staff dashboards, and print agents without consuming excessive server memory.
  \item \textbf{Hardware Interfacing via Electron:} The Electron framework provides direct access to Windows operating system APIs and the local print spooler (\texttt{pdf-to-printer}), allowing the desktop Print Agent to control physical hardware seamlessly.
\end{itemize}
The technical architecture requires no proprietary, untried technology; all components have mature documentation, strong community support, and verified open-source libraries. Hence, the project is technically feasible.

\subsection{2.3.2 Operational Feasibility}
Operational feasibility assesses how effectively the proposed solution integrates into the daily routines of campus stakeholders:
\begin{itemize}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{Student and Faculty Usability:} Students and faculty already use smartphones and web browsers daily. The intuitive 3-step ordering wizard, mobile-responsive layout, and PWA installation require zero formal user training.
  \item \textbf{Counter Staff Ergonomics:} Counter operators transition from manual file handling and cash calculation to an intuitive dashboard that displays incoming jobs, automatically computes totals, and verifies handovers via single-click OTP entry.
  \item \textbf{Institutional Governance:} Administrators receive real-time visibility into machine status, paper consumption, daily revenue, and staff incident reports, substantially easing operational auditing.
\end{itemize}
Because REPOSYS directly eliminates manual bottlenecks without imposing complicated new workflows, user acceptance is exceptionally high. Therefore, the system is operationally feasible.

\subsection{2.3.3 Economic Feasibility}
Economic feasibility weighs the development, deployment, and operational expenditures against the tangible and intangible cost savings:
\begin{itemize}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{Development Cost:} The platform is constructed entirely using open-source frameworks (React, Node.js, Express, MongoDB Community/Atlas free tier, Vite, Tailwind CSS, Electron), incurring zero proprietary software licensing fees.
  \item \textbf{Hosting and Cloud Infrastructure:} Cloud hosting on scalable platforms (Vercel for frontend, Render for backend, MongoDB Atlas M0/M10 for database) provides cost-effective hosting tailored to campus traffic profiles.
  \item \textbf{Resource Savings:} Eliminating uncollected prints and wasted paper saves hundreds of sheets per week. Accurate automated billing prevents revenue leakage.
  \item \textbf{Productivity Dividends:} Minimising queue wait times recovers valuable instructional and research hours for students and faculty.
\end{itemize}
The projected operational savings and efficiency gains substantially outweigh the negligible deployment costs, confirming high economic feasibility.

\subsection{2.3.4 Schedule Feasibility}
The capstone project was structured across a 17-week academic timeline prescribed by the Department of Computer Applications for course \textbf{20IMCAP501 (Mini Project - 2)}. The schedule allotted realistic durations for requirements analysis, system architecture, database design, backend coding, frontend development, payment/agent integration, and automated testing. Table 2.2 in Section 2.5 confirms that all deliverables aligned with institutional assessment milestones.

\section{2.4 CONCEPTUAL MODELLING}
Conceptual modelling captures the high-level boundaries, external entities, and data flows governing REPOSYS.

\subsection{2.4.1 Level 0 Context Data Flow Diagram}
The Level 0 Context DFD depicts REPOSYS as a centralised system interacting with five primary external entities: Students/Faculty, Counter Staff, Administrators, Razorpay Payment Gateway, and Cloudinary Storage.

\begin{figure}[H]
\centering
\begin{tikzpicture}[node distance=1.8cm, auto,
  process/.style={circle, draw=blue!80, fill=blue!10, thick, text width=1.1in, text centered, font=\bfseries\small},
  entity/.style={rectangle, draw=black!80, fill=gray!10, thick, text width=1.1in, text centered, rounded corners, minimum height=0.35in, font=\small},
  line/.style={draw, -{Latex[length=2mm]}, thick}]
  
  \node [process] (system) {0.0\\REPOSYS Platform};
  \node [entity, above of=system, yshift=0.8cm] (user) {Students / Faculty};
  \node [entity, right of=system, xshift=1.6cm] (staff) {Counter Staff};
  \node [entity, below of=system, yshift=-0.8cm] (admin) {Administrator};
  \node [entity, left of=system, xshift=-1.6cm] (gateway) {Payment Gateway (Razorpay)};
  
  \path [line] (user) -- node[left, font=\tiny]{Uploads, Orders} (system);
  \path [line] (system) -- node[right, font=\tiny]{Receipts, OTPs} (user);
  \path [line] (system) -- node[above, font=\tiny]{Queue, Jobs} (staff);
  \path [line] (staff) -- node[below, font=\tiny]{OTP, Cash Status} (system);
  \path [line] (admin) -- node[right, font=\tiny]{Pricing, Config} (system);
  \path [line] (system) -- node[left, font=\tiny]{Analytics, Logs} (admin);
  \path [line] (system) -- node[above, font=\tiny]{Payment Requisition} (gateway);
  \path [line] (gateway) -- node[below, font=\tiny]{Signature / Status} (system);
\end{tikzpicture}
\caption{Level 0 Context Data Flow Diagram of REPOSYS}
\label{fig:dfd_level0}
\end{figure}

\subsection{2.4.2 Level 1 Functional Data Flow Diagram}
The Level 1 DFD decomposes REPOSYS into its major functional processes: Authentication (1.0), Document Upload and Inspection (2.0), Order Configuration and Costing (3.0), Payment Settlement (4.0), Queue Scheduling (5.0), and Physical Production Handover (6.0).

\begin{figure}[H]
\centering
\begin{tikzpicture}[node distance=1.3cm, auto,
  proc/.style={rectangle, draw=blue!70, fill=blue!5, rounded corners, text width=2.8in, text centered, minimum height=0.35in, font=\small},
  store/.style={rectangle, draw=black!70, fill=yellow!10, text width=2.8in, text centered, minimum height=0.28in, font=\footnotesize},
  line/.style={draw, -{Latex[length=2mm]}, thick}]
  
  \node [proc] (p1) {1.0 User Authentication \& Role Verification};
  \node [proc, below of=p1] (p2) {2.0 Document Upload, MIME Check \& Analysis};
  \node [proc, below of=p2] (p3) {3.0 Order Configuration \& Dynamic Cost Estimation};
  \node [proc, below of=p3] (p4) {4.0 Payment Processing (Wallet / Razorpay / PAC)};
  \node [proc, below of=p4] (p5) {5.0 Priority Queue Scheduling \& Aging Engine};
  \node [proc, below of=p5] (p6) {6.0 Print Dispatch, OTP Handover \& Receipting};
  
  \path [line] (p1) -- (p2);
  \path [line] (p2) -- (p3);
  \path [line] (p3) -- (p4);
  \path [line] (p4) -- (p5);
  \path [line] (p5) -- (p6);
\end{tikzpicture}
\caption{Level 1 Functional Data Flow Diagram of the Complete Order Pipeline}
\label{fig:dfd_level1}
\end{figure}

\section{2.5 PLANNING AND SCHEDULING}
The engineering development of REPOSYS was structured using the Agile Scrum methodology across a 17-week semester schedule prescribed by the official Scrum Register for course \textbf{20IMCAP501 (Mini Project - 2)}.

Table 2.2 documents the formal project schedule, task assignments, deliverables, and review milestones.

\begin{table}[H]
\centering
\small
\begin{tabularx}{\textwidth}{|p{0.55in}|p{0.95in}|X|p{0.65in}|}
\hline
\textbf{Week} & \textbf{Date Range} & \textbf{Planned Work and Key Deliverables} & \textbf{Status} \\ \hline
\textbf{W1} & 01--04 Jul 2026 & Topic selection, domain research, and approved synopsis & 100\% Done \\ \hline
\textbf{W2} & 06--10 Jul 2026 & System study, feasibility analysis, module identification & 100\% Done \\ \hline
\textbf{W3} & 13--17 Jul 2026 & Requirements gathering, user stories, UI wireframes & 100\% Done \\ \hline
\textbf{W4} & 20--22 Jul 2026 & UML modeling, ER schema normalization, Git repo setup & 100\% Done \\ \hline
\textbf{W5} & 27--29 Jul 2026 & Core structure setup, basic UI components (\textbf{Review 0}) & 100\% Done \\ \hline
\textbf{W6} & 03--07 Aug 2026 & Authentication, JWT security, user profile management & 100\% Done \\ \hline
\textbf{W7} & 10--14 Aug 2026 & Document upload pipeline, Cloudinary integration, testing & 100\% Done \\ \hline
\textbf{W8} & 17--21 Aug 2026 & Priority queue, pricing engine, 50\% evaluation (\textbf{Review 1}) & 100\% Done \\ \hline
\textbf{W9} & 01--05 Sep 2026 & Razorpay gateway, wallet atomic transactions & 100\% Done \\ \hline
\textbf{W10} & 07--11 Sep 2026 & Staff counter dashboard, OTP pickup verification & 100\% Done \\ \hline
\textbf{W11} & 14--18 Sep 2026 & Admin console, inventory tracker, Selenium suite build & 100\% Done \\ \hline
\textbf{W12} & 21--25 Sep 2026 & Socket.IO real-time engine, 80\% Scrum Master Review & 100\% Done \\ \hline
\textbf{W13} & 28--30 Sep 2026 & Electron Print Agent, shop cron scheduler, cloud hosting & 100\% Done \\ \hline
\textbf{W14} & 05--09 Oct 2026 & PWA service worker, push alerts, final bug rectification & 100\% Done \\ \hline
\textbf{W15} & 12--14 Oct 2026 & Final assessment board evaluation, live demo (\textbf{Review 2}) & 100\% Done \\ \hline
\textbf{W16} & 14 Oct 2026 & Final project report submission and print verification & 100\% Done \\ \hline
\textbf{W17} & 15 Oct 2026 & Hard-bound submission, signed Scrum register, git logs & 100\% Done \\ \hline
\end{tabularx}
\caption{Official Project Schedule and Milestone Tracking (Scrum Register 20IMCAP501)}
\label{tab:schedule}
\end{table}
"""
