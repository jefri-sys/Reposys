def get_chapter7():
    return r"""% =========================================================================
% CHAPTER 7: CONCLUSION
% =========================================================================
\chapter{CONCLUSION}

\section{7.1 LIMITATIONS}
While REPOSYS introduces major operational advancements over traditional campus reprography workflows, an objective engineering assessment reveals several operational and technical constraints:
\begin{enumerate}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{High-Volume Document Upload Latency:} Transferring very large PDF documents (e.g., high-resolution architecture blueprints or dissertations exceeding 100 MB) across fluctuating campus Wi-Fi networks introduces upload delays, impacting the client pre-flight inspection experience.
  \item \textbf{Serverless Cloud Cold-Start Latencies:} When hosted on free or cost-optimized serverless tiers (such as Render free instances), inactive backend services spin down, creating an initial request delay of 30--50 seconds upon first wake-up.
  \item \textbf{Operating System Dependency of Print Agent:} The native Print Agent relies on Windows PowerShell cmdlets and Windows Print Spooler APIs (\texttt{pdf-to-printer}), restricting agent deployment to counter terminals running Microsoft Windows operating systems.
  \item \textbf{Pay at Counter Uncollected Print Risk:} Although Pay at Counter (PAC) orders incorporate automated reminder emails and cancellation timeouts, jobs printed prior to cash collection remain vulnerable to financial loss if an irresponsible user abandons the order.
  \item \textbf{Guest Session Volatility:} Temporary kiosk guest sessions depend on browser local storage and time-limited tokens; if a visitor clears browser history before claiming output, recovery requires staff intervention.
\end{enumerate}

\section{7.2 FUTURE SCOPE}
The modular, micro-service-ready architecture of REPOSYS establishes a robust foundation for extensive future engineering enhancements:
\begin{enumerate}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{Cross-Platform Native Mobile Applications:} Developing native iOS and Android client applications using React Native or Flutter, incorporating background push notifications, native biometrics, and camera-based document scanning with perspective correction.
  \item \textbf{Smart Campus RFID / NFC Card Integration:} Interfacing counter terminals and kiosk stations with institutional RFID smart identity cards (such as MIFARE cards), enabling students to tap their college ID for instantaneous authentication and automatic tuition wallet debiting.
  \item \textbf{AI-Powered Document Intelligence and Summarization:} Integrating Google Gemini API models to deliver automated document quality assessments, font legibility checks, multi-language translation, and automatic executive summaries of lengthy study materials.
  \item \textbf{Multi-Centre Campus Load Balancing:} Expanding the priority queue scheduler to dynamically distribute printing workloads across multiple reprography centres, departmental printers, and library hubs based on real-time queue congestion.
  \item \textbf{Autonomous Hardware Kiosks:} Constructing fully autonomous, unattended printing kiosks equipped with cash acceptors, coin mechanisms, and automated document output sorting bins for 24/7 campus service.
\end{enumerate}

\section{7.3 CONCLUSION}
The development and implementation of \textbf{REPOSYS (Reprography Automation System)} successfully addresses the chronic operational bottlenecks, privacy vulnerabilities, and financial tracking difficulties that have historically hindered campus reprography centres. 

By replacing manual physical counter interactions with a modern, cloud-connected MERN platform, REPOSYS achieves:
\begin{itemize}[leftmargin=0.35in, itemsep=2pt]
  \item Elimination of physical queue congestion through asynchronous digital submission and transparent wait-time tracking.
  \item Protection of personal privacy and endpoint IT security by retiring ad-hoc WhatsApp file sharing and USB flash drives.
  \item Equitable resource distribution via the Composite Priority Queue with dynamic aging deduction, guaranteeing fairness for students while supporting urgent faculty requirements.
  \item Accurate financial accounting and operational transparency through automated Razorpay integration, ACID-compliant digital wallets, and append-only activity auditing.
  \item Reliable hardware automation via the autonomous Electron Windows Print Agent.
\end{itemize}

Extensive verification through an automated 120-case Selenium WebDriver test suite confirmed a 95.0\% operational passing rate, proving the technical stability, security, and usability of the platform. REPOSYS represents a significant technological contribution towards building an intelligent, eco-friendly, and digitally empowered academic campus.
"""
