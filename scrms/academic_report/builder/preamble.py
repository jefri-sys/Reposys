def get_preamble():
    return r"""\documentclass[12pt,a4paper,oneside]{report}

% Page dimensions and exact 2-inch margins as prescribed by college guidelines
\usepackage[a4paper,left=2in,right=2in,top=2in,bottom=2in]{geometry}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage{mathptmx} % Times New Roman typography throughout
\usepackage{setspace}
\usepackage{titlesec}
\usepackage{tocloft}
\usepackage{graphicx}
\usepackage{booktabs}
\usepackage{longtable}
\usepackage{array}
\usepackage{multirow}
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
\usepackage{cite}

% Typography and spacing
\onehalfspacing
\setlength{\parindent}{0.35in}
\setlength{\parskip}{4pt}

% Page numbering and running headers/footers
\pagestyle{fancy}
\fancyhf{}
\fancyfoot[C]{\thepage}
\renewcommand{\headrulewidth}{0pt}
\renewcommand{\footrulewidth}{0pt}

\fancypagestyle{plain}{
  \fancyhf{}
  \fancyfoot[C]{\thepage}
  \renewcommand{\headrulewidth}{0pt}
  \renewcommand{\footrulewidth}{0pt}
}

% Heading formatting
\titleformat{\chapter}[display]
  {\normalfont\bfseries\centering}
  {\vspace*{10mm}\normalsize CHAPTER \thechapter}
  {4pt}
  {\normalsize\MakeUppercase}
\titlespacing*{\chapter}{0pt}{0pt}{20pt}

\titleformat{\section}
  {\normalfont\normalsize\bfseries}
  {\thesection}{1em}{\MakeUppercase}

\titleformat{\subsection}
  {\normalfont\normalsize\bfseries}
  {\thesubsection}{1em}{\MakeUppercase}

\titleformat{\subsubsection}
  {\normalfont\normalsize\bfseries}
  {\thesubsubsection}{1em}{}

\titlespacing*{\section}{0pt}{12pt}{4pt}
\titlespacing*{\subsection}{0pt}{10pt}{3pt}
\titlespacing*{\subsubsection}{0pt}{8pt}{2pt}

% Code listing configuration
\definecolor{codebg}{RGB}{248,249,250}
\definecolor{codeframe}{RGB}{210,215,220}
\definecolor{codegreen}{RGB}{0,128,0}
\definecolor{codegray}{RGB}{100,100,100}
\definecolor{codepurple}{RGB}{128,0,128}

\lstdefinestyle{academiccode}{
  backgroundcolor=\color{codebg},
  basicstyle=\ttfamily\footnotesize\singlespacing,
  breakatwhitespace=false,
  breaklines=true,
  captionpos=b,
  frame=single,
  rulecolor=\color{codeframe},
  numbers=left,
  numberstyle=\tiny\color{codegray},
  numbersep=5pt,
  tabsize=2,
  showstringspaces=false,
  commentstyle=\color{codegreen},
  keywordstyle=\bfseries\color{blue},
  stringstyle=\color{codepurple}
}
\lstset{style=academiccode}

\captionsetup{font={small,singlespacing},labelfont=bf,justification=centering}
\setlength{\cftbeforechapskip}{6pt}
\setlength{\cftbeforesecskip}{3pt}

\begin{document}
"""
