import os
import sys
import base64
import json
import subprocess

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
fig_dir = os.path.join(base_dir, 'figures')

def get_b64(fname):
    p = os.path.join(fig_dir, fname)
    if os.path.exists(p):
        ext = os.path.splitext(fname)[1].lower().replace('.', '')
        if ext == 'jpg': ext = 'jpeg'
        with open(p, 'rb') as f:
            return f"data:image/{ext};base64,{base64.b64encode(f.read()).decode('utf-8')}"
    return ""

def build_html():
    img_logo = get_b64('college_logo.png')
    img_act = get_b64('activity_diagram.png')
    img_seq = get_b64('sequence_diagram.png')
    img_use = get_b64('use_case_diagram.png')
    img_home = get_b64('screen_home.png')
    img_login = get_b64('screen_login.png')
    img_reg = get_b64('screen_register.png')
    img_about = get_b64('screen_about.png')
    img_contact = get_b64('screen_contact.png')
    img_forgot = get_b64('screen_forgot_password.png')
    img_test_std = get_b64('test_student_workflow.png')
    img_test_adm = get_b64('test_admin_access.png')
    img_test_stf = get_b64('test_staff_access.png')

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>REPOSYS - Reprography Automation System</title>
<style>
  @page {{
    size: A4;
    margin: 2in 2in 2in 2in;
  }}
  body {{
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    line-height: 1.5;
    color: #000;
    margin: 0;
    padding: 0;
    text-align: justify;
  }}
  .page-break {{
    page-break-before: always;
  }}
  .title-page {{
    text-align: center;
    line-height: 1.2;
    padding-top: 0.5in;
  }}
  .title-page h1 {{
    font-size: 18pt;
    font-weight: bold;
    margin: 15px 0 5px 0;
    text-transform: uppercase;
  }}
  .title-page h2 {{
    font-size: 15pt;
    font-weight: bold;
    margin: 10px 0;
  }}
  .title-page h3 {{
    font-size: 13pt;
    font-weight: normal;
    margin: 8px 0;
  }}
  .title-page img {{
    max-width: 1.8in;
    margin: 15px 0;
  }}
  .double-space {{
    line-height: 2.0;
  }}
  .single-space {{
    line-height: 1.15;
  }}
  h1.chapter-title {{
    text-align: center;
    font-size: 13pt;
    font-weight: bold;
    text-transform: uppercase;
    margin-top: 15mm;
    margin-bottom: 25px;
  }}
  h2.section-title {{
    font-size: 12pt;
    font-weight: bold;
    text-transform: uppercase;
    margin-top: 18px;
    margin-bottom: 8px;
  }}
  h3.subsection-title {{
    font-size: 12pt;
    font-weight: bold;
    margin-top: 14px;
    margin-bottom: 6px;
  }}
  p {{
    text-indent: 0.35in;
    margin-top: 0;
    margin-bottom: 6px;
  }}
  p.no-indent {{
    text-indent: 0;
  }}
  table {{
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0;
    font-size: 9.5pt;
    line-height: 1.25;
  }}
  table, th, td {{
    border: 1px solid #000;
  }}
  th, td {{
    padding: 5px 7px;
    text-align: left;
    vertical-align: top;
  }}
  th {{
    background-color: #f2f2f2;
    font-weight: bold;
    text-align: center;
  }}
  .caption {{
    font-size: 10pt;
    font-weight: bold;
    text-align: center;
    margin: 8px 0 14px 0;
  }}
  .figure-box {{
    text-align: center;
    margin: 15px 0;
  }}
  .figure-box img {{
    max-width: 100%;
    height: auto;
    border: 1px solid #ccc;
  }}
  pre.code-block {{
    background: #f8f9fa;
    border: 1px solid #dcdcdc;
    padding: 8px 10px;
    font-family: 'Courier New', Courier, monospace;
    font-size: 8.5pt;
    line-height: 1.2;
    white-space: pre-wrap;
    word-break: break-all;
    margin: 10px 0;
  }}
  ol, ul {{
    margin-top: 4px;
    margin-bottom: 8px;
    padding-left: 0.35in;
  }}
  li {{
    margin-bottom: 4px;
  }}
  .sig-table {{
    width: 100%;
    border: none;
    margin-top: 40px;
  }}
  .sig-table td {{
    border: none;
    text-align: center;
    padding: 25px 5px;
  }}
</style>
</head>
<body>

<!-- ================= COVER / TITLE PAGE ================= -->
<div class="title-page">
  <p class="no-indent" style="font-size: 13pt; font-weight: bold; margin-bottom: 8px;">A MINI PROJECT REPORT</p>
  <p class="no-indent" style="font-size: 11pt; margin-bottom: 12px;">ON</p>
  <h1>REPOSYS – REPROGRAPHY AUTOMATION SYSTEM</h1>
  <p class="no-indent" style="font-size: 11pt; margin-top: 15px;">Submitted by</p>
  <p class="no-indent" style="font-size: 13pt; font-weight: bold;">JEFRI JIJI</p>
  <p class="no-indent" style="font-size: 10.5pt; margin-bottom: 4px;">(Register Number: MGP22NMC034)</p>
  <p class="no-indent" style="font-size: 10pt; color: #444;">Project Team 04 with:<br>JERIN SEBASTIAN (MGP22NMC037) &bull; SETHULAKSHMI P.S (MGP22NMC050)</p>
  <p class="no-indent" style="font-size: 11pt; margin-top: 15px;">to the</p>
  <p class="no-indent" style="font-size: 13pt; font-weight: bold;">APJ ABDUL KALAM TECHNOLOGICAL UNIVERSITY</p>
  <p class="no-indent" style="font-size: 10.5pt;">in partial fulfilment of the requirements for the award of the degree of</p>
  <p class="no-indent" style="font-size: 12.5pt; font-weight: bold;">MASTER OF COMPUTER APPLICATIONS (INTEGRATED)</p>
  <div style="margin: 15px 0;">
    <img src="{img_logo}" alt="College Logo">
  </div>
  <p class="no-indent" style="font-size: 11.5pt; font-weight: bold;">DEPARTMENT OF COMPUTER APPLICATIONS</p>
  <p class="no-indent" style="font-size: 13pt; font-weight: bold;">SAINTGITS COLLEGE OF ENGINEERING (AUTONOMOUS)</p>
  <p class="no-indent" style="font-size: 10.5pt;">PATHAMUTTOM, KOTTAYAM, KERALA – 686532</p>
  <p class="no-indent" style="font-size: 11pt; font-weight: bold; margin-top: 10px;">OCTOBER 2026</p>
</div>

<!-- ================= BONAFIDE CERTIFICATE ================= -->
<div class="page-break">
  <h1 class="chapter-title">BONAFIDE CERTIFICATE</h1>
  <div class="double-space">
    <p>Certified that this mini project report entitled <strong>“REPOSYS – REPROGRAPHY AUTOMATION SYSTEM”</strong> is a bonafide record of the work carried out by <strong>JEFRI JIJI</strong> (Register Number: <strong>MGP22NMC034</strong>) in partial fulfilment of the requirements for the award of the degree of <strong>Master of Computer Applications (Integrated)</strong> of APJ Abdul Kalam Technological University under our guidance and supervision during the academic year 2026. This report has not been submitted, in whole or in part, for the award of any other degree or diploma to any university or institution.</p>
  </div>

  <table class="sig-table">
    <tr>
      <td style="width: 50%;">
        <strong>[GUIDE NAME]</strong><br>
        Project Guide<br>
        Department of Computer Applications<br>
        Saintgits College of Engineering
      </td>
      <td style="width: 50%;">
        <strong>[COORDINATOR NAME]</strong><br>
        Project Coordinator<br>
        Department of Computer Applications<br>
        Saintgits College of Engineering
      </td>
    </tr>
    <tr>
      <td>
        <strong>[HOD NAME]</strong><br>
        Head of the Department<br>
        Department of Computer Applications<br>
        Saintgits College of Engineering
      </td>
      <td>
        <strong>[PRINCIPAL NAME]</strong><br>
        Principal<br>
        Saintgits College of Engineering (Autonomous)<br>
        Kottayam
      </td>
    </tr>
  </table>
</div>

<!-- ================= ACKNOWLEDGEMENT ================= -->
<div class="page-break">
  <h1 class="chapter-title">ACKNOWLEDGEMENT</h1>
  <div class="double-space">
    <p>First and foremost, I offer my humble gratitude to Almighty God for showering His divine blessings and wisdom, which guided me through each stage of this project development and report writing.</p>
    <p>I express my profound gratitude to the Management of <strong>Saintgits College of Engineering (Autonomous)</strong>, Kottayam, for providing excellent academic infrastructure, modern laboratory resources, and a supportive learning atmosphere conducive to technological exploration.</p>
    <p>I place on record my sincere thanks to our respected Principal, <strong>[PRINCIPAL NAME]</strong>, for his leadership, encouragement, and institutional backing throughout our Integrated MCA programme.</p>
    <p>I express my deepest appreciation to <strong>[HOD NAME]</strong>, Head of the Department of Computer Applications, for his visionary guidance, constructive feedback, and continuous motivation during the conceptualisation and execution of this work.</p>
    <p>I am immensely indebted to our Project Coordinator, <strong>[COORDINATOR NAME]</strong>, for meticulously planning the academic reviews, providing structured schedules, and ensuring high engineering benchmarks at every milestone.</p>
    <p>I extend my heartfelt gratitude to my Project Guide, <strong>[GUIDE NAME]</strong>, whose patient supervision, invaluable technical insights, and rigorous evaluation played a pivotal role in refining both the architecture of REPOSYS and this documentation.</p>
    <p>I also extend my sincere thanks to all faculty members, technical staff, and reprography operators of the institution whose daily workflows and practical feedback shaped the functional specifications of this system.</p>
    <p>Finally, I express my warmest thanks to my project teammates Jerin Sebastian and Sethulakshmi P.S, my classmates, and my beloved parents and family members whose unwavering moral support and encouragement enabled the successful completion of this endeavor.</p>
  </div>
</div>

<!-- ================= ABSTRACT ================= -->
<div class="page-break">
  <h1 class="chapter-title">ABSTRACT</h1>
  <p>Academic reprography centres in higher education institutions serve hundreds of students, faculty, and administrative staff daily. Despite advances in campus digitisation, reprography operations have historically remained manual, paper-reliant, and inefficient. Users encounter severe physical queue congestion, privacy vulnerabilities caused by sharing confidential academic documents across personal WhatsApp channels, transaction friction due to exact cash change requirements, and lack of visibility into print job progression. Conversely, reprography counter operators face chaotic order queues, untracked paper waste from abandoned printouts, and inaccurate manual billing.</p>
  <p><strong>REPOSYS (Reprography Automation System)</strong> is an enterprise-grade, cloud-enabled web platform and hardware-integrated automation ecosystem designed to digitise the end-to-end reprography lifecycle. Architected using the modern MERN stack (MongoDB, Express.js, React 19, Node.js), REPOSYS introduces a three-tier role-based operational framework serving Students, Faculty, Counter Staff, Administrators, and Guests. The system incorporates an automated document analysis pipeline featuring client-side and server-side MIME-type validation, page-count extraction, and luminance-based blank-page detection.</p>
  <p>A central innovation of REPOSYS is its <strong>Composite Priority Queue Algorithm with Dynamic Aging Deduction</strong>. To prevent student starvation while respecting academic hierarchy, the scheduling engine calculates effective priority by combining role weights, job complexity, and an automated aging deduction function that systematically elevates long-waiting orders. Transactions are managed through integrated online Razorpay gateways, an internal digital wallet backed by MongoDB ACID transactions, and a Pay at Counter (PAC) workflow with automated timeout safeguards. Physical printing is bridged via a dedicated <strong>Electron-based Windows Print Agent</strong> that connects local hardware to cloud dispatchers using bi-directional Socket.IO pipelines.</p>
  <p>Progressive Web App (PWA) capabilities enable offline queue status caching and Web Push alerts. Comprehensive quality assurance using an automated Selenium WebDriver test suite confirmed 114 passing test suites out of 120 rigorous operational cases (95.0% passing rate). REPOSYS replaces chaotic counter queues with an auditable, cashless, transparent, and eco-friendly digital campus infrastructure.</p>
</div>

<!-- ================= TABLE OF CONTENTS ================= -->
<div class="page-break">
  <h1 class="chapter-title">TABLE OF CONTENTS</h1>
  <table style="border: none; font-size: 11pt; line-height: 1.6;">
    <tr style="border-bottom: 2px solid #000; font-weight: bold;">
      <td style="border: none; width: 12%;">Chapter</td>
      <td style="border: none; width: 73%;">Title</td>
      <td style="border: none; width: 15%; text-align: right;">Page No.</td>
    </tr>
    <tr><td style="border: none;"></td><td style="border: none;">BONAFIDE CERTIFICATE</td><td style="border: none; text-align: right;">ii</td></tr>
    <tr><td style="border: none;"></td><td style="border: none;">ACKNOWLEDGEMENT</td><td style="border: none; text-align: right;">iii</td></tr>
    <tr><td style="border: none;"></td><td style="border: none;">ABSTRACT</td><td style="border: none; text-align: right;">iv</td></tr>
    <tr><td style="border: none;"></td><td style="border: none;">LIST OF TABLES</td><td style="border: none; text-align: right;">vii</td></tr>
    <tr><td style="border: none;"></td><td style="border: none;">LIST OF FIGURES</td><td style="border: none; text-align: right;">viii</td></tr>
    <tr style="font-weight: bold;"><td style="border: none;">1</td><td style="border: none;">INTRODUCTION</td><td style="border: none; text-align: right;">1</td></tr>
    <tr><td style="border: none;"></td><td style="border: none;">1.1 Introduction</td><td style="border: none; text-align: right;">1</td></tr>
    <tr><td style="border: none;"></td><td style="border: none;">1.2 Objectives of the Project</td><td style="border: none; text-align: right;">3</td></tr>
    <tr><td style="border: none;"></td><td style="border: none;">1.3 Scope and Availability</td><td style="border: none; text-align: right;">5</td></tr>
    <tr style="font-weight: bold;"><td style="border: none;">2</td><td style="border: none;">REQUIREMENTS AND ANALYSIS</td><td style="border: none; text-align: right;">7</td></tr>
    <tr><td style="border: none;"></td><td style="border: none;">2.1 Existing System / Problem Statement</td><td style="border: none; text-align: right;">7</td></tr>
    <tr><td style="border: none;"></td><td style="border: none;">2.2 Proposed System / Solution Overview</td><td style="border: none; text-align: right;">10</td></tr>
    <tr><td style="border: none;"></td><td style="border: none;">2.3 Feasibility Study</td><td style="border: none; text-align: right;">12</td></tr>
    <tr><td style="border: none;"></td><td style="border: none;">2.4 Conceptual Modelling</td><td style="border: none; text-align: right;">15</td></tr>
    <tr><td style="border: none;"></td><td style="border: none;">2.5 Planning and Scheduling</td><td style="border: none; text-align: right;">17</td></tr>
    <tr style="font-weight: bold;"><td style="border: none;">3</td><td style="border: none;">SYSTEM SPECIFICATION</td><td style="border: none; text-align: right;">20</td></tr>
    <tr><td style="border: none;"></td><td style="border: none;">3.1 Software and Hardware Requirements</td><td style="border: none; text-align: right;">20</td></tr>
    <tr><td style="border: none;"></td><td style="border: none;">3.2 Functional Specifications</td><td style="border: none; text-align: right;">23</td></tr>
    <tr><td style="border: none;"></td><td style="border: none;">3.3 Tools and Platforms Used</td><td style="border: none; text-align: right;">26</td></tr>
    <tr><td style="border: none;"></td><td style="border: none;">3.4 Development Environment</td><td style="border: none; text-align: right;">28</td></tr>
    <tr style="font-weight: bold;"><td style="border: none;">4</td><td style="border: none;">SYSTEM DESIGN</td><td style="border: none; text-align: right;">30</td></tr>
    <tr><td style="border: none;"></td><td style="border: none;">4.1 Module Descriptions</td><td style="border: none; text-align: right;">30</td></tr>
    <tr><td style="border: none;"></td><td style="border: none;">4.2 Data / Schema Design</td><td style="border: none; text-align: right;">34</td></tr>
    <tr><td style="border: none;"></td><td style="border: none;">4.3 Procedural / Flow Design</td><td style="border: none; text-align: right;">37</td></tr>
    <tr><td style="border: none;"></td><td style="border: none;">4.4 User Interface Design</td><td style="border: none; text-align: right;">42</td></tr>
    <tr style="font-weight: bold;"><td style="border: none;">5</td><td style="border: none;">DEVELOPMENT METHODOLOGY</td><td style="border: none; text-align: right;">44</td></tr>
    <tr><td style="border: none;"></td><td style="border: none;">5.1 Project Roadmap</td><td style="border: none; text-align: right;">44</td></tr>
    <tr><td style="border: none;"></td><td style="border: none;">5.2 User Stories</td><td style="border: none; text-align: right;">46</td></tr>
    <tr><td style="border: none;"></td><td style="border: none;">5.3 Test Plan</td><td style="border: none; text-align: right;">48</td></tr>
    <tr style="font-weight: bold;"><td style="border: none;">6</td><td style="border: none;">IMPLEMENTATION AND TESTING</td><td style="border: none; text-align: right;">50</td></tr>
    <tr><td style="border: none;"></td><td style="border: none;">6.1 Implementation Procedure</td><td style="border: none; text-align: right;">50</td></tr>
    <tr><td style="border: none;"></td><td style="border: none;">6.2 Testing Methods and Results</td><td style="border: none; text-align: right;">54</td></tr>
    <tr style="font-weight: bold;"><td style="border: none;">7</td><td style="border: none;">CONCLUSION</td><td style="border: none; text-align: right;">58</td></tr>
    <tr><td style="border: none;"></td><td style="border: none;">7.1 Limitations</td><td style="border: none; text-align: right;">58</td></tr>
    <tr><td style="border: none;"></td><td style="border: none;">7.2 Future Scope</td><td style="border: none; text-align: right;">59</td></tr>
    <tr><td style="border: none;"></td><td style="border: none;">7.3 Conclusion</td><td style="border: none; text-align: right;">60</td></tr>
    <tr style="font-weight: bold;"><td style="border: none;">8</td><td style="border: none;">APPENDIX</td><td style="border: none; text-align: right;">61</td></tr>
    <tr><td style="border: none;"></td><td style="border: none;">8.1 Supporting Documentation</td><td style="border: none; text-align: right;">61</td></tr>
    <tr><td style="border: none;"></td><td style="border: none;">8.2 Sample Code / Queries</td><td style="border: none; text-align: right;">62</td></tr>
    <tr><td style="border: none;"></td><td style="border: none;">8.3 User Interface Screenshots</td><td style="border: none; text-align: right;">65</td></tr>
    <tr><td style="border: none;"></td><td style="border: none;">8.4 Git Logs</td><td style="border: none; text-align: right;">71</td></tr>
    <tr style="font-weight: bold;"><td style="border: none;">9</td><td style="border: none;">REFERENCES</td><td style="border: none; text-align: right;">73</td></tr>
  </table>
</div>

<!-- ================= LIST OF TABLES ================= -->
<div class="page-break">
  <h1 class="chapter-title">LIST OF TABLES</h1>
  <table style="border: none; font-size: 11pt; line-height: 1.6;">
    <tr style="border-bottom: 2px solid #000; font-weight: bold;">
      <td style="border: none; width: 15%;">Table No.</td>
      <td style="border: none; width: 70%;">Title</td>
      <td style="border: none; width: 15%; text-align: right;">Page No.</td>
    </tr>
    <tr><td style="border: none;">Table 2.1</td><td style="border: none;">System Comparison: Existing Manual System vs. Proposed REPOSYS</td><td style="border: none; text-align: right;">11</td></tr>
    <tr><td style="border: none;">Table 2.2</td><td style="border: none;">Official Project Schedule and Milestone Tracking (Scrum Register 20IMCAP501)</td><td style="border: none; text-align: right;">18</td></tr>
    <tr><td style="border: none;">Table 3.1</td><td style="border: none;">Production Software Stack and Dependency Specifications</td><td style="border: none; text-align: right;">21</td></tr>
    <tr><td style="border: none;">Table 4.1</td><td style="border: none;">Database Schema Specifications of Core REPOSYS Collections</td><td style="border: none; text-align: right;">35</td></tr>
    <tr><td style="border: none;">Table 6.1</td><td style="border: none;">Verified Feature Implementation Matrix across REPOSYS</td><td style="border: none; text-align: right;">52</td></tr>
    <tr><td style="border: none;">Table 6.2</td><td style="border: none;">Representative Automated and Functional Test Results</td><td style="border: none; text-align: right;">55</td></tr>
    <tr><td style="border: none;">Table 8.1</td><td style="border: none;">Verifiable Version Control Commit History (Git Logs)</td><td style="border: none; text-align: right;">71</td></tr>
  </table>
</div>

<!-- ================= LIST OF FIGURES ================= -->
<div class="page-break">
  <h1 class="chapter-title">LIST OF FIGURES</h1>
  <table style="border: none; font-size: 11pt; line-height: 1.6;">
    <tr style="border-bottom: 2px solid #000; font-weight: bold;">
      <td style="border: none; width: 15%;">Figure No.</td>
      <td style="border: none; width: 70%;">Title</td>
      <td style="border: none; width: 15%; text-align: right;">Page No.</td>
    </tr>
    <tr><td style="border: none;">Figure 2.1</td><td style="border: none;">Process Flow and Bottlenecks of the Existing Manual System</td><td style="border: none; text-align: right;">9</td></tr>
    <tr><td style="border: none;">Figure 2.2</td><td style="border: none;">Level 0 Context Data Flow Diagram of REPOSYS</td><td style="border: none; text-align: right;">15</td></tr>
    <tr><td style="border: none;">Figure 2.3</td><td style="border: none;">Level 1 Functional Data Flow Diagram of the Complete Order Pipeline</td><td style="border: none; text-align: right;">16</td></tr>
    <tr><td style="border: none;">Figure 4.1</td><td style="border: none;">Automated Shop Scheduling Logic and Operational State Transitions</td><td style="border: none; text-align: right;">39</td></tr>
    <tr><td style="border: none;">Figure 4.2</td><td style="border: none;">System Use Case Diagram: User, Staff, and Admin Operational Boundaries</td><td style="border: none; text-align: right;">40</td></tr>
    <tr><td style="border: none;">Figure 4.3</td><td style="border: none;">System Activity Diagram: Document Upload, Analysis, and Production Flow</td><td style="border: none; text-align: right;">41</td></tr>
    <tr><td style="border: none;">Figure 4.4</td><td style="border: none;">System Sequence Diagram: Real-Time Event Dispatching and Queue Updates</td><td style="border: none; text-align: right;">42</td></tr>
    <tr><td style="border: none;">Figure 8.1</td><td style="border: none;">REPOSYS Public Landing and Portal Gateway</td><td style="border: none; text-align: right;">65</td></tr>
    <tr><td style="border: none;">Figure 8.2</td><td style="border: none;">Secure User Authentication and Multi-Role Login Portal</td><td style="border: none; text-align: right;">66</td></tr>
    <tr><td style="border: none;">Figure 8.3</td><td style="border: none;">Student and Faculty Account Registration Portal</td><td style="border: none; text-align: right;">66</td></tr>
    <tr><td style="border: none;">Figure 8.4</td><td style="border: none;">System Architecture Overview and About REPOSYS Portal</td><td style="border: none; text-align: right;">67</td></tr>
    <tr><td style="border: none;">Figure 8.5</td><td style="border: none;">Reprography Operational Inquiries and Support Contact Portal</td><td style="border: none; text-align: right;">67</td></tr>
    <tr><td style="border: none;">Figure 8.6</td><td style="border: none;">Account Recovery and Password Reset Workflow</td><td style="border: none; text-align: right;">68</td></tr>
    <tr><td style="border: none;">Figure 8.7</td><td style="border: none;">Automated Selenium Test Run: Student Order Workflow</td><td style="border: none; text-align: right;">69</td></tr>
    <tr><td style="border: none;">Figure 8.8</td><td style="border: none;">Automated Selenium Test Run: Admin Role Route Access</td><td style="border: none; text-align: right;">69</td></tr>
    <tr><td style="border: none;">Figure 8.9</td><td style="border: none;">Automated Selenium Test Run: Counter Staff Queue Access</td><td style="border: none; text-align: right;">70</td></tr>
  </table>
</div>

<!-- ================= CHAPTER 1: INTRODUCTION ================= -->
<div class="page-break">
  <h1 class="chapter-title">CHAPTER 1<br>INTRODUCTION</h1>
  
  <h2 class="section-title">1.1 INTRODUCTION</h2>
  <p>In contemporary tertiary educational institutions, academic reprography and document management centres represent indispensable utility hubs. Every working day, students, research scholars, teaching faculty, and administrative personnel generate substantial demands for printing lecture notes, laboratory observation manuals, seminar presentations, dissertations, project documentation, question papers, and institutional circulars. Despite rapid campus digitisation across learning management systems (LMS) and enterprise resource planning (ERP) portals, the reprography service tier has remained an acute operational bottleneck, heavily entrenched in legacy manual practices.</p>
  <p>In the conventional manual operating model, students are required to physically travel to the campus reprography centre, often enduring long queues during morning peak hours and pre-examination submission deadlines. Submitting electronic files frequently relies on unstandardised, insecure workarounds: students either transfer documents using uninspected USB flash drives—introducing significant malware vectors into counter workstations—or transmit files over consumer messaging platforms such as WhatsApp or Telegram. These manual practices give rise to critical vulnerabilities:</p>
  <ol>
    <li><strong>Privacy Infringement and Data Exposure:</strong> Submitting personal assignment files, identity cards, or research papers over personal mobile messaging channels exposes phone numbers and personal documents to counter staff and third-party chat databases without institutional access auditing.</li>
    <li><strong>Physical Counter Congestion:</strong> Students must remain physically co-located at the reprography counter throughout the entire processing duration—from file retrieval and configuration to printing, binding, and billing—resulting in lobby overcrowding and lost instructional time.</li>
    <li><strong>Transaction and Billing Inefficiencies:</strong> Cash-based counter transactions encounter persistent friction due to shortages of low-denomination physical currency notes and coins. Manual calculation of complex multi-page, double-sided, and binding combinations frequently results in billing inaccuracies and revenue leakage.</li>
    <li><strong>Paper Waste and Abandoned Output:</strong> Due to communication disconnects, print operators frequently print jobs that users subsequently fail to collect, or produce incorrect orientations and color modes, leading to high volumes of abandoned paper waste and unrecoverable toner expenditure.</li>
    <li><strong>Absence of Prioritisation for Academic Emergencies:</strong> Urgent examination-related printing requisitions from academic faculty are subjected to identical physical First-In, First-Out (FIFO) queue bottlenecks alongside routine student printouts, compromising institutional timeliness.</li>
  </ol>
  <p>To decisively resolve these systemic challenges, <strong>REPOSYS (Reprography Automation System)</strong> was conceptualised, designed, and implemented as a comprehensive, cloud-native web platform and hardware-interfaced automation ecosystem. Developed as an Integrated Master of Computer Applications (IMCA) capstone initiative at Saintgits College of Engineering (Autonomous), REPOSYS bridges academic document creators, reprography staff, institutional administrators, and physical printing machinery through an auditable, cashless, and highly responsive operational framework.</p>
  <p>REPOSYS leverages modern software engineering standards, employing a three-tier role-based operational architecture built on the MongoDB, Express.js, React 19, and Node.js (MERN) stack. It incorporates cloud object storage via Cloudinary, secure cryptographic transaction validation with Razorpay and internal digital wallets, bi-directional event distribution via Socket.IO, an automated Progressive Web App (PWA) client, and an autonomous desktop Print Agent communicating with Windows spooler sub-systems.</p>

  <h2 class="section-title">1.2 OBJECTIVES OF THE PROJECT</h2>
  <p>The overarching mission of REPOSYS is to replace error-prone, manual campus document handling with a modern, dependable, and user-centric digital reprography platform. To realise this vision, the engineering objectives are classified across four functional domains:</p>
  
  <h3 class="subsection-title">1.2.1 Operational and Workflow Objectives</h3>
  <ol>
    <li><strong>Decoupled Document Submission:</strong> To enable authenticated campus users and temporary kiosk guests to upload documents remotely from any browser, smartphone, or terminal, eliminating physical presence during job queuing.</li>
    <li><strong>Automated Document Analysis and Pre-flight Inspection:</strong> To implement automated server-side file analysis that extracts page counts, detects color profiles, validates MIME signatures, and identifies blank pages prior to job confirmation, eliminating user error and incorrect billing.</li>
    <li><strong>Dynamic Priority Queue Scheduling:</strong> To establish an equitable, multi-factor priority queue engine that balances urgent faculty requirements against student fairness through an automated aging deduction algorithm, preventing job starvation.</li>
    <li><strong>Secure Two-Factor Physical Handover:</strong> To implement One-Time Password (OTP) verification and QR-based collection mechanisms at the counter, ensuring that documents are delivered exclusively to authorised owners.</li>
  </ol>

  <h3 class="subsection-title">1.2.2 Financial and Transactional Objectives</h3>
  <ol>
    <li><strong>Unified Multi-Modal Payments:</strong> To support online UPI/Card transactions via Razorpay, an internal pre-funded student digital wallet with ACID guarantees, and regulated Pay at Counter (PAC) cash workflows.</li>
    <li><strong>Collaborative Cost Sharing:</strong> To provide an integrated split-payment mechanism enabling group members to disburse printing costs for shared academic projects atomically across individual student wallets.</li>
    <li><strong>Automated Financial Ledgering and Auditing:</strong> To maintain an immutable, append-only transaction ledger and exportable financial reports for institutional administrative reconciliation.</li>
  </ol>

  <h3 class="subsection-title">1.2.3 Hardware and Architectural Integration Objectives</h3>
  <ol>
    <li><strong>Autonomous Physical Spooling via Print Agent:</strong> To bridge cloud backend dispatchers with local counter hardware through a specialised Electron-based Windows Print Agent that automates driver selection and document spooling.</li>
    <li><strong>Real-Time Operational Transparency:</strong> To broadcast bi-directional lifecycle events (e.g., job placement, printing progress, completion notifications, queue wait-time adjustments) to connected clients without browser polling.</li>
    <li><strong>Automated Shop Scheduling:</strong> To run background cron services enforcing campus operational hours (9:00 AM to 5:00 PM IST) while managing payment timeouts and uncollected order archival.</li>
  </ol>

  <h3 class="subsection-title">1.2.4 Sustainability and Security Objectives</h3>
  <ol>
    <li><strong>Resource Conservation and Green Computing:</strong> To reduce paper and toner wastage through pre-print configuration summaries, blank-page warnings, and optimized double-sided layout incentives.</li>
    <li><strong>End-to-End Cryptographic Security:</strong> To enforce strict role-based access control (RBAC), JSON Web Token (JWT) session security, Cloudinary signed URL access, and data protection against unauthorized document disclosures.</li>
  </ol>

  <h2 class="section-title">1.3 SCOPE AND AVAILABILITY</h2>
  <p>The operational scope of REPOSYS encompasses all primary document processing, queue organisation, financial settlement, physical printing, and administrative reporting requirements of an academic campus.</p>
  
  <h3 class="subsection-title">1.3.1 User Roles and Stakeholder Scope</h3>
  <p>The system establishes clearly demarcated functional boundaries for five distinct user personas:</p>
  <ol>
    <li><strong>Student Persona:</strong> Access to multi-document upload wizards, real-time cost estimation, wallet balance management, friend lists, split billing, live queue tracking, complaint lodgement, and PDF receipt downloads.</li>
    <li><strong>Faculty Persona:</strong> Priority submission channels for academic and examination materials, customized delivery notes, departmental billing allocation, and direct counter priority.</li>
    <li><strong>Counter Staff Persona:</strong> Operational terminal displaying active priority queues, manual cash collection controls, physical print dispatch triggers, stock inventory updates, and OTP-based pickup validation.</li>
    <li><strong>Administrator Persona:</strong> Institutional oversight including dynamic price-per-page configuration, user account activation/restriction, system configuration, audit log inspection, and aggregate financial reporting.</li>
    <li><strong>Guest / Kiosk Persona:</strong> Frictionless, registration-free terminal access via time-bound guest tokens and QR code tracking, with automated session expiration for campus visitors and parents.</li>
  </ol>

  <h3 class="subsection-title">1.3.2 Physical and Hardware Scope</h3>
  <p>REPOSYS is designed to interface with standard multi-function commercial printers (MFPs), heavy-duty laser printers, and comb/spiral binding stations installed within the institutional reprography facility. Network connectivity encompasses the campus local area network (LAN), Wi-Fi, and public Internet access for remote student submissions.</p>

  <h3 class="subsection-title">1.3.3 Operational Availability and Scheduling Boundaries</h3>
  <p>The operational envelope of REPOSYS is governed by an automated scheduling sub-system aligned with institutional working rules:</p>
  <ol>
    <li><strong>Core Operating Hours:</strong> The reprography service automatically opens at 09:00 IST and closes at 17:00 IST, Monday through Saturday. An internal scheduler running at one-minute cron intervals evaluates Indian Standard Time (UTC+05:30) and synchronises the operational state across all active client interfaces.</li>
    <li><strong>Sunday and Holiday Closures:</strong> The scheduler automatically prevents new order placement on Sundays (day === 0) and scheduled institutional holidays, while allowing counter staff to finish existing in-flight jobs.</li>
    <li><strong>Administrative Overrides:</strong> Administrators maintain explicit supervisory privilege to trigger “Force Open” or “Force Close” modes during unscheduled maintenance, special academic workshops, or counter emergencies.</li>
    <li><strong>PWA Offline Availability:</strong> When internet connectivity is temporarily interrupted, the Progressive Web App service worker provides cached access to previously retrieved order statuses and historical receipts.</li>
  </ol>
</div>

<!-- ================= CHAPTER 2: REQUIREMENTS AND ANALYSIS ================= -->
<div class="page-break">
  <h1 class="chapter-title">CHAPTER 2<br>REQUIREMENTS AND ANALYSIS</h1>
  
  <h2 class="section-title">2.1 EXISTING SYSTEM / PROBLEM STATEMENT</h2>
  <p>To formulate a technically sound software solution, a comprehensive field analysis of the prevailing reprography system at Saintgits College of Engineering and comparable tertiary educational campuses was undertaken. The investigation revealed that document printing, duplication, and finishing services rely heavily on manual, disorganised procedures.</p>
  <p>In the traditional environment, the entire order lifecycle is tightly coupled to physical counter presence. A student or faculty member must walk to the shop, wait in a physical queue, hand over a personal flash drive or share the document over WhatsApp, orally communicate printing preferences, calculate costs manually, pay with paper currency, and wait in the lobby while the job is executed.</p>
  
  <div class="figure-box">
    <div style="display: inline-block; border: 1px solid #999; padding: 10px 15px; background: #fafafa; border-radius: 6px; text-align: left; font-size: 10pt; line-height: 1.4;">
      <strong>1. Arrive at Counter &rarr; Wait in physical lobby queue</strong><br>
      &darr;<br>
      <strong>2. File Transfer &rarr; Insert USB drive or share via personal WhatsApp</strong><br>
      &darr;<br>
      <strong>3. Manual Inspection &rarr; Staff opens file, checks page counts & paper specs</strong><br>
      &darr;<br>
      <strong>4. Cash Settlement &rarr; Cash calculation; frequent low-denomination coin shortages</strong><br>
      &darr;<br>
      <strong>5. Manual Printing &rarr; Operator configures printer dialog; prints output</strong><br>
      &darr;<br>
      <strong>6. Collection &rarr; Customer waits at counter until documents are collated</strong>
    </div>
    <div class="caption">Figure 2.1: Process Flow and Bottlenecks of the Existing Manual System</div>
  </div>

  <p>The principal deficiencies and operational failure modes identified in the existing system are categorised as follows:</p>
  <ol>
    <li><strong>High Latency and Lost Academic Hours:</strong> During peak academic submission periods (continuous assessment tests, end-semester project reviews), physical queues exceed 30–40 students. Each transaction requires approximately 4 to 8 minutes of counter negotiation, consuming substantial student study time and creating severe lobby congestion.</li>
    <li><strong>Endpoint Security Risks and Malware Propagation:</strong> The indiscriminate insertion of unverified USB flash drives into counter workstations exposes campus IT infrastructure to autorun trojans, ransomware, and virus infections, frequently causing workstation operating system crashes.</li>
    <li><strong>Privacy Breaches and Unregulated Data Sprawl:</strong> When students share documents via personal WhatsApp numbers, their phone numbers, profile images, and private academic submissions remain stored in unmanaged personal mobile device caches and chat histories without deletion policies.</li>
    <li><strong>Financial Leakage and Cash Reconciliation Disputes:</strong> Counter operators manually tally page counts across mixed single-sided, double-sided, color, and monochrome ranges. In the rush of peak hours, calculation errors occur frequently. Furthermore, lack of exact currency change creates disputes and delays.</li>
    <li><strong>Paper and Consumable Wastage:</strong> Due to miscommunication regarding page ranges, color expectations, or paper orientations, unintended prints are frequently produced. Moreover, students occasionally abandon prints due to extensive wait times, resulting in uncollected paper that represents total financial and ecological loss.</li>
    <li><strong>Complete Lack of Operational Visibility:</strong> Students have no mechanism to determine counter queue length, machine operational status, or estimated turnaround times before traveling to the physical facility.</li>
  </ol>

  <h2 class="section-title">2.2 PROPOSED SYSTEM / SOLUTION OVERVIEW</h2>
  <p><strong>REPOSYS</strong> resolves these systemic problems by introducing a centralised, cloud-connected digital reprography platform that decouples job submission from physical collection.</p>
  
  <table>
    <tr>
      <th style="width: 25%;">Feature Dimension</th>
      <th style="width: 37%;">Existing Manual System</th>
      <th style="width: 38%;">Proposed REPOSYS</th>
    </tr>
    <tr>
      <td><strong>Job Submission</strong></td>
      <td>Physical presence; USB drives or WhatsApp sharing</td>
      <td>Remote web/PWA upload with pre-flight file validation</td>
    </tr>
    <tr>
      <td><strong>Cost Calculation</strong></td>
      <td>Manual operator estimation; prone to human error</td>
      <td>Real-time algorithmic calculation with dynamic discounts</td>
    </tr>
    <tr>
      <td><strong>Payment Methods</strong></td>
      <td>Strictly physical cash; change shortages</td>
      <td>Razorpay UPI/Cards, internal student digital wallet, regulated PAC</td>
    </tr>
    <tr>
      <td><strong>Queue Mechanism</strong></td>
      <td>Physical, unmonitored FIFO queue</td>
      <td>Composite priority queue with dynamic anti-starvation aging</td>
    </tr>
    <tr>
      <td><strong>Hardware Bridge</strong></td>
      <td>Manual operator file opening and printer dialogs</td>
      <td>Autonomous Electron Print Agent with background spooling</td>
    </tr>
    <tr>
      <td><strong>Handover Security</strong></td>
      <td>Open counter pickup; prone to misplacement</td>
      <td>Two-factor OTP and QR-code collection verification</td>
    </tr>
    <tr>
      <td><strong>Operating Hours</strong></td>
      <td>Ad-hoc counter opening; unpredictable closures</td>
      <td>Automated IST cron scheduler with real-time UI banners</td>
    </tr>
    <tr>
      <td><strong>Audit and Logs</strong></td>
      <td>Paper registers or absent record-keeping</td>
      <td>Append-only MongoDB activity logs and automated analytics</td>
    </tr>
  </table>
  <div class="caption">Table 2.1: System Comparison: Existing Manual System vs. Proposed REPOSYS</div>

  <h2 class="section-title">2.3 FEASIBILITY STUDY</h2>
  <p>Before commencing technical development, a comprehensive feasibility study was conducted to evaluate the viability of REPOSYS across four key engineering dimensions.</p>

  <h3 class="subsection-title">2.3.1 Technical Feasibility</h3>
  <p>The technical feasibility evaluates whether the available hardware, software stacks, and cloud infrastructure can support the target system requirements:</p>
  <ul>
    <li><strong>Technology Stack Maturity:</strong> The MERN stack (MongoDB, Express.js, React 19, Node.js) represents an industry-standard, battle-tested software architecture. Node.js provides non-blocking, asynchronous I/O ideal for handling concurrent upload streams and WebSocket events.</li>
    <li><strong>Cloud Storage and Processing:</strong> Cloudinary provides reliable cloud object storage with signed secure URLs, while client-side pdfjs-dist and server-side pdf-lib provide robust programmatic document parsing.</li>
    <li><strong>Real-Time Communication:</strong> Socket.IO enables low-latency, full-duplex bi-directional communication between connected clients, staff dashboards, and print agents without consuming excessive server memory.</li>
    <li><strong>Hardware Interfacing via Electron:</strong> The Electron framework provides direct access to Windows operating system APIs and the local print spooler (pdf-to-printer), allowing the desktop Print Agent to control physical hardware seamlessly.</li>
  </ul>
  <p>The technical architecture requires no proprietary, untried technology; all components have mature documentation, strong community support, and verified open-source libraries. Hence, the project is technically feasible.</p>

  <h3 class="subsection-title">2.3.2 Operational Feasibility</h3>
  <p>Operational feasibility assesses how effectively the proposed solution integrates into the daily routines of campus stakeholders:</p>
  <ul>
    <li><strong>Student and Faculty Usability:</strong> Students and faculty already use smartphones and web browsers daily. The intuitive 3-step ordering wizard, mobile-responsive layout, and PWA installation require zero formal user training.</li>
    <li><strong>Counter Staff Ergonomics:</strong> Counter operators transition from manual file handling and cash calculation to an intuitive dashboard that displays incoming jobs, automatically computes totals, and verifies handovers via single-click OTP entry.</li>
    <li><strong>Institutional Governance:</strong> Administrators receive real-time visibility into machine status, paper consumption, daily revenue, and staff incident reports, substantially easing operational auditing.</li>
  </ul>
  <p>Because REPOSYS directly eliminates manual bottlenecks without imposing complicated new workflows, user acceptance is exceptionally high. Therefore, the system is operationally feasible.</p>

  <h3 class="subsection-title">2.3.3 Economic Feasibility</h3>
  <p>Economic feasibility weighs the development, deployment, and operational expenditures against the tangible and intangible cost savings:</p>
  <ul>
    <li><strong>Development Cost:</strong> The platform is constructed entirely using open-source frameworks (React, Node.js, Express, MongoDB Community/Atlas free tier, Vite, Tailwind CSS, Electron), incurring zero proprietary software licensing fees.</li>
    <li><strong>Hosting and Cloud Infrastructure:</strong> Cloud hosting on scalable platforms (Vercel for frontend, Render for backend, MongoDB Atlas M0/M10 for database) provides cost-effective hosting tailored to campus traffic profiles.</li>
    <li><strong>Resource Savings:</strong> Eliminating uncollected prints and wasted paper saves hundreds of sheets per week. Accurate automated billing prevents revenue leakage.</li>
    <li><strong>Productivity Dividends:</strong> Minimising queue wait times recovers valuable instructional and research hours for students and faculty.</li>
  </ul>
  <p>The projected operational savings and efficiency gains substantially outweigh the negligible deployment costs, confirming high economic feasibility.</p>

  <h3 class="subsection-title">2.3.4 Schedule Feasibility</h3>
  <p>The capstone project was structured across a 17-week academic timeline prescribed by the Department of Computer Applications for course <strong>20IMCAP501 (Mini Project - 2)</strong>. The schedule allotted realistic durations for requirements analysis, system architecture, database design, backend coding, frontend development, payment/agent integration, and automated testing. Table 2.2 confirms that all deliverables aligned with institutional assessment milestones.</p>

  <h2 class="section-title">2.4 CONCEPTUAL MODELLING</h2>
  <p>Conceptual modelling captures the high-level boundaries, external entities, and data flows governing REPOSYS.</p>

  <h3 class="subsection-title">2.4.1 Level 0 Context Data Flow Diagram</h3>
  <p>The Level 0 Context DFD depicts REPOSYS as a centralised system interacting with five primary external entities: Students/Faculty, Counter Staff, Administrators, Razorpay Payment Gateway, and Cloudinary Storage.</p>
  <div class="figure-box">
    <div style="display: inline-block; border: 2px solid #2563eb; padding: 15px 25px; background: #eff6ff; border-radius: 8px; font-size: 11pt;">
      <strong>Context DFD (Level 0):</strong><br>
      [Students / Faculty] &larr; (Uploads, Orders, Razorpay Payments) &rarr; <strong>[ REPOSYS Platform 0.0 ]</strong><br>
      [ REPOSYS Platform 0.0 ] &larr; (Queue Orders, OTP Verify, PAC Cash) &rarr; [Counter Staff]<br>
      [ REPOSYS Platform 0.0 ] &larr; (Pricing Rules, Shop Sched, Audit Logs) &rarr; [System Administrator]<br>
      [ REPOSYS Platform 0.0 ] &larr; (Signed Cloudinary URLs, Webhook Signatures) &rarr; [External Cloud APIS]
    </div>
    <div class="caption">Figure 2.2: Level 0 Context Data Flow Diagram of REPOSYS</div>
  </div>

  <h3 class="subsection-title">2.4.2 Level 1 Functional Data Flow Diagram</h3>
  <p>The Level 1 DFD decomposes REPOSYS into its major functional processes: Authentication (1.0), Document Upload and Inspection (2.0), Order Configuration and Costing (3.0), Payment Settlement (4.0), Queue Scheduling (5.0), and Physical Production Handover (6.0).</p>
  <div class="figure-box">
    <div style="display: inline-block; border: 1px solid #475569; padding: 12px 20px; background: #f8fafc; border-radius: 6px; font-size: 10pt; line-height: 1.5; text-align: left;">
      <strong>1.0 User Authentication &amp; Role Check</strong> &rarr; Validated JWT Claims<br>
      <strong>2.0 Document Upload &amp; Analysis</strong> &rarr; MIME Verification &amp; Page Extraction<br>
      <strong>3.0 Order Configuration &amp; Cost Estimation</strong> &rarr; Algorithmic Price Calculation<br>
      <strong>4.0 Payment Settlement Engine</strong> &rarr; Razorpay / ACID Wallet / Cash-Pending<br>
      <strong>5.0 Priority Queue Scheduling</strong> &rarr; Role Weight + Aging Deduction<br>
      <strong>6.0 Print Spooling &amp; OTP Handover</strong> &rarr; Desktop Print Agent &amp; Customer Delivery
    </div>
    <div class="caption">Figure 2.3: Level 1 Functional Data Flow Diagram of the Complete Order Pipeline</div>
  </div>

  <h2 class="section-title">2.5 PLANNING AND SCHEDULING</h2>
  <p>The engineering development of REPOSYS was structured using the Agile Scrum methodology across a 17-week semester schedule prescribed by the official Scrum Register for course <strong>20IMCAP501 (Mini Project - 2)</strong>.</p>

  <table>
    <tr>
      <th style="width: 10%;">Week</th>
      <th style="width: 20%;">Date Range</th>
      <th style="width: 55%;">Planned Work and Key Deliverables</th>
      <th style="width: 15%;">Status</th>
    </tr>
    <tr><td><strong>W1</strong></td><td>01–04 Jul 2026</td><td>Topic selection, domain research, and approved synopsis</td><td>100% Done</td></tr>
    <tr><td><strong>W2</strong></td><td>06–10 Jul 2026</td><td>System study, feasibility analysis, module identification</td><td>100% Done</td></tr>
    <tr><td><strong>W3</strong></td><td>13–17 Jul 2026</td><td>Requirements gathering, user stories, UI wireframes</td><td>100% Done</td></tr>
    <tr><td><strong>W4</strong></td><td>20–22 Jul 2026</td><td>UML modeling, ER schema normalization, Git repo setup</td><td>100% Done</td></tr>
    <tr><td><strong>W5</strong></td><td>27–29 Jul 2026</td><td>Core structure setup, basic UI components (<strong>Review 0</strong>)</td><td>100% Done</td></tr>
    <tr><td><strong>W6</strong></td><td>03–07 Aug 2026</td><td>Authentication, JWT security, user profile management</td><td>100% Done</td></tr>
    <tr><td><strong>W7</strong></td><td>10–14 Aug 2026</td><td>Document upload pipeline, Cloudinary integration, testing</td><td>100% Done</td></tr>
    <tr><td><strong>W8</strong></td><td>17–21 Aug 2026</td><td>Priority queue, pricing engine, 50% evaluation (<strong>Review 1</strong>)</td><td>100% Done</td></tr>
    <tr><td><strong>W9</strong></td><td>01–05 Sep 2026</td><td>Razorpay gateway, wallet atomic transactions</td><td>100% Done</td></tr>
    <tr><td><strong>W10</strong></td><td>07–11 Sep 2026</td><td>Staff counter dashboard, OTP pickup verification</td><td>100% Done</td></tr>
    <tr><td><strong>W11</strong></td><td>14–18 Sep 2026</td><td>Admin console, inventory tracker, Selenium suite build</td><td>100% Done</td></tr>
    <tr><td><strong>W12</strong></td><td>21–25 Sep 2026</td><td>Socket.IO real-time engine, 80% Scrum Master Review</td><td>100% Done</td></tr>
    <tr><td><strong>W13</strong></td><td>28–30 Sep 2026</td><td>Electron Print Agent, shop cron scheduler, cloud hosting</td><td>100% Done</td></tr>
    <tr><td><strong>W14</strong></td><td>05–09 Oct 2026</td><td>PWA service worker, push alerts, final bug rectification</td><td>100% Done</td></tr>
    <tr><td><strong>W15</strong></td><td>12–14 Oct 2026</td><td>Final assessment board evaluation, live demo (<strong>Review 2</strong>)</td><td>100% Done</td></tr>
    <tr><td><strong>W16</strong></td><td>14 Oct 2026</td><td>Final project report submission and print verification</td><td>100% Done</td></tr>
    <tr><td><strong>W17</strong></td><td>15 Oct 2026</td><td>Hard-bound submission, signed Scrum register, git logs</td><td>100% Done</td></tr>
  </table>
  <div class="caption">Table 2.2: Official Project Schedule and Milestone Tracking (Scrum Register 20IMCAP501)</div>
</div>

<!-- ================= CHAPTER 3: SYSTEM SPECIFICATION ================= -->
<div class="page-break">
  <h1 class="chapter-title">CHAPTER 3<br>SYSTEM SPECIFICATION</h1>
  
  <h2 class="section-title">3.1 SOFTWARE AND HARDWARE REQUIREMENTS</h2>
  <p>To guarantee reliable execution across development, testing, and production tiers, clear hardware and software operational requirements were established.</p>

  <h3 class="subsection-title">3.1.1 Software Requirement</h3>
  <p>Table 3.1 enumerates the complete software specifications and production dependency versions derived directly from the application's configuration manifests.</p>

  <table>
    <tr>
      <th style="width: 25%;">Layer / Component</th>
      <th style="width: 30%;">Technology / Library</th>
      <th style="width: 45%;">Version / Configuration</th>
    </tr>
    <tr><td><strong>Server Runtime</strong></td><td>Node.js</td><td>v20.12.0 LTS (or higher)</td></tr>
    <tr><td><strong>Backend Framework</strong></td><td>Express.js</td><td>v4.19.2</td></tr>
    <tr><td><strong>Database Engine</strong></td><td>MongoDB Atlas / Community</td><td>v7.0.x with Mongoose ODM</td></tr>
    <tr><td><strong>Frontend Framework</strong></td><td>React.js</td><td>v19.2.4 (Vite bundler)</td></tr>
    <tr><td><strong>CSS Framework</strong></td><td>Tailwind CSS</td><td>v4.2.2 with PostCSS</td></tr>
    <tr><td><strong>Real-Time Engine</strong></td><td>Socket.IO</td><td>Server &amp; Client v4.8.3</td></tr>
    <tr><td><strong>Cloud File Storage</strong></td><td>Cloudinary SDK</td><td>Multer-storage-cloudinary</td></tr>
    <tr><td><strong>Payment Gateway</strong></td><td>Razorpay Node SDK</td><td>v2.9.6 (Webhook verification)</td></tr>
    <tr><td><strong>Desktop Agent</strong></td><td>Electron</td><td>v30.0.0 with pdf-to-printer</td></tr>
    <tr><td><strong>Document Parser</strong></td><td>pdf-lib &amp; pdfjs-dist</td><td>Server-side PDF analysis</td></tr>
    <tr><td><strong>Security Packages</strong></td><td>Helmet, bcryptjs, cors</td><td>Salt factor 12, rate limiter</td></tr>
    <tr><td><strong>Scheduler</strong></td><td>node-cron</td><td>5-field cron running * * * * *</td></tr>
    <tr><td><strong>Testing Engine</strong></td><td>Selenium WebDriver</td><td>Python 3.12, pytest-html 4.2.0</td></tr>
    <tr><td><strong>Client Browsers</strong></td><td>Chromium, Firefox, Edge</td><td>Modern HTML5 / ES6 standards</td></tr>
  </table>
  <div class="caption">Table 3.1: Production Software Stack and Dependency Specifications</div>

  <h3 class="subsection-title">3.1.2 Hardware Requirement</h3>
  <p>The system hardware requirements are divided across the production cloud server, the physical counter workstation, and the user client devices:</p>
  <ol>
    <li><strong>Production Cloud Application Server:</strong>
      <ul>
        <li>Processor: Quad-Core 64-bit x86/ARM CPU (2.4 GHz or higher).</li>
        <li>Random Access Memory (RAM): Minimum 4 GB RAM (8 GB recommended for concurrent upload parsing).</li>
        <li>Persistent Disk: 20 GB SSD storage for operating system, temporary buffer caches, and application logs.</li>
        <li>Network Interface: 100 Mbps full-duplex uplink with high-bandwidth availability.</li>
      </ul>
    </li>
    <li><strong>Counter Staff Workstation &amp; Print Agent Host:</strong>
      <ul>
        <li>Operating System: Microsoft Windows 10 / Windows 11 (64-bit) for Windows Spooler API compatibility.</li>
        <li>Processor: Intel Core i3 / AMD Ryzen 3 or equivalent.</li>
        <li>RAM: Minimum 4 GB RAM.</li>
        <li>Disk: 10 GB free space for spooling temporary PDF documents.</li>
        <li>Peripherals: USB 3.0 / Gigabit Ethernet interface connecting local multi-function printers, thermal receipt printer, and 2D barcode / QR-code scanner.</li>
      </ul>
    </li>
    <li><strong>Student / Faculty Client Devices:</strong>
      <ul>
        <li>Smartphone or Laptop: Any standard Android, iOS, Windows, macOS, or Linux device equipped with an HTML5-compliant web browser.</li>
        <li>Network: 4G/5G mobile data or campus Wi-Fi connectivity.</li>
      </ul>
    </li>
    <li><strong>Target Reprography Hardware:</strong>
      <ul>
        <li>Networked Heavy-Duty Commercial Multifunction Printers (Canon, HP, Ricoh, Konica Minolta).</li>
        <li>Comb and Spiral document binding machine.</li>
      </ul>
    </li>
  </ol>

  <h2 class="section-title">3.2 FUNCTIONAL SPECIFICATIONS</h2>
  <p>The functional capabilities of REPOSYS were architected across 39 distinct system features. The primary operational specifications are detailed below:</p>
  <ol>
    <li><strong>User Authentication and Role Verification (Feature 1):</strong> Implements secure registration with email validation, password encryption via bcrypt (12 salt rounds), and stateless JSON Web Token (JWT) session generation stored in HTTP-only secure cookies.</li>
    <li><strong>Composite Priority Queue Management (Feature 2):</strong> Dynamically sorts in-flight printing jobs based on a composite score combining user role, job duration, and waiting time aging deduction.</li>
    <li><strong>Document Upload and Pre-Flight Inspection (Feature 3):</strong> Supports multi-format upload (PDF, DOCX, PNG, JPEG) with client and server MIME validation, computing page count, color percentage, and blank-page alerts.</li>
    <li><strong>Order Configuration Wizard (Feature 4):</strong> Multi-step wizard allowing users to configure copies, color mode (Monochrome vs. Full Color), duplexing (Single vs. Double-sided), paper size (A4, A3, Legal), and binding (Spiral, Staple, None).</li>
    <li><strong>Dynamic Cost Calculation Engine (Feature 7):</strong> Deterministic price estimation applying unit rates, duplex discounts (0.85 multiplier), binding costs, and active coupon codes.</li>
    <li><strong>Multi-Channel Payment Settlement (Feature 8):</strong> Real-time payment processing through Razorpay (UPI, Netbanking, Cards), internal user wallet with atomic MongoDB transactions, and cash Pay at Counter.</li>
    <li><strong>Order Tracking Timeline (Feature 10):</strong> Visual status progression tracking: Pending, In_Queue, Processing, ReadyForPickup, Completed, and Cancelled.</li>
    <li><strong>Counter Staff Production Dashboard (Feature 13):</strong> Live terminal displaying queue orders, cash collection triggers, physical print dispatch, and stock status.</li>
    <li><strong>OTP-Protected Pickup Handover (Feature 28):</strong> High-security order delivery requiring counter staff to enter the customer's 4-digit OTP or scan their QR token before order status changes to Completed.</li>
    <li><strong>Smart Kiosk Session Mode (Feature 36):</strong> Registration-free guest ordering generating temporary UUID session tokens with 2-hour sliding expirations and automatic inactivity wipe.</li>
    <li><strong>Collaborative Friend Chat and Split Requests (Features 38 &amp; 39):</strong> Peer-to-peer friend chat and collaborative group-order payment splitting with atomic multi-wallet deductions.</li>
  </ol>

  <h2 class="section-title">3.3 TOOLS AND PLATFORMS USED</h2>
  <ol>
    <li><strong>React 19 with Vite:</strong> Delivers a lightning-fast Single Page Application (SPA) leveraging React Server Components, custom hooks (useSocket, useAuth), and optimized bundle splitting via Vite.</li>
    <li><strong>Node.js and Express.js:</strong> Forms the asynchronous API gateway capable of non-blocking I/O operations, routing, middleware orchestration, and streaming multipart upload data.</li>
    <li><strong>MongoDB Atlas and Mongoose:</strong> Flexible document-oriented NoSQL database providing schema validation, high-speed secondary indexing, and multi-document ACID transaction guarantees.</li>
    <li><strong>Socket.IO:</strong> Enterprise-grade WebSocket abstraction managing room-based event broadcasting (queue:serviceType, user:userId, staff, admin) with automatic HTTP long-polling fallback.</li>
    <li><strong>Cloudinary Media Cloud:</strong> Enterprise object storage managing uploaded documents with AES-256 cloud encryption, time-delimited signed URLs, and automated PDF-to-thumbnail transformation.</li>
    <li><strong>Razorpay API:</strong> RBI-compliant digital payment gateway facilitating seamless student payments across Google Pay, PhonePe, Paytm, debit/credit cards, and net banking.</li>
    <li><strong>Electron Framework:</strong> Powers the desktop Print Agent, bridging web APIs to native Windows operating system commands, Windows PowerShell, and spooler utilities.</li>
    <li><strong>Selenium WebDriver and Pytest:</strong> Comprehensive automated testing suite simulating end-to-end user interactions, verifying route protection, and auditing UI flows across real browser sessions.</li>
  </ol>

  <h2 class="section-title">3.4 DEVELOPMENT ENVIRONMENT</h2>
  <p>The development lifecycle was conducted under structured development conventions:</p>
  <ul>
    <li><strong>Version Control Configuration:</strong> Git and GitHub were utilised for branching, feature pull requests, and commit tracking.</li>
    <li><strong>Environment Variable Management:</strong> Configuration isolation was maintained through .env.development and .env.production files, segregating API keys, MongoDB connection URIs, Razorpay secrets, and Cloudinary credentials.</li>
    <li><strong>Cross-Origin Resource Sharing (CORS):</strong> Controlled through strict origin whitelisting in origins.js, permitting requests exclusively from authorized frontend and print-agent hosts.</li>
    <li><strong>Database Seeding Scripts:</strong> Automated seeding scripts (seedAdmin.js, seedInventory.js) populated default system configurations, catalog pricing rules, paper stock, and supervisory accounts upon initialization.</li>
  </ul>
</div>

<!-- ================= CHAPTER 4: SYSTEM DESIGN ================= -->
<div class="page-break">
  <h1 class="chapter-title">CHAPTER 4<br>SYSTEM DESIGN</h1>
  
  <h2 class="section-title">4.1 MODULE DESCRIPTIONS</h2>
  <p>REPOSYS is engineered around four deeply integrated subsystem modules, each tailored to distinct operational responsibilities within the reprography ecosystem.</p>

  <h3 class="subsection-title">4.1.1 User and Customer Module</h3>
  <p>The User Module provides authenticated students, faculty, and campus guests with an intuitive digital storefront for document submission and lifecycle management:</p>
  <ol>
    <li><strong>Authentication and Profile Subsystem:</strong> Manages user registration, JWT login, profile editing, and password recovery via encrypted email tokens.</li>
    <li><strong>Three-Step Order Placement Wizard:</strong> Guides the customer through: (i) File drag-and-drop with pre-flight analysis; (ii) Print configuration (copies, color, duplexing, paper format, binding); and (iii) Cost review and payment gateway selection.</li>
    <li><strong>Digital Wallet Subsystem:</strong> Displays pre-funded balances, transaction logs, and single-click wallet debits backed by MongoDB multi-document ACID transactions.</li>
    <li><strong>Order Tracking and Digital Receipts:</strong> Renders an active order timeline with live queue position updates, countdown timers, pickup OTP codes, and dynamically generated PDF receipts.</li>
    <li><strong>Collaborative Tools:</strong> Manages student friend connections, direct peer messaging, and collaborative split-order requests.</li>
  </ol>

  <h3 class="subsection-title">4.1.2 Counter Staff Module</h3>
  <p>The Counter Staff Module equips reprography operators with a dedicated operational terminal designed for high-throughput, error-free counter processing:</p>
  <ol>
    <li><strong>Active Priority Queue Board:</strong> Real-time dashboard grouping active jobs by service type (Printing, Photocopying, Scanning, Binding), sorted dynamically by effective priority score.</li>
    <li><strong>Production Controls:</strong> Enables operators to trigger manual print dispatches, mark orders as Processing, and transition finished jobs to ReadyForPickup.</li>
    <li><strong>Cash-at-Counter Settlement:</strong> Single-click verification for cash collections, updating paymentStatus from Cash_Pending to Paid and synchronizing the daily counter register.</li>
    <li><strong>OTP-Protected Handover Terminal:</strong> Requires entry of the customer's 4-digit verification code or barcode scan before finalizing delivery.</li>
    <li><strong>Incident Reporting Subsystem:</strong> Enables operators to log equipment malfunctions, toner outages, or customer disputes directly to administrators.</li>
  </ol>

  <h3 class="subsection-title">4.1.3 Administrator Module</h3>
  <p>The Administrator Module provides institutional supervisors with governance and configuration capabilities:</p>
  <ol>
    <li><strong>Dynamic Tariff and Pricing Control:</strong> Live configuration of unit costs for black-and-white, color, double-sided discounts, binding modes, and paper types without requiring server restarts.</li>
    <li><strong>User and Role Governance:</strong> Supervisory oversight of student, faculty, and staff accounts, including role reassignments and account restrictions.</li>
    <li><strong>Consumable Inventory Tracker:</strong> Automated monitoring of A4/A3 paper reams, toner cartridges, and binding coils with low-stock warning thresholds.</li>
    <li><strong>Append-Only Audit Logging:</strong> Comprehensive activity tracking logging every sensitive administrative, financial, and operational action.</li>
    <li><strong>Automated Shop Operations Control:</strong> Manual overrides for shop opening hours (schedule, manual_open, manual_close).</li>
  </ol>

  <h3 class="subsection-title">4.1.4 Print Agent Module</h3>
  <p>The Print Agent is an autonomous Electron desktop background service deployed on counter workstations:</p>
  <ol>
    <li><strong>Hardware Discovery:</strong> Periodically executes Windows PowerShell cmdlets (Get-Printer) to detect installed physical print drivers and online/offline states.</li>
    <li><strong>Secure Cloud Job Retrieval:</strong> Authenticates using unique agent tokens, listens for Socket.IO dispatch events, and fetches documents via temporary signed Cloudinary URLs.</li>
    <li><strong>Spooler Execution:</strong> Invokes native Windows printing utilities (pdf-to-printer) to spool files directly into the target printer queue.</li>
    <li><strong>Heartbeat Telemetry:</strong> Emits heartbeat pings every 30 seconds to update cloud registries regarding hardware readiness.</li>
  </ol>

  <h2 class="section-title">4.2 DATA / SCHEMA DESIGN</h2>
  <p>Persistence in REPOSYS is managed through MongoDB using Mongoose Object Data Modeling (ODM). The database comprises 23 primary collections structured to support rapid lookups, transactional integrity, and comprehensive auditability.</p>

  <table>
    <tr>
      <th style="width: 20%;">Collection</th>
      <th style="width: 25%;">Key Indexes</th>
      <th style="width: 55%;">Core Schema Fields &amp; Data Types</th>
    </tr>
    <tr>
      <td><strong>User</strong></td>
      <td>email (unique)</td>
      <td>name (String), email (String), password (Hash), role (Enum: Student, Faculty, Staff, Admin), department (String), walletBalance (Number), isVerified (Boolean).</td>
    </tr>
    <tr>
      <td><strong>Order</strong></td>
      <td>orderNumber (unique), userId, status, createdAt</td>
      <td>orderNumber (String), userId (Ref: User), serviceType (Enum), documents (Array), totalCost (Number), paymentStatus (Enum), status (Enum), priorityScore (Number), pickupOtp (String), qrCode (String).</td>
    </tr>
    <tr>
      <td><strong>Document</strong></td>
      <td>orderId, userId</td>
      <td>fileName (String), fileUrl (String), fileType (String), pageCount (Number), colorPages (Number), blankPages (Array), fileSize (Number).</td>
    </tr>
    <tr>
      <td><strong>Payment</strong></td>
      <td>razorpayOrderId, orderId</td>
      <td>orderId (Ref: Order), userId (Ref: User), amount (Number), method (Enum: Razorpay, Wallet, Cash), transactionId (String), status (Enum: Pending, Completed, Failed).</td>
    </tr>
    <tr>
      <td><strong>Wallet</strong></td>
      <td>userId (unique)</td>
      <td>userId (Ref: User), balance (Number), currency (String), lastUpdated (Date).</td>
    </tr>
    <tr>
      <td><strong>WalletTransaction</strong></td>
      <td>walletId, createdAt</td>
      <td>walletId (Ref: Wallet), type (Enum: Credit, Debit), amount (Number), description (String), balanceAfter (Number).</td>
    </tr>
    <tr>
      <td><strong>Complaint</strong></td>
      <td>orderId, userId, status</td>
      <td>orderId (Ref: Order), userId (Ref: User), category (String), subject (String), description (String), status (Enum: Open, In_Progress, Resolved), messages (Array).</td>
    </tr>
    <tr>
      <td><strong>InventoryItem</strong></td>
      <td>itemCode (unique)</td>
      <td>itemName (String), category (Enum: Paper, Toner, Binding), quantity (Number), threshold (Number), unitCost (Number).</td>
    </tr>
    <tr>
      <td><strong>SystemConfig</strong></td>
      <td>Singleton</td>
      <td>pricing (Object), operatingHours (Object), shopMode (Enum: schedule, manual_open, manual_close), isManuallyOpen (Boolean).</td>
    </tr>
    <tr>
      <td><strong>PrintAgentRegistry</strong></td>
      <td>agentId (unique)</td>
      <td>agentId (String), hostName (String), ipAddress (String), status (Enum: Online, Offline), lastHeartbeat (Date), printers (Array).</td>
    </tr>
  </table>
  <div class="caption">Table 4.1: Database Schema Specifications of Core REPOSYS Collections</div>

  <h2 class="section-title">4.3 PROCEDURAL / FLOW DESIGN</h2>
  
  <h3 class="subsection-title">4.3.1 Priority Queue and Aging Mathematical Model</h3>
  <p>To balance institutional hierarchy against fair queue wait times, REPOSYS executes a dynamic priority evaluation algorithm within queueService.js. A lower score denotes a higher processing priority.</p>
  <p>The base priority score (S<sub>base</sub>) is evaluated upon order creation:</p>
  <div style="text-align: center; margin: 8px 0; font-style: italic;">
    S<sub>base</sub> = P<sub>role</sub> + &lfloor; T<sub>est</sub> &rfloor;
  </div>
  <p>where P<sub>role</sub> represents the categorical role priority (Faculty = 100, Staff = 150, Student = 200, Guest = 200), and T<sub>est</sub> represents the estimated physical production duration in minutes.</p>
  <p>To prevent job starvation where an influx of faculty orders permanently postpones student orders, the system recalculates the effective priority score (S<sub>eff</sub>) dynamically:</p>
  <div style="text-align: center; margin: 8px 0; font-style: italic;">
    D<sub>aging</sub> = max(0, &lfloor;(T<sub>wait</sub> &minus; 1) / 60&rfloor;) &times; 20<br>
    S<sub>eff</sub> = S<sub>base</sub> &minus; D<sub>aging</sub>
  </div>
  <p>where T<sub>wait</sub> is the elapsed waiting time in minutes. For every full hour of counter waiting, the order's score is reduced by 20 points, steadily moving the job ahead in queue. When two orders possess equal effective scores, First-In, First-Out (createdAt ascending) serves as the definitive tie-breaker.</p>

  <h3 class="subsection-title">4.3.2 Automated Shop Scheduling State Machine</h3>
  <p>The operating availability of the reprography centre is governed by an automated scheduler in shopScheduler.js executing every minute via node-cron (* * * * *).</p>
  
  <div class="figure-box">
    <div style="display: inline-block; border: 1px solid #0284c7; padding: 12px 20px; background: #f0f9ff; border-radius: 6px; font-size: 10pt; line-height: 1.4;">
      <strong>Cron Event (* * * * *)</strong> &rarr; Calculate IST (UTC + 05:30)<br>
      &darr;<br>
      <strong>Check Time Window:</strong> Monday&ndash;Saturday, 09:00 to 17:00 IST<br>
      &darr;<br>
      <strong>Evaluate shopMode:</strong> Mode = 'schedule' vs. 'manual_open' / 'manual_close'<br>
      &darr;<br>
      <strong>State Changed?</strong> Yes &rarr; Commit to SystemConfig &amp; Emit Socket.IO Event (shop_opened / shop_closed)
    </div>
    <div class="caption">Figure 4.1: Automated Shop Scheduling Logic and Operational State Transitions</div>
  </div>

  <h3 class="subsection-title">4.3.3 Order Expiration and Pay-at-Counter Timeout Management</h3>
  <p>In addition to shop hours, background services in cronJobs.js enforce financial and operational timeouts:</p>
  <ul>
    <li><strong>Unpaid Online Orders:</strong> Cancelled automatically after 15 minutes of inactivity.</li>
    <li><strong>Pay at Counter Orders:</strong> First email reminder issued at 24 hours; order cancelled and archived if unpaid at 48 hours.</li>
    <li><strong>Uncollected Orders:</strong> A reminder is dispatched after 24 hours of reaching ReadyForPickup. A secondary warning is issued at 48 hours. If uncollected at 72 hours, the job is flagged for administrative review to prevent storage clutter.</li>
  </ul>

  <h3 class="subsection-title">4.3.4 UML Diagrams</h3>
  <div class="figure-box">
    <img src="{img_use}" alt="Use Case Diagram">
    <div class="caption">Figure 4.2: System Use Case Diagram: User, Staff, and Admin Operational Boundaries</div>
  </div>

  <div class="figure-box">
    <img src="{img_act}" alt="Activity Diagram">
    <div class="caption">Figure 4.3: System Activity Diagram: Document Upload, Analysis, and Production Flow</div>
  </div>

  <div class="figure-box">
    <img src="{img_seq}" alt="Sequence Diagram">
    <div class="caption">Figure 4.4: System Sequence Diagram: Real-Time Event Dispatching and Queue Updates</div>
  </div>

  <h2 class="section-title">4.4 USER INTERFACE DESIGN</h2>
  <p>The user interface is engineered adhering to mobile-first responsive design paradigms using React 19, Tailwind CSS, and Lucide React icon tokens:</p>
  <ul>
    <li><strong>Color System:</strong> The interface employs an accessible academic palette: Deep Slate Navy (#0f172a) for structural headers, Vibrant Cobalt Blue (#2563eb) for call-to-actions, Emerald Green (#10b981) for successful pickups, and Amber (#f59e0b) for pending queue states.</li>
    <li><strong>Navigation Hierarchy:</strong> Role-aware layout bars automatically present relevant navigation links depending on authenticated JWT claims.</li>
    <li><strong>Mobile-First Ordering Wizard:</strong> A step-by-step progress stepper ensures students on smartphones can easily configure document options and review cost estimations without excessive scrolling.</li>
  </ul>
</div>

<!-- ================= CHAPTER 5: DEVELOPMENT METHODOLOGY ================= -->
<div class="page-break">
  <h1 class="chapter-title">CHAPTER 5<br>DEVELOPMENT METHODOLOGY</h1>
  
  <h2 class="section-title">5.1 PROJECT ROADMAP</h2>
  <p>The development of REPOSYS adhered to an iterative engineering lifecycle, organized into nine distinct development stages designed to deliver incremental value and facilitate early testing.</p>
  <ol>
    <li><strong>Stage 1 – Requirements Discovery and Architectural Feasibility:</strong> Field interviews with campus students, faculty coordinators, and reprography operators to define the 39-feature backlog, security requirements, and system boundaries.</li>
    <li><strong>Stage 2 – Wireframing and Database Design:</strong> UI prototyping using Figma and complete entity-relationship modeling across 23 Mongoose collections with schema validations and indexing.</li>
    <li><strong>Stage 3 – Core Identity and Access Management:</strong> Implementation of JWT-based authentication, bcrypt password hashing (salt 12), and role-based access control middleware (auth.js, roleGuard.js).</li>
    <li><strong>Stage 4 – Document Upload and Inspection Pipeline:</strong> Integration of Multer memory storage, Cloudinary object streaming, and automated document analysis for page counting and blank-page detection.</li>
    <li><strong>Stage 5 – Dynamic Cost Estimation and Payments:</strong> Construction of deterministic pricing algorithms, Razorpay webhook verification, and internal digital wallet debiting backed by MongoDB ACID transactions.</li>
    <li><strong>Stage 6 – Composite Priority Queue and Staff Dashboard:</strong> Implementation of the anti-starvation priority queue engine and the counter operator dashboard.</li>
    <li><strong>Stage 7 – Hardware Integration via Desktop Print Agent:</strong> Development of the Electron desktop application, Windows PowerShell printer discovery, signed URL retrieval, and pdf-to-printer spooling.</li>
    <li><strong>Stage 8 – Real-Time Engine, Scheduling, and PWA:</strong> Implementation of Socket.IO rooms, automated shop scheduling cron services, Web Push alerts, and Service Worker caching.</li>
    <li><strong>Stage 9 – Verification, Security Hardening, and Deployment:</strong> Execution of 120 automated Selenium test cases, Helmet security hardening, rate limiting, and production cloud hosting.</li>
  </ol>

  <h2 class="section-title">5.2 USER STORIES</h2>
  <p>User stories define system features from the direct perspective of each operational stakeholder.</p>
  <ol>
    <li><strong>User Story US-01 (Student Remote Order):</strong>
      <ul>
        <li><em>Narrative:</em> As a Student, I want to upload my seminar report PDF from my smartphone and select double-sided printing, so that I do not have to wait in the physical counter queue.</li>
        <li><em>Acceptance Criteria:</em> Given an authenticated student account, when a PDF document is uploaded, then the system automatically detects page count, calculates the 15% duplex discount, displays the cost breakdown, and updates the queue status upon payment.</li>
      </ul>
    </li>
    <li><strong>User Story US-02 (Faculty Priority Printing):</strong>
      <ul>
        <li><em>Narrative:</em> As a Faculty member, I want my examination question papers to receive prioritized counter processing, so that academic timelines are strictly maintained.</li>
        <li><em>Acceptance Criteria:</em> Given an active Faculty session, when an order is created, then the priority engine automatically assigns a base score of 100 (higher than student base of 200), positioning the order near the front of the staff queue board.</li>
      </ul>
    </li>
    <li><strong>User Story US-03 (Counter Staff OTP Verification):</strong>
      <ul>
        <li><em>Narrative:</em> As a Counter Staff operator, I want to verify a 4-digit pickup code before handing over printed documents, so that orders are never delivered to the wrong individual.</li>
        <li><em>Acceptance Criteria:</em> Given an order in ReadyForPickup status, when the staff inputs the customer's 4-digit OTP, then the backend validates the code and transitions status to Completed; invalid OTP attempts return an error without releasing the job.</li>
      </ul>
    </li>
    <li><strong>User Story US-04 (Admin Dynamic Pricing):</strong>
      <ul>
        <li><em>Narrative:</em> As an Administrator, I want to update paper and binding tariffs on the live system, so that prices reflect changes in institutional procurement costs without server restarts.</li>
        <li><em>Acceptance Criteria:</em> Given an authenticated Admin role, when the tariff configuration is updated via the dashboard, then new rates are committed immediately to SystemConfig and reflected in all subsequent order estimations.</li>
      </ul>
    </li>
    <li><strong>User Story US-05 (Collaborative Split Payment):</strong>
      <ul>
        <li><em>Narrative:</em> As a Project Team Leader, I want to split a ₹300 project documentation printing cost equally among three teammates, so that we do not have to collect cash manually.</li>
        <li><em>Acceptance Criteria:</em> Given an active group order, when split requests are dispatched, then each participant's wallet is debited by ₹100 atomically upon individual approval; the order enters the active queue only after all shares are successfully settled.</li>
      </ul>
    </li>
  </ol>

  <h2 class="section-title">5.3 TEST PLAN</h2>
  <p>The testing strategy for REPOSYS was formulated to validate end-to-end reliability, financial consistency, role security, and real-time state synchronization across all 39 documented system features.</p>
  
  <h3 class="subsection-title">5.3.1 Testing Levels and Scope</h3>
  <ol>
    <li><strong>Unit Testing:</strong> Verification of isolated mathematical algorithms in pricingService.js (cost estimation, duplex discount calculation, aging score deduction) and utility functions (IST conversion, token generation).</li>
    <li><strong>Integration Testing:</strong> Verification of inter-service contracts, including Express middleware pipelines, Cloudinary stream uploads, Razorpay webhook signature verification, and Socket.IO room broadcast relays.</li>
    <li><strong>System and End-to-End Testing:</strong> Automated browser-driven operational tests simulating full customer journeys from registration to pickup using Python Selenium WebDriver.</li>
    <li><strong>Security and Penetration Testing:</strong> Boundary verification evaluating CORS rules, Helmet header protections, rate limiting against brute-force attacks, and prevention of privilege escalation across protected API routes.</li>
    <li><strong>User Acceptance Testing (UAT):</strong> Evaluation conducted by student representatives and counter staff during pilot deployment to assess operational usability.</li>
  </ol>

  <h3 class="subsection-title">5.3.2 Test Automation Architecture</h3>
  <p>Automated end-to-end testing was implemented using a dedicated Python Selenium framework located in selenium-tests/. The framework is structured into modular layers:</p>
  <ul>
    <li><strong>Page Object Model (POM):</strong> Encapsulates web elements and UI interactions into reusable page classes (login_page.py, register_page.py).</li>
    <li><strong>Driver Harness (driver.py &amp; conftest.py):</strong> Configures headless Chrome sessions, sets implicit wait thresholds, and captures automatic PNG screenshots upon assertion failure.</li>
    <li><strong>Pytest HTML Test Runner:</strong> Generates comprehensive execution reports (scrms_test_report.html) capturing test status, timing, and stack traces.</li>
  </ul>

  <h3 class="subsection-title">5.3.3 Entry and Exit Criteria</h3>
  <ul>
    <li><strong>Test Entry Criteria:</strong> All backend route controllers, frontend views, and database collections deployed to a stable staging environment with seeded administrative accounts.</li>
    <li><strong>Test Exit Criteria:</strong> Minimum 90% pass rate across all automated test cases, zero critical security vulnerabilities on role access guards, and verified ACID consistency on wallet transactions.</li>
  </ul>
</div>

<!-- ================= CHAPTER 6: IMPLEMENTATION AND TESTING ================= -->
<div class="page-break">
  <h1 class="chapter-title">CHAPTER 6<br>IMPLEMENTATION AND TESTING</h1>
  
  <h2 class="section-title">6.1 IMPLEMENTATION PROCEDURE</h2>
  <p>The implementation of REPOSYS translates the architectural specifications into production-grade software across backend services, client interfaces, and native desktop utilities.</p>
  <p>The repository is organised into decoupled, independently maintainable modules: backend/src/ (Express.js application layer), frontend/src/ (React 19 Single Page Application), print-agent-desktop/ (Electron-based native Windows application), and selenium-tests/ (Automated QA harness).</p>

  <h3 class="subsection-title">6.1.1 Feature Verification and Implementation Matrix</h3>
  <p>Table 6.1 documents the implementation status of all 39 audited system features, verified through comprehensive source code inspection.</p>

  <table>
    <tr>
      <th style="width: 10%;">Ref</th>
      <th style="width: 45%;">Feature Title</th>
      <th style="width: 45%;">Verified Implementation Status</th>
    </tr>
    <tr><td>C01</td><td>JWT Authentication &amp; Bcrypt</td><td><strong>IMPLEMENTED</strong> (Salt factor 12, httpOnly cookies)</td></tr>
    <tr><td>C02</td><td>Three-Tier Priority Queue</td><td><strong>IMPLEMENTED</strong> (Aging deduction, role weights)</td></tr>
    <tr><td>C03</td><td>Document Upload &amp; Analysis</td><td><strong>IMPLEMENTED</strong> (pdf-lib parsing, blank page detection)</td></tr>
    <tr><td>C04</td><td>Document Processing Services</td><td><strong>IMPLEMENTED</strong> (Print parameters, binding options)</td></tr>
    <tr><td>C05</td><td>Document Utility Suite</td><td><strong>PARTIALLY IMPLEMENTED</strong> (Merge/split functional)</td></tr>
    <tr><td>C06</td><td>Multi-Document Orders</td><td><strong>IMPLEMENTED</strong> (Batch upload, combined estimate)</td></tr>
    <tr><td>C07</td><td>Smart Cost Estimation</td><td><strong>PARTIALLY IMPLEMENTED</strong> (Algorithmic pricing active)</td></tr>
    <tr><td>C08</td><td>Payment Gateway &amp; Receipts</td><td><strong>IMPLEMENTED</strong> (Razorpay, Wallet, PAC, PDF receipts)</td></tr>
    <tr><td>C09</td><td>Order Editing &amp; Cancellation</td><td><strong>PARTIALLY IMPLEMENTED</strong> (Cancel in Pending state)</td></tr>
    <tr><td>C10</td><td>Real-Time Order Tracking</td><td><strong>IMPLEMENTED</strong> (Socket.IO timeline progression)</td></tr>
    <tr><td>C11</td><td>Partial Order Handling</td><td><strong>IMPLEMENTED</strong> (Multi-file individual status flags)</td></tr>
    <tr><td>C12</td><td>Slot Booking &amp; Pickup Times</td><td><strong>IMPLEMENTED</strong> (Custom pickup slot selection)</td></tr>
    <tr><td>C13</td><td>Counter Staff Dashboard</td><td><strong>IMPLEMENTED</strong> (Queue table, status controls, PAC)</td></tr>
    <tr><td>C14</td><td>Admin Dashboard</td><td><strong>IMPLEMENTED</strong> (Tariffs, user roles, system configs)</td></tr>
    <tr><td>C15</td><td>Append-Only Audit Trail</td><td><strong>IMPLEMENTED</strong> (ActivityLog collection logging)</td></tr>
    <tr><td>C16</td><td>Inventory Tracker</td><td><strong>IMPLEMENTED</strong> (Paper/toner stock, low-stock alerts)</td></tr>
    <tr><td>C17</td><td>Operational Reporting</td><td><strong>IMPLEMENTED</strong> (Daily financial summaries, exports)</td></tr>
    <tr><td>C18</td><td>Notification System</td><td><strong>IMPLEMENTED</strong> (In-app alerts, Web Push, Nodemailer)</td></tr>
    <tr><td>C19</td><td>Order History &amp; Invoicing</td><td><strong>IMPLEMENTED</strong> (PDF generation via pdfkit)</td></tr>
    <tr><td>C20</td><td>Complaints &amp; Real-Time Chat</td><td><strong>IMPLEMENTED</strong> (Socket.IO complaint chat rooms)</td></tr>
    <tr><td>C21</td><td>AI Chatbot Assistant</td><td><strong>PARTIALLY IMPLEMENTED</strong> (Rule-based FAQ active)</td></tr>
    <tr><td>C22</td><td>Search &amp; System Filtering</td><td><strong>IMPLEMENTED</strong> (MongoDB regex filtering)</td></tr>
    <tr><td>C23</td><td>User Rating &amp; Feedback</td><td><strong>IMPLEMENTED</strong> (5-star rating with staff reviews)</td></tr>
    <tr><td>C24</td><td>Backup &amp; Recovery Strategy</td><td><strong>UNCLEAR</strong> (Cloud database automated snapshots)</td></tr>
    <tr><td>C25</td><td>Operating Hours &amp; Schedule</td><td><strong>IMPLEMENTED</strong> (Automated IST cron, shop banners)</td></tr>
    <tr><td>C26</td><td>Reorder Functionality</td><td><strong>IMPLEMENTED</strong> (Single-click reorder cloning)</td></tr>
    <tr><td>C27</td><td>Document Preview</td><td><strong>IMPLEMENTED</strong> (Canvas-based PDF page rendering)</td></tr>
    <tr><td>C28</td><td>Pickup Verification via OTP</td><td><strong>IMPLEMENTED</strong> (4-digit numeric code validation)</td></tr>
    <tr><td>C29</td><td>Maximum Order Limits</td><td><strong>IMPLEMENTED</strong> (Page and file-size threshold guards)</td></tr>
    <tr><td>C30</td><td>User Profile Management</td><td><strong>IMPLEMENTED</strong> (Session management, security settings)</td></tr>
    <tr><td>C31</td><td>Registration Verification</td><td><strong>IMPLEMENTED</strong> (Email confirmation link tokens)</td></tr>
    <tr><td>C32</td><td>Pay at Counter Lifecycle</td><td><strong>PARTIALLY IMPLEMENTED</strong> (24h/48h/72h timeout alerts)</td></tr>
    <tr><td>C33</td><td>Staff Incident Reports</td><td><strong>IMPLEMENTED</strong> (Operational malfunction logging)</td></tr>
    <tr><td>C34</td><td>Security Controls</td><td><strong>PARTIALLY IMPLEMENTED</strong> (Helmet, rate limits, CORS)</td></tr>
    <tr><td>C35</td><td>Smart Kiosk Mode</td><td><strong>IMPLEMENTED</strong> (Guest sessions, QR code tracking)</td></tr>
    <tr><td>C36</td><td>PWA Architecture</td><td><strong>PARTIALLY IMPLEMENTED</strong> (Service worker, manifest)</td></tr>
    <tr><td>C37</td><td>Friend Chat Subsystem</td><td><strong>IMPLEMENTED</strong> (Direct/group messaging, media sharing)</td></tr>
    <tr><td>C38</td><td>Group Split Requests</td><td><strong>IMPLEMENTED</strong> (Atomic multi-wallet deductions)</td></tr>
    <tr><td>C39</td><td>Desktop Print Agent</td><td><strong>IMPLEMENTED</strong> (Electron tray, Windows spooler)</td></tr>
  </table>
  <div class="caption">Table 6.1: Verified Feature Implementation Matrix across REPOSYS</div>

  <h2 class="section-title">6.2 TESTING METHODS AND RESULTS</h2>
  <p>Quality assurance was executed through the automated Selenium WebDriver test suite, verifying authentication, document flows, payment webhooks, queue sorting, and administrative access controls.</p>

  <h3 class="subsection-title">6.2.1 Test Suite Execution Summary</h3>
  <p>The complete automated test suite was executed against a running staging instance. The generated test execution report (scrms_test_report.html) established:</p>
  <ul>
    <li><strong>Total Test Cases Executed:</strong> 120 tests.</li>
    <li><strong>Passed Tests:</strong> 114 tests (95.0% passing rate).</li>
    <li><strong>Failed Tests:</strong> 6 tests (5.0% failure rate).</li>
    <li><strong>Errors / Exceptions:</strong> 0 runtime errors.</li>
    <li><strong>Total Execution Duration:</strong> 7 minutes and 2 seconds.</li>
  </ul>

  <h3 class="subsection-title">6.2.2 Verified Test Cases and Results</h3>
  <p>Table 6.2 enumerates representative test cases executed across core subsystem workflows.</p>

  <table>
    <tr>
      <th style="width: 12%;">Test ID</th>
      <th style="width: 23%;">Feature Area</th>
      <th style="width: 50%;">Condition, Action, and Verified Output</th>
      <th style="width: 15%;">Result</th>
    </tr>
    <tr><td><strong>TC-001</strong></td><td>Authentication</td><td>Valid student login with correct credentials yields 200 OK and sets secure httpOnly JWT cookie.</td><td><strong>Passed</strong></td></tr>
    <tr><td><strong>TC-002</strong></td><td>Authentication</td><td>Login attempt with invalid password returns 401 Unauthorized with generic error message.</td><td><strong>Passed</strong></td></tr>
    <tr><td><strong>TC-003</strong></td><td>Role Guard</td><td>Student attempting to navigate to /api/admin/* is intercepted by middleware returning 403 Forbidden.</td><td><strong>Passed</strong></td></tr>
    <tr><td><strong>TC-004</strong></td><td>Role Guard</td><td>Staff attempting to access /admin routes is denied access and redirected to staff dashboard.</td><td><strong>Passed</strong></td></tr>
    <tr><td><strong>TC-005</strong></td><td>Role Guard</td><td>Administrator credentials grant authenticated access across all administrative and staff endpoints.</td><td><strong>Passed</strong></td></tr>
    <tr><td><strong>TC-006</strong></td><td>File Upload</td><td>Uploading valid PDF document extracts correct page count and generates signed Cloudinary URL.</td><td><strong>Passed</strong></td></tr>
    <tr><td><strong>TC-007</strong></td><td>File Upload</td><td>Uploading non-document executable (.exe) is rejected by MIME inspection returning 400 Bad Request.</td><td><strong>Passed</strong></td></tr>
    <tr><td><strong>TC-008</strong></td><td>Blank Detection</td><td>Uploading PDF with blank pages flags specific page numbers and alerts user in pre-flight dialog.</td><td><strong>Passed</strong></td></tr>
    <tr><td><strong>TC-009</strong></td><td>Cost Calculation</td><td>Ordering 10 double-sided B/W pages correctly computes discount (10 &times; 1.50 &times; 0.85 = ₹12.75).</td><td><strong>Passed</strong></td></tr>
    <tr><td><strong>TC-010</strong></td><td>Wallet Payment</td><td>Order placement with sufficient wallet balance atomically deducts funds and sets status to In_Queue.</td><td><strong>Passed</strong></td></tr>
    <tr><td><strong>TC-011</strong></td><td>Wallet Deficit</td><td>Order placement with insufficient balance prevents debit and prompts user to top up or select Razorpay.</td><td><strong>Passed</strong></td></tr>
    <tr><td><strong>TC-012</strong></td><td>Priority Queue</td><td>Faculty order created with base priority 100 is positioned ahead of student order with base priority 200.</td><td><strong>Passed</strong></td></tr>
    <tr><td><strong>TC-013</strong></td><td>Queue Aging</td><td>Student order waiting beyond 60 minutes receives 20-point deduction, advancing its relative queue position.</td><td><strong>Passed</strong></td></tr>
    <tr><td><strong>TC-014</strong></td><td>OTP Handover</td><td>Counter staff entering valid 4-digit customer OTP successfully transitions order to Completed.</td><td><strong>Passed</strong></td></tr>
    <tr><td><strong>TC-015</strong></td><td>OTP Security</td><td>Submitting incorrect OTP prevents handover, returns 400 Error, and retains order in ReadyForPickup.</td><td><strong>Passed</strong></td></tr>
    <tr><td><strong>TC-016</strong></td><td>Shop Scheduler</td><td>Visiting order wizard during Sunday closure shows active shop-closed banner and disables checkout.</td><td><strong>Passed</strong></td></tr>
    <tr><td><strong>TC-017</strong></td><td>Print Agent</td><td>Desktop agent polls Socket.IO, receives print payload, and invokes pdf-to-printer on default spooler.</td><td><strong>Passed</strong></td></tr>
    <tr><td><strong>TC-018</strong></td><td>Kiosk Mode</td><td>Guest session token expires after 2 hours; inactive kiosk terminal automatically logs out after timeout.</td><td><strong>Passed</strong></td></tr>
  </table>
  <div class="caption">Table 6.2: Representative Automated and Functional Test Results</div>

  <h3 class="subsection-title">6.2.3 Analysis of Failed Test Cases and Remediation</h3>
  <p>The 6 failing test cases in the test suite were systematically analysed:</p>
  <ul>
    <li><strong>Mobile Wizard Drag-and-Drop (2 failures):</strong> On certain mobile browser viewports, native HTML5 drag-and-drop events failed to trigger the upload handler. <em>Remediation:</em> Implemented an explicit fallback file input button with touch listeners.</li>
    <li><strong>Razorpay Webhook Timing Latency (2 failures):</strong> Under heavy network latency simulation, the webhook notification arrived slightly after the frontend polling timeout. <em>Remediation:</em> Added a resilient Socket.IO fallback listener for instant payment confirmation.</li>
    <li><strong>Print Agent ASAR Test File Extraction (2 failures):</strong> In packaged Electron production builds, pdf-to-printer could not read test files embedded inside the read-only ASAR archive. <em>Remediation:</em> Extracted temporary test PDF files to the local user data directory prior to spooler invocation (Git commit 4fd6368).</li>
  </ul>
</div>

<!-- ================= CHAPTER 7: CONCLUSION ================= -->
<div class="page-break">
  <h1 class="chapter-title">CHAPTER 7<br>CONCLUSION</h1>
  
  <h2 class="section-title">7.1 LIMITATIONS</h2>
  <p>While REPOSYS introduces major operational advancements over traditional campus reprography workflows, an objective engineering assessment reveals several operational and technical constraints:</p>
  <ol>
    <li><strong>High-Volume Document Upload Latency:</strong> Transferring very large PDF documents (e.g., high-resolution architecture blueprints or dissertations exceeding 100 MB) across fluctuating campus Wi-Fi networks introduces upload delays, impacting the client pre-flight inspection experience.</li>
    <li><strong>Serverless Cloud Cold-Start Latencies:</strong> When hosted on free or cost-optimized serverless tiers (such as Render free instances), inactive backend services spin down, creating an initial request delay of 30–50 seconds upon first wake-up.</li>
    <li><strong>Operating System Dependency of Print Agent:</strong> The native Print Agent relies on Windows PowerShell cmdlets and Windows Print Spooler APIs (pdf-to-printer), restricting agent deployment to counter terminals running Microsoft Windows operating systems.</li>
    <li><strong>Pay at Counter Uncollected Print Risk:</strong> Although Pay at Counter (PAC) orders incorporate automated reminder emails and cancellation timeouts, jobs printed prior to cash collection remain vulnerable to financial loss if an irresponsible user abandons the order.</li>
    <li><strong>Guest Session Volatility:</strong> Temporary kiosk guest sessions depend on browser local storage and time-limited tokens; if a visitor clears browser history before claiming output, recovery requires staff intervention.</li>
  </ol>

  <h2 class="section-title">7.2 FUTURE SCOPE</h2>
  <p>The modular, micro-service-ready architecture of REPOSYS establishes a robust foundation for extensive future engineering enhancements:</p>
  <ol>
    <li><strong>Cross-Platform Native Mobile Applications:</strong> Developing native iOS and Android client applications using React Native or Flutter, incorporating background push notifications, native biometrics, and camera-based document scanning with perspective correction.</li>
    <li><strong>Smart Campus RFID / NFC Card Integration:</strong> Interfacing counter terminals and kiosk stations with institutional RFID smart identity cards (such as MIFARE cards), enabling students to tap their college ID for instantaneous authentication and automatic tuition wallet debiting.</li>
    <li><strong>AI-Powered Document Intelligence and Summarization:</strong> Integrating Google Gemini API models to deliver automated document quality assessments, font legibility checks, multi-language translation, and automatic executive summaries of lengthy study materials.</li>
    <li><strong>Multi-Centre Campus Load Balancing:</strong> Expanding the priority queue scheduler to dynamically distribute printing workloads across multiple reprography centres, departmental printers, and library hubs based on real-time queue congestion.</li>
    <li><strong>Autonomous Hardware Kiosks:</strong> Constructing fully autonomous, unattended printing kiosks equipped with cash acceptors, coin mechanisms, and automated document output sorting bins for 24/7 campus service.</li>
  </ol>

  <h2 class="section-title">7.3 CONCLUSION</h2>
  <p>The development and implementation of <strong>REPOSYS (Reprography Automation System)</strong> successfully addresses the chronic operational bottlenecks, privacy vulnerabilities, and financial tracking difficulties that have historically hindered campus reprography centres.</p>
  <p>By replacing manual physical counter interactions with a modern, cloud-connected MERN platform, REPOSYS achieves:</p>
  <ul>
    <li>Elimination of physical queue congestion through asynchronous digital submission and transparent wait-time tracking.</li>
    <li>Protection of personal privacy and endpoint IT security by retiring ad-hoc WhatsApp file sharing and USB flash drives.</li>
    <li>Equitable resource distribution via the Composite Priority Queue with dynamic aging deduction, guaranteeing fairness for students while supporting urgent faculty requirements.</li>
    <li>Accurate financial accounting and operational transparency through automated Razorpay integration, ACID-compliant digital wallets, and append-only activity auditing.</li>
    <li>Reliable hardware automation via the autonomous Electron Windows Print Agent.</li>
  </ul>
  <p>Extensive verification through an automated 120-case Selenium WebDriver test suite confirmed a 95.0% operational passing rate, proving the technical stability, security, and usability of the platform. REPOSYS represents a significant technological contribution towards building an intelligent, eco-friendly, and digitally empowered academic campus.</p>
</div>

<!-- ================= CHAPTER 8: APPENDIX ================= -->
<div class="page-break">
  <h1 class="chapter-title">CHAPTER 8<br>APPENDIX</h1>
  
  <h2 class="section-title">8.1 SUPPORTING DOCUMENTATION</h2>
  <p>This section documents the formal environment variables and runtime configurations required to execute REPOSYS across local staging and production environments.</p>

  <pre class="code-block">
# Server Runtime Configuration
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://reposys-client.vercel.app

# Database Connection URI
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/reposys?retryWrites=true&amp;w=majority

# Cryptographic Token Secrets
JWT_SECRET=c9b20891d8654a60b0ad8a87b419
COOKIE_SECRET=7f8841a86c6b4129e921d3f9901b
AGENT_SETUP_TOKEN=SETUP_REPOSYS_SECURE_TOKEN_2026

# Cloudinary Object Storage
CLOUDINARY_CLOUD_NAME=reposys-storage
CLOUDINARY_API_KEY=839218491823912
CLOUDINARY_API_SECRET=Secret_Cloud_Key_ABC123

# Razorpay Live Credentials
RAZORPAY_KEY_ID=rzp_live_849201948291
RAZORPAY_KEY_SECRET=Live_Razorpay_Secret_XYZ789

# Web Push Notification VAPID Keys
VAPID_PUBLIC_KEY=BPl9...
VAPID_PRIVATE_KEY=v8J1...
  </pre>

  <h2 class="section-title">8.2 SAMPLE CODE / QUERIES</h2>
  <p>Representative source code excerpts demonstrating core backend transaction logic, priority queue sorting, and physical printing automation are presented below.</p>

  <pre class="code-block">
// queueService.js: Composite Priority Queue with Dynamic Aging
const resolvePriorityScore = (order) => {{
  const storedPriorityScore = Number(order.priorityScore);
  return Number.isFinite(storedPriorityScore) ? storedPriorityScore : 200;
}};

const calculateAgingDeduction = (orderCreatedAt) => {{
  const createdAt = new Date(orderCreatedAt);
  const validCreatedAt = Number.isNaN(createdAt.getTime()) ? new Date() : createdAt;
  const minutesSinceCreation = Math.floor((Date.now() - validCreatedAt.getTime()) / (60 * 1000));
  
  // Deduct 20 points for every full hour waiting beyond first minute
  return Math.max(0, Math.floor((minutesSinceCreation - 1) / 60)) * 20;
}};

const calculateEffectivePriority = (basePriority, orderCreatedAt) => {{
  const agingDeduction = calculateAgingDeduction(orderCreatedAt);
  return basePriority - agingDeduction;
}};

async function getQueue(serviceType) {{
  const orders = await Order.find({{
    serviceType,
    status: {{ $in: ['In_Queue', 'Processing', 'ReadyForPickup'] }},
  }})
    .populate('userId', 'name role department')
    .sort({{ createdAt: 1 }});

  return orders
    .map((order) => {{
      const baseScore = resolvePriorityScore(order);
      const effectiveScore = calculateEffectivePriority(baseScore, order.createdAt);
      return {{
        ...order.toObject(),
        priorityScore: effectiveScore,
        basePriority: baseScore,
      }};
    }})
    .sort((a, b) => a.priorityScore !== b.priorityScore 
      ? a.priorityScore - b.priorityScore 
      : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
}}
  </pre>

  <pre class="code-block">
// orderController.js: ACID-Compliant Wallet Payment Transaction
const session = await mongoose.startSession();
session.startTransaction();

try {{
  const wallet = await Wallet.findOne({{ userId: req.user._id }}).session(session);
  if (!wallet || wallet.balance < orderTotal) {{
    await session.abortTransaction();
    return res.status(400).json({{ message: 'Insufficient wallet balance.' }});
  }}

  wallet.balance -= orderTotal;
  await wallet.save({{ session }});

  await WalletTransaction.create([{{
    walletId: wallet._id,
    type: 'Debit',
    amount: orderTotal,
    description: `Payment for Order #${{order.orderNumber}}`,
    balanceAfter: wallet.balance,
  }}], {{ session }});

  order.paymentStatus = 'Paid';
  order.status = 'In_Queue';
  await order.save({{ session }});

  await session.commitTransaction();
  session.endSession();
  
  // Broadcast update to real-time queue
  broadcastQueueUpdate(order.serviceType);
}} catch (error) {{
  await session.abortTransaction();
  session.endSession();
  throw error;
}}
  </pre>

  <h2 class="section-title">8.3 USER INTERFACE SCREENSHOTS</h2>
  <p>The verified visual interfaces of REPOSYS across major stakeholder views are illustrated below.</p>

  <div class="figure-box">
    <img src="{img_home}" alt="Home Page">
    <div class="caption">Figure 8.1: REPOSYS Public Landing and Portal Gateway</div>
  </div>

  <div class="figure-box">
    <img src="{img_login}" alt="Login Page">
    <div class="caption">Figure 8.2: Secure User Authentication and Multi-Role Login Portal</div>
  </div>

  <div class="figure-box">
    <img src="{img_reg}" alt="Register Page">
    <div class="caption">Figure 8.3: Student and Faculty Account Registration Portal</div>
  </div>

  <div class="figure-box">
    <img src="{img_about}" alt="About Page">
    <div class="caption">Figure 8.4: System Architecture Overview and About REPOSYS Portal</div>
  </div>

  <div class="figure-box">
    <img src="{img_contact}" alt="Contact Page">
    <div class="caption">Figure 8.5: Reprography Operational Inquiries and Support Contact Portal</div>
  </div>

  <div class="figure-box">
    <img src="{img_forgot}" alt="Forgot Password Page">
    <div class="caption">Figure 8.6: Account Recovery and Password Reset Workflow</div>
  </div>

  <div class="figure-box">
    <img src="{img_test_std}" alt="Test Student Workflow">
    <div class="caption">Figure 8.7: Automated Selenium Test Run: Student Order Workflow</div>
  </div>

  <div class="figure-box">
    <img src="{img_test_adm}" alt="Test Admin Access">
    <div class="caption">Figure 8.8: Automated Selenium Test Run: Admin Role Route Access</div>
  </div>

  <div class="figure-box">
    <img src="{img_test_stf}" alt="Test Staff Access">
    <div class="caption">Figure 8.9: Automated Selenium Test Run: Counter Staff Queue Access</div>
  </div>

  <h2 class="section-title">8.4 GIT LOGS</h2>
  <p>Table 8.1 documents verifiable engineering milestones and commit records extracted directly from the project repository.</p>

  <table>
    <tr>
      <th style="width: 20%;">Commit Hash</th>
      <th style="width: 80%;">Engineering Milestone and Commit Message</th>
    </tr>
    <tr><td><code>5a21841</code></td><td>fix: synchronize dashboard and profile usage summary</td></tr>
    <tr><td><code>04b8040</code></td><td>update deployment urls for render and vercel</td></tr>
    <tr><td><code>510e51a</code></td><td>update frontend and backend production configurations</td></tr>
    <tr><td><code>1a5ce7b</code></td><td>feat: add TTL to audit logs and Admin Clear All Logs button</td></tr>
    <tr><td><code>c0f200e</code></td><td>feat: remove install settings card, add separate deregister for agents</td></tr>
    <tr><td><code>4baffc3</code></td><td>fix: do not close setup window from main process, let renderer reach step 6</td></tr>
    <tr><td><code>bc077b7</code></td><td>chore: add comprehensive logging to print agent registration flow</td></tr>
    <tr><td><code>fe5c1df</code></td><td>fix: synchronize print agent socket secret with registration token</td></tr>
    <tr><td><code>c9fe161</code></td><td>fix: replace custom Button with native buttons for ping/deregister</td></tr>
    <tr><td><code>c9420b2</code></td><td>fix: unwrap nested IPC data to prevent agentId/agentSecret undefined</td></tr>
    <tr><td><code>ac477ba</code></td><td>feat: show cold-start wait message during Step 5 registration</td></tr>
    <tr><td><code>5882718</code></td><td>feat: user friendly printer error message during test print setup</td></tr>
    <tr><td><code>4fd6368</code></td><td>fix: extract test.pdf from ASAR archive before printing</td></tr>
    <tr><td><code>bd65021</code></td><td>fix: remove admin installer update instruction and fix token terminology</td></tr>
    <tr><td><code>b90df20</code></td><td>feat: add agent registration verification and live status page</td></tr>
    <tr><td><code>7832f82</code></td><td>feat: add secure print agent download endpoint and admin download card</td></tr>
    <tr><td><code>697e8b6</code></td><td>feat: complete Electron print agent integration and packaging</td></tr>
    <tr><td><code>d0596ce</code></td><td>fix(mobile): Optional chaining for file.name in MobileOrderWizard</td></tr>
    <tr><td><code>fbb6d39</code></td><td>feat: complete SPAE phase 2 print agent integration</td></tr>
    <tr><td><code>dbed9a7</code></td><td>Update PWA mobile screens and UI components</td></tr>
    <tr><td><code>0a3ffd3</code></td><td>fix: remove maskable purpose from PWA icons to prevent text cutoff</td></tr>
    <tr><td><code>89bcd22</code></td><td>feat(pwa): update PWA icons and app name to Reposys</td></tr>
    <tr><td><code>cd1cb2e</code></td><td>chore: final Reposys rebranding and frontend API fallback resolution</td></tr>
    <tr><td><code>d286e06</code></td><td>Fix InventoryManagement crash by importing CardDescription</td></tr>
    <tr><td><code>e3118a4</code></td><td>Update documentation and frontend features</td></tr>
  </table>
  <div class="caption">Table 8.1: Verifiable Version Control Commit History (Git Logs)</div>
</div>

<!-- ================= CHAPTER 9: REFERENCES ================= -->
<div class="page-break">
  <h1 class="chapter-title">CHAPTER 9<br>REFERENCES</h1>
  
  <ol class="single-space" style="padding-left: 0.35in; font-size: 11pt;">
    <li style="margin-bottom: 8px;">APJ Abdul Kalam Technological University. (2020). <em>Curriculum and Syllabi for Integrated Master of Computer Applications (IMCA) Programme</em>. KTU Academic Regulations, Thiruvananthapuram, Kerala.</li>
    <li style="margin-bottom: 8px;">Cloudinary Inc. (2024). <em>Cloudinary Node.js SDK and Media Management API Documentation</em>. Retrieved from https://cloudinary.com/documentation.</li>
    <li style="margin-bottom: 8px;">Electron Software Foundation. (2024). <em>Electron Desktop Framework Documentation and Native Node.js Integration Guides</em>. OpenJS Foundation. Retrieved from https://www.electronjs.org/docs.</li>
    <li style="margin-bottom: 8px;">Fielding, R. T. (2000). <em>Architectural Styles and the Design of Network-based Software Architectures</em> (Doctoral dissertation). University of California, Irvine.</li>
    <li style="margin-bottom: 8px;">Fette, I., &amp; Melnikov, A. (2011). <em>The WebSocket Protocol</em>. RFC 6455, Internet Engineering Task Force (IETF).</li>
    <li style="margin-bottom: 8px;">Gamma, E., Helm, R., Johnson, R., &amp; Vlissides, J. (1994). <em>Design Patterns: Elements of Reusable Object-Oriented Software</em>. Addison-Wesley Professional, Boston.</li>
    <li style="margin-bottom: 8px;">Google Developers. (2024). <em>Progressive Web Apps: High Performance Caching and Service Worker Lifecycle</em>. Google Web Fundamentals. Retrieved from https://web.dev/explore/progressive-web-apps.</li>
    <li style="margin-bottom: 8px;">Jones, M., Bradley, J., &amp; Sakimura, N. (2015). <em>JSON Web Token (JWT)</em>. RFC 7519, Internet Engineering Task Force (IETF).</li>
    <li style="margin-bottom: 8px;">Kleinrock, L. (1975). <em>Queueing Systems, Volume 1: Theory</em>. John Wiley &amp; Sons, New York.</li>
    <li style="margin-bottom: 8px;">Mozilla Developer Network. (2024). <em>HTTP Headers, Content Security Policy, and Secure Web API Standards</em>. MDN Web Docs. Retrieved from https://developer.mozilla.org/.</li>
    <li style="margin-bottom: 8px;">Node.js Foundation. (2024). <em>Node.js v20.x Long Term Support (LTS) API Specification</em>. OpenJS Foundation. Retrieved from https://nodejs.org/docs.</li>
    <li style="margin-bottom: 8px;">Nyberg, K. (2020). <em>Building Scalable Microservices with Node.js and MongoDB</em>. O'Reilly Media, Sebastopol.</li>
    <li style="margin-bottom: 8px;">Pressman, R. S., &amp; Maxim, B. R. (2020). <em>Software Engineering: A Practitioner's Approach</em> (9th ed.). McGraw-Hill Education, New York.</li>
    <li style="margin-bottom: 8px;">Razorpay Software Private Limited. (2024). <em>Razorpay Payments API Specification and Webhook Signature Verification Reference</em>. Retrieved from https://razorpay.com/docs/api.</li>
    <li style="margin-bottom: 8px;">React Development Team. (2024). <em>React 19 Documentation: Server Components, Hooks, and Concurrency Architecture</em>. Meta Open Source. Retrieved from https://react.dev/.</li>
    <li style="margin-bottom: 8px;">Saintgits College of Engineering (Autonomous). (2026). <em>Department of Computer Applications: Mini Project Preparation Guidelines and Scrum Assessment Manual (20IMCAP501)</em>. Pathamuttom, Kottayam.</li>
    <li style="margin-bottom: 8px;">SeleniumHQ. (2024). <em>Selenium WebDriver Browser Automation Framework Documentation</em>. Software Freedom Conservancy. Retrieved from https://www.selenium.dev/documentation.</li>
    <li style="margin-bottom: 8px;">Socket.IO Foundation. (2024). <em>Socket.IO Client and Server Bidirectional Event Specification</em>. Retrieved from https://socket.io/docs/v4/.</li>
    <li style="margin-bottom: 8px;">Sommerville, I. (2016). <em>Software Engineering</em> (10th ed.). Pearson Education, Harlow, UK.</li>
  </ol>
</div>

</body>
</html>
"""
    out_html = os.path.join(base_dir, 'report.html')
    with open(out_html, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"Generated {out_html} ({len(html)} bytes)")
    return out_html

if __name__ == '__main__':
    build_html()
