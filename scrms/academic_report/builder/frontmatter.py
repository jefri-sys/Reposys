def get_frontmatter():
    return r"""% =========================================================================
% COVER / TITLE PAGE
% =========================================================================
\begin{titlepage}
\centering
\begin{singlespace}
\vspace*{0.2in}
{\bfseries\large A MINI PROJECT REPORT}\\[0.15in]
{\large ON}\\[0.2in]
{\bfseries\Large REPOSYS -- REPROGRAPHY AUTOMATION SYSTEM}\\[0.3in]
{\normalsize Submitted by}\\[0.1in]
{\bfseries\large JEFRI JIJI}\\
{\normalsize (Register Number: MGP22NMC034)}\\[0.08in]
{\normalsize Under the Project Team 04 with}\\[0.05in]
{\normalsize JERIN SEBASTIAN (MGP22NMC037)}\\
{\normalsize SETHULAKSHMI P.S (MGP22NMC050)}\\[0.25in]
{\normalsize to the}\\[0.08in]
{\bfseries\large APJ ABDUL KALAM TECHNOLOGICAL UNIVERSITY}\\[0.12in]
{\normalsize in partial fulfilment of the requirements for the award of the degree of}\\[0.1in]
{\bfseries\large MASTER OF COMPUTER APPLICATIONS}\\[0.06in]
{\bfseries\normalsize (INTEGRATED)}\\[0.25in]
\begin{figure}[H]
\centering
\includegraphics[width=1.8in,keepaspectratio]{figures/college_logo.png}
\end{figure}
\vspace{0.1in}
{\bfseries\normalsize DEPARTMENT OF COMPUTER APPLICATIONS}\\[0.06in]
{\bfseries\large SAINTGITS COLLEGE OF ENGINEERING}\\[0.04in]
{\bfseries\normalsize (AUTONOMOUS)}\\[0.04in]
{\normalsize KOTTAYAM, KERALA -- 686532}\\[0.15in]
{\normalsize OCTOBER 2026}
\end{singlespace}
\end{titlepage}

% =========================================================================
% PRELIMINARY NUMBERING
% =========================================================================
\pagenumbering{roman}
\setcounter{page}{2}

% =========================================================================
% BONAFIDE CERTIFICATE
% =========================================================================
\chapter*{BONAFIDE CERTIFICATE}
\addcontentsline{toc}{chapter}{BONAFIDE CERTIFICATE}
\begin{doublespace}
Certified that this mini project report entitled \textbf{``REPOSYS -- REPROGRAPHY AUTOMATION SYSTEM''} is a bonafide record of the work carried out by \textbf{JEFRI JIJI} (Register Number: \textbf{MGP22NMC034}) in partial fulfilment of the requirements for the award of the degree of \textbf{Master of Computer Applications (Integrated)} of APJ Abdul Kalam Technological University under our guidance and supervision during the academic year 2026. This report has not been submitted, in whole or in part, for the award of any other degree or diploma to any university or institution.
\end{doublespace}

\vspace{1.2in}
\begin{singlespace}
\noindent
\begin{tabular*}{\textwidth}{@{\extracolsep{\fill}}cc}
\textbf{[GUIDE NAME]} & \textbf{[COORDINATOR NAME]} \\
Project Guide & Project Coordinator \\
Department of Computer Applications & Department of Computer Applications \\
Saintgits College of Engineering & Saintgits College of Engineering \\[1.1in]
\textbf{[HOD NAME]} & \textbf{[PRINCIPAL NAME]} \\
Head of the Department & Principal \\
Department of Computer Applications & Saintgits College of Engineering \\
Saintgits College of Engineering & (Autonomous), Kottayam \\
\end{tabular*}
\end{singlespace}

\clearpage

% =========================================================================
% ACKNOWLEDGEMENT
% =========================================================================
\chapter*{ACKNOWLEDGEMENT}
\addcontentsline{toc}{chapter}{ACKNOWLEDGEMENT}
\begin{doublespace}
First and foremost, I offer my humble gratitude to Almighty God for showering His divine blessings and wisdom, which guided me through each stage of this project development and report writing.

I express my profound gratitude to the Management of \textbf{Saintgits College of Engineering (Autonomous)}, Kottayam, for providing excellent academic infrastructure, modern laboratory resources, and a supportive learning atmosphere conducive to technological exploration.

I place on record my sincere thanks to our respected Principal, \textbf{[PRINCIPAL NAME]}, for his leadership, encouragement, and institutional backing throughout our Integrated MCA programme.

I express my deepest appreciation to \textbf{[HOD NAME]}, Head of the Department of Computer Applications, for his visionary guidance, constructive feedback, and continuous motivation during the conceptualisation and execution of this work.

I am immensely indebted to our Project Coordinator, \textbf{[COORDINATOR NAME]}, for meticulously planning the academic reviews, providing structured schedules, and ensuring high engineering benchmarks at every milestone.

I extend my heartfelt gratitude to my Project Guide, \textbf{[GUIDE NAME]}, whose patient supervision, invaluable technical insights, and rigorous evaluation played a pivotal role in refining both the architecture of REPOSYS and this documentation.

I also extend my sincere thanks to all faculty members, technical staff, and reprography operators of the institution whose daily workflows and practical feedback shaped the functional specifications of this system.

Finally, I express my warmest thanks to my project teammates Jerin Sebastian and Sethulakshmi P.S, my classmates, and my beloved parents and family members whose unwavering moral support and encouragement enabled the successful completion of this endeavor.
\end{doublespace}

\clearpage

% =========================================================================
% ABSTRACT
% =========================================================================
\chapter*{ABSTRACT}
\addcontentsline{toc}{chapter}{ABSTRACT}
Academic reprography centres in higher education institutions serve hundreds of students, faculty, and administrative staff daily. Despite advances in campus digitisation, reprography operations have historically remained manual, paper-reliant, and inefficient. Users encounter severe physical queue congestion, privacy vulnerabilities caused by sharing confidential academic documents across personal WhatsApp channels, transaction friction due to exact cash change requirements, and lack of visibility into print job progression. Conversely, reprography counter operators face chaotic order queues, untracked paper waste from abandoned printouts, and inaccurate manual billing.

\textbf{REPOSYS (Reprography Automation System)} is an enterprise-grade, cloud-enabled web platform and hardware-integrated automation ecosystem designed to digitise the end-to-end reprography lifecycle. Architected using the modern MERN stack (MongoDB, Express.js, React 19, Node.js), REPOSYS introduces a three-tier role-based operational framework serving Students, Faculty, Counter Staff, Administrators, and Guests. The system incorporates an automated document analysis pipeline featuring client-side and server-side MIME-type validation, page-count extraction, and luminance-based blank-page detection. 

A central innovation of REPOSYS is its \textbf{Composite Priority Queue Algorithm with Dynamic Aging Deduction}. To prevent student starvation while respecting academic hierarchy, the scheduling engine calculates effective priority by combining role weights, job complexity, and an automated aging deduction function that systematically elevates long-waiting orders. Transactions are managed through integrated online Razorpay gateways, an internal digital wallet backed by MongoDB ACID transactions, and a Pay at Counter (PAC) workflow with automated timeout safeguards. Physical printing is bridged via a dedicated \textbf{Electron-based Windows Print Agent} that connects local hardware to cloud dispatchers using bi-directional Socket.IO pipelines.

Progressive Web App (PWA) capabilities enable offline queue status caching and Web Push alerts. Comprehensive quality assurance using an automated Selenium WebDriver test suite confirmed 114 passing test suites out of 120 rigorous operational cases (95.0\% passing rate). REPOSYS replaces chaotic counter queues with an auditable, cashless, transparent, and eco-friendly digital campus infrastructure.

\clearpage

% =========================================================================
% TABLE OF CONTENTS & LISTS
% =========================================================================
\tableofcontents
\clearpage
\listoftables
\clearpage
\listoffigures
\clearpage
"""
