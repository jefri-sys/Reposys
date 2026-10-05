def get_chapter4():
    return r"""% =========================================================================
% CHAPTER 4: SYSTEM DESIGN
% =========================================================================
\chapter{SYSTEM DESIGN}

\section{4.1 MODULE DESCRIPTIONS}
REPOSYS is engineered around four deeply integrated subsystem modules, each tailored to distinct operational responsibilities within the reprography ecosystem.

\subsection{4.1.1 User and Customer Module}
The User Module provides authenticated students, faculty, and campus guests with an intuitive digital storefront for document submission and lifecycle management:
\begin{enumerate}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{Authentication and Profile Subsystem:} Manages user registration, JWT login, profile editing, and password recovery via encrypted email tokens.
  \item \textbf{Three-Step Order Placement Wizard:} Guides the customer through: (i) File drag-and-drop with pre-flight analysis; (ii) Print configuration (copies, color, duplexing, paper format, binding); and (iii) Cost review and payment gateway selection.
  \item \textbf{Digital Wallet Subsystem:} Displays pre-funded balances, transaction logs, and single-click wallet debits backed by MongoDB multi-document ACID transactions.
  \item \textbf{Order Tracking and Digital Receipts:} Renders an active order timeline with live queue position updates, countdown timers, pickup OTP codes, and dynamically generated PDF receipts.
  \item \textbf{Collaborative Tools:} Manages student friend connections, direct peer messaging, and collaborative split-order requests.
\end{enumerate}

\subsection{4.1.2 Counter Staff Module}
The Counter Staff Module equips reprography operators with a dedicated operational terminal designed for high-throughput, error-free counter processing:
\begin{enumerate}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{Active Priority Queue Board:} Real-time dashboard grouping active jobs by service type (Printing, Photocopying, Scanning, Binding), sorted dynamically by effective priority score.
  \item \textbf{Production Controls:} Enables operators to trigger manual print dispatches, mark orders as \texttt{Processing}, and transition finished jobs to \texttt{ReadyForPickup}.
  \item \textbf{Cash-at-Counter Settlement:} Single-click verification for cash collections, updating \texttt{paymentStatus} from \texttt{Cash\_Pending} to \texttt{Paid} and synchronizing the daily counter register.
  \item \textbf{OTP-Protected Handover Terminal:} Requires entry of the customer's 4-digit verification code or barcode scan before finalizing delivery.
  \item \textbf{Incident Reporting Subsystem:} Enables operators to log equipment malfunctions, toner outages, or customer disputes directly to administrators.
\end{enumerate}

\subsection{4.1.3 Administrator Module}
The Administrator Module provides institutional supervisors with governance and configuration capabilities:
\begin{enumerate}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{Dynamic Tariff and Pricing Control:} Live configuration of unit costs for black-and-white, color, double-sided discounts, binding modes, and paper types without requiring server restarts.
  \item \textbf{User and Role Governance:} Supervisory oversight of student, faculty, and staff accounts, including role reassignments and account restrictions.
  \item \textbf{Consumable Inventory Tracker:} Automated monitoring of A4/A3 paper reams, toner cartridges, and binding coils with low-stock warning thresholds.
  \item \textbf{Append-Only Audit Logging:} Comprehensive activity tracking logging every sensitive administrative, financial, and operational action.
  \item \textbf{Automated Shop Operations Control:} Manual overrides for shop opening hours (\texttt{schedule}, \texttt{manual\_open}, \texttt{manual\_close}).
\end{enumerate}

\subsection{4.1.4 Print Agent Module}
The Print Agent is an autonomous Electron desktop background service deployed on counter workstations:
\begin{enumerate}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{Hardware Discovery:} Periodically executes Windows PowerShell cmdlets (\texttt{Get-Printer}) to detect installed physical print drivers and online/offline states.
  \item \textbf{Secure Cloud Job Retrieval:} Authenticates using unique agent tokens, listens for Socket.IO dispatch events, and fetches documents via temporary signed Cloudinary URLs.
  \item \textbf{Spooler Execution:} Invokes native Windows printing utilities (\texttt{pdf-to-printer}) to spool files directly into the target printer queue.
  \item \textbf{Heartbeat Telemetry:} Emits heartbeat pings every 30 seconds to update cloud registries regarding hardware readiness.
\end{enumerate}

\section{4.2 DATA / SCHEMA DESIGN}
Persistence in REPOSYS is managed through MongoDB using Mongoose Object Data Modeling (ODM). The database comprises 23 primary collections structured to support rapid lookups, transactional integrity, and comprehensive auditability.

Table 4.1 details the primary collections, indexing strategies, and schema definitions.

\begin{table}[H]
\centering
\small
\begin{tabularx}{\textwidth}{|p{1.1in}|p{1.1in}|X|}
\hline
\textbf{Collection} & \textbf{Key Indexes} & \textbf{Core Schema Fields \& Data Types} \\ \hline
\textbf{User} & \texttt{email} (unique) & \texttt{name} (String), \texttt{email} (String), \texttt{password} (Hash), \texttt{role} (Enum: Student, Faculty, Staff, Admin), \texttt{department} (String), \texttt{walletBalance} (Number), \texttt{isVerified} (Boolean). \\ \hline
\textbf{Order} & \texttt{orderNumber} (unique), \texttt{userId}, \texttt{status}, \texttt{createdAt} & \texttt{orderNumber} (String), \texttt{userId} (Ref: User), \texttt{serviceType} (Enum), \texttt{documents} (Array), \texttt{totalCost} (Number), \texttt{paymentStatus} (Enum), \texttt{status} (Enum), \texttt{priorityScore} (Number), \texttt{pickupOtp} (String), \texttt{qrCode} (String). \\ \hline
\textbf{Document} & \texttt{orderId}, \texttt{userId} & \texttt{fileName} (String), \texttt{fileUrl} (String), \texttt{fileType} (String), \texttt{pageCount} (Number), \texttt{colorPages} (Number), \texttt{blankPages} (Array), \texttt{fileSize} (Number). \\ \hline
\textbf{Payment} & \texttt{razorpayOrderId}, \texttt{orderId} & \texttt{orderId} (Ref: Order), \texttt{userId} (Ref: User), \texttt{amount} (Number), \texttt{method} (Enum: Razorpay, Wallet, Cash), \texttt{transactionId} (String), \texttt{status} (Enum: Pending, Completed, Failed). \\ \hline
\textbf{Wallet} & \texttt{userId} (unique) & \texttt{userId} (Ref: User), \texttt{balance} (Number), \texttt{currency} (String), \texttt{lastUpdated} (Date). \\ \hline
\textbf{WalletTransaction} & \texttt{walletId}, \texttt{createdAt} & \texttt{walletId} (Ref: Wallet), \texttt{type} (Enum: Credit, Debit), \texttt{amount} (Number), \texttt{description} (String), \texttt{balanceAfter} (Number). \\ \hline
\textbf{Complaint} & \texttt{orderId}, \texttt{userId}, \texttt{status} & \texttt{orderId} (Ref: Order), \texttt{userId} (Ref: User), \texttt{category} (String), \texttt{subject} (String), \texttt{description} (String), \texttt{status} (Enum: Open, In\_Progress, Resolved), \texttt{messages} (Array). \\ \hline
\textbf{InventoryItem} & \texttt{itemCode} (unique) & \texttt{itemName} (String), \texttt{category} (Enum: Paper, Toner, Binding), \texttt{quantity} (Number), \texttt{threshold} (Number), \texttt{unitCost} (Number). \\ \hline
\textbf{SystemConfig} & Singleton & \texttt{pricing} (Object), \texttt{operatingHours} (Object), \texttt{shopMode} (Enum: schedule, manual\_open, manual\_close), \texttt{isManuallyOpen} (Boolean). \\ \hline
\textbf{PrintAgentRegistry} & \texttt{agentId} (unique) & \texttt{agentId} (String), \texttt{hostName} (String), \texttt{ipAddress} (String), \texttt{status} (Enum: Online, Offline), \texttt{lastHeartbeat} (Date), \texttt{printers} (Array). \\ \hline
\end{tabularx}
\caption{Database Schema Specifications of Core REPOSYS Collections}
\label{tab:schema_specs}
\end{table}

\section{4.3 PROCEDURAL / FLOW DESIGN}

\subsection{4.3.1 Priority Queue and Aging Mathematical Model}
To balance institutional hierarchy against fair queue wait times, REPOSYS executes a dynamic priority evaluation algorithm within \texttt{queueService.js}. A lower score denotes a higher processing priority.

The base priority score ($S_{\text{base}}$) is evaluated upon order creation:
\begin{equation}
S_{\text{base}} = P_{\text{role}} + \lfloor T_{\text{est}} \rfloor
\end{equation}
where $P_{\text{role}}$ represents the categorical role priority:
\begin{equation}
P_{\text{role}} = 
\begin{cases} 
100, & \text{if User Role} = \text{Faculty} \\
150, & \text{if User Role} = \text{Staff} \\
200, & \text{if User Role} \in \{\text{Student}, \text{Guest}\}
\end{cases}
\end{equation}
and $T_{\text{est}}$ represents the estimated physical production duration in minutes.

To prevent job starvation where an influx of faculty orders permanently postpones student orders, the system recalculates the effective priority score ($S_{\text{eff}}$) dynamically:
\begin{equation}
D_{\text{aging}} = \max\left(0, \left\lfloor \frac{T_{\text{wait}} - 1}{60} \right\rfloor\right) \times 20
\end{equation}
\begin{equation}
S_{\text{eff}} = S_{\text{base}} - D_{\text{aging}}
\end{equation}
where $T_{\text{wait}}$ is the elapsed waiting time in minutes. For every full hour of counter waiting, the order's score is reduced by 20 points, steadily moving the job ahead in queue. When two orders possess equal effective scores, First-In, First-Out (\texttt{createdAt} ascending) serves as the definitive tie-breaker.

\subsection{4.3.2 Automated Shop Scheduling State Machine}
The operating availability of the reprography centre is governed by an automated scheduler in \texttt{shopScheduler.js} executing every minute via \texttt{node-cron} (\texttt{* * * * *}).

Figure 4.1 depicts the operational state machine controlling shop availability.

\begin{figure}[H]
\centering
\begin{tikzpicture}[node distance=1.4cm, auto,
  state/.style={rectangle, draw=blue!80, fill=blue!5, rounded corners, text width=2.6in, text centered, minimum height=0.4in, font=\small},
  line/.style={draw, -{Latex[length=2mm]}, thick}]
  
  \node [state] (cron) {Cron Triggered Every Minute\\(* * * * *)};
  \node [state, below of=cron] (time) {Evaluate IST Time (UTC + 05:30)\\Check: Monday--Saturday, 09:00 to 17:00};
  \node [state, below of=time] (check) {Check \texttt{shopMode} Configuration\\Mode = \texttt{schedule} (Evaluate IST)\\Mode = \texttt{manual\_open} / \texttt{manual\_close} (Override)};
  \node [state, below of=check] (emit) {Broadcast State Change via Socket.IO\\Events: \texttt{shop\_opened} or \texttt{shop\_closed}};
  
  \path [line] (cron) -- (time);
  \path [line] (time) -- (check);
  \path [line] (check) -- (emit);
\end{tikzpicture}
\caption{Automated Shop Scheduling Logic and Operational State Transitions}
\label{fig:shop_scheduler}
\end{figure}

\subsection{4.3.3 Order Expiration and Pay-at-Counter Timeout Management}
In addition to shop hours, background services in \texttt{cronJobs.js} enforce financial and operational timeouts:
\begin{itemize}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{Unpaid Online Orders:} Cancelled automatically after 15 minutes of inactivity.
  \item \textbf{Pay at Counter Orders:} First email reminder issued at 24 hours; order cancelled and archived if unpaid at 48 hours.
  \item \textbf{Uncollected Orders:} A reminder is dispatched after 24 hours of reaching \texttt{ReadyForPickup}. A secondary warning is issued at 48 hours. If uncollected at 72 hours, the job is flagged for administrative review to prevent storage clutter.
\end{itemize}

\subsection{4.3.4 UML Diagrams}
The formal architectural interactions are captured through UML diagrams:

\begin{figure}[H]
\centering
\includegraphics[width=\textwidth,keepaspectratio]{figures/use_case_diagram.png}
\caption{System Use Case Diagram: User, Staff, and Admin Operational Boundaries}
\label{fig:use_case}
\end{figure}

\begin{figure}[H]
\centering
\includegraphics[width=\textwidth,keepaspectratio]{figures/activity_diagram.png}
\caption{System Activity Diagram: Document Upload, Analysis, and Production Flow}
\label{fig:activity_diagram}
\end{figure}

\begin{figure}[H]
\centering
\includegraphics[width=\textwidth,keepaspectratio]{figures/sequence_diagram.png}
\caption{System Sequence Diagram: Real-Time Event Dispatching and Queue Updates}
\label{fig:sequence_diagram}
\end{figure}

\section{4.4 USER INTERFACE DESIGN}
The user interface is engineered adhering to mobile-first responsive design paradigms using React 19, Tailwind CSS, and Lucide React icon tokens:
\begin{itemize}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{Color System:} The interface employs an accessible academic palette: Deep Slate Navy (\texttt{\#0f172a}) for structural headers, Vibrant Cobalt Blue (\texttt{\#2563eb}) for call-to-actions, Emerald Green (\texttt{\#10b981}) for successful pickups, and Amber (\texttt{\#f59e0b}) for pending queue states.
  \item \textbf{Navigation Hierarchy:} Role-aware layout bars automatically present relevant navigation links depending on authenticated JWT claims.
  \item \textbf{Mobile-First Ordering Wizard:} A step-by-step progress stepper ensures students on smartphones can easily configure document options and review cost estimations without excessive scrolling.
\end{itemize}
"""
