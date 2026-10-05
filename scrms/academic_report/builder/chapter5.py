def get_chapter5():
    return r"""% =========================================================================
% CHAPTER 5: DEVELOPMENT METHODOLOGY
% =========================================================================
\chapter{DEVELOPMENT METHODOLOGY}

\section{5.1 PROJECT ROADMAP}
The development of REPOSYS adhered to an iterative engineering lifecycle, organized into nine distinct development stages designed to deliver incremental value and facilitate early testing.

\begin{enumerate}[leftmargin=0.35in, itemsep=3pt]
  \item \textbf{Stage 1 -- Requirements Discovery and Architectural Feasibility:} Field interviews with campus students, faculty coordinators, and reprography operators to define the 39-feature backlog, security requirements, and system boundaries.
  \item \textbf{Stage 2 -- Wireframing and Database Design:} UI prototyping using Figma and complete entity-relationship modeling across 23 Mongoose collections with schema validations and indexing.
  \item \textbf{Stage 3 -- Core Identity and Access Management:} Implementation of JWT-based authentication, bcrypt password hashing (salt 12), and role-based access control middleware (\texttt{auth.js}, \texttt{roleGuard.js}).
  \item \textbf{Stage 4 -- Document Upload and Inspection Pipeline:} Integration of Multer memory storage, Cloudinary object streaming, and automated document analysis for page counting and blank-page detection.
  \item \textbf{Stage 5 -- Dynamic Cost Estimation and Payments:} Construction of deterministic pricing algorithms, Razorpay webhook verification, and internal digital wallet debiting backed by MongoDB ACID transactions.
  \item \textbf{Stage 6 -- Composite Priority Queue and Staff Dashboard:} Implementation of the anti-starvation priority queue engine and the counter operator dashboard.
  \item \textbf{Stage 7 -- Hardware Integration via Desktop Print Agent:} Development of the Electron desktop application, Windows PowerShell printer discovery, signed URL retrieval, and \texttt{pdf-to-printer} spooling.
  \item \textbf{Stage 8 -- Real-Time Engine, Scheduling, and PWA:} Implementation of Socket.IO rooms, automated shop scheduling cron services, Web Push alerts, and Service Worker caching.
  \item \textbf{Stage 9 -- Verification, Security Hardening, and Deployment:} Execution of 120 automated Selenium test cases, Helmet security hardening, rate limiting, and production cloud hosting.
\end{enumerate}

\section{5.2 USER STORIES}
User stories define system features from the direct perspective of each operational stakeholder.

\begin{enumerate}[leftmargin=0.35in, itemsep=4pt]
  \item \textbf{User Story US-01 (Student Remote Order):}
    \begin{itemize}[itemsep=1pt]
      \item \textit{Narrative:} As a Student, I want to upload my seminar report PDF from my smartphone and select double-sided printing, so that I do not have to wait in the physical counter queue.
      \item \textit{Acceptance Criteria:} Given an authenticated student account, when a PDF document is uploaded, then the system automatically detects page count, calculates the 15\% duplex discount, displays the cost breakdown, and updates the queue status upon payment.
    \end{itemize}
  \item \textbf{User Story US-02 (Faculty Priority Printing):}
    \begin{itemize}[itemsep=1pt]
      \item \textit{Narrative:} As a Faculty member, I want my examination question papers to receive prioritized counter processing, so that academic timelines are strictly maintained.
      \item \textit{Acceptance Criteria:} Given an active Faculty session, when an order is created, then the priority engine automatically assigns a base score of 100 (higher than student base of 200), positioning the order near the front of the staff queue board.
    \end{itemize}
  \item \textbf{User Story US-03 (Counter Staff OTP Verification):}
    \begin{itemize}[itemsep=1pt]
      \item \textit{Narrative:} As a Counter Staff operator, I want to verify a 4-digit pickup code before handing over printed documents, so that orders are never delivered to the wrong individual.
      \item \textit{Acceptance Criteria:} Given an order in \texttt{ReadyForPickup} status, when the staff inputs the customer's 4-digit OTP, then the backend validates the code and transitions status to \texttt{Completed}; invalid OTP attempts return an error without releasing the job.
    \end{itemize}
  \item \textbf{User Story US-04 (Admin Dynamic Pricing):}
    \begin{itemize}[itemsep=1pt]
      \item \textit{Narrative:} As an Administrator, I want to update paper and binding tariffs on the live system, so that prices reflect changes in institutional procurement costs without server restarts.
      \item \textit{Acceptance Criteria:} Given an authenticated Admin role, when the tariff configuration is updated via the dashboard, then new rates are committed immediately to \texttt{SystemConfig} and reflected in all subsequent order estimations.
    \end{itemize}
  \item \textbf{User Story US-05 (Collaborative Split Payment):}
    \begin{itemize}[itemsep=1pt]
      \item \textit{Narrative:} As a Project Team Leader, I want to split a ₹300 project documentation printing cost equally among three teammates, so that we do not have to collect cash manually.
      \item \textit{Acceptance Criteria:} Given an active group order, when split requests are dispatched, then each participant's wallet is debited by ₹100 atomically upon individual approval; the order enters the active queue only after all shares are successfully settled.
    \end{itemize}
\end{enumerate}

\section{5.3 TEST PLAN}
The testing strategy for REPOSYS was formulated to validate end-to-end reliability, financial consistency, role security, and real-time state synchronization across all 39 documented system features.

\subsection{5.3.1 Testing Levels and Scope}
\begin{enumerate}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{Unit Testing:} Verification of isolated mathematical algorithms in \texttt{pricingService.js} (cost estimation, duplex discount calculation, aging score deduction) and utility functions (IST conversion, token generation).
  \item \textbf{Integration Testing:} Verification of inter-service contracts, including Express middleware pipelines, Cloudinary stream uploads, Razorpay webhook signature verification, and Socket.IO room broadcast relays.
  \item \textbf{System and End-to-End Testing:} Automated browser-driven operational tests simulating full customer journeys from registration to pickup using Python Selenium WebDriver.
  \item \textbf{Security and Penetration Testing:} Boundary verification evaluating CORS rules, Helmet header protections, rate limiting against brute-force attacks, and prevention of privilege escalation across protected API routes.
  \item \textbf{User Acceptance Testing (UAT):} Evaluation conducted by student representatives and counter staff during pilot deployment to assess operational usability.
\end{enumerate}

\subsection{5.3.2 Test Automation Architecture}
Automated end-to-end testing was implemented using a dedicated Python Selenium framework located in \texttt{selenium-tests/}. The framework is structured into modular layers:
\begin{itemize}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{Page Object Model (POM):} Encapsulates web elements and UI interactions into reusable page classes (\texttt{login\_page.py}, \texttt{register\_page.py}).
  \item \textbf{Driver Harness (\texttt{driver.py} \& \texttt{conftest.py}):} Configures headless Chrome sessions, sets implicit wait thresholds, and captures automatic PNG screenshots upon assertion failure.
  \item \textbf{Pytest HTML Test Runner:} Generates comprehensive execution reports (\texttt{scrms\_test\_report.html}) capturing test status, timing, and stack traces.
\end{itemize}

\subsection{5.3.3 Entry and Exit Criteria}
\begin{itemize}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{Test Entry Criteria:} All backend route controllers, frontend views, and database collections deployed to a stable staging environment with seeded administrative accounts.
  \item \textbf{Test Exit Criteria:} Minimum 90\% pass rate across all automated test cases, zero critical security vulnerabilities on role access guards, and verified ACID consistency on wallet transactions.
\end{itemize}
"""
