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
    img_logo = get_b64('saintgits_logo.jpg')
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
<title>REPOSYS -- Campus Reprography Automation System</title>
<style>
  @page {{
    size: A4;
    margin: 1in 1in 1in 1.25in;
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
    padding-top: 0.2in;
  }}
  .title-page h1 {{
    font-size: 16pt;
    font-weight: bold;
    margin: 15px 0 5px 0;
    text-transform: uppercase;
  }}
  .title-page h2 {{
    font-size: 14pt;
    font-weight: bold;
    margin: 10px 0;
  }}
  .title-page h3 {{
    font-size: 12pt;
    font-weight: normal;
    margin: 6px 0;
  }}
  .title-page img {{
    max-width: 1.35in;
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
    margin-top: 10mm;
    margin-bottom: 25px;
  }}
  h2.section-title {{
    font-size: 12pt;
    font-weight: bold;
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
    text-indent: 0.4in;
    margin-top: 0;
    margin-bottom: 6px;
  }}
  p.no-indent {{
    text-indent: 0;
  }}
  table.data-table {{
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0;
    font-size: 9.5pt;
    line-height: 1.25;
  }}
  table.data-table, table.data-table th, table.data-table td {{
    border: 1px solid #000;
  }}
  table.data-table th, table.data-table td {{
    padding: 5px 7px;
    text-align: left;
    vertical-align: top;
  }}
  table.data-table th {{
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
    margin: 18px 0;
  }}
  .figure-box img {{
    max-width: 85%;
    max-height: 4.0in;
    height: auto;
    border: 1px solid #ddd;
  }}
  pre.code-block {{
    background: #fcfcfc;
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
    padding-left: 0.4in;
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
    text-align: left;
    padding: 20px 5px;
  }}
  .candidate-table {{
    margin: 0 auto;
    border: none;
    font-weight: bold;
    font-size: 11pt;
  }}
  .candidate-table td {{
    border: none;
    padding: 3px 15px;
    text-align: left;
  }}
</style>
</head>
<body>

<!-- ================= COVER / TITLE PAGE (EXACT SAMPLE PDF LAYOUT) ================= -->
<div class="title-page">
  <p class="no-indent" style="font-size: 12pt; font-weight: bold; margin-bottom: 8px; letter-spacing: 0.5px;">MINI PROJECT REPORT</p>
  <p class="no-indent" style="font-size: 11pt; font-weight: bold; margin-bottom: 12px;">ON</p>
  <h1 style="font-size: 14pt; margin: 15px 0 25px 0;">REPOSYS -- CAMPUS REPROGRAPHY AUTOMATION SYSTEM</h1>
  
  <p class="no-indent" style="font-size: 11pt; font-style: italic; margin-bottom: 12px;">Submitted By</p>
  <table class="candidate-table">
    <tr><td>MGP22NMC034</td><td>JEFRI JIJI</td></tr>
    <tr><td>MGP22NMC037</td><td>JERIN SEBASTIAN</td></tr>
    <tr><td>MGP22NMC050</td><td>SETHULAKSHMI P.S</td></tr>
  </table>

  <p class="no-indent" style="font-size: 11pt; font-weight: bold; margin-top: 25px; margin-bottom: 6px;">To</p>
  <p class="no-indent" style="font-size: 10.5pt; font-style: italic; line-height: 1.3;">the APJ Abdul Kalam Technological University in partial fulfillment of the<br>requirements for the award of the degree of</p>
  
  <p class="no-indent" style="font-size: 12pt; font-weight: bold; margin-top: 15px; margin-bottom: 20px;">Master of Computer Applications</p>
  
  <p class="no-indent" style="font-size: 11pt; font-style: italic; margin-bottom: 6px;">Under the Guidance of</p>
  <p class="no-indent" style="font-size: 12pt; font-weight: bold; margin-bottom: 20px;">Dr. Abin T. Abraham</p>

  <div style="margin: 15px 0;">
    <img src="{img_logo}" alt="Saintgits College Logo" style="width: 1.35in;">
  </div>

  <p class="no-indent" style="font-size: 11pt; font-weight: bold; margin-bottom: 3px;">DEPARTMENT OF COMPUTER APPLICATIONS</p>
  <p class="no-indent" style="font-size: 11pt; font-weight: bold; margin-bottom: 3px;">Saintgits College of Engineering (Autonomous) Pathamuttom,</p>
  <p class="no-indent" style="font-size: 11pt; font-weight: bold; margin-bottom: 15px;">Kottayam, Kerala-686532</p>
  <p class="no-indent" style="font-size: 11pt; font-weight: bold;">NOVEMBER 2025</p>
</div>

<!-- ================= BONAFIDE CERTIFICATE (EXACT SAMPLE PDF LAYOUT) ================= -->
<div class="page-break">
  <div style="text-align: center;">
    <p class="no-indent" style="font-size: 12pt; font-weight: bold; margin-bottom: 4px;">SAINTGITS COLLEGE OF ENGINEERING (AUTONOMOUS)</p>
    <p class="no-indent" style="font-size: 11pt; margin-bottom: 15px;">Kottukulam Hills, Pathamuttom, Kottayam, Kerala</p>
    <div style="margin: 12px 0 20px 0;">
      <img src="{img_logo}" alt="Saintgits Logo" style="width: 1.1in;">
    </div>
    <h1 class="chapter-title" style="margin-top: 10px; margin-bottom: 20px;">BONAFIDE CERTIFICATE</h1>
  </div>

  <div class="double-space">
    <p>Certified that the report entitled <strong>“REPOSYS -- Campus Reprography Automation System”</strong> submitted by <strong>Jefri Jiji MGP22NMC034</strong>, <strong>Jerin Sebastian MGP22NMC037</strong> and <strong>Sethulakshmi P.S MGP22NMC050</strong> to the APJ Abdul Kalam Technological University in partial fulfillment of the requirements for the award of the Degree of <strong>Master of Computer Applications</strong> is a bonafide record of the project work carried out by them under our guidance and supervision. This report in any form has not been submitted to any other University or Institute for any purpose.</p>
  </div>

  <table class="sig-table">
    <tr>
      <td style="width: 50%;">
        <strong>Dr. Abin T. Abraham</strong><br>
        Internal Guide
      </td>
      <td style="width: 50%; text-align: right;">
        <strong>Dr. Rani Saritha R</strong><br>
        Project Co-ordinator
      </td>
    </tr>
    <tr>
      <td style="padding-top: 50px;">
        <strong>Dr. Rani Saritha R</strong><br>
        Head of the Department
      </td>
      <td style="padding-top: 50px; text-align: right;">
        <strong>Dr. Sudha T</strong><br>
        Principal
      </td>
    </tr>
  </table>

  <p class="no-indent" style="margin-top: 40px; font-style: italic;">
    Viva-voce held on: .................................................
  </p>
</div>

<!-- ================= ACKNOWLEDGEMENT (EXACT SAMPLE PDF LAYOUT) ================= -->
<div class="page-break">
  <h1 class="chapter-title">ACKNOWLEDGEMENT</h1>
  <div class="double-space">
    <p>At the outset, we thank the lord almighty for his abundant grace, strength and hope to make our endeavour a success. We express our deep-felt gratitude to <strong>Dr. Sudha T.</strong>, Principal, Saintgits College of Engineering (Autonomous) for her warm support with regard to the work and to the management for providing the facilities required.</p>
    <p>We would like to place our deep sense of gratitude to <strong>Prof. Mini Punnoose</strong>, Director- MCA, Department of Computer Applications, Saintgits College of Engineering (Autonomous) for her constant encouragement. We express our gratitude to <strong>Dr. Rani Saritha R</strong>, Head, Department of Computer Applications, Saintgits College of Engineering (Autonomous), for her support and guidance.</p>
    <p>We profoundly grateful to <strong>Dr. Abin T. Abraham</strong>, Assistant Professor, our project guide and <strong>Dr. Rani Saritha R</strong>, the project co-ordinator for their valuable guidance, help, suggestions and assessment.</p>
    <p>Furthermore, we would like to thank all others especially our parents and numerous friends. This project report would not have been a success without their inspiration, valuable suggestions and moral support from them throughout its course.</p>
  </div>
  <div style="float: right; margin-top: 40px; text-align: right; font-weight: bold; line-height: 1.4;">
    Jefri Jiji<br>
    Jerin Sebastian<br>
    Sethulakshmi P.S
  </div>
  <div style="clear: both;"></div>
</div>

<!-- ================= ABSTRACT (EXACT SAMPLE PDF LAYOUT) ================= -->
<div class="page-break">
  <h1 class="chapter-title">ABSTRACT</h1>
  <p>In educational institutions, hospitals, corporate offices, and other secure environments, the conventional manual document printing and reprography counter system poses significant challenges including manual billing errors, lack of verification, time-consuming physical queues, and inadequate security measures. The web-based and IoT-integrated Reprography Automation System (REPOSYS) addresses these critical issues by introducing a fully automated, secure, and efficient digital solution that transforms campus reprography management through modern web and systems technology.</p>
  <p>The system operates through an intuitive responsive web portal and tablet kiosk interface. As soon as a student, faculty member, or visitor accesses the portal or counter kiosk, a file processing engine powered by pdf-lib and client-side web technologies automatically inspects their documents, extracting page counts, identifying blank pages, and detecting color modes. If the user has previously registered, their profile details and digital wallet balance are automatically retrieved and pre-filled in the order form, significantly reducing submission time and enhancing user convenience. For first-time visitors or guests, the system prompts them to complete a quick registration or creates a time-bound guest kiosk session. In all cases, users specify their exact printing requirements including copies, color mode, duplexing, and binding. To ensure authenticity, a 4-digit One-Time Password (OTP) and QR code token are generated for physical pickup verification at the counter.</p>
  <p>The software architecture is built using Node.js and the Express web framework for backend operations, handling routing, session management, and API endpoints for order lifecycle management, pricing, and OTP verification. The frontend interface uses React 19, HTML, CSS, and Tailwind CSS for a responsive, modern user experience. Socket.IO enables real-time queue synchronization, live wait-time updates, and instant status transitions across connected client and staff dashboards. For online payment processing, the system integrates the Razorpay payment gateway API alongside an internal ACID-compliant digital wallet. All operational data including user credentials, order records, timestamps, payment transactions, and inventory items are securely stored in a cloud MongoDB Atlas database.</p>
  <p>A key feature is the staff and administrator dashboard, which provides authorized personnel with complete control and visibility over printing queues and operational records. Operators can view real-time queue entries, verify cash collections, trigger physical print jobs via a native Electron Print Agent, search and filter logs by date or service type, and export daily reports for auditing. The dashboard displays active jobs alongside customer details, enabling quick verification and eliminating manual paper registers.</p>
  <p>The system enhances security by addressing multiple vulnerabilities in traditional reprography management. Digital file transfer eliminates the need for uninspected USB drives and unencrypted mobile messaging, establishing a secure digital audit trail. Real-time OTP verification prevents wrong-order handovers and unauthorized collections. The automated pricing engine eliminates manual calculation mistakes and exact change shortages. The Composite Priority Queue algorithm with dynamic aging deduction guarantees fairness for students while prioritizing urgent faculty requisitions, eliminating queue starvation.</p>
  <p>Beyond educational campuses, the Reprography Automation System has broad applicability across corporate document centres, commercial print shops, legal chambers, government secretariats, and co-working spaces. The relevance of this project lies in its alignment with the growing emphasis on digital transformation, paperless automation, and operational accountability in public and semi-public facilities. By replacing outdated manual registers and physical counter bottlenecks with an intelligent, automated platform powered by MERN, Socket.IO, Razorpay, and Electron, the system improves operational throughput while significantly enhancing security, transparency, and resource sustainability.</p>
</div>

<!-- ================= TABLE OF CONTENTS (EXACT SAMPLE PDF STRUCTURE) ================= -->
<div class="page-break">
  <h1 class="chapter-title">TABLE OF CONTENTS</h1>
  <table style="width: 100%; border: none; font-size: 11pt; line-height: 1.6;">
    <tr style="font-weight: bold;"><td style="border: none;">CHAPTER 1: INTRODUCTION</td><td style="border: none; text-align: right;">1</td></tr>
    <tr><td style="border: none; padding-left: 20px;">1.1 Introduction to the Project</td><td style="border: none; text-align: right;">1</td></tr>
    <tr><td style="border: none; padding-left: 20px;">1.2 Organization Profile</td><td style="border: none; text-align: right;">1</td></tr>
    <tr><td style="border: none; padding-left: 20px;">1.3 Objectives of the Project</td><td style="border: none; text-align: right;">2</td></tr>
    <tr><td style="border: none; padding-left: 20px;">1.4 Scope and Applicability</td><td style="border: none; text-align: right;">3</td></tr>
    <tr style="font-weight: bold;"><td style="border: none; padding-top: 8px;">CHAPTER 2: REQUIREMENTS AND ANALYSIS</td><td style="border: none; text-align: right; padding-top: 8px;">4</td></tr>
    <tr><td style="border: none; padding-left: 20px;">2.1 Existing Systems</td><td style="border: none; text-align: right;">4</td></tr>
    <tr><td style="border: none; padding-left: 20px;">2.2 Proposed System</td><td style="border: none; text-align: right;">4</td></tr>
    <tr><td style="border: none; padding-left: 20px;">2.3 Feasibility Study</td><td style="border: none; text-align: right;">5</td></tr>
    <tr><td style="border: none; padding-left: 40px;">2.3.1 Technical Feasibility</td><td style="border: none; text-align: right;">6</td></tr>
    <tr><td style="border: none; padding-left: 40px;">2.3.2 Operational Feasibility</td><td style="border: none; text-align: right;">6</td></tr>
    <tr><td style="border: none; padding-left: 40px;">2.3.3 Economic Feasibility</td><td style="border: none; text-align: right;">6</td></tr>
    <tr><td style="border: none; padding-left: 40px;">2.3.4 Time Feasibility</td><td style="border: none; text-align: right;">6</td></tr>
    <tr><td style="border: none; padding-left: 20px;">2.4 Conceptual Modelling</td><td style="border: none; text-align: right;">7</td></tr>
    <tr><td style="border: none; padding-left: 20px;">2.5 Planning and Scheduling</td><td style="border: none; text-align: right;">8</td></tr>
    <tr style="font-weight: bold;"><td style="border: none; padding-top: 8px;">CHAPTER 3: SYSTEM SPECIFICATION</td><td style="border: none; text-align: right; padding-top: 8px;">10</td></tr>
    <tr><td style="border: none; padding-left: 20px;">3.1 Software and Hardware Requirements</td><td style="border: none; text-align: right;">10</td></tr>
    <tr><td style="border: none; padding-left: 40px;">3.1.1 Software Requirements</td><td style="border: none; text-align: right;">10</td></tr>
    <tr><td style="border: none; padding-left: 40px;">3.1.2 Hardware Requirements</td><td style="border: none; text-align: right;">11</td></tr>
    <tr><td style="border: none; padding-left: 20px;">3.2 Functional Specifications</td><td style="border: none; text-align: right;">11</td></tr>
    <tr><td style="border: none; padding-left: 20px;">3.3 Tools and Platforms Used</td><td style="border: none; text-align: right;">12</td></tr>
    <tr style="font-weight: bold;"><td style="border: none; padding-top: 8px;">CHAPTER 4: SYSTEM DESIGN</td><td style="border: none; text-align: right; padding-top: 8px;">15</td></tr>
    <tr><td style="border: none; padding-left: 20px;">4.1 Module Description</td><td style="border: none; text-align: right;">15</td></tr>
    <tr><td style="border: none; padding-left: 40px;">4.1.1 User Authentication Module</td><td style="border: none; text-align: right;">15</td></tr>
    <tr><td style="border: none; padding-left: 40px;">4.1.2 Document Upload and Analysis Module</td><td style="border: none; text-align: right;">15</td></tr>
    <tr><td style="border: none; padding-left: 40px;">4.1.3 Order Configuration Wizard Module</td><td style="border: none; text-align: right;">16</td></tr>
    <tr><td style="border: none; padding-left: 40px;">4.1.4 Dynamic Cost Estimation Module</td><td style="border: none; text-align: right;">16</td></tr>
    <tr><td style="border: none; padding-left: 40px;">4.1.5 Payment and Digital Wallet Module</td><td style="border: none; text-align: right;">16</td></tr>
    <tr><td style="border: none; padding-left: 40px;">4.1.6 Composite Priority Queue Module</td><td style="border: none; text-align: right;">17</td></tr>
    <tr><td style="border: none; padding-left: 40px;">4.1.7 Counter Staff Operations Module</td><td style="border: none; text-align: right;">17</td></tr>
    <tr><td style="border: none; padding-left: 40px;">4.1.8 OTP Pickup Handover Module</td><td style="border: none; text-align: right;">17</td></tr>
    <tr><td style="border: none; padding-left: 40px;">4.1.9 Administrator Governance Module</td><td style="border: none; text-align: right;">18</td></tr>
    <tr><td style="border: none; padding-left: 40px;">4.1.10 Consumable Inventory Tracker Module</td><td style="border: none; text-align: right;">18</td></tr>
    <tr><td style="border: none; padding-left: 40px;">4.1.11 Desktop Print Agent Module</td><td style="border: none; text-align: right;">18</td></tr>
    <tr><td style="border: none; padding-left: 20px;">4.2 Schema Design</td><td style="border: none; text-align: right;">19</td></tr>
    <tr><td style="border: none; padding-left: 40px;">4.2.1 Database Tables</td><td style="border: none; text-align: right;">19</td></tr>
    <tr><td style="border: none; padding-left: 40px;">4.2.2 Relationships</td><td style="border: none; text-align: right;">21</td></tr>
    <tr><td style="border: none; padding-left: 40px;">4.2.3 Constraints</td><td style="border: none; text-align: right;">21</td></tr>
    <tr><td style="border: none; padding-left: 20px;">4.3 Procedural/Flow Design</td><td style="border: none; text-align: right;">21</td></tr>
    <tr><td style="border: none; padding-left: 40px;">4.3.1 Order and Production Flowchart</td><td style="border: none; text-align: right;">21</td></tr>
    <tr><td style="border: none; padding-left: 20px;">4.4 User Interface Design</td><td style="border: none; text-align: right;">23</td></tr>
    <tr><td style="border: none; padding-left: 40px;">4.4.1 Client Interface</td><td style="border: none; text-align: right;">24</td></tr>
    <tr><td style="border: none; padding-left: 40px;">4.4.2 Administrator and Staff Dashboard</td><td style="border: none; text-align: right;">24</td></tr>
    <tr style="font-weight: bold;"><td style="border: none; padding-top: 8px;">CHAPTER 5: AGILE METHODOLOGY</td><td style="border: none; text-align: right; padding-top: 8px;">26</td></tr>
    <tr><td style="border: none; padding-left: 20px;">5.1 Project Roadmap</td><td style="border: none; text-align: right;">26</td></tr>
    <tr><td style="border: none; padding-left: 20px;">5.2 User Stories</td><td style="border: none; text-align: right;">27</td></tr>
    <tr><td style="border: none; padding-left: 40px;">5.2.1 User Stories</td><td style="border: none; text-align: right;">27</td></tr>
    <tr><td style="border: none; padding-left: 40px;">5.2.2 Sprint Planning</td><td style="border: none; text-align: right;">28</td></tr>
    <tr><td style="border: none; padding-left: 20px;">5.3 Test Plan</td><td style="border: none; text-align: right;">29</td></tr>
    <tr style="font-weight: bold;"><td style="border: none; padding-top: 8px;">CHAPTER 6: IMPLEMENTATION AND TESTING</td><td style="border: none; text-align: right; padding-top: 8px;">31</td></tr>
    <tr><td style="border: none; padding-left: 20px;">6.1 Implementation Procedures</td><td style="border: none; text-align: right;">31</td></tr>
    <tr><td style="border: none; padding-left: 20px;">6.2 Testing Methods and Results</td><td style="border: none; text-align: right;">32</td></tr>
    <tr><td style="border: none; padding-left: 40px;">6.2.1 Unit Testing</td><td style="border: none; text-align: right;">32</td></tr>
    <tr><td style="border: none; padding-left: 40px;">6.2.2 Integration Testing</td><td style="border: none; text-align: right;">33</td></tr>
    <tr><td style="border: none; padding-left: 40px;">6.2.3 System Testing</td><td style="border: none; text-align: right;">33</td></tr>
    <tr><td style="border: none; padding-left: 40px;">6.2.4 User Acceptance Testing</td><td style="border: none; text-align: right;">33</td></tr>
    <tr style="font-weight: bold;"><td style="border: none; padding-top: 8px;">CHAPTER 7: CONCLUSIONS</td><td style="border: none; text-align: right; padding-top: 8px;">35</td></tr>
    <tr><td style="border: none; padding-left: 20px;">7.1 Summary</td><td style="border: none; text-align: right;">35</td></tr>
    <tr><td style="border: none; padding-left: 20px;">7.2 Limitations</td><td style="border: none; text-align: right;">35</td></tr>
    <tr><td style="border: none; padding-left: 20px;">7.3 Future Scope</td><td style="border: none; text-align: right;">36</td></tr>
    <tr style="font-weight: bold;"><td style="border: none; padding-top: 8px;">CHAPTER 8: APPENDICES</td><td style="border: none; text-align: right; padding-top: 8px;">37</td></tr>
    <tr><td style="border: none; padding-left: 20px;">8.1 Code</td><td style="border: none; text-align: right;">37</td></tr>
    <tr><td style="border: none; padding-left: 20px;">8.2 Screenshots</td><td style="border: none; text-align: right;">65</td></tr>
    <tr style="font-weight: bold;"><td style="border: none; padding-top: 8px;">CHAPTER 9: REFERENCES</td><td style="border: none; text-align: right; padding-top: 8px;">71</td></tr>
  </table>
</div>

<!-- ================= LIST OF TABLES (EXACT SAMPLE PDF LAYOUT) ================= -->
<div class="page-break">
  <h1 class="chapter-title">LIST OF TABLES</h1>
  <table style="width: 100%; border: none; font-size: 11pt; line-height: 1.8;">
    <tr><td style="border: none;">Table 4.1 Users Table</td><td style="border: none; text-align: right;">19</td></tr>
    <tr><td style="border: none;">Table 4.2 Orders Table</td><td style="border: none; text-align: right;">20</td></tr>
    <tr><td style="border: none;">Table 4.3 Documents Table</td><td style="border: none; text-align: right;">20</td></tr>
    <tr><td style="border: none;">Table 4.4 Payments Table</td><td style="border: none; text-align: right;">20</td></tr>
    <tr><td style="border: none;">Table 5.1 Project Roadmap</td><td style="border: none; text-align: right;">26</td></tr>
    <tr><td style="border: none;">Table 5.2 Sprint Planning Table</td><td style="border: none; text-align: right;">28</td></tr>
  </table>
</div>

<!-- ================= LIST OF FIGURES (EXACT SAMPLE PDF LAYOUT) ================= -->
<div class="page-break">
  <h1 class="chapter-title">LIST OF FIGURES</h1>
  <table style="width: 100%; border: none; font-size: 11pt; line-height: 1.8;">
    <tr><td style="border: none;">Figure 2.1 ER-Diagram of Proposed System</td><td style="border: none; text-align: right;">8</td></tr>
    <tr><td style="border: none;">Figure 3.1 Use Case Diagram</td><td style="border: none; text-align: right;">12</td></tr>
    <tr><td style="border: none;">Figure 4.1 Order Placement and Production Flowchart</td><td style="border: none; text-align: right;">23</td></tr>
  </table>
</div>

<!-- ================= CHAPTER 1: INTRODUCTION ================= -->
<div class="page-break">
  <h1 class="chapter-title">CHAPTER 1: INTRODUCTION</h1>
  
  <h2 class="section-title">1.1 Introduction to the Project</h2>
  <p>The Reprography Automation System (REPOSYS) replaces manual campus print shop operations and paper logbooks with a secure, automated digital platform and counter kiosk. In contemporary academic institutions, document printing, copying, scanning, and binding are vital daily requirements for students submitting assignments, laboratory records, seminar reports, and theses, as well as faculty members preparing examination question papers and administrative course materials. Traditionally, students and faculty must physically walk to the campus reprography centre, stand in long lines, share sensitive documents over personal WhatsApp messaging or uninspected USB drives, wait for manual cost calculations, and pay in cash. This manual workflow creates severe counter bottlenecks during peak submission periods, exposes personal phone numbers, risks malware transmission, and leads to uncollected prints that generate substantial paper waste.</p>
  <p>REPOSYS modernizes this environment by providing a unified web-based portal and counter kiosk. Students and faculty submit document duplication requests online, where an automated pre-flight file inspection engine extracts exact page counts and detects blank pages. Real-time cost computation applies transparent institutional tariffs, including paper conservation incentives. Secure payments are settled via Razorpay, an ACID-compliant student digital wallet, or Pay at Counter cash collections. At the counter, operators manage incoming production queues through a real-time Socket.IO dashboard, trigger automated printing to local Windows hardware via an Electron desktop Print Agent, and enforce One-Time Password (OTP) verification before releasing finished documents.</p>

  <h2 class="section-title">1.2 Organization Profile</h2>
  <p>Saintgits College of Engineering, established in 2002, is a premier private self-financing institution located in Pathamuttom, Kottayam, Kerala. Affiliated with APJ Abdul Kalam Technological University (KTU) and approved by the All India Council for Technical Education (AICTE), the college has earned recognition for its academic excellence, state-of-the-art infrastructure, and forward-looking research initiatives. The institution offers a diverse portfolio of undergraduate and postgraduate programs, including Integrated Master of Computer Applications (IMCA), MCA, M.Tech, and B.Tech disciplines. Saintgits holds autonomous status granted by the University Grants Commission (UGC), making it one of the first three engineering colleges in Kerala to achieve this distinction, which enables it to design its own curriculum, conduct examinations, and implement innovative teaching methods to maintain high educational standards. With nine NBA-accredited programs and a campus equipped with advanced laboratories, research centers, and modern facilities, Saintgits fosters a dynamic and conducive learning environment. Beyond academics, the college promotes holistic development through technical fests, cultural events, and sports, while its strong industry collaborations and excellent placement record further establish its reputation as a leading engineering institution in Kerala.</p>

  <h2 class="section-title">1.3 Objectives of the Project</h2>
  <p>The primary objective of this project is to develop a cloud-connected Reprography Automation System that automates campus document printing workflows while enhancing security, fairness, and operational efficiency. Specific objectives include:</p>
  <ol>
    <li><strong>Automation of Order Submission and Processing:</strong> Replace manual USB file transfers and physical counter queues with a digital upload portal to reduce delays, save student time, and ensure accurate record-keeping.</li>
    <li><strong>Enhanced Handover Security:</strong> Implement One-Time Password (OTP) and QR-code verification at the counter to prevent unauthorized document collections and protect user confidentiality.</li>
    <li><strong>Real-Time Queue Monitoring and Transparency:</strong> Provide an Administrator and Staff Dashboard to track live queue positions, monitor print jobs, manage inventory, and generate exportable reports for administrative auditing.</li>
    <li><strong>Dynamic Priority and Fairness:</strong> Establish an anti-starvation priority queue engine combining academic role weights with waiting-time aging deductions to prevent job starvation during peak submission hours.</li>
    <li><strong>Multi-Channel Financial Settlement:</strong> Facilitate cashless student transactions via integrated Razorpay online payments, an ACID-compliant digital student wallet, and regulated Pay at Counter cash handling.</li>
    <li><strong>Data Integrity and Traceability:</strong> Ensure that all order parameters---including page counts, duplex settings, timestamps, costs, and audit logs---are securely stored and readily retrievable for future institutional reconciliation.</li>
  </ol>

  <h2 class="section-title">1.4 Scope and Applicability</h2>
  <p>The Reprography Automation System is designed to modernize campus reprography centres by automating registration, file analysis, cost calculation, payment, and handover verification processes. The system primarily targets educational institutions, such as college and university campuses, where large numbers of students, research scholars, and faculty members require fast, dependable, and secure document duplication services. By replacing manual logbooks and physical line-standing with a web portal and counter terminal integrated with Razorpay payments, Socket.IO real-time updates, and an Electron desktop Print Agent, the system improves accuracy, reduces staff workload, and enhances overall campus operational efficiency.</p>
  <p>Beyond tertiary educational institutions, the system is scalable and adaptable to other document-intensive environments, including corporate offices, hospitals, government secretariats, research facilities, law libraries, and commercial print establishments. Its modular architecture allows integration with additional hardware and software security measures, such as campus RFID smart cards, multi-printer load balancers, real-time audio alerts, and automated SMS/email notifications, making it suitable for a wide range of operational contexts.</p>
</div>

<!-- ================= CHAPTER 2: REQUIREMENTS AND ANALYSIS ================= -->
<div class="page-break">
  <h1 class="chapter-title">CHAPTER 2: REQUIREMENTS AND ANALYSIS</h1>
  
  <h2 class="section-title">2.1 Existing Systems</h2>
  <p>Currently, most educational institutions, including Saintgits College of Engineering, rely on manual procedures and physical logbooks to record and manage printing orders. Students and faculty are required to walk to the reprography centre, wait in physical queues, share files via uninspected USB flash drives or personal WhatsApp chats, calculate costs manually, and pay using physical cash. This traditional workflow has several critical limitations:</p>
  <ul>
    <li><strong>Time-consuming and Inefficient:</strong> Manual file transfer and manual page counting slow down counter check-ins, especially during peak submission hours, causing extensive lobby congestion and lost study time.</li>
    <li><strong>Error-prone and Inaccurate:</strong> Handwritten receipts and manual tariff calculations are susceptible to arithmetic mistakes, wrong duplex selections, and billing inaccuracies that cause revenue loss.</li>
    <li><strong>Limited Security and Privacy Exposure:</strong> Sharing academic reports and identity documents over personal mobile messaging platforms exposes phone numbers and personal files to counter staff and third-party servers.</li>
    <li><strong>Lack of Real-Time Monitoring:</strong> Students cannot check counter queue lengths or machine availability before visiting the facility, leading to unpredictable waiting times.</li>
    <li><strong>Poor Data Management and Wastage:</strong> Physical paper logbooks are difficult to store, search, and audit. Furthermore, uncollected printouts lead to significant paper and toner waste that cannot be reclaimed.</li>
  </ul>

  <h2 class="section-title">2.2 Proposed System</h2>
  <p>The proposed Reprography Automation System aims to overcome the limitations of traditional print shop management methods by introducing a fully automated, secure, and intelligent digital platform. Instead of maintaining physical registers and accepting uninspected USB drives, the system provides a responsive web application and counter terminal integrated with cloud storage, real-time WebSockets, and a native desktop Print Agent.</p>
  <p>When a student or faculty member uploads a document, the system automatically analyzes the file using pdf-lib, extracting page numbers and flagging blank pages. The customer customizes printing parameters (copies, color mode, duplexing, binding) and receives an instant cost quotation computed from active institutional rates. Online payments are settled via Razorpay or an internal digital wallet backed by MongoDB ACID transactions, or marked as Pay at Counter.</p>
  <p>All operational data---such as order details, user credentials, timestamps, payment records, and pickup OTPs---are securely stored in a cloud MongoDB database. The system also features an intuitive Staff and Administrator Dashboard that allows authorized counter operators to view active priority queues, verify cash payments, dispatch physical print jobs, and generate comprehensive daily reports for administrative auditing.</p>

  <h2 class="section-title">2.3 Feasibility Study</h2>
  <p>Before implementing the Reprography Automation System, a detailed feasibility study was conducted to ensure that the project is practical, cost-effective, and technically achievable.</p>

  <h3 class="subsection-title">2.3.1 Technical Feasibility</h3>
  <p>The proposed system is technically feasible since it utilizes readily available and proven technologies such as React 19, Node.js, Express.js, MongoDB, Socket.IO, and Electron. These components are lightweight, modern, open-source, and cross-platform. Integrating automated PDF pre-flight inspection and desktop printer spooling is readily achievable using pdf-lib and pdf-to-printer libraries. The use of cloud database clusters (MongoDB Atlas) and cloud storage (Cloudinary) ensures smooth data synchronization and high availability.</p>

  <h3 class="subsection-title">2.3.2 Operational Feasibility</h3>
  <p>From an operational perspective, the system is user-friendly and requires minimal training for campus stakeholders. Students and faculty can easily submit orders from smartphones or laptops, and counter staff can manage queues through an intuitive, streamlined dashboard. Automating document validation and OTP pickup verification simplifies counter operations, reducing human error.</p>

  <h3 class="subsection-title">2.3.3 Economic Feasibility</h3>
  <p>The project is economically feasible as it primarily relies on open-source frameworks, minimizing software licensing expenditures. Hardware requirements are limited to existing counter PCs, standard multi-function commercial printers, and campus Wi-Fi network infrastructure---all of which are already available on campus. In the long run, it saves operational costs by preventing abandoned prints, reducing paper waste, and eliminating billing discrepancies.</p>

  <h3 class="subsection-title">2.3.4 Time Feasibility</h3>
  <p>The system can be developed within a reasonable academic timeframe using modular, Agile development techniques. Each subsystem---authentication, document analysis, pricing engine, payment gateway, priority queue, and staff dashboard---can be developed and verified independently before final integration.</p>

  <h2 class="section-title">2.4 Conceptual Modelling</h2>
  <p>The conceptual model provides a high-level understanding of how data flows within the Reprography Automation System. It visually represents the relationships between different entities involved in reprography operations, assisting in the design of a normalized database schema.</p>

  <div class="figure-box">
    <p class="caption">Figure 2.1: ER-Diagram of Proposed System</p>
  </div>

  <h2 class="section-title">2.5 Planning and Scheduling</h2>
  <p>The development of the Reprography Automation System was carried out in a structured and phased manner across 16 weekly sprints, adhering to the KTU project curriculum and Saintgits Scrum evaluation manual.</p>
</div>

<!-- ================= CHAPTER 3: SYSTEM SPECIFICATION ================= -->
<div class="page-break">
  <h1 class="chapter-title">CHAPTER 3: SYSTEM SPECIFICATION</h1>
  
  <h2 class="section-title">3.1 Software and Hardware Requirements</h2>
  
  <h3 class="subsection-title">3.1.1 Software Requirements</h3>
  <p class="no-indent"><strong>Operating System:</strong> Windows 10/11 or Linux for backend server; Windows 10/11 64-bit for Counter Workstation; Android, iOS, Windows, macOS for client users.</p>
  <p class="no-indent"><strong>Languages and Frameworks:</strong> Node.js v20.x LTS, Express.js v4.19, React 19, Tailwind CSS, Electron v30.x.</p>
  <p class="no-indent"><strong>Libraries & Tools:</strong> Mongoose ODM, pdf-lib, Socket.IO v4.8, Razorpay SDK, pdf-to-printer, node-cron, Selenium WebDriver.</p>

  <h3 class="subsection-title">3.1.2 Hardware Requirements</h3>
  <p class="no-indent"><strong>Counter Workstation:</strong> Desktop PC with Intel Core i3 10th Gen, 8 GB RAM, 256 GB SSD, USB 3.0 / Gigabit LAN.</p>
  <p class="no-indent"><strong>Production Server:</strong> Quad-Core CPU (2.4 GHz), 4 GB RAM, 20 GB SSD, 100 Mbps uplink.</p>
  <p class="no-indent"><strong>Printers:</strong> Heavy-duty commercial multifunction printers (Canon, HP, Ricoh, Konica Minolta).</p>

  <h2 class="section-title">3.2 Functional Specifications</h2>
  <p>The key functional capabilities of REPOSYS include user authentication with role-based access control, pre-flight PDF analysis, custom order configuration, dynamic pricing with duplex paper discounts, multi-channel payment processing, composite priority queue with dynamic aging, OTP handover verification, automated desktop print spooling, and administrative governance.</p>

  <h2 class="section-title">3.3 Tools and Platforms Used</h2>
  <p>The platform leverages React 19 for reactive frontend rendering, Node.js and Express for backend REST APIs, MongoDB Atlas for ACID-compliant document storage, Socket.IO for real-time WebSocket distribution, Cloudinary for signed media hosting, Razorpay for cashless payments, and Electron for local Windows print spooling.</p>

  <div class="figure-box">
    <img src="{img_use}" alt="Use Case Diagram">
    <p class="caption">Figure 3.1: Use Case Diagram</p>
  </div>
</div>

<!-- ================= CHAPTER 4: SYSTEM DESIGN ================= -->
<div class="page-break">
  <h1 class="chapter-title">CHAPTER 4: SYSTEM DESIGN</h1>
  
  <h2 class="section-title">4.1 Module Description</h2>
  <p>The system comprises 11 functional modules: User Authentication, Document Upload and Analysis, Order Configuration Wizard, Dynamic Cost Estimation, Payment and Digital Wallet, Composite Priority Queue, Counter Staff Operations, OTP Pickup Handover, Administrator Governance, Consumable Inventory Tracker, and Desktop Print Agent.</p>

  <h2 class="section-title">4.2 Schema Design</h2>
  <h3 class="subsection-title">4.2.1 Database Tables</h3>

  <p class="caption">Table 4.1: Users Table</p>
  <table class="data-table">
    <tr><th>Field</th><th>Data Type</th><th>Description</th></tr>
    <tr><td>id</td><td>ObjectId</td><td>Unique identifier for each user (Primary Key)</td></tr>
    <tr><td>name</td><td>String</td><td>User's full name</td></tr>
    <tr><td>email</td><td>String</td><td>Institutional email address (unique)</td></tr>
    <tr><td>password</td><td>String</td><td>Salted bcrypt password hash</td></tr>
    <tr><td>role</td><td>String</td><td>Role classification (Student, Faculty, Staff, Admin)</td></tr>
    <tr><td>department</td><td>String</td><td>Academic department</td></tr>
    <tr><td>walletBalance</td><td>Number</td><td>Current pre-funded digital wallet balance</td></tr>
    <tr><td>isVerified</td><td>Boolean</td><td>Email verification status flag</td></tr>
  </table>

  <p class="caption">Table 4.2: Orders Table</p>
  <table class="data-table">
    <tr><th>Field</th><th>Data Type</th><th>Description</th></tr>
    <tr><td>id</td><td>ObjectId</td><td>Unique identifier for each order (Primary Key)</td></tr>
    <tr><td>orderNumber</td><td>String</td><td>Human-readable tracking identifier (e.g. ORD-10024)</td></tr>
    <tr><td>userId</td><td>ObjectId</td><td>Foreign key reference to Users collection</td></tr>
    <tr><td>serviceType</td><td>String</td><td>Service category (Printing, Copy, Scan, Binding)</td></tr>
    <tr><td>totalCost</td><td>Number</td><td>Total price in INR</td></tr>
    <tr><td>paymentStatus</td><td>String</td><td>Settlement status (Pending, Paid, Cash_Pending)</td></tr>
    <tr><td>status</td><td>String</td><td>Order state (Pending, In_Queue, Processing, Ready, Completed)</td></tr>
    <tr><td>priorityScore</td><td>Number</td><td>Composite score governing queue position</td></tr>
    <tr><td>pickupOtp</td><td>String</td><td>4-digit secret code for handover verification</td></tr>
  </table>

  <p class="caption">Table 4.3: Documents Table</p>
  <table class="data-table">
    <tr><th>Field</th><th>Data Type</th><th>Description</th></tr>
    <tr><td>id</td><td>ObjectId</td><td>Unique identifier for document record (PK)</td></tr>
    <tr><td>orderId</td><td>ObjectId</td><td>Foreign key linking to Orders collection</td></tr>
    <tr><td>fileName</td><td>String</td><td>Original client file name</td></tr>
    <tr><td>fileUrl</td><td>String</td><td>Secure signed cloud storage URL</td></tr>
    <tr><td>pageCount</td><td>Number</td><td>Total verified pages in document</td></tr>
    <tr><td>colorPages</td><td>Number</td><td>Count of pages containing color elements</td></tr>
    <tr><td>fileSize</td><td>Number</td><td>Document size in bytes</td></tr>
  </table>

  <p class="caption">Table 4.4: Payments Table</p>
  <table class="data-table">
    <tr><th>Field</th><th>Data Type</th><th>Description</th></tr>
    <tr><td>id</td><td>ObjectId</td><td>Unique payment identifier (PK)</td></tr>
    <tr><td>orderId</td><td>ObjectId</td><td>Foreign key reference to Orders collection</td></tr>
    <tr><td>userId</td><td>ObjectId</td><td>Foreign key reference to Users collection</td></tr>
    <tr><td>amount</td><td>Number</td><td>Amount settled in INR</td></tr>
    <tr><td>method</td><td>String</td><td>Payment channel (Razorpay, Wallet, Cash)</td></tr>
    <tr><td>transactionId</td><td>String</td><td>Gateway transaction reference ID</td></tr>
    <tr><td>status</td><td>String</td><td>Settlement status (Completed, Failed, Pending)</td></tr>
  </table>

  <h3 class="subsection-title">4.2.2 Relationships</h3>
  <p>The system establishes one-to-many relationships between Users and Orders, Orders and Documents, and Users and Payments, with referential integrity enforced via Mongoose schema validators.</p>

  <h3 class="subsection-title">4.2.3 Constraints</h3>
  <p>Primary key uniqueness, required field validation, and domain-restricted email checks ensure strict database consistency.</p>

  <h2 class="section-title">4.3 Procedural/Flow Design</h2>
  <h3 class="subsection-title">4.3.1 Order and Production Flowchart</h3>
  <div class="figure-box">
    <p class="caption">Figure 4.1: Order Placement and Production Flowchart</p>
  </div>

  <h2 class="section-title">4.4 User Interface Design</h2>
  <h3 class="subsection-title">4.4.1 Client Interface</h3>
  <p>The client portal offers a mobile-first wizard stepper, instant price estimation card, and live queue tracking timeline.</p>
  <h3 class="subsection-title">4.4.2 Administrator and Staff Dashboard</h3>
  <p>The operator terminal features Kanban production queue boards, OTP verification modals, and administrative tariff controls.</p>
</div>

<!-- ================= CHAPTER 5: AGILE METHODOLOGY ================= -->
<div class="page-break">
  <h1 class="chapter-title">CHAPTER 5: AGILE METHODOLOGY</h1>
  
  <h2 class="section-title">5.1 Project Roadmap</h2>
  <p class="caption">Table 5.1: Project Roadmap</p>
  <table class="data-table">
    <tr><th style="width: 15%;">Week</th><th>Tasks Completed</th></tr>
    <tr><td>Week 1</td><td>Finalized project topic and scope. Scrum Master divided requirements into task units.</td></tr>
    <tr><td>Week 2</td><td>Created Git repository. Started designing user registration form and dashboard wireframes.</td></tr>
    <tr><td>Week 3</td><td>Improved UI of order wizard and dashboard. Created authentication views for students and staff.</td></tr>
    <tr><td>Week 4</td><td>Implemented document upload pipeline and PDF parsing module for page counts.</td></tr>
    <tr><td>Week 5</td><td>Created MongoDB schemas for users, orders, and documents. Enhanced upload UI.</td></tr>
    <tr><td>Week 6</td><td>Completed first project review with guide feedback and architectural refinement.</td></tr>
    <tr><td>Week 7</td><td>Developed staff queue dashboard, order status transitions, and cash payment recording.</td></tr>
    <tr><td>Week 8</td><td>Created dynamic pricing service and anti-starvation priority queue engine.</td></tr>
    <tr><td>Week 9</td><td>Integrated Razorpay payment gateway and ACID-compliant student digital wallet.</td></tr>
    <tr><td>Week 10</td><td>Implemented OTP pickup verification at counter and real-time Socket.IO synchronization.</td></tr>
    <tr><td>Week 11</td><td>Developed administrator console for tariff management, inventory tracking, and audit logs.</td></tr>
    <tr><td>Week 12</td><td>Built autonomous Electron desktop Print Agent with Windows spooler integration.</td></tr>
    <tr><td>Week 13</td><td>Added background shop scheduling cron services (09:00 to 17:00 IST) and order timeouts.</td></tr>
    <tr><td>Week 14</td><td>Implemented Progressive Web App (PWA) service worker caching and Web Push notifications.</td></tr>
    <tr><td>Week 15</td><td>Executed automated Selenium test suite across 120 test cases and resolved edge cases.</td></tr>
    <tr><td>Week 16</td><td>Completed final UI polish, system deployment on cloud servers, and report documentation.</td></tr>
  </table>

  <h2 class="section-title">5.2 User Stories</h2>
  <h3 class="subsection-title">5.2.1 User Stories</h3>
  <p class="no-indent"><strong>Student:</strong></p>
  <ul>
    <li>As a student, I want to upload my assignment PDF from my phone so that I do not have to wait in the physical counter queue.</li>
    <li>As a student, I want to see an instant price breakdown before paying so that I know exactly how much the print job will cost.</li>
    <li>As a student, I want to pay using UPI or my college wallet so that I do not need exact cash currency.</li>
    <li>As a student, I want to track my order status in real time so that I know exactly when to walk to the counter for collection.</li>
    <li>As a student, I want to receive an OTP code so that my documents cannot be collected by unauthorized persons.</li>
  </ul>
  <p class="no-indent"><strong>Faculty / Staff / Admin:</strong></p>
  <ul>
    <li>As a faculty member, I want my urgent exam question papers to receive prioritized counter processing to meet submission deadlines.</li>
    <li>As a counter staff operator, I want to see incoming jobs sorted by priority so that I can print urgent and long-waiting jobs efficiently.</li>
    <li>As a counter staff operator, I want to verify a 4-digit OTP before handing over prints so that jobs are never misplaced.</li>
    <li>As an administrator, I want to update per-page print tariffs live so that prices reflect changes in institutional paper costs.</li>
    <li>As an administrator, I want to track consumable inventory so that the shop never runs out of essential stock.</li>
  </ul>

  <h3 class="subsection-title">5.2.2 Sprint Planning</h3>
  <p class="caption">Table 5.2: Sprint Planning Table</p>
  <table class="data-table">
    <tr><th style="width: 20%;">Sprint</th><th>Key Activities / Focus</th></tr>
    <tr><td>Sprint 1</td><td>Requirement gathering, system feasibility, and task distribution by the Scrum Master.</td></tr>
    <tr><td>Sprint 2</td><td>Design and prototyping of the responsive order wizard and dashboard interfaces.</td></tr>
    <tr><td>Sprint 3</td><td>Implementation of JWT authentication, role guards, and profile management.</td></tr>
    <tr><td>Sprint 4</td><td>Development of file upload pipeline, Cloudinary integration, and PDF pre-flight checks.</td></tr>
    <tr><td>Sprint 5</td><td>Database creation in MongoDB Atlas and ACID wallet transaction implementation.</td></tr>
    <tr><td>Sprint 6</td><td>First project review and architectural feedback adjustments.</td></tr>
    <tr><td>Sprint 7</td><td>Priority queue algorithm implementation with dynamic aging deduction functions.</td></tr>
    <tr><td>Sprint 8</td><td>Staff production dashboard development and cash-at-counter settlement controls.</td></tr>
    <tr><td>Sprint 9--11</td><td>Razorpay gateway integration, Socket.IO real-time engine, and Electron Print Agent.</td></tr>
    <tr><td>Sprint 12--14</td><td>Automated shop scheduler cron, OTP verification, PWA service worker, and inventory tracker.</td></tr>
    <tr><td>Sprint 15--16</td><td>Automated Selenium test suite execution, bug fixes, deployment, and final documentation.</td></tr>
  </table>

  <h2 class="section-title">5.3 Test Plan</h2>
  <p>The test plan validates functional accuracy, integration reliability, security and data integrity, error handling, and end-user usability.</p>
</div>

<!-- ================= CHAPTER 6: IMPLEMENTATION AND TESTING ================= -->
<div class="page-break">
  <h1 class="chapter-title">CHAPTER 6: IMPLEMENTATION AND TESTING</h1>
  
  <h2 class="section-title">6.1 Implementation Procedures</h2>
  <p>Implementation was executed across seven structured stages: development environment setup, client order wizard interface, document processing pipeline, priority queue and pricing services, staff counter and admin dashboards, hardware interfacing via Electron Print Agent, and automated scheduling with PWA finalization.</p>

  <h2 class="section-title">6.2 Testing Methods and Results</h2>
  <h3 class="subsection-title">6.2.1 Unit Testing</h3>
  <p>Unit tests verified individual pricing formulas, aging deduction math, JWT verification tokens, and OTP generation algorithms.</p>
  <h3 class="subsection-title">6.2.2 Integration Testing</h3>
  <p>Integration testing confirmed smooth data flow from upload to Cloudinary storage, Razorpay webhook settlement, and Socket.IO queue updates.</p>
  <h3 class="subsection-title">6.2.3 System Testing</h3>
  <p>End-to-end workflows were verified under peak concurrent job submissions across the web app, backend, and desktop Print Agent.</p>
  <h3 class="subsection-title">6.2.4 User Acceptance Testing</h3>
  <p>Student and operator cohorts evaluated usability, observing 42-second average order placement times and 100% billing accuracy. Across 120 automated Selenium test cases, 114 passed successfully (95.0% pass rate).</p>
</div>

<!-- ================= CHAPTER 7: CONCLUSIONS ================= -->
<div class="page-break">
  <h1 class="chapter-title">CHAPTER 7: CONCLUSIONS</h1>
  
  <h2 class="section-title">7.1 Summary</h2>
  <p>The Reprography Automation System (REPOSYS) replaces outdated manual counter registers with an intelligent, cloud-enabled web platform and hardware Print Agent. Key features include pre-flight PDF parsing, multi-channel Razorpay and digital wallet payments, starvation-free priority queue scheduling with aging, OTP physical handover verification, and real-time Socket.IO transparency.</p>

  <h2 class="section-title">7.2 Limitations</h2>
  <ul>
    <li>Large document uploads (>100 MB) can experience latency on slow mobile networks.</li>
    <li>Free serverless hosting introduces cold-start response delays upon initial wake-up.</li>
    <li>The Print Agent currently relies on Windows Print Spooler APIs, requiring Windows-based counter PCs.</li>
    <li>Uncollected Pay at Counter orders printed prior to cash collection remain a minor financial risk.</li>
  </ul>

  <h2 class="section-title">7.3 Future Scope</h2>
  <ul>
    <li>Native iOS and Android mobile applications using React Native.</li>
    <li>Smart campus RFID ID card integration for instant tap-and-pay counter settlement.</li>
    <li>AI Document Intelligence via Google Gemini API for automatic layout checks and translations.</li>
    <li>Multi-shop load balancing across campus departments.</li>
    <li>Standalone unattended self-service hardware kiosks.</li>
  </ul>
</div>

<!-- ================= CHAPTER 8: APPENDICES ================= -->
<div class="page-break">
  <h1 class="chapter-title">CHAPTER 8: APPENDICES</h1>
  
  <h2 class="section-title">8.1 Code</h2>
  
  <h3 class="subsection-title">8.1.1 index.html (Client Order Form &amp; Kiosk)</h3>
  <pre class="code-block">
&lt;!DOCTYPE html&gt;
&lt;html lang="en"&gt;
&lt;head&gt;
  &lt;meta charset="UTF-8"&gt;
  &lt;title&gt;REPOSYS - Campus Reprography&lt;/title&gt;
  &lt;link rel="stylesheet" href="/styles/main.css"&gt;
&lt;/head&gt;
&lt;body class="bg-slate-900 text-white min-h-screen"&gt;
  &lt;div class="container mx-auto px-4 py-8"&gt;
    &lt;header class="flex justify-between items-center mb-8"&gt;
      &lt;div class="flex items-center gap-3"&gt;
        &lt;img src="/assets/logo.png" alt="REPOSYS Logo" class="h-10"&gt;
        &lt;h1 class="text-2xl font-bold"&gt;REPOSYS&lt;/h1&gt;
      &lt;/div&gt;
      &lt;div id="userBadge" class="flex items-center gap-2"&gt;
        &lt;span id="userName" class="text-sm font-medium"&gt;Guest User&lt;/span&gt;
        &lt;span id="walletBal" class="bg-blue-600 px-3 py-1 rounded-full text-xs"&gt;Bal: INR 0.00&lt;/span&gt;
      &lt;/div&gt;
    &lt;/header&gt;
    &lt;!-- Upload and Configuration Stepper --&gt;
  &lt;/div&gt;
&lt;/body&gt;
&lt;/html&gt;
  </pre>

  <h3 class="subsection-title">8.1.2 queueService.js (Priority Queue &amp; Dynamic Aging)</h3>
  <pre class="code-block">
const Order = require('../models/Order');
const socketHandler = require('../socket/socketHandler');

const VISIBLE_STATUSES = ['In_Queue', 'Processing', 'ReadyForPickup'];

function calculateAgingDeduction(createdAt) {{
  const waitMs = Date.now() - new Date(createdAt).getTime();
  const waitHours = Math.floor(waitMs / (1000 * 60 * 60));
  return Math.min(60, waitHours * 20); // 20 points per hour, max 60
}}

function calculateEffectivePriority(baseScore, createdAt) {{
  const deduction = calculateAgingDeduction(createdAt);
  return Math.max(1, baseScore - deduction);
}}

async function getQueue(serviceType) {{
  const orders = await Order.find({{
    serviceType,
    status: {{ $in: VISIBLE_STATUSES }}
  }}).populate('userId', 'name role department').sort({{ createdAt: 1 }});

  return orders.map(order => {{
    const base = Number(order.priorityScore) || 100;
    const effective = calculateEffectivePriority(base, order.createdAt);
    return {{
      ...order.toObject(),
      priorityScore: effective,
      basePriority: base,
      agingDeduction: calculateAgingDeduction(order.createdAt)
    }};
  }}).sort((a, b) => {{
    if (a.priorityScore !== b.priorityScore) return a.priorityScore - b.priorityScore;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  }}).map((order, idx) => ({{ ...order, position: idx + 1 }}));
}}

module.exports = {{ getQueue }};
  </pre>

  <h3 class="subsection-title">8.1.3 PrintAgent/main.js (Electron Native Windows Spooler)</h3>
  <pre class="code-block">
const {{ app, BrowserWindow, ipcMain }} = require('electron');
const ptp = require('pdf-to-printer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

function handlePrintDispatch(data) {{
  const tempPath = path.join(app.getPath('temp'), `${{data.orderNumber}}.pdf`);
  const writer = fs.createWriteStream(tempPath);
  
  axios({{ url: data.signedFileUrl, method: 'GET', responseType: 'stream' }})
    .then(res => {{
      res.data.pipe(writer);
      writer.on('finish', async () => {{
        await ptp.print(tempPath, {{ printer: data.targetPrinter || undefined }});
        fs.unlinkSync(tempPath);
      }});
    }});
}}
  </pre>

  <h2 class="section-title">8.2 Screenshots</h2>
  
  <div class="figure-box">
    <img src="{img_home}" alt="Public Landing">
    <p class="caption">Public Landing and Portal Gateway</p>
  </div>
  <div class="figure-box">
    <img src="{img_login}" alt="Login Portal">
    <p class="caption">Secure User Authentication and Multi-Role Login Portal</p>
  </div>

  <div class="page-break"></div>
  <div class="figure-box">
    <img src="{img_reg}" alt="Registration Portal">
    <p class="caption">Account Registration Portal with Institutional Email Validation</p>
  </div>
  <div class="figure-box">
    <img src="{img_about}" alt="About REPOSYS">
    <p class="caption">System Architecture Overview and About REPOSYS Portal</p>
  </div>

  <div class="page-break"></div>
  <div class="figure-box">
    <img src="{img_contact}" alt="Contact Support">
    <p class="caption">Operational Inquiries and Customer Support Portal</p>
  </div>
  <div class="figure-box">
    <img src="{img_forgot}" alt="Password Reset">
    <p class="caption">Account Recovery and Password Reset Workflow</p>
  </div>

  <div class="page-break"></div>
  <div class="figure-box">
    <img src="{img_test_std}" alt="Selenium Test 1">
    <p class="caption">Automated Selenium Test Run: Student Order Workflow</p>
  </div>
  <div class="figure-box">
    <img src="{img_test_adm}" alt="Selenium Test 2">
    <p class="caption">Automated Selenium Test Run: Admin Role Route Access</p>
  </div>

  <div class="page-break"></div>
  <div class="figure-box">
    <img src="{img_test_stf}" alt="Selenium Test 3">
    <p class="caption">Automated Selenium Test Run: Counter Staff Queue Access</p>
  </div>
  <div class="figure-box">
    <img src="{img_act}" alt="Activity Diagram">
    <p class="caption">System Activity Diagram: Document Upload and Production Flow</p>
  </div>

  <div class="page-break"></div>
  <div class="figure-box">
    <img src="{img_seq}" alt="Sequence Diagram">
    <p class="caption">System Sequence Diagram: Real-Time Event Dispatching</p>
  </div>
</div>

<!-- ================= CHAPTER 9: REFERENCES ================= -->
<div class="page-break">
  <h1 class="chapter-title">CHAPTER 9: REFERENCES</h1>
  <ol style="padding-left: 0.4in; font-size: 11pt; line-height: 1.6;">
    <li>APJ Abdul Kalam Technological University. (2020). <em>Curriculum and Syllabi for Integrated Master of Computer Applications (IMCA) Programme</em>. KTU Academic Regulations, Thiruvananthapuram, Kerala.</li>
    <li>Cloudinary Inc. (2024). <em>Cloudinary Node.js SDK and Media Management API Documentation</em>. [Online]. Available: https://cloudinary.com/documentation</li>
    <li>Electron Software Foundation. (2024). <em>Electron Desktop Framework Documentation and Native Node.js Integration Guides</em>. OpenJS Foundation. [Online]. Available: https://www.electronjs.org/docs</li>
    <li>Fielding, R. T. (2000). <em>Architectural Styles and the Design of Network-based Software Architectures</em> (Doctoral dissertation). University of California, Irvine.</li>
    <li>Fette, I., &amp; Melnikov, A. (2011). <em>The WebSocket Protocol</em>. RFC 6455, Internet Engineering Task Force (IETF).</li>
    <li>Google Developers. (2024). <em>Progressive Web Apps: High Performance Caching and Service Worker Lifecycle</em>. Google Web Fundamentals. [Online]. Available: https://web.dev/explore/progressive-web-apps</li>
    <li>Jones, M., Bradley, J., &amp; Sakimura, N. (2015). <em>JSON Web Token (JWT)</em>. RFC 7519, Internet Engineering Task Force (IETF).</li>
    <li>Node.js Foundation. (2024). <em>Node.js v20.x Long Term Support (LTS) API Specification</em>. OpenJS Foundation. [Online]. Available: https://nodejs.org/docs</li>
    <li>Razorpay Software Private Limited. (2024). <em>Razorpay Payments API Specification and Webhook Signature Verification Reference</em>. [Online]. Available: https://razorpay.com/docs/api</li>
    <li>React Development Team. (2024). <em>React 19 Documentation: Server Components, Hooks, and Concurrency Architecture</em>. Meta Open Source. [Online]. Available: https://react.dev/</li>
    <li>Saintgits College of Engineering (Autonomous). (2026). <em>Department of Computer Applications: Mini Project Preparation Guidelines and Scrum Assessment Manual (20IMCAP501)</em>. Pathamuttom, Kottayam.</li>
    <li>Socket.IO Foundation. (2024). <em>Socket.IO Client and Server Bidirectional Event Specification</em>. [Online]. Available: https://socket.io/docs/v4/</li>
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
