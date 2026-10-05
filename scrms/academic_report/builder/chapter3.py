def get_chapter3():
    return r"""% =========================================================================
% CHAPTER 3: SYSTEM SPECIFICATION
% =========================================================================
\chapter{SYSTEM SPECIFICATION}

\section{3.1 SOFTWARE AND HARDWARE REQUIREMENTS}
To guarantee reliable execution across development, testing, and production tiers, clear hardware and software operational requirements were established.

\subsection{3.1.1 Software Requirement}
Table 3.1 enumerates the complete software specifications and production dependency versions derived directly from the application's configuration manifests.

\begin{table}[H]
\centering
\small
\begin{tabularx}{\textwidth}{|p{1.2in}|p{1.3in}|X|}
\hline
\textbf{Layer / Component} & \textbf{Technology / Library} & \textbf{Version / Configuration} \\ \hline
\textbf{Server Runtime} & Node.js & v20.12.0 LTS (or higher) \\ \hline
\textbf{Backend Framework} & Express.js & v4.19.2 \\ \hline
\textbf{Database Engine} & MongoDB Atlas / Community & v7.0.x with Mongoose ODM \\ \hline
\textbf{Frontend Framework} & React.js & v19.2.4 (Vite bundler) \\ \hline
\textbf{CSS Framework} & Tailwind CSS & v4.2.2 with PostCSS \\ \hline
\textbf{Real-Time Engine} & Socket.IO & Server \& Client v4.8.3 \\ \hline
\textbf{Cloud File Storage} & Cloudinary SDK & Multer-storage-cloudinary \\ \hline
\textbf{Payment Gateway} & Razorpay Node SDK & v2.9.6 (Webhook verification) \\ \hline
\textbf{Desktop Agent} & Electron & v30.0.0 with pdf-to-printer \\ \hline
\textbf{Document Parser} & pdf-lib \& pdfjs-dist & Server-side PDF analysis \\ \hline
\textbf{Security Packages} & Helmet, bcryptjs, cors & Salt factor 12, rate limiter \\ \hline
\textbf{Scheduler} & node-cron & 5-field cron running * * * * * \\ \hline
\textbf{Testing Engine} & Selenium WebDriver & Python 3.12, pytest-html 4.2.0 \\ \hline
\textbf{Client Browsers} & Chromium, Firefox, Edge & Modern HTML5 / ES6 standards \\ \hline
\end{tabularx}
\caption{Production Software Stack and Dependency Specifications}
\label{tab:software_reqs}
\end{table}

\subsection{3.1.2 Hardware Requirement}
The system hardware requirements are divided across the production cloud server, the physical counter workstation, and the user client devices:
\begin{enumerate}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{Production Cloud Application Server:}
    \begin{itemize}[itemsep=1pt]
      \item Processor: Quad-Core 64-bit x86/ARM CPU (2.4 GHz or higher).
      \item Random Access Memory (RAM): Minimum 4 GB RAM (8 GB recommended for concurrent upload parsing).
      \item Persistent Disk: 20 GB SSD storage for operating system, temporary buffer caches, and application logs.
      \item Network Interface: 100 Mbps full-duplex uplink with high-bandwidth availability.
    \end{itemize}
  \item \textbf{Counter Staff Workstation \& Print Agent Host:}
    \begin{itemize}[itemsep=1pt]
      \item Operating System: Microsoft Windows 10 / Windows 11 (64-bit) for Windows Spooler API compatibility.
      \item Processor: Intel Core i3 / AMD Ryzen 3 or equivalent.
      \item RAM: Minimum 4 GB RAM.
      \item Disk: 10 GB free space for spooling temporary PDF documents.
      \item Peripherals: USB 3.0 / Gigabit Ethernet interface connecting local multi-function printers, thermal receipt printer, and 2D barcode / QR-code scanner.
    \end{itemize}
  \item \textbf{Student / Faculty Client Devices:}
    \begin{itemize}[itemsep=1pt]
      \item Smartphone or Laptop: Any standard Android, iOS, Windows, macOS, or Linux device equipped with an HTML5-compliant web browser.
      \item Network: 4G/5G mobile data or campus Wi-Fi connectivity.
    \end{itemize}
  \item \textbf{Target Reprography Hardware:}
    \begin{itemize}[itemsep=1pt]
      \item Networked Heavy-Duty Commercial Multifunction Printers (Canon, HP, Ricoh, Konica Minolta).
      \item Comb and Spiral document binding machine.
    \end{itemize}
\end{enumerate}

\section{3.2 FUNCTIONAL SPECIFICATIONS}
The functional capabilities of REPOSYS were architected across 39 distinct system features. The primary operational specifications are detailed below:
\begin{enumerate}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{User Authentication and Role Verification (Feature 1):} Implements secure registration with email validation, password encryption via bcrypt (12 salt rounds), and stateless JSON Web Token (JWT) session generation stored in HTTP-only secure cookies.
  \item \textbf{Composite Priority Queue Management (Feature 2):} Dynamically sorts in-flight printing jobs based on a composite score combining user role, job duration, and waiting time aging deduction.
  \item \textbf{Document Upload and Pre-Flight Inspection (Feature 3):} Supports multi-format upload (PDF, DOCX, PNG, JPEG) with client and server MIME validation, computing page count, color percentage, and blank-page alerts.
  \item \textbf{Order Configuration Wizard (Feature 4):} Multi-step wizard allowing users to configure copies, color mode (Monochrome vs. Full Color), duplexing (Single vs. Double-sided), paper size (A4, A3, Legal), and binding (Spiral, Staple, None).
  \item \textbf{Dynamic Cost Calculation Engine (Feature 7):} Deterministic price estimation applying unit rates, duplex discounts (0.85 multiplier), binding costs, and active coupon codes.
  \item \textbf{Multi-Channel Payment Settlement (Feature 8):} Real-time payment processing through Razorpay (UPI, Netbanking, Cards), internal user wallet with atomic MongoDB transactions, and cash Pay at Counter.
  \item \textbf{Order Tracking Timeline (Feature 10):} Visual status progression tracking: \texttt{Pending}, \texttt{In\_Queue}, \texttt{Processing}, \texttt{ReadyForPickup}, \texttt{Completed}, and \texttt{Cancelled}.
  \item \textbf{Counter Staff Production Dashboard (Feature 13):} Live terminal displaying queue orders, cash collection triggers, physical print dispatch, and stock status.
  \item \textbf{OTP-Protected Pickup Handover (Feature 28):} High-security order delivery requiring counter staff to enter the customer's 4-digit OTP or scan their QR token before order status changes to \texttt{Completed}.
  \item \textbf{Smart Kiosk Session Mode (Feature 36):} Registration-free guest ordering generating temporary UUID session tokens with 2-hour sliding expirations and automatic inactivity wipe.
  \item \textbf{Collaborative Friend Chat and Split Requests (Features 38 \& 39):} Peer-to-peer friend chat and collaborative group-order payment splitting with atomic multi-wallet deductions.
\end{enumerate}

\section{3.3 TOOLS AND PLATFORMS USED}
\begin{enumerate}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{React 19 with Vite:} Delivers a lightning-fast Single Page Application (SPA) leveraging React Server Components, custom hooks (\texttt{useSocket}, \texttt{useAuth}), and optimized bundle splitting via Vite.
  \item \textbf{Node.js and Express.js:} Forms the asynchronous API gateway capable of non-blocking I/O operations, routing, middleware orchestration, and streaming multipart upload data.
  \item \textbf{MongoDB Atlas and Mongoose:} Flexible document-oriented NoSQL database providing schema validation, high-speed secondary indexing, and multi-document ACID transaction guarantees.
  \item \textbf{Socket.IO:} Enterprise-grade WebSocket abstraction managing room-based event broadcasting (\texttt{queue:serviceType}, \texttt{user:userId}, \texttt{staff}, \texttt{admin}) with automatic HTTP long-polling fallback.
  \item \textbf{Cloudinary Media Cloud:} Enterprise object storage managing uploaded documents with AES-256 cloud encryption, time-delimited signed URLs, and automated PDF-to-thumbnail transformation.
  \item \textbf{Razorpay API:} RBI-compliant digital payment gateway facilitating seamless student payments across Google Pay, PhonePe, Paytm, debit/credit cards, and net banking.
  \item \textbf{Electron Framework:} Powers the desktop Print Agent, bridging web APIs to native Windows operating system commands, Windows PowerShell, and spooler utilities.
  \item \textbf{Selenium WebDriver and Pytest:} Comprehensive automated testing suite simulating end-to-end user interactions, verifying route protection, and auditing UI flows across real browser sessions.
\end{enumerate}

\section{3.4 DEVELOPMENT ENVIRONMENT}
The development lifecycle was conducted under structured development conventions:
\begin{itemize}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{Version Control Configuration:} Git and GitHub were utilised for branching, feature pull requests, and commit tracking.
  \item \textbf{Environment Variable Management:} Configuration isolation was maintained through \texttt{.env.development} and \texttt{.env.production} files, segregating API keys, MongoDB connection URIs, Razorpay secrets, and Cloudinary credentials.
  \item \textbf{Cross-Origin Resource Sharing (CORS):} Controlled through strict origin whitelisting in \texttt{origins.js}, permitting requests exclusively from authorized frontend and print-agent hosts.
  \item \textbf{Database Seeding Scripts:} Automated seeding scripts (\texttt{seedAdmin.js}, \texttt{seedInventory.js}) populated default system configurations, catalog pricing rules, paper stock, and supervisory accounts upon initialization.
\end{itemize}
"""
