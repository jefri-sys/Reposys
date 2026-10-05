def get_chapter8():
    return r"""% =========================================================================
% CHAPTER 8: APPENDIX
% =========================================================================
\chapter{APPENDIX}

\section{8.1 SUPPORTING DOCUMENTATION}
This section documents the formal environment variables and runtime configurations required to execute REPOSYS across local staging and production environments.

\begin{lstlisting}[language=bash, caption={Production Environment Configuration Template (.env.production)}]
# Server Runtime
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://reposys-client.vercel.app

# Database Connection
MONGODB_URI=mongodb+srv://admin:securepass@cluster0.mongodb.net/reposys?retryWrites=true&w=majority

# Cryptographic Secrets
JWT_SECRET=c9b20891d8654a60b0ad8a87b419
COOKIE_SECRET=7f8841a86c6b4129e921d3f9901b
AGENT_SETUP_TOKEN=SETUP_REPOSYS_SECURE_TOKEN_2026

# Cloud Storage
CLOUDINARY_CLOUD_NAME=reposys-storage
CLOUDINARY_API_KEY=839218491823912
CLOUDINARY_API_SECRET=Secret_Cloud_Key_ABC123

# Payment Gateway
RAZORPAY_KEY_ID=rzp_live_849201948291
RAZORPAY_KEY_SECRET=Live_Razorpay_Secret_XYZ789

# Web Push Notification
VAPID_PUBLIC_KEY=BPl9...
VAPID_PRIVATE_KEY=v8J1...
\end{lstlisting}

\section{8.2 SAMPLE CODE / QUERIES}
Representative source code excerpts demonstrating core backend transaction logic, priority queue sorting, and physical printing automation are presented below.

\begin{lstlisting}[language=JavaScript, caption={Priority Queue Calculation and Dynamic Aging (queueService.js)}]
const resolvePriorityScore = (order) => {
  const storedPriorityScore = Number(order.priorityScore);
  return Number.isFinite(storedPriorityScore) ? storedPriorityScore : 200;
};

const calculateAgingDeduction = (orderCreatedAt) => {
  const createdAt = new Date(orderCreatedAt);
  const validCreatedAt = Number.isNaN(createdAt.getTime()) ? new Date() : createdAt;
  const minutesSinceCreation = Math.floor((Date.now() - validCreatedAt.getTime()) / (60 * 1000));
  
  // Deduct 20 points for every full hour waiting beyond first minute
  return Math.max(0, Math.floor((minutesSinceCreation - 1) / 60)) * 20;
};

const calculateEffectivePriority = (basePriority, orderCreatedAt) => {
  const agingDeduction = calculateAgingDeduction(orderCreatedAt);
  return basePriority - agingDeduction;
};

async function getQueue(serviceType) {
  const orders = await Order.find({
    serviceType,
    status: { $in: ['In_Queue', 'Processing', 'ReadyForPickup'] },
  })
    .populate('userId', 'name role department')
    .sort({ createdAt: 1 });

  return orders
    .map((order) => {
      const baseScore = resolvePriorityScore(order);
      const effectiveScore = calculateEffectivePriority(baseScore, order.createdAt);
      return {
        ...order.toObject(),
        priorityScore: effectiveScore,
        basePriority: baseScore,
      };
    })
    .sort((a, b) => a.priorityScore !== b.priorityScore 
      ? a.priorityScore - b.priorityScore 
      : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
}
\end{lstlisting}

\begin{lstlisting}[language=JavaScript, caption={ACID-Compliant Wallet Payment Transaction (orderController.js)}]
const session = await mongoose.startSession();
session.startTransaction();

try {
  const wallet = await Wallet.findOne({ userId: req.user._id }).session(session);
  if (!wallet || wallet.balance < orderTotal) {
    await session.abortTransaction();
    return res.status(400).json({ message: 'Insufficient wallet balance.' });
  }

  wallet.balance -= orderTotal;
  await wallet.save({ session });

  await WalletTransaction.create([{
    walletId: wallet._id,
    type: 'Debit',
    amount: orderTotal,
    description: `Payment for Order #${order.orderNumber}`,
    balanceAfter: wallet.balance,
  }], { session });

  order.paymentStatus = 'Paid';
  order.status = 'In_Queue';
  await order.save({ session });

  await session.commitTransaction();
  session.endSession();
  
  // Broadcast update to real-time queue
  broadcastQueueUpdate(order.serviceType);
} catch (error) {
  await session.abortTransaction();
  session.endSession();
  throw error;
}
\end{lstlisting}

\section{8.3 USER INTERFACE SCREENSHOTS}
The verified visual interfaces of REPOSYS across major stakeholder views are illustrated below.

\begin{figure}[H]
\centering
\includegraphics[width=\textwidth,keepaspectratio]{figures/screen_home.png}
\caption{REPOSYS Public Landing and Portal Gateway}
\label{fig:ui_home}
\end{figure}

\begin{figure}[H]
\centering
\includegraphics[width=\textwidth,keepaspectratio]{figures/screen_login.png}
\caption{Secure User Authentication and Multi-Role Login Portal}
\label{fig:ui_login}
\end{figure}

\begin{figure}[H]
\centering
\includegraphics[width=\textwidth,keepaspectratio]{figures/screen_register.png}
\caption{Student and Faculty Account Registration with Institutional Email Validation}
\label{fig:ui_register}
\end{figure}

\begin{figure}[H]
\centering
\includegraphics[width=\textwidth,keepaspectratio]{figures/screen_about.png}
\caption{System Architecture Overview and About REPOSYS Portal}
\label{fig:ui_about}
\end{figure}

\begin{figure}[H]
\centering
\includegraphics[width=\textwidth,keepaspectratio]{figures/screen_contact.png}
\caption{Reprography Operational Inquiries and Support Contact Portal}
\label{fig:ui_contact}
\end{figure}

\begin{figure}[H]
\centering
\includegraphics[width=\textwidth,keepaspectratio]{figures/screen_forgot_password.png}
\caption{Account Recovery and Password Reset Workflow}
\label{fig:ui_forgot}
\end{figure}

\begin{figure}[H]
\centering
\includegraphics[width=\textwidth,keepaspectratio]{figures/test_student_workflow.png}
\caption{Automated Selenium Test Run: Student Document Upload and Order Creation Workflow}
\label{fig:test_student_workflow}
\end{figure}

\begin{figure}[H]
\centering
\includegraphics[width=\textwidth,keepaspectratio]{figures/test_admin_access.png}
\caption{Automated Selenium Test Run: Admin Role Route Access and Security Guard Verification}
\label{fig:test_admin_access}
\end{figure}

\begin{figure}[H]
\centering
\includegraphics[width=\textwidth,keepaspectratio]{figures/test_staff_access.png}
\caption{Automated Selenium Test Run: Counter Staff Queue Dashboard Access Verification}
\label{fig:test_staff_access}
\end{figure}

\section{8.4 GIT LOGS}
Table 8.1 documents verifiable engineering milestones and commit records extracted directly from the project repository.

\begin{table}[H]
\centering
\small
\begin{tabularx}{\textwidth}{|p{0.75in}|X|}
\hline
\textbf{Commit Hash} & \textbf{Engineering Milestone and Commit Message} \\ \hline
\texttt{5a21841} & fix: synchronize dashboard and profile usage summary \\ \hline
\texttt{04b8040} & update deployment urls for render and vercel \\ \hline
\texttt{510e51a} & update frontend and backend production configurations \\ \hline
\texttt{1a5ce7b} & feat: add TTL to audit logs and Admin Clear All Logs button \\ \hline
\texttt{c0f200e} & feat: remove install settings card, add separate deregister for agents \\ \hline
\texttt{4baffc3} & fix: do not close setup window from main process, let renderer reach step 6 \\ \hline
\texttt{bc077b7} & chore: add comprehensive logging to print agent registration flow \\ \hline
\texttt{fe5c1df} & fix: synchronize print agent socket secret with registration token \\ \hline
\texttt{c9fe161} & fix: replace custom Button with native buttons for ping/deregister \\ \hline
\texttt{c9420b2} & fix: unwrap nested IPC data to prevent agentId/agentSecret undefined \\ \hline
\texttt{ac477ba} & feat: show cold-start wait message during Step 5 registration \\ \hline
\texttt{5882718} & feat: user friendly printer error message during test print setup \\ \hline
\texttt{4fd6368} & fix: extract test.pdf from ASAR archive before printing \\ \hline
\texttt{bd65021} & fix: remove admin installer update instruction and fix token terminology \\ \hline
\texttt{b90df20} & feat: add agent registration verification and live status page \\ \hline
\texttt{7832f82} & feat: add secure print agent download endpoint and admin download card \\ \hline
\texttt{697e8b6} & feat: complete Electron print agent integration and packaging \\ \hline
\texttt{d0596ce} & fix(mobile): Optional chaining for file.name in MobileOrderWizard \\ \hline
\texttt{fbb6d39} & feat: complete SPAE phase 2 print agent integration \\ \hline
\texttt{dbed9a7} & Update PWA mobile screens and UI components \\ \hline
\texttt{0a3ffd3} & fix: remove maskable purpose from PWA icons to prevent text cutoff \\ \hline
\texttt{89bcd22} & feat(pwa): update PWA icons and app name to Reposys \\ \hline
\texttt{cd1cb2e} & chore: final Reposys rebranding and frontend API fallback resolution \\ \hline
\texttt{d286e06} & Fix InventoryManagement crash by importing CardDescription \\ \hline
\texttt{e3118a4} & Update documentation and frontend features \\ \hline
\end{tabularx}
\caption{Verifiable Version Control Commit History (Git Logs)}
\label{tab:git_logs}
\end{table}
"""
