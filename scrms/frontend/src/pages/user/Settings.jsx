import React, { useContext } from 'react';
import { UserRound, Bell, Shield, Palette, Smartphone, Laptop } from 'lucide-react';
import { AuthContext } from '../../context/AuthContextObject';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

const DesktopSettings = () => {
  const { user } = useContext(AuthContext);
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f8fbff,_#eef4ff_52%,_#f8fafc)] dark:bg-[linear-gradient(180deg,_#0f172a,_#1e293b_52%,_#0f172a)] text-slate-950 dark:text-slate-50 py-10">
      <div className="mx-auto max-w-5xl px-6 sm:px-8">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Settings</h1>
          <p className="text-slate-600 dark:text-slate-400">Manage your account preferences, security, and application appearance.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-3 space-y-2">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-3 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <button className="flex w-full items-center gap-3 rounded-2xl bg-sky-50 dark:bg-sky-900/30 px-4 py-3 text-sm font-semibold text-sky-700 dark:text-sky-400 transition">
                <UserRound className="h-4 w-4" /> Profile Settings
              </button>
              <button className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-400 transition hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200">
                <Palette className="h-4 w-4" /> Appearance
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-9 space-y-6">
            {/* Profile Section */}
            <section className="rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-8 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Profile Settings</h2>
              <div className="flex items-center gap-6 mb-8">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/50 text-3xl font-bold text-sky-700 dark:text-sky-400 shadow-inner">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{user?.name || 'Alex Rivers'}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{user?.email || 'alex.rivers@reposys.io'}</p>
                  <button 
                    onClick={() => navigate('/profile')}
                    className="rounded-full bg-slate-900 dark:bg-white px-5 py-2 text-sm font-semibold text-white dark:text-slate-900 transition hover:bg-slate-800 dark:hover:bg-slate-200 shadow-sm"
                  >
                    Edit Profile
                  </button>
                </div>
              </div>
            </section>

            {/* Appearance Section */}
            <section className="rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-8 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Theme Appearance</h2>
              <div className="grid grid-cols-3 gap-4">
                <button 
                  onClick={() => !isDark && toggleTheme()}
                  className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 p-4 transition ${!isDark ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'}`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
                  </div>
                  <span className={`text-sm font-semibold ${!isDark ? 'text-sky-700 dark:text-sky-400' : 'text-slate-700 dark:text-slate-300'}`}>Light Mode</span>
                </button>
                <button 
                  onClick={() => isDark && toggleTheme()}
                  className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 p-4 transition ${isDark ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'}`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                  </div>
                  <span className={`text-sm font-semibold ${isDark ? 'text-sky-700 dark:text-sky-400' : 'text-slate-700 dark:text-slate-300'}`}>Dark Mode</span>
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesktopSettings;
