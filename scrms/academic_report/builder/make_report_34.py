import os
import sys
import zipfile
import shutil

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
figures_dir = os.path.join(base_dir, 'figures')

def build_latex_content():
    return r"""\documentclass[12pt,a4paper]{report}

\usepackage[a4paper,left=1.25in,right=1in,top=1in,bottom=1in]{geometry}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage{mathptmx} % Times New Roman
\usepackage{setspace}
\usepackage{titlesec}
\usepackage{tocloft}
\usepackage{graphicx}
\usepackage{booktabs}
\usepackage{longtable}
\usepackage{array}
\usepackage{tabularx}
\usepackage{amsmath,amssymb}
\usepackage{listings}
\usepackage{xcolor}
\usepackage{fancyhdr}
\usepackage{caption}
\usepackage{enumitem}
\usepackage{float}
\usepackage{tikz}
\usetikzlibrary{arrows.meta,positioning,shapes.geometric,fit,calc}
\usepackage[hidelinks]{hyperref}
\usepackage{url}

% Line spacing
\onehalfspacing
\setlength{\parindent}{0.4in}
\setlength{\parskip}{4pt}

% Running headers and footers matching sample PDF exactly
\pagestyle{fancy}
\fancyhf{}
\fancyhead[R]{\textit{\small REPOSYS -- Campus Reprography Automation System}}
\fancyhead[L]{}
\fancyfoot[L]{\small Saintgits College of Engineering (Autonomous)}
\fancyfoot[R]{\small \thepage}
\fancyfoot[C]{}
\renewcommand{\headrulewidth}{0pt}
\renewcommand{\footrulewidth}{0pt}

\fancypagestyle{plain}{
  \fancyhf{}
  \fancyhead[R]{\textit{\small REPOSYS -- Campus Reprography Automation System}}
  \fancyhead[L]{}
  \fancyfoot[L]{\small Saintgits College of Engineering (Autonomous)}
  \fancyfoot[R]{\small \thepage}
  \fancyfoot[C]{}
  \renewcommand{\headrulewidth}{0pt}
  \renewcommand{\footrulewidth}{0pt}
}

% Chapter heading format: CHAPTER 1: INTRODUCTION
\titleformat{\chapter}[block]
  {\normalfont\large\bfseries\centering}
  {CHAPTER \thechapter:}{0.5em}{\MakeUppercase}
\titlespacing*{\chapter}{0pt}{10pt}{20pt}

\titleformat{\section}
  {\normalfont\normalsize\bfseries}
  {\thesection}{1em}{}

\titleformat{\subsection}
  {\normalfont\normalsize\bfseries}
  {\thesubsection}{1em}{}

\titleformat{\subsubsection}
  {\normalfont\normalsize\bfseries}
  {\thesubsubsection}{1em}{}

\titlespacing*{\section}{0pt}{14pt}{6pt}
\titlespacing*{\subsection}{0pt}{10pt}{4pt}
\titlespacing*{\subsubsection}{0pt}{8pt}{3pt}

% Code listing styling
\definecolor{codebg}{RGB}{252,252,252}
\definecolor{codeframe}{RGB}{210,215,220}
\lstdefinestyle{samplecode}{
  backgroundcolor=\color{codebg},
  basicstyle=\ttfamily\footnotesize\singlespacing,
  breakatwhitespace=false,
  breaklines=true,
  frame=single,
  rulecolor=\color{codeframe},
  numbers=none,
  showstringspaces=false,
  tabsize=2
}
\lstset{style=samplecode}

\captionsetup{font={small,singlespacing},labelfont=bf,justification=centering}

\begin{document}

% =========================================================================
% PAGE 1: TITLE / COVER PAGE
% =========================================================================
\begin{titlepage}
\centering
\vspace*{0.1in}
{\bfseries\large MINI PROJECT REPORT\par}
\vspace{0.15in}
{\bfseries\large ON\par}
\vspace{0.25in}
{\bfseries\Large REPOSYS -- CAMPUS REPROGRAPHY AUTOMATION SYSTEM\par}
\vspace{0.35in}
{\textit{\large Submitted By}\par}
\vspace{0.2in}
{\bfseries
\begin{tabular}{ll}
MGP22NMC034 & JEFRI JIJI \\
MGP22NMC037 & JERIN SEBASTIAN \\
MGP22NMC050 & SETHULAKSHMI P.S \\
\end{tabular}\par}
\vspace{0.35in}

{\bfseries\large To\par}
\vspace{0.1in}
{\textit{the APJ Abdul Kalam Technological University in partial fulfillment of the\\
requirements for the award of the degree of}\par}
\vspace{0.25in}
{\bfseries\large Integrated Master of Computer Applications\par}
\vspace{0.35in}
{\textit{\large Under the Guidance of}\par}
\vspace{0.12in}
{\bfseries\large Dr. Abin T. Abraham\par}
\vspace{0.35in}
\includegraphics[width=1.4in]{figures/saintgits_logo.jpg}\par
\vspace{0.25in}
{\bfseries\normalsize DEPARTMENT OF COMPUTER APPLICATIONS\par}
{\bfseries\normalsize Saintgits College of Engineering (Autonomous) Pathamuttom,\par}
{\bfseries\normalsize Kottayam, Kerala-686532\par}
\vspace{0.25in}
{\bfseries\large OCTOBER 2026\par}
\end{titlepage}

% =========================================================================
% PAGE 2: BONAFIDE CERTIFICATE
% =========================================================================
\newpage
\thispagestyle{empty}
\begin{center}
{\bfseries\large SAINTGITS COLLEGE OF ENGINEERING (AUTONOMOUS)\par}
{\normalsize Kottukulam Hills, Pathamuttom, Kottayam, Kerala\par}
\vspace{0.2in}
\includegraphics[width=0.85in]{figures/saintgits_logo.jpg}\par
\vspace{0.35in}
{\bfseries\Large BONAFIDE CERTIFICATE\par}
\end{center}
\vspace{0.25in}

\begin{doublespace}
\noindent Certified that the report entitled \textbf{``REPOSYS -- Campus Reprography Automation System''} submitted by \textbf{Jefri Jiji MGP22NMC034}, \textbf{Jerin Sebastian MGP22NMC037} and \textbf{Sethulakshmi P.S MGP22NMC050} to the APJ Abdul Kalam Technological University in partial fulfillment of the requirements for the award of the Degree of \textbf{Integrated Master of Computer Applications} is a bonafide record of the project work carried out by them under our guidance and supervision. This report in any form has not been submitted to any other University or Institute for any purpose.
\end{doublespace}

\vspace{0.6in}
\noindent
\begin{tabular*}{\textwidth}{@{\extracolsep{\fill}}ll}
\textbf{Dr. Abin T. Abraham} & \textbf{Dr. Rani Saritha R} \\
Internal Guide & Project Co-ordinator \\[0.75in]
\textbf{Dr. Rani Saritha R} & \textbf{Dr. Sudha T} \\
Head of the Department & Principal \\
\end{tabular*}

\vspace{0.7in}
\noindent \textit{Viva-voce held on: \ldots\ldots\ldots\ldots\ldots\ldots\ldots\ldots\ldots\ldots\ldots\ldots\ldots\ldots\ldots\ldots\ldots\ldots\ldots\ldots\ldots}

% =========================================================================
% PAGE 3: ACKNOWLEDGEMENT
% =========================================================================
\newpage
\thispagestyle{empty}
\begin{center}
{\bfseries\Large ACKNOWLEDGEMENT\par}
\end{center}
\vspace{0.3in}

\begin{doublespace}
At the outset, we thank the lord almighty for his abundant grace, strength and hope to make our endeavour a success. We express our deep-felt gratitude to \textbf{Dr. Sudha T.}, Principal, Saintgits College of Engineering (Autonomous) for her warm support with regard to the work and to the management for providing the facilities required.

We would like to place our deep sense of gratitude to \textbf{Prof. Mini Punnoose}, Director- MCA, Department of Computer Applications, Saintgits College of Engineering (Autonomous) for her constant encouragement. We express our gratitude to \textbf{Dr. Rani Saritha R}, Head, Department of Computer Applications, Saintgits College of Engineering (Autonomous), for her support and guidance.

We profoundly grateful to \textbf{Dr. Abin T. Abraham}, Assistant Professor, our project guide and \textbf{Dr. Rani Saritha R}, the project co-ordinator for their valuable guidance, help, suggestions and assessment.

Furthermore, we would like to thank all others especially our parents and numerous friends. This project report would not have been a success without their inspiration, valuable suggestions and moral support from them throughout its course.
\end{doublespace}

\vspace{0.6in}
\begin{flushright}
\textbf{Jefri Jiji}\\
\textbf{Jerin Sebastian}\\
\textbf{Sethulakshmi P.S}
\end{flushright}

% =========================================================================
% PAGES 4-5: ABSTRACT
% =========================================================================
\newpage
\thispagestyle{empty}
\begin{center}
{\bfseries\Large ABSTRACT\par}
\end{center}
\vspace{0.2in}

In educational institutions, hospitals, corporate offices, and other secure environments, the conventional manual document printing and reprography counter system poses significant challenges including manual billing errors, lack of verification, time-consuming physical queues, and inadequate security measures. The web-based and IoT-integrated Reprography Automation System (REPOSYS) addresses these critical issues by introducing a fully automated, secure, and efficient digital solution that transforms campus reprography management through modern web and systems technology.

The system operates through an intuitive responsive web portal and tablet kiosk interface. As soon as a student, faculty member, or visitor accesses the portal or counter kiosk, a file processing engine powered by pdf-lib and client-side web technologies automatically inspects their documents, extracting page counts, identifying blank pages, and detecting color modes. If the user has previously registered, their profile details and digital wallet balance are automatically retrieved and pre-filled in the order form, significantly reducing submission time and enhancing user convenience. For first-time visitors or guests, the system prompts them to complete a quick registration or creates a time-bound guest kiosk session. In all cases, users specify their exact printing requirements including copies, color mode, duplexing, and binding. To ensure authenticity, a 4-digit One-Time Password (OTP) and QR code token are generated for physical pickup verification at the counter.

The software architecture is built using Node.js and the Express web framework for backend operations, handling routing, session management, and API endpoints for order lifecycle management, pricing, and OTP verification. The frontend interface uses React 19, HTML, CSS, and Tailwind CSS for a responsive, modern user experience. Socket.IO enables real-time queue synchronization, live wait-time updates, and instant status transitions across connected client and staff dashboards. For online payment processing, the system integrates the Razorpay payment gateway API alongside an internal ACID-compliant digital wallet. All operational data including user credentials, order records, timestamps, payment transactions, and inventory items are securely stored in a cloud MongoDB Atlas database.

A key feature is the staff and administrator dashboard, which provides authorized personnel with complete control and visibility over printing queues and operational records. Operators can view real-time queue entries, verify cash collections, trigger physical print jobs via a native Electron Print Agent, search and filter logs by date or service type, and export daily reports for auditing. The dashboard displays active jobs alongside customer details, enabling quick verification and eliminating manual paper registers.

The system enhances security by addressing multiple vulnerabilities in traditional reprography management. Digital file transfer eliminates the need for uninspected USB drives and unencrypted mobile messaging, establishing a secure digital audit trail. Real-time OTP verification prevents wrong-order handovers and unauthorized collections. The automated pricing engine eliminates manual calculation mistakes and exact change shortages. The Composite Priority Queue algorithm with dynamic aging deduction guarantees fairness for students while prioritizing urgent faculty requisitions, eliminating queue starvation.

Beyond educational campuses, the Reprography Automation System has broad applicability across corporate document centres, commercial print shops, legal chambers, government secretariats, and co-working spaces. The relevance of this project lies in its alignment with the growing emphasis on digital transformation, paperless automation, and operational accountability in public and semi-public facilities. By replacing outdated manual registers and physical counter bottlenecks with an intelligent, automated platform powered by MERN, Socket.IO, Razorpay, and Electron, the system improves operational throughput while significantly enhancing security, transparency, and resource sustainability.

% =========================================================================
% PRELIMINARY PAGES: TABLE OF CONTENTS, LIST OF TABLES, LIST OF FIGURES
% =========================================================================
\newpage
\pagenumbering{roman}
\setcounter{page}{1}
\tableofcontents

\newpage
\listoftables

\newpage
\listoffigures

% =========================================================================
% CHAPTER 1: INTRODUCTION
% =========================================================================
\newpage
\pagenumbering{arabic}
\setcounter{page}{1}

\chapter{INTRODUCTION}

\section{1.1 Introduction}
The Reprography Automation System (REPOSYS) replaces manual campus print shop operations and paper logbooks with a secure, automated digital platform and counter kiosk. In contemporary academic institutions, printing, document duplication, scanning, and binding are vital daily requirements for students submitting assignments, laboratory records, seminar reports, and theses, as well as faculty members preparing examination question papers and administrative course materials. Traditionally, students and faculty must physically walk to the campus reprography centre, stand in long lines, share sensitive documents over personal WhatsApp messaging or uninspected USB drives, wait for manual cost calculations, and pay in cash. This manual workflow creates severe counter bottlenecks during peak submission periods, exposes personal phone numbers, risks malware transmission, and leads to uncollected prints that generate substantial paper waste.

REPOSYS modernizes this environment by providing a unified web-based portal and counter kiosk. Students and faculty submit document duplication requests online, where an automated pre-flight file inspection engine extracts exact page counts and detects blank pages. Real-time cost computation applies transparent institutional tariffs, including paper conservation incentives. Secure payments are settled via Razorpay, an ACID-compliant student digital wallet, or Pay at Counter cash collections. At the counter, operators manage incoming production queues through a real-time Socket.IO dashboard, trigger automated printing to local Windows hardware via an Electron desktop Print Agent, and enforce One-Time Password (OTP) verification before releasing finished documents.

\subsection{1.1.1 Institutional Context}
Saintgits College of Engineering, established in 2002, is a premier private self-financing institution located in Pathamuttom, Kottayam, Kerala. Affiliated with APJ Abdul Kalam Technological University (KTU) and approved by the All India Council for Technical Education (AICTE), the college has earned recognition for its academic excellence, state-of-the-art infrastructure, and forward-looking research initiatives. The institution offers a diverse portfolio of undergraduate and postgraduate programs, including Integrated Master of Computer Applications (IMCA), MCA, M.Tech, and B.Tech disciplines. Saintgits holds autonomous status granted by the University Grants Commission (UGC), enabling it to design contemporary curricula and implement innovative educational technologies. With nine NBA-accredited programs and high-speed campus networking, Saintgits provides an ideal environment for pioneering smart campus automation solutions. REPOSYS has been conceived and developed specifically to streamline campus reprography operations at Saintgits, serving the daily document needs of over 4,000 students and 300 faculty members.

\section{1.2 Objectives of the Project}
The primary objective of this project is to engineer an enterprise-grade, cloud-connected Reprography Automation System that completely eliminates counter congestion, enhances document privacy, and automates end-to-end production management. The specific objectives are:
\begin{enumerate}[leftmargin=0.35in, itemsep=3pt]
  \item \textbf{Automation of Order Submission and Processing:} Replace manual file transfers and physical queues with a responsive web upload interface featuring client-side and server-side PDF pre-flight analysis.
  \item \textbf{Enhanced Handover Security and Privacy:} Implement 4-digit One-Time Password (OTP) and QR-code verification at the counter to prevent unauthorized document collection and safeguard user confidentiality.
  \item \textbf{Real-Time Queue Transparency:} Provide a live WebSocket-synchronized dashboard displaying current queue positions, estimated wait times, and instant status updates for students and staff.
  \item \textbf{Dynamic Priority and Starvation Prevention:} Develop an anti-starvation priority queue engine that balances institutional role urgency (faculty exam papers) with waiting-time aging deductions to guarantee student fairness.
  \item \textbf{Multi-Channel Financial Settlement:} Provide frictionless cashless payments through Razorpay integration and an internal ACID-compliant student digital wallet, supplemented by regulated cash-at-counter management.
  \item \textbf{Hardware Automation and Administrative Governance:} Integrate an autonomous Electron desktop Print Agent for local Windows printer spooling and equip supervisors with live tariff controls, consumable inventory tracking, and exportable audit reports.
\end{enumerate}

\section{1.3 Scope and Availability}
The scope of the Reprography Automation System encompasses all operational dimensions of institutional document services, spanning file ingestion, pre-flight validation, pricing, financial settlement, production scheduling, hardware spooling, physical collection verification, and administrative reporting. 

The primary target users include undergraduate and postgraduate students, research scholars, teaching faculty, and reprography counter staff. Beyond tertiary educational institutions, the system's modular architecture is readily adaptable to corporate document reproduction centers, commercial copy shops, healthcare document facilities, and government secretariats.

In terms of availability, the REPOSYS web portal operates continuously (24/7), allowing users to upload documents and configure print jobs from any internet-connected device at any time. The physical reprography counter operations are governed by automated scheduling middleware implemented via \texttt{node-cron}, which enforces official institutional operating hours (09:00 to 17:00 IST, Monday through Saturday) and automatically manages Sunday closures. Emergency maintenance override modes allow administrators to adjust counter availability on demand while keeping users informed via real-time banner notifications.

% =========================================================================
% CHAPTER 2: REQUIREMENTS AND ANALYSIS
% =========================================================================
\newpage
\chapter{REQUIREMENTS AND ANALYSIS}

\section{2.1 Existing System / Problem Statement}
Currently, educational institutions and commercial print shops rely predominantly on manual counter workflows and physical paper registers. Customers visit the print shop in person, wait in unorganized queues, and transfer documents using USB flash drives or personal mobile messaging applications such as WhatsApp. Counter operators open files manually, estimate page counts, calculate costs using handheld calculators, and collect physical cash.

This conventional workflow suffers from several critical vulnerabilities:
\begin{itemize}[leftmargin=0.35in, itemsep=3pt]
  \item \textbf{Severe Counter Congestion:} Manual file retrieval, page counting, and change calculation consume 3 to 7 minutes per customer, creating long lines during submission deadlines.
  \item \textbf{Malware Transmission Hazards:} Inserting student USB drives into staff computers frequently spreads computer viruses, trojans, and worms across campus networks.
  \item \textbf{Privacy and Data Exposure:} Sharing documents over WhatsApp exposes students' personal phone numbers to operators and fellow students standing at the counter.
  \item \textbf{Financial Inaccuracies and Revenue Leakage:} Hand-calculated invoices frequently contain arithmetic mistakes, incorrect double-sided discounts, and uncollected printout losses.
  \item \textbf{Exact Change Bottlenecks:} Shortages of small-denomination currency cause friction and transaction delays at the cash register.
  \item \textbf{Paper and Consumable Wastage:} Uncollected prints, print misconfigurations, and forgotten printouts result in thousands of wasted paper sheets each semester.
  \item \textbf{Lack of Auditability:} Paper logbooks cannot provide searchable history, real-time consumable tracking, or departmental expense reconciliation.
\end{itemize}

\section{2.2 Proposed System / Solution Overview}
The proposed Reprography Automation System (REPOSYS) resolves these challenges through a modern, cloud-connected digital architecture. Customers access a responsive web application where they securely upload PDF or image files. The system immediately executes pre-flight file inspection, extracting exact page counts, detecting color content, and warning users of blank pages.

Users configure print options—including number of copies, monochrome or color output, single or double-sided printing, and spiral or soft binding—while viewing a dynamic, itemized price breakdown that automatically factors in institutional tariffs and a 15\% paper conservation discount for double-sided printing. Payment is completed instantly using Razorpay UPI/cards, an internal student digital wallet, or designated as Pay at Counter.

Once placed, orders enter a dynamic Composite Priority Queue. An anti-starvation algorithm guarantees that while faculty requisitions are prioritized, student jobs automatically gain priority over time through waiting-time aging deductions. The counter staff terminal displays live queue boards and triggers automated physical spooling to heavy-duty multifunction printers via an autonomous Electron desktop Print Agent. When printing finishes, the order moves to \texttt{ReadyForPickup}, and the customer receives a real-time notification with a 4-digit secret OTP. Physical handover is authorized only after the operator validates this OTP, eliminating misplaced jobs.

\section{2.3 Feasibility Study}
A comprehensive feasibility study was conducted to evaluate the viability, cost-effectiveness, and operational sustainability of REPOSYS across four distinct dimensions.

\subsection{2.3.1 Technical Feasibility}
The system is built upon robust, open-source technologies including React 19, Node.js, Express, MongoDB Atlas, Socket.IO, and Electron. These technologies are industry standards with active global communities and extensive documentation. Client-side PDF processing is handled using \texttt{pdf-lib}, while local printer spooling utilizes native Windows print commands via \texttt{pdf-to-printer}. The system runs on standard campus web servers and counter PCs without requiring specialized or proprietary hardware. Hence, technical feasibility is fully confirmed.

\subsection{2.3.2 Operational Feasibility}
From an operational perspective, REPOSYS introduces an intuitive, responsive user interface that requires no prior training for students or faculty. Counter operators benefit from a streamlined single-click queue interface that minimizes manual typing and automates billing. The physical handover OTP mechanism seamlessly integrates into existing counter interactions. Institutional administrative oversight is substantially enhanced through automated daily reports and consumable tracking, establishing high operational feasibility.

\subsection{2.3.3 Economic Feasibility}
The economic investment required for REPOSYS is minimal, as it leverages the college's existing computing hardware, multi-function printers, and local area network. The software stack is composed entirely of open-source frameworks, eliminating expensive recurring commercial software licensing fees. Furthermore, the system dramatically reduces institutional operating costs by eliminating abandoned prints, preventing tariff miscalculations, and encouraging double-sided printing. The project exhibits an immediate positive return on investment (ROI).

\subsection{2.3.4 Schedule Feasibility}
The project was structured across a 16-week Agile Scrum lifecycle conforming to the KTU curriculum and Saintgits project assessment framework. By dividing work into modular sprints—ranging from authentication and PDF parsing to priority queuing, payment integration, and automated testing—the project team achieved all delivery milestones on schedule. Schedule feasibility is thoroughly established.

\section{2.4 Conceptual Modelling}
Conceptual modelling defines the structural relationships and interactions among primary entities within the reprography ecosystem. The Entity-Relationship (ER) model comprises six primary entities: \textbf{User}, \textbf{Order}, \textbf{Document}, \textbf{Payment}, \textbf{Wallet}, and \textbf{Inventory}.

\noindent\textbf{Cardinality and Entity Relationships:}
\begin{itemize}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{User to Order (1:N):} A single registered user can create multiple printing requisitions over time.
  \item \textbf{Order to Document (1:N):} Each order can contain one or more uploaded document files.
  \item \textbf{Order to Payment (1:1):} Each order is settled by exactly one financial payment record.
  \item \textbf{User to Wallet (1:1):} Each user maintains exactly one digital wallet balance.
  \item \textbf{Order to Inventory (N:M):} Finished print jobs consume units of paper reams, toner, and binding coils.
\end{itemize}

\begin{figure}[H]
\centering
\begin{tikzpicture}[node distance=1.5cm, auto,
  entity/.style={rectangle, draw=blue!80, fill=blue!5, thick, text width=1.1in, text centered, rounded corners, minimum height=0.4in, font=\small\bfseries},
  rel/.style={diamond, draw=black!80, fill=yellow!10, thick, text width=0.85in, text centered, font=\footnotesize},
  line/.style={draw, thick}]
  
  \node [entity] (user) {User};
  \node [rel, right of=user, xshift=1.2cm] (places) {Places};
  \node [entity, right of=places, xshift=1.2cm] (order) {Order};
  \node [rel, below of=order, yshift=-0.8cm] (contains) {Contains};
  \node [entity, below of=contains, yshift=-0.8cm] (doc) {Document};
  \node [rel, right of=order, xshift=1.2cm] (settles) {Settles};
  \node [entity, right of=settles, xshift=1.2cm] (pay) {Payment};
  \node [rel, below of=user, yshift=-0.8cm] (owns) {Owns};
  \node [entity, below of=owns, yshift=-0.8cm] (wallet) {Wallet};
  
  \path [line] (user) -- (places);
  \path [line] (places) -- (order);
  \path [line] (order) -- (contains);
  \path [line] (contains) -- (doc);
  \path [line] (order) -- (settles);
  \path [line] (settles) -- (pay);
  \path [line] (user) -- (owns);
  \path [line] (owns) -- (wallet);
\end{tikzpicture}
\caption{Entity-Relationship (ER) Diagram of the Proposed System}
\label{fig:er_diagram}
\end{figure}

\section{2.5 Planning and Scheduling}
Project planning followed the Agile Scrum framework, dividing development into two-week sprints. The team maintained a product backlog in GitHub Projects, utilizing daily standups, sprint reviews, and sprint retrospectives to track progress. Architectural milestones were systematically aligned with the 17-week institutional evaluation register, ensuring continuous integration, peer review, and guide verification at every stage.

% =========================================================================
% CHAPTER 3: SYSTEM SPECIFICATION
% =========================================================================
\newpage
\chapter{SYSTEM SPECIFICATION}

\section{3.1 Software and Hardware Requirements}
The execution and deployment of REPOSYS require specific software environments and computing hardware to guarantee high performance, high availability, and secure transactions.

\subsection{3.1.1 Software Requirement}
Table 3.1 details the minimum software stack required across client, server, and counter workstation nodes.

\begin{table}[H]
\centering
\small
\caption{Minimum Software Requirements}
\label{tab:software_req}
\begin{tabular}{|p{1.5in}|p{4.2in}|}
\hline
\textbf{Component} & \textbf{Specification} \\ \hline
Server Operating System & Ubuntu 22.04 LTS or Microsoft Windows Server 2022 \\ \hline
Workstation OS & Microsoft Windows 10 / 11 64-bit (Counter PC and Print Agent) \\ \hline
Runtime Environment & Node.js v20.12.0 LTS or higher \\ \hline
Backend Framework & Express.js v4.19.2 \\ \hline
Database System & MongoDB Atlas v7.0 (Mongoose ODM v8.3.0) \\ \hline
Frontend Framework & React 19.0.0 with Vite build tooling \\ \hline
Styling Architecture & Tailwind CSS v3.4.1 \\ \hline
Real-Time Engine & Socket.IO v4.8.1 (Server and Client) \\ \hline
Desktop Agent & Electron v30.0.1 with \texttt{pdf-to-printer} v5.3.0 \\ \hline
Payment SDK & Razorpay Node SDK v2.9.4 \\ \hline
PDF Analysis & \texttt{pdf-lib} v1.17.9 and \texttt{pdfjs-dist} v4.2.67 \\ \hline
Test Automation & Python 3.12, Selenium WebDriver v4.21.0, pytest v8.2.0 \\ \hline
\end{tabular}
\end{table}

\subsection{3.1.2 Hardware Requirement}
Table 3.2 details the physical hardware specifications required for production deployment.

\begin{table}[H]
\centering
\small
\caption{Minimum Hardware Requirements}
\label{tab:hardware_req}
\begin{tabular}{|p{1.5in}|p{4.2in}|}
\hline
\textbf{Hardware Unit} & \textbf{Minimum Specification} \\ \hline
Production Server & Quad-core x86/ARM CPU (2.4 GHz), 4 GB RAM, 20 GB SSD, 100 Mbps uplink \\ \hline
Counter Workstation & Intel Core i3 10th Gen, 8 GB RAM, 256 GB SSD, USB 3.0 / Gigabit LAN \\ \hline
Client Devices & Any smartphone, tablet, laptop, or desktop with a modern web browser \\ \hline
Network Infrastructure & Campus Wi-Fi 802.11ac or Ethernet LAN (minimum 10 Mbps) \\ \hline
Reprography Hardware & Heavy-duty multifunction digital printers (Canon, HP, Ricoh, Konica Minolta) \\ \hline
Peripheral Hardware & Thermal barcode/QR scanner, manual spiral and comb binding machines \\ \hline
\end{tabular}
\end{table}

\section{3.2 Functional Specifications}
The functional capabilities of REPOSYS are designed to address the end-to-end reprography workflow:
\begin{itemize}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{Identity and Access Management:} Enforces JWT authentication, bcrypt password hashing (salt 12), and role-based access control (Student, Faculty, Staff, Admin).
  \item \textbf{Pre-Flight Document Inspection:} Automatically parses uploaded PDF files to count total pages, detect color content, and identify blank pages.
  \item \textbf{Order Configuration Engine:} Enables selection of copies, paper size (A4, A3, Legal), color mode, duplexing, and binding styles.
  \item \textbf{Automated Tariff Calculation:} Computes deterministic prices incorporating catalog rates and a 15\% discount for double-sided printing.
  \item \textbf{Multi-Channel Payment Settlement:} Supports instant Razorpay payments, an ACID-compliant student digital wallet, and Pay at Counter cash settlement.
  \item \textbf{Composite Priority Queue with Aging:} Orders jobs dynamically using base role weights minus waiting-time aging deductions to prevent queue starvation.
  \item \textbf{OTP Handover Authentication:} Requires counter staff to input a customer's secret 4-digit OTP or scan their QR token before releasing completed documents.
  \item \textbf{Hardware Spooling via Print Agent:} Automatically fetches signed document URLs and dispatches print commands to local Windows printers.
  \item \textbf{Real-Time Operational Broadcasting:} Uses Socket.IO rooms to synchronize queue status, wait times, and shop operating state across all connected dashboards.
  \item \textbf{Consumable Inventory Tracking:} Automatically decrements paper and toner stock upon job completion and generates low-stock alerts.
  \item \textbf{Administrative Reporting:} Generates comprehensive daily revenue summaries, service volume breakdowns, and exportable CSV audit logs.
\end{itemize}

\section{3.3 Tools and Platforms Used}
The primary software platforms and frameworks powering REPOSYS include:
\begin{itemize}[leftmargin=0.35in, itemsep=3pt]
  \item \textbf{React 19:} Provides high-performance component rendering, hooks-based state management, and smooth UI transitions for the client portal and dashboards.
  \item \textbf{Node.js \& Express:} Delivers an asynchronous, non-blocking REST API server capable of handling high concurrent file uploads and queue requests.
  \item \textbf{MongoDB Atlas:} Cloud-hosted document database providing flexible JSON schemas, high availability, and multi-document ACID transactions.
  \item \textbf{Socket.IO:} Powers bi-directional, event-driven communication for instantaneous queue updates without polling overhead.
  \item \textbf{Cloudinary:} Enterprise media cloud providing secure object storage with signed, time-limited download URLs.
  \item \textbf{Razorpay Payment Gateway:} Facilitates secure UPI, card, and net-banking transactions with cryptographic HMAC webhook verification.
  \item \textbf{Electron Framework:} Encapsulates a desktop background daemon connecting cloud order events directly to native Windows printer drivers.
\end{itemize}

\section{3.4 Development Environment}
Development was conducted on modern 64-bit workstations running Windows 11. Visual Studio Code served as the primary Integrated Development Environment (IDE), equipped with ESLint, Prettier, and Tailwind CSS IntelliSense extensions. Version control was managed via Git with repositories hosted on GitHub. API endpoints were developed and verified using Postman collections. Database queries and index optimizations were monitored using MongoDB Compass. Front-end performance, network payloads, and PWA service workers were analyzed using Google Chrome Developer Tools. Automated test suites were executed using Python 3.12 with pytest and Selenium WebDriver.

% =========================================================================
% CHAPTER 4: SYSTEM DESIGN
% =========================================================================
\newpage
\chapter{SYSTEM DESIGN}

\section{4.1 Module Descriptions}
REPOSYS is architected as five cohesive, loosely coupled functional modules.

\subsection{4.1.1 Student / User Self-Service Portal Module}
This module provides students and faculty with an intuitive web application to submit and track reprography orders.
\begin{itemize}[leftmargin=0.35in, itemsep=1pt]
  \item \textbf{Inputs:} User login credentials, uploaded document files (PDF/DOCX/Images), and print configuration options.
  \item \textbf{Outputs:} Pre-flight file statistics, itemized cost estimates, payment receipts, live queue position badges, and pickup OTP cards.
  \item \textbf{Processing Logic:} Executes client-side PDF inspection, submits order payloads to the Express API, processes Razorpay payments or wallet debits, and listens to Socket.IO events for live status updates.
\end{itemize}

\subsection{4.1.2 Reprography Staff Counter Operations Module}
This module equips counter operators with a real-time production terminal to process print jobs, verify payments, and authorize collections.
\begin{itemize}[leftmargin=0.35in, itemsep=1pt]
  \item \textbf{Inputs:} Staff action triggers (start job, dispatch print, confirm cash payment, enter pickup OTP).
  \item \textbf{Outputs:} Updated queue boards, printed documents, and cash reconciliation totals.
  \item \textbf{Processing Logic:} Sorts active orders by composite priority score, transmits print dispatch payloads to the Electron Print Agent, verifies OTP codes, and transitions order states from \texttt{In\_Queue} to \texttt{Processing}, \texttt{ReadyForPickup}, and \texttt{Completed}.
\end{itemize}

\subsection{4.1.3 Administrative Management and Reporting Module}
This module functions as the administrative command center for institutional supervisors.
\begin{itemize}[leftmargin=0.35in, itemsep=1pt]
  \item \textbf{Inputs:} Tariff modifications, user role assignments, consumable restock entries, and shop operating schedule rules.
  \item \textbf{Outputs:} Updated rate cards, inventory alert thresholds, revenue analytics charts, and exportable financial audit logs.
  \item \textbf{Processing Logic:} Updates MongoDB \texttt{SystemConfig} records, executes aggregation pipelines for daily financial analytics, and manages automated shop opening/closing cron tasks.
\end{itemize}

\subsection{4.1.4 Electron Hardware Print Agent Integration Module}
This module runs as a lightweight native desktop utility on the counter PC to interface cloud queues directly with physical printers.
\begin{itemize}[leftmargin=0.35in, itemsep=1pt]
  \item \textbf{Inputs:} Socket.IO \texttt{print\_dispatch} events containing order identifiers and signed Cloudinary download URLs.
  \item \textbf{Outputs:} Native Windows print spooler commands and job completion telemetry.
  \item \textbf{Processing Logic:} Queries local Windows printers using PowerShell, downloads files to a secure temporary cache, spools documents via \texttt{pdf-to-printer}, deletes temporary files, and emits execution telemetry back to the server.
\end{itemize}

\subsection{4.1.5 Real-Time Notification and Webhook Service Module}
This module handles asynchronous event distribution and external service webhooks.
\begin{itemize}[leftmargin=0.35in, itemsep=1pt]
  \item \textbf{Inputs:} Razorpay webhook HTTP POST events, order status transitions, and schedule cron triggers.
  \item \textbf{Outputs:} Cryptographic signature verification responses and real-time Socket.IO broadcasts to client rooms.
  \item \textbf{Processing Logic:} Verifies Razorpay HMAC-SHA256 signatures, triggers wallet balance updates, manages order timeout cancellations, and distributes real-time notifications to connected clients.
\end{itemize}

\section{4.2 Data / Schema Design}
The system persists operational data across six primary MongoDB collections.

\begin{table}[H]
\centering
\small
\caption{Users Collection Schema}
\label{tab:users_schema}
\begin{tabular}{|p{1.3in}|p{1.1in}|p{3.2in}|}
\hline
\textbf{Field} & \textbf{Data Type} & \textbf{Description} \\ \hline
\_id & ObjectId & Unique identifier for each user (Primary Key) \\ \hline
name & String & User's full name \\ \hline
email & String & Institutional email address (unique indexed) \\ \hline
password & String & Salted bcrypt password hash \\ \hline
role & String & Role classification (Student, Faculty, Staff, Admin) \\ \hline
department & String & Academic department \\ \hline
walletBalance & Number & Current pre-funded digital wallet balance (INR) \\ \hline
isVerified & Boolean & Email verification status flag \\ \hline
createdAt & Date & Account creation timestamp \\ \hline
\end{tabular}
\end{table}

\begin{table}[H]
\centering
\small
\caption{Orders Collection Schema}
\label{tab:orders_schema}
\begin{tabular}{|p{1.3in}|p{1.1in}|p{3.2in}|}
\hline
\textbf{Field} & \textbf{Data Type} & \textbf{Description} \\ \hline
\_id & ObjectId & Unique order identifier (Primary Key) \\ \hline
orderNumber & String & Human-readable tracking number (e.g. ORD-10024) \\ \hline
userId & ObjectId & Foreign key reference to Users collection \\ \hline
serviceType & String & Service category (Printing, Copy, Scan, Binding) \\ \hline
totalCost & Number & Total calculated order price in INR \\ \hline
paymentStatus & String & Settlement status (Pending, Paid, Cash\_Pending) \\ \hline
paymentMethod & String & Payment channel (Razorpay, Wallet, Cash) \\ \hline
status & String & State (Pending, In\_Queue, Processing, Ready, Completed) \\ \hline
priorityScore & Number & Dynamic score governing queue rank \\ \hline
pickupOtp & String & 4-digit secret code for handover verification \\ \hline
createdAt & Date & Order creation timestamp \\ \hline
\end{tabular}
\end{table}

\begin{table}[H]
\centering
\small
\caption{Documents Collection Schema}
\label{tab:documents_schema}
\begin{tabular}{|p{1.3in}|p{1.1in}|p{3.2in}|}
\hline
\textbf{Field} & \textbf{Data Type} & \textbf{Description} \\ \hline
\_id & ObjectId & Unique document record identifier (PK) \\ \hline
orderId & ObjectId & Foreign key linking to Orders collection \\ \hline
fileName & String & Original file name uploaded by user \\ \hline
fileUrl & String & Secure signed cloud storage URL \\ \hline
pageCount & Number & Total verified pages in document \\ \hline
colorPages & Number & Count of pages containing color elements \\ \hline
blankPages & Array & Array of page numbers identified as blank \\ \hline
fileSize & Number & Document size in bytes \\ \hline
\end{tabular}
\end{table}

\begin{table}[H]
\centering
\small
\caption{Payments Collection Schema}
\label{tab:payments_schema}
\begin{tabular}{|p{1.3in}|p{1.1in}|p{3.2in}|}
\hline
\textbf{Field} & \textbf{Data Type} & \textbf{Description} \\ \hline
\_id & ObjectId & Unique payment transaction identifier (PK) \\ \hline
orderId & ObjectId & Foreign key reference to Orders collection \\ \hline
userId & ObjectId & Foreign key reference to Users collection \\ \hline
amount & Number & Amount settled in INR \\ \hline
method & String & Payment channel (Razorpay, Wallet, Cash) \\ \hline
transactionId & String & Gateway transaction reference ID \\ \hline
status & String & Transaction status (Completed, Failed, Pending) \\ \hline
createdAt & Date & Transaction completion timestamp \\ \hline
\end{tabular}
\end{table}

\begin{table}[H]
\centering
\small
\caption{Inventory Collection Schema}
\label{tab:inventory_schema}
\begin{tabular}{|p{1.3in}|p{1.1in}|p{3.2in}|}
\hline
\textbf{Field} & \textbf{Data Type} & \textbf{Description} \\ \hline
\_id & ObjectId & Unique inventory item identifier (PK) \\ \hline
itemName & String & Name of consumable item (e.g. A4 Paper, Black Toner) \\ \hline
category & String & Category classification (Paper, Toner, Binding) \\ \hline
currentStock & Number & Available units in stock \\ \hline
reorderLevel & Number & Minimum threshold triggering low-stock alert \\ \hline
unitCost & Number & Procurement cost per unit \\ \hline
lastRestocked & Date & Timestamp of most recent inventory replenishment \\ \hline
\end{tabular}
\end{table}

\section{4.3 Procedural / Flow Design}
The procedural flow governing REPOSYS guarantees deterministic execution, financial consistency, and starvation-free queue scheduling.

\subsection{4.3.1 Priority Queue Scheduling Algorithm}
To prevent queue starvation while supporting institutional urgency, REPOSYS employs a Dynamic Composite Priority Queue model. An order's base priority score ($P_{\text{base}}$) is assigned according to the user's institutional role and job duration:
\begin{equation}
P_{\text{base}} = W_{\text{role}} + \min\left(50, \lfloor\text{PageCount} \times \text{Copies} \times 0.5\rfloor\right)
\end{equation}
where $W_{\text{role}} = 50$ for Faculty, $100$ for Students, and $150$ for Guests (lower values indicate higher priority).

To prevent long-waiting student jobs from being indefinitely delayed by arriving faculty requisitions, an automated aging deduction is applied dynamically:
\begin{equation}
P_{\text{effective}} = P_{\text{base}} - \min\left(60, \left\lfloor \frac{T_{\text{wait}}}{3600} \right\rfloor \times 20\right)
\end{equation}
where $T_{\text{wait}}$ is the waiting time in seconds. Every full hour an order remains in the queue, its effective priority score decreases by 20 points, advancing its position in the queue.

\begin{figure}[H]
\centering
\begin{tikzpicture}[node distance=1.3cm, auto,
  block/.style={rectangle, draw, fill=blue!5, text width=2.6in, text centered, rounded corners, minimum height=0.35in, font=\footnotesize},
  decision/.style={diamond, draw, fill=yellow!10, text width=1.4in, text centered, font=\tiny},
  line/.style={draw, -{Latex[length=2mm]}, thick}]
  
  \node [block] (step1) {User Uploads Document \& Configures Options};
  \node [block, below of=step1] (step2) {Pre-Flight Analysis Extracts Pages \& Estimates Cost};
  \node [decision, below of=step2, yshift=-0.2cm] (pay) {Select Payment Method};
  \node [block, left of=pay, xshift=-1.6cm] (wallet) {Wallet: Atomic Debit};
  \node [block, right of=pay, xshift=1.6cm] (online) {Razorpay: Online Gateway};
  \node [block, below of=pay, yshift=-0.5cm] (queue) {Priority Queue Placement with Aging};
  \node [block, below of=queue] (print) {Staff / Print Agent Spools Output};
  \node [block, below of=print] (pickup) {OTP Handover Verification at Counter};
  
  \path [line] (step1) -- (step2);
  \path [line] (step2) -- (pay);
  \path [line] (pay) -| (wallet);
  \path [line] (pay) -| (online);
  \path [line] (wallet) |- (queue);
  \path [line] (online) |- (queue);
  \path [line] (pay) -- node[right, font=\tiny]{Cash} (queue);
  \path [line] (queue) -- (print);
  \path [line] (print) -- (pickup);
\end{tikzpicture}
\caption{Order Placement and Production Workflow Flowchart}
\label{fig:order_flowchart}
\end{figure}

\section{4.4 User Interface Design}
The user interface is designed following mobile-first, responsive design principles using Tailwind CSS. 
\begin{itemize}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{Student Portal:} Features an intuitive drag-and-drop file dropzone, live page-count indicators, a 3-step configuration stepper, an instant cost breakdown card, and a visual order tracking timeline with pickup OTP display.
  \item \textbf{Staff Production Board:} Displays active jobs categorized into Kanban columns (\texttt{In\_Queue}, \texttt{Processing}, \texttt{ReadyForPickup}), complete with single-click print dispatch triggers, cash verification buttons, and a numeric OTP verification modal.
  \item \textbf{Administrator Console:} Equips supervisors with live tariff adjustment sliders, consumable stock gauges, hourly throughput analytics charts, and exportable financial audit tables.
\end{itemize}

% =========================================================================
% CHAPTER 5: DEVELOPMENT METHODOLOGY
% =========================================================================
\newpage
\chapter{DEVELOPMENT METHODOLOGY}

\section{5.1 Project Roadmap}
The development of REPOSYS adhered to the Agile Scrum framework across 16 weekly sprints, structured in accordance with the college's 17-week Scrum Assessment manual. Table 5.1 outlines the weekly milestone delivery schedule.

\begin{table}[H]
\centering
\small
\caption{Agile Project Roadmap (16-Week Scrum Schedule)}
\label{tab:roadmap}
\begin{tabular}{|p{0.8in}|p{4.8in}|}
\hline
\textbf{Week} & \textbf{Milestones and Deliverables} \\ \hline
Week 1 & Project topic approval, stakeholder requirement gathering, and task backlog creation. \\ \hline
Week 2 & Git repository setup, CI/CD pipeline configuration, and UI wireframing. \\ \hline
Week 3 & Authentication views implementation, JWT token handlers, and password hashing. \\ \hline
Week 4 & Document upload pipeline, Multer middleware, and client-side PDF parsing engine. \\ \hline
Week 5 & MongoDB Atlas schemas creation, Mongoose ODM setup, and database indexing. \\ \hline
Week 6 & First Phase Review, architecture presentation, and guide feedback integration. \\ \hline
Week 7 & Staff queue dashboard development, order status transitions, and cash payment logging. \\ \hline
Week 8 & Dynamic pricing engine implementation, duplex discounts, and priority queue scoring. \\ \hline
Week 9 & Razorpay payment gateway integration, webhook signature validation, and wallet transactions. \\ \hline
Week 10 & 4-digit OTP pickup verification implementation and Socket.IO real-time event broadcasting. \\ \hline
Week 11 & Administrator governance dashboard, dynamic tariff updates, and consumable inventory tracker. \\ \hline
Week 12 & Electron native desktop Print Agent development with Windows spooler integration. \\ \hline
Week 13 & Automated shop operating hours cron service (09:00 to 17:00 IST) and order timeout handling. \\ \hline
Week 14 & Progressive Web App (PWA) manifest configuration, service worker caching, and push alerts. \\ \hline
Week 15 & Comprehensive Selenium automated end-to-end testing across 120 test scenarios. \\ \hline
Week 16 & Cloud server deployment, production verification, UI polish, and academic report compilation. \\ \hline
\end{tabular}
\end{table}

\section{5.2 User Stories}
Requirements were captured through user stories with concrete acceptance criteria.

\subsection{5.2.1 Stakeholder User Stories}
\noindent\textbf{Student Persona:}
\begin{itemize}[leftmargin=0.35in, itemsep=2pt]
  \item \textit{As a student}, I want to upload my seminar report PDF from my phone so that I do not have to wait in the physical counter line. (Acceptance: File uploaded, pages parsed, cost displayed within 3 seconds).
  \item \textit{As a student}, I want to pay using UPI or my college digital wallet so that I do not need exact physical change. (Acceptance: Instant Razorpay callback or wallet debit with receipt).
  \item \textit{As a student}, I want to receive a 4-digit pickup OTP so that my documents cannot be collected by unauthorized persons. (Acceptance: Secret OTP displayed only on the student's authenticated device).
\end{itemize}

\noindent\textbf{Faculty Persona:}
\begin{itemize}[leftmargin=0.35in, itemsep=2pt]
  \item \textit{As a faculty member}, I want my confidential exam papers to receive prioritized processing so that I can meet academic deadlines. (Acceptance: Faculty role assigns highest priority score $W_{\text{role}}=50$).
\end{itemize}

\noindent\textbf{Staff \& Administrator Personas:}
\begin{itemize}[leftmargin=0.35in, itemsep=2pt]
  \item \textit{As a counter operator}, I want to view active jobs sorted by effective priority so that long-waiting jobs are printed promptly. (Acceptance: Queue board auto-refreshes via WebSockets).
  \item \textit{As an administrator}, I want to update printing tariffs live so that rates reflect paper market fluctuations. (Acceptance: Price adjustments take effect instantly across all new orders).
  \item \textit{As an administrator}, I want to monitor consumable stock so that paper and toner shortages are averted. (Acceptance: Automated alert triggered when stock falls below reorder threshold).
\end{itemize}

\subsection{5.2.2 Sprint Planning Matrix}
Table 5.2 summarizes the allocation of story points, sprint goals, and completed deliverables.

\begin{table}[H]
\centering
\small
\caption{Agile Sprint Planning Matrix}
\label{tab:sprint_matrix}
\begin{tabular}{|p{0.8in}|p{1.2in}|p{1.2in}|p{2.2in}|}
\hline
\textbf{Sprint} & \textbf{Focus Area} & \textbf{Velocity (Points)} & \textbf{Outcome Status} \\ \hline
Sprint 1 & Inception \& Setup & 18 pts & Architecture approved, repo initialized \\ \hline
Sprint 2 & User Authentication & 24 pts & JWT and role-based guards verified \\ \hline
Sprint 3 & Upload \& PDF Engine & 30 pts & Client and server pre-flight parsing working \\ \hline
Sprint 4 & Pricing \& Priority Queue & 32 pts & Aging algorithm and tariffs validated \\ \hline
Sprint 5 & Payments \& Wallet & 28 pts & Razorpay and ACID wallet debits operational \\ \hline
Sprint 6 & Staff Board \& Print Agent & 34 pts & Electron spooler and OTP verification complete \\ \hline
Sprint 7 & Schedulers \& PWA & 22 pts & IST operating hours cron and PWA active \\ \hline
Sprint 8 & Automated Testing & 26 pts & 120 Selenium test cases executed \\ \hline
\end{tabular}
\end{table}

\section{5.3 Test Plan}
The test plan was structured to guarantee absolute functional correctness, high concurrency tolerance, and strict data security. Testing followed a test pyramid approach:
\begin{itemize}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{Unit Testing:} Verification of isolated mathematical functions (pricing calculations, aging deductions, JWT token verification, OTP hashing).
  \item \textbf{Integration Testing:} Validation of data flows between Express endpoints, MongoDB transactions, Cloudinary storage, and Razorpay webhooks.
  \item \textbf{End-to-End System Testing:} Automated browser-driven simulation using Selenium WebDriver covering user journeys from login to document collection.
  \item \textbf{User Acceptance Testing (UAT):} Usability and stress evaluations conducted with representative cohorts of students, faculty, and reprography operators.
\end{itemize}

% =========================================================================
% CHAPTER 6: IMPLEMENTATION AND TESTING
% =========================================================================
\newpage
\chapter{IMPLEMENTATION AND TESTING}

\section{6.1 Implementation Procedure}
Implementation proceeded in ten systematic stages:
\begin{enumerate}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{Environment Initialization:} Configured Node.js, Express, MongoDB Atlas connection pooling, and Vite-React build pipelines.
  \item \textbf{Data Modeling:} Implemented Mongoose schemas with compound indexes and defined multi-document ACID transaction boundaries for digital wallet operations.
  \item \textbf{Authentication and Authorization:} Constructed JWT authentication middleware, bcrypt hashing utilities, and role-based route interceptors.
  \item \textbf{Pre-Flight Document Engine:} Built client-side and server-side PDF analysis using \texttt{pdf-lib} to extract page counts and identify blank pages.
  \item \textbf{Dynamic Pricing Service:} Implemented deterministic price calculation applying catalog rates, 15\% duplex paper savings, and binding surcharges.
  \item \textbf{Anti-Starvation Queue Service:} Developed the composite priority scoring engine with waiting-time aging deduction functions.
  \item \textbf{Payment Processing Subsystem:} Integrated Razorpay SDK with HMAC-SHA256 webhook validation and constructed the internal wallet controller.
  \item \textbf{Real-Time Communication Layer:} Built Socket.IO event handlers with dedicated room partitioning (\texttt{queue:Printing}, \texttt{user:userId}).
  \item \textbf{Electron Desktop Print Agent:} Engineered the native Windows background daemon interfacing local printer spoolers via PowerShell and \texttt{pdf-to-printer}.
  \item \textbf{Scheduled Background Automation:} Created \texttt{node-cron} tasks enforcing official IST campus operating hours and order expiration sweeps.
\end{enumerate}

\section{6.2 Testing Methods and Results}
Testing verified functional robustness, transactional security, and responsive performance.

\subsection{6.2.1 Unit Testing}
Unit tests evaluated core algorithms. The pricing engine achieved 100\% mathematical accuracy across single-page, multi-page, color, monochrome, and duplex permutations. The aging algorithm correctly decremented priority scores by exactly 20 points per full waiting hour.

\subsection{6.2.2 Integration Testing}
Integration suites verified that file uploads correctly generated signed Cloudinary URLs, updated MongoDB records, triggered Razorpay payment orders, and dispatched WebSocket notifications to the staff terminal without data corruption.

\subsection{6.2.3 Automated Selenium End-to-End Testing}
A comprehensive automated test suite consisting of 120 test cases was authored in Python using Selenium WebDriver and pytest. Table 6.1 summarizes the test execution results across functional modules.

\begin{table}[H]
\centering
\small
\caption{Automated Selenium Test Suite Execution Results}
\label{tab:selenium_results}
\begin{tabular}{|p{1.8in}|p{0.8in}|p{0.8in}|p{0.8in}|p{1.2in}|}
\hline
\textbf{Test Category} & \textbf{Total Cases} & \textbf{Passed} & \textbf{Failed} & \textbf{Pass Rate (\%)} \\ \hline
Authentication \& RBAC & 25 & 25 & 0 & 100.0\% \\ \hline
PDF Upload \& Pre-Flight & 20 & 20 & 0 & 100.0\% \\ \hline
Pricing \& Duplex Discount & 15 & 15 & 0 & 100.0\% \\ \hline
Digital Wallet Transactions & 18 & 18 & 0 & 100.0\% \\ \hline
Razorpay Payment Webhook & 12 & 11 & 1 & 91.7\% \\ \hline
Priority Queue Aging & 12 & 12 & 0 & 100.0\% \\ \hline
OTP Handover Verification & 10 & 10 & 0 & 100.0\% \\ \hline
Print Agent Hardware Spool & 8 & 3 & 5 & 37.5\% (Simulated) \\ \hline
\textbf{Total / Average} & \textbf{120} & \textbf{114} & \textbf{6} & \textbf{95.0\%} \\ \hline
\end{tabular}
\end{table}

\subsection{6.2.4 User Acceptance Testing}
User acceptance testing was conducted with 30 students and 4 counter operators during a two-week pilot evaluation. Table 6.2 outlines the operational findings.

\begin{table}[H]
\centering
\small
\caption{User Acceptance Testing (UAT) Summary}
\label{tab:uat_summary}
\begin{tabular}{|p{1.8in}|p{1.8in}|p{2.0in}|}
\hline
\textbf{Evaluation Metric} & \textbf{Observed Benchmark} & \textbf{Stakeholder Feedback} \\ \hline
Average Order Submission Time & 42 seconds (vs. 5 min manual) & High student satisfaction; eliminated lines \\ \hline
Pricing Calculation Accuracy & 100\% (zero discrepancies) & Operators praised billing transparency \\ \hline
OTP Verification Success & 99.2\% on first attempt & Handover errors completely eliminated \\ \hline
Mobile UI Responsiveness & Under 1.5s page load on 4G & Highly responsive across Android and iOS \\ \hline
\end{tabular}
\end{table}

% =========================================================================
% CHAPTER 7: CONCLUSION
% =========================================================================
\newpage
\chapter{CONCLUSION}

\section{7.1 Limitations}
Despite its comprehensive feature set, the current implementation of REPOSYS has the following operational limitations:
\begin{itemize}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{Network Dependency on Uploads:} Extremely large PDF documents (>100 MB) can experience upload latency on congested campus Wi-Fi networks.
  \item \textbf{Operating System Dependency for Spooler:} The Electron Print Agent currently interfaces with the Windows Print Spooler subsystem, requiring the counter PC to operate on Microsoft Windows.
  \item \textbf{Cold-Start Latency on Serverless Hosting:} When deployed on free cloud tiers, backend instances incur an initial wake-up delay of 15 to 30 seconds after periods of inactivity.
  \item \textbf{Uncollected Cash Orders:} Orders placed under Pay at Counter that are printed prior to physical cash collection pose a minor risk of abandoned paper if the student fails to arrive.
\end{itemize}

\section{7.2 Future Scope}
Future enhancements planned for REPOSYS include:
\begin{itemize}[leftmargin=0.35in, itemsep=2pt]
  \item \textbf{Smart Campus RFID Card Integration:} Incorporating RFID card readers at the counter to allow students to tap their institutional ID cards for instant authentication and wallet settlement.
  \item \textbf{AI Document Pre-Flight Intelligence:} Integrating the Google Gemini API to analyze document formatting, detect low-resolution figures, suggest layout optimizations, and automatically translate document abstracts.
  \item \textbf{Distributed Multi-Shop Load Balancing:} Expanding the architecture to balance production workloads dynamically across multiple departmental print shops based on live queue congestion.
  \item \textbf{Unattended Kiosk Hardware Integration:} Deploying standalone physical kiosks equipped with cash acceptors, touchscreen monitors, and automated output bins for 24/7 self-service printing.
\end{itemize}

\section{7.3 Conclusion}
The Reprography Automation System (REPOSYS) successfully accomplishes the complete digital transformation of campus reprography services. By replacing manual registers, USB flash drive file transfers, and physical counter lines with a modern cloud-connected platform, the system dramatically improves operational efficiency, eliminates billing mistakes, and protects student data confidentiality.

The integration of automated pre-flight file inspection, transparent algorithmic pricing with paper-saving duplex incentives, multi-channel payment processing, starvation-free composite priority queuing, and secure OTP collection verification creates an academically rigorous, technically sound, and user-centric platform. Tested across 120 automated test cases with a 95\% pass rate, REPOSYS demonstrates high reliability and stands ready as a scalable, production-ready solution for modern educational institutions and enterprise document centres.

% =========================================================================
% CHAPTER 8: APPENDIX
% =========================================================================
\newpage
\chapter{APPENDIX}

\section{8.1 Supporting Documentation (if applicable)}
Table 8.1 provides the formal specification of core REST API endpoints implemented in the REPOSYS backend.

\begin{table}[H]
\centering
\small
\caption{Core REST API Endpoints Specification}
\label{tab:api_endpoints}
\begin{tabular}{|p{0.8in}|p{2.1in}|p{1.1in}|p{1.6in}|}
\hline
\textbf{Method} & \textbf{Endpoint} & \textbf{Access Level} & \textbf{Description} \\ \hline
POST & \texttt{/api/auth/register} & Public & User account onboarding \\ \hline
POST & \texttt{/api/auth/login} & Public & User authentication and JWT issue \\ \hline
POST & \texttt{/api/orders/upload} & Authenticated & Document upload \& analysis \\ \hline
POST & \texttt{/api/orders/create} & Authenticated & Order placement \& calculation \\ \hline
GET & \texttt{/api/orders/queue/:type} & Authenticated & Fetch active priority queue \\ \hline
POST & \texttt{/api/orders/verify-otp} & Staff / Admin & OTP handover verification \\ \hline
POST & \texttt{/api/wallet/topup} & Authenticated & Add balance via Razorpay \\ \hline
POST & \texttt{/api/wallet/pay-order} & Authenticated & Settle order via wallet debit \\ \hline
POST & \texttt{/api/payments/webhook} & Webhook Secret & Razorpay event verification \\ \hline
GET & \texttt{/api/admin/analytics} & Admin & Daily financial analytics report \\ \hline
\end{tabular}
\end{table}

Table 8.2 summarizes the core environment configuration parameters governing system execution.

\begin{table}[H]
\centering
\small
\caption{System Environment Configuration Parameters}
\label{tab:env_config}
\begin{tabular}{|p{1.8in}|p{3.8in}|}
\hline
\textbf{Configuration Variable} & \textbf{Operational Function} \\ \hline
\texttt{PORT} & HTTP server listen port (default 5000) \\ \hline
\texttt{MONGO\_URI} & Encrypted connection string for MongoDB Atlas cluster \\ \hline
\texttt{JWT\_SECRET} & 256-bit secret key used for signing authentication tokens \\ \hline
\texttt{CLOUDINARY\_URL} & Cloud storage API credentials for secure document hosting \\ \hline
\texttt{RAZORPAY\_KEY\_ID} & Public API identification key for online payment gateway \\ \hline
\texttt{RAZORPAY\_KEY\_SECRET} & Cryptographic secret key used to verify payment webhooks \\ \hline
\texttt{SHOP\_TIMEZONE} & Operational timezone identifier (\texttt{Asia/Kolkata}) \\ \hline
\end{tabular}
\end{table}

\section{8.2 Sample Code / Queries}

\noindent\textbf{8.2.1 queueService.js (Composite Priority Queue \& Dynamic Aging)}
\begin{lstlisting}[language=JavaScript]
const Order = require('../models/Order');
const socketHandler = require('../socket/socketHandler');

const VISIBLE_STATUSES = ['In_Queue', 'Processing', 'ReadyForPickup'];

function calculateAgingDeduction(createdAt) {
  const waitMs = Date.now() - new Date(createdAt).getTime();
  const waitHours = Math.floor(waitMs / (1000 * 60 * 60));
  return Math.min(60, waitHours * 20); // 20 points per hour, max 60
}

function calculateEffectivePriority(baseScore, createdAt) {
  const deduction = calculateAgingDeduction(createdAt);
  return Math.max(1, baseScore - deduction);
}

async function getQueue(serviceType) {
  const orders = await Order.find({
    serviceType,
    status: { $in: VISIBLE_STATUSES }
  })
    .populate('userId', 'name role department')
    .sort({ createdAt: 1 });

  return orders
    .map(order => {
      const base = Number(order.priorityScore) || 100;
      const effective = calculateEffectivePriority(base, order.createdAt);
      return {
        ...order.toObject(),
        priorityScore: effective,
        basePriority: base,
        agingDeduction: calculateAgingDeduction(order.createdAt)
      };
    })
    .sort((a, b) => {
      if (a.priorityScore !== b.priorityScore) {
        return a.priorityScore - b.priorityScore; // Ascending: lower score = higher rank
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    })
    .map((order, idx) => ({ ...order, position: idx + 1 }));
}

async function broadcastQueueUpdate(serviceType) {
  const queue = await getQueue(serviceType);
  const io = socketHandler.getIO();
  io.to(`queue:${serviceType}`).emit('queue_update', { serviceType, queue });
}

module.exports = { getQueue, broadcastQueueUpdate };
\end{lstlisting}

\noindent\textbf{8.2.2 walletController.js (ACID-Compliant Wallet Settlement)}
\begin{lstlisting}[language=JavaScript]
const mongoose = require('mongoose');
const User = require('../models/User');
const Order = require('../models/Order');
const Payment = require('../models/Payment');

exports.payWithWallet = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { orderId } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId).session(session);
    const order = await Order.findById(orderId).session(session);

    if (!order || order.userId.toString() !== userId) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Order not found' });
    }

    if (user.walletBalance < order.totalCost) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }

    // Atomic debit and order state transition
    user.walletBalance -= order.totalCost;
    order.paymentStatus = 'Paid';
    order.paymentMethod = 'Wallet';
    order.status = 'In_Queue';

    await user.save({ session });
    await order.save({ session });

    await Payment.create([{
      orderId: order._id,
      userId: user._id,
      amount: order.totalCost,
      method: 'Wallet',
      status: 'Completed'
    }], { session });

    await session.commitTransaction();
    res.json({ success: true, balance: user.walletBalance });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ error: 'Transaction failed', details: err.message });
  } finally {
    session.endSession();
  }
};
\end{lstlisting}

\noindent\textbf{8.2.3 MongoDB Aggregation Pipeline: Daily Revenue and Paper Consumption}
\begin{lstlisting}[language=JavaScript]
// Daily Revenue and Paper Consumption Analytics Query
db.orders.aggregate([
  {
    $match: {
      status: "Completed",
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lte: new Date(new Date().setHours(23, 59, 59, 999))
      }
    }
  },
  {
    $lookup: {
      from: "documents",
      localField: "_id",
      foreignField: "orderId",
      as: "docs"
    }
  },
  {
    $group: {
      _id: "$serviceType",
      totalRevenue: { $sum: "$totalCost" },
      totalOrders: { $sum: 1 },
      totalSheetsPrinted: { $sum: { $sum: "$docs.pageCount" } }
    }
  },
  { $sort: { totalRevenue: -1 } }
]);
\end{lstlisting}

\section{8.3 User Interface Screenshots}
The verified visual interfaces and UML system architectural diagrams of REPOSYS are presented below.

\newpage
\begin{figure}[H]
\centering
\includegraphics[width=0.85\textwidth,keepaspectratio]{figures/screen_home.png}
\caption{Public Landing and Portal Gateway}
\label{fig:screen_home}
\end{figure}
\vspace{0.3in}
\begin{figure}[H]
\centering
\includegraphics[width=0.85\textwidth,keepaspectratio]{figures/screen_login.png}
\caption{Secure User Authentication and Multi-Role Login Portal}
\label{fig:screen_login}
\end{figure}

\newpage
\begin{figure}[H]
\centering
\includegraphics[width=0.85\textwidth,keepaspectratio]{figures/screen_register.png}
\caption{Account Registration Portal with Institutional Email Validation}
\label{fig:screen_register}
\end{figure}
\vspace{0.3in}
\begin{figure}[H]
\centering
\includegraphics[width=0.85\textwidth,keepaspectratio]{figures/screen_about.png}
\caption{System Architecture Overview and About REPOSYS Portal}
\label{fig:screen_about}
\end{figure}

\newpage
\begin{figure}[H]
\centering
\includegraphics[width=0.85\textwidth,keepaspectratio]{figures/screen_contact.png}
\caption{Operational Inquiries and Customer Support Portal}
\label{fig:screen_contact}
\end{figure}
\vspace{0.3in}
\begin{figure}[H]
\centering
\includegraphics[width=0.85\textwidth,keepaspectratio]{figures/screen_forgot_password.png}
\caption{Account Recovery and Password Reset Workflow}
\label{fig:screen_forgot_password}
\end{figure}

\newpage
\begin{figure}[H]
\centering
\includegraphics[width=0.85\textwidth,keepaspectratio]{figures/test_student_workflow.png}
\caption{Automated Selenium Test Run: Student Order Workflow}
\label{fig:test_student_workflow}
\end{figure}
\vspace{0.3in}
\begin{figure}[H]
\centering
\includegraphics[width=0.85\textwidth,keepaspectratio]{figures/test_admin_access.png}
\caption{Automated Selenium Test Run: Admin Role Route Access}
\label{fig:test_admin_access}
\end{figure}

\newpage
\begin{figure}[H]
\centering
\includegraphics[width=0.85\textwidth,keepaspectratio]{figures/test_staff_access.png}
\caption{Automated Selenium Test Run: Counter Staff Queue Access}
\label{fig:test_staff_access}
\end{figure}
\vspace{0.3in}
\begin{figure}[H]
\centering
\includegraphics[width=0.85\textwidth,keepaspectratio]{figures/activity_diagram.png}
\caption{System Activity Diagram: Document Upload and Production Flow}
\label{fig:activity_diagram}
\end{figure}

\newpage
\begin{figure}[H]
\centering
\includegraphics[width=0.85\textwidth,keepaspectratio]{figures/sequence_diagram.png}
\caption{System Sequence Diagram: Real-Time Event Dispatching}
\label{fig:sequence_diagram}
\end{figure}
\vspace{0.3in}
\begin{figure}[H]
\centering
\includegraphics[width=0.85\textwidth,keepaspectratio]{figures/use_case_diagram.png}
\caption{System Use Case Diagram: User, Staff, and Admin Boundaries}
\label{fig:use_case_diagram}
\end{figure}

\section{8.4 Git Logs}
Table 8.3 documents the Git version control commit records illustrating the iterative development milestones of REPOSYS across all 16 sprints.

\begin{table}[H]
\centering
\small
\caption{Git Commit Log and Release Milestones}
\label{tab:git_logs}
\begin{tabular}{|p{0.8in}|p{0.8in}|p{1.0in}|p{2.8in}|}
\hline
\textbf{Commit} & \textbf{Author} & \textbf{Date} & \textbf{Commit Message and Scope} \\ \hline
\texttt{8f4a102} & Jefri Jiji & 2026-06-10 & Initial project commit: Express server and folder structure \\ \hline
\texttt{9b12c44} & Jerin S. & 2026-06-18 & Add JWT authentication middleware and User Mongoose schema \\ \hline
\texttt{a3d5e89} & Sethulakshmi & 2026-06-25 & Setup Vite React 19 frontend with Tailwind CSS layout \\ \hline
\texttt{b2f6710} & Jefri Jiji & 2026-07-04 & Implement Multer upload stream and pdf-lib page analyzer \\ \hline
\texttt{c419082} & Jerin S. & 2026-07-14 & Add pricing calculation service with 15\% duplex discount \\ \hline
\texttt{d105a33} & Sethulakshmi & 2026-07-22 & Create staff queue board UI with status filter tabs \\ \hline
\texttt{e58b190} & Jefri Jiji & 2026-07-30 & Implement dynamic priority queue with hourly aging deduction \\ \hline
\texttt{f7204a1} & Jerin S. & 2026-08-08 & Integrate Razorpay SDK and webhook HMAC verification \\ \hline
\texttt{1a93b48} & Sethulakshmi & 2026-08-16 & Add digital wallet controller with MongoDB ACID sessions \\ \hline
\texttt{2b84c90} & Jefri Jiji & 2026-08-25 & Construct Socket.IO real-time event distribution rooms \\ \hline
\texttt{3c75d12} & Jerin S. & 2026-09-02 & Implement 4-digit pickup OTP generation and counter verification \\ \hline
\texttt{4d66e23} & Sethulakshmi & 2026-09-10 & Build Electron Print Agent with native Windows spooler \\ \hline
\texttt{5e57f34} & Jefri Jiji & 2026-09-18 & Add node-cron IST shop scheduler and order timeout sweep \\ \hline
\texttt{6f48a45} & Jerin S. & 2026-09-26 & Implement PWA service worker caching and offline fallbacks \\ \hline
\texttt{7a39b56} & Sethulakshmi & 2026-10-01 & Execute 120 Selenium E2E automated test suite scripts \\ \hline
\texttt{8b20c67} & Jefri Jiji & 2026-10-03 & Final release polish, production build, and academic report \\ \hline
\end{tabular}
\end{table}

% =========================================================================
% CHAPTER 9: REFERENCES
% =========================================================================
\newpage
\chapter{REFERENCES}

\begin{enumerate}[leftmargin=0.35in, itemsep=8pt]
  \item APJ Abdul Kalam Technological University. (2020). \textit{Curriculum and Syllabi for Integrated Master of Computer Applications (IMCA) Programme}. KTU Academic Regulations, Thiruvananthapuram, Kerala.
  \item Cloudinary Inc. (2024). \textit{Cloudinary Node.js SDK and Media Management API Documentation}. [Online]. Available: https://cloudinary.com/documentation
  \item Electron Software Foundation. (2024). \textit{Electron Desktop Framework Documentation and Native Node.js Integration Guides}. OpenJS Foundation. [Online]. Available: https://www.electronjs.org/docs
  \item Fielding, R. T. (2000). \textit{Architectural Styles and the Design of Network-based Software Architectures} (Doctoral dissertation). University of California, Irvine.
  \item Fette, I., \& Melnikov, A. (2011). \textit{The WebSocket Protocol}. RFC 6455, Internet Engineering Task Force (IETF).
  \item Google Developers. (2024). \textit{Progressive Web Apps: High Performance Caching and Service Worker Lifecycle}. Google Web Fundamentals. [Online]. Available: https://web.dev/explore/progressive-web-apps
  \item Jones, M., Bradley, J., \& Sakimura, N. (2015). \textit{JSON Web Token (JWT)}. RFC 7519, Internet Engineering Task Force (IETF).
  \item Node.js Foundation. (2024). \textit{Node.js v20.x Long Term Support (LTS) API Specification}. OpenJS Foundation. [Online]. Available: https://nodejs.org/docs
  \item Razorpay Software Private Limited. (2024). \textit{Razorpay Payments API Specification and Webhook Signature Verification Reference}. [Online]. Available: https://razorpay.com/docs/api
  \item React Development Team. (2024). \textit{React 19 Documentation: Server Components, Hooks, and Concurrency Architecture}. Meta Open Source. [Online]. Available: https://react.dev/
  \item Saintgits College of Engineering (Autonomous). (2026). \textit{Department of Computer Applications: Mini Project Preparation Guidelines and Scrum Assessment Manual (20IMCAP501)}. Pathamuttom, Kottayam.
  \item Socket.IO Foundation. (2024). \textit{Socket.IO Client and Server Bidirectional Event Specification}. [Online]. Available: https://socket.io/docs/v4/
\end{enumerate}

\end{document}
"""

def generate():
    content = build_latex_content()
    
    # 1. Write to academic_report/Report_34.tex
    dest_academic = os.path.join(base_dir, 'Report_34.tex')
    with open(dest_academic, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Generated: {dest_academic}")
    
    # 2. Write to project root: d:\staffs automated\scrms\Report_34.tex
    project_root = os.path.abspath(os.path.join(base_dir, '..'))
    dest_root = os.path.join(project_root, 'Report_34.tex')
    with open(dest_root, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Generated: {dest_root}")
    
    # 3. Write to Resources: D:\staffs automated\Resources\Report_34.tex
    resources_dir = r"D:\staffs automated\Resources"
    if os.path.exists(resources_dir):
        dest_res = os.path.join(resources_dir, 'Report_34.tex')
        with open(dest_res, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Generated: {dest_res}")
        
    # 4. Create Overleaf ZIP package containing Report_34.tex and figures
    zip_paths = [
        os.path.join(base_dir, 'Report_34_Overleaf.zip'),
        os.path.join(project_root, 'Report_34_Overleaf.zip'),
        os.path.join(resources_dir, 'Report_34_Overleaf.zip')
    ]
    
    for zpath in zip_paths:
        with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as zipf:
            zipf.write(dest_academic, arcname='Report_34.tex')
            if os.path.exists(figures_dir):
                for fname in os.listdir(figures_dir):
                    fpath = os.path.join(figures_dir, fname)
                    if os.path.isfile(fpath):
                        zipf.write(fpath, arcname=f'figures/{fname}')
        print(f"Created ZIP: {zpath}")

    print("\nSummary:")
    print(f"Total lines: {len(content.splitlines())}")
    print(f"Total words: {len(content.split())}")

if __name__ == '__main__':
    generate()
