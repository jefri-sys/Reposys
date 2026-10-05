import React, { startTransition, useContext, useEffect, useState } from 'react';
import { LoaderCircle, LogOut, MonitorSmartphone, PencilLine, ShieldCheck, UserRound, ChevronRight, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContextObject';
import api from '../../services/api';

const PROFILE_TABS = [
  { id: 'personal', label: 'Personal', Icon: UserRound },
  { id: 'security', label: 'Security', Icon: ShieldCheck },
  { id: 'usage', label: 'Usage', Icon: MonitorSmartphone },
];

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const formatDate = (value, options = {}) => (
  value
    ? new Date(value).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      ...options,
    })
    : '--'
);

const formatDateTime = (value) => (
  value
    ? new Date(value).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
    : '--'
);

const passwordRules = [
  { label: '8+ chars', test: (value) => value.length >= 8 },
  { label: '1 uppercase', test: (value) => /[A-Z]/.test(value) },
  { label: '1 number', test: (value) => /\d/.test(value) },
  { label: '1 special', test: (value) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value) },
];

const strengthPalette = [
  { label: 'Too weak', className: 'bg-red-500', textClassName: 'text-red-700' },
  { label: 'Weak', className: 'bg-orange-500', textClassName: 'text-orange-700' },
  { label: 'Fair', className: 'bg-yellow-500', textClassName: 'text-yellow-700' },
  { label: 'Strong', className: 'bg-emerald-500', textClassName: 'text-emerald-700' },
];

const getPasswordStrength = (value) => {
  const score = passwordRules.reduce((count, rule) => count + (rule.test(value) ? 1 : 0), 0);
  return {
    score,
    ...strengthPalette[Math.max(0, Math.min(score, strengthPalette.length) - 1)],
  };
};

const MobileProfile = () => {
  const { login, logout } = useContext(AuthContext);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'personal');
  const [profile, setProfile] = useState(null);
  const [usageSummary, setUsageSummary] = useState(null);
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    department: '',
    phone: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [pageError, setPageError] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [flash, setFlash] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

  const passwordStrength = getPasswordStrength(passwordForm.newPassword);
  const completedPasswordRules = passwordRules.filter((rule) => rule.test(passwordForm.newPassword)).length;

  useEffect(() => {
    let isActive = true;

    const loadProfile = async () => {
      setIsLoadingProfile(true);
      setPageError('');

      try {
        const response = await api.get('/users/me');

        if (!isActive) return;

        const nextProfile = response.data?.user || null;

        startTransition(() => {
          setProfile(nextProfile);
          setProfileForm({
            name: nextProfile?.name || '',
            email: nextProfile?.pendingEmail || nextProfile?.email || '',
            department: nextProfile?.department || '',
            phone: nextProfile?.phone || '',
          });
        });

        if (nextProfile) {
          login(nextProfile);
        }
      } catch (error) {
        if (!isActive) return;
        setPageError(error.response?.data?.message || 'Could not load your profile right now.');
      } finally {
        if (isActive) {
          setIsLoadingProfile(false);
        }
      }
    };

    loadProfile();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (activeTab !== 'usage') return undefined;

    let isActive = true;

    const loadUsageSummary = async () => {
      setIsLoadingUsage(true);
      setPageError('');

      try {
        const response = await api.get('/users/me/usage-summary');

        if (!isActive) return;

        startTransition(() => {
          setUsageSummary(response.data || null);
        });
      } catch (error) {
        if (!isActive) return;
        setPageError(error.response?.data?.message || 'Could not load your usage summary.');
      } finally {
        if (isActive) setIsLoadingUsage(false);
      }
    };

    loadUsageSummary();

    return () => {
      isActive = false;
    };
  }, [activeTab]);

  useEffect(() => {
    if (!flash) return undefined;
    const timeoutId = window.setTimeout(() => setFlash(null), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [flash]);

  const handleProfileInputChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  };

  const handlePasswordInputChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
  };

  const handleCancelEdit = () => {
    setProfileError('');
    setProfileForm({
      name: profile?.name || '',
      email: profile?.pendingEmail || profile?.email || '',
      department: profile?.department || '',
      phone: profile?.phone || '',
    });
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    const trimmedName = profileForm.name.trim();
    const trimmedEmail = profileForm.email.trim();

    if (!trimmedName || !trimmedEmail) {
      setProfileError('Name and Email are required.');
      return;
    }

    setIsSavingProfile(true);
    setProfileError('');

    try {
      const response = await api.patch('/users/me', {
        name: trimmedName,
        email: trimmedEmail,
        department: profileForm.department,
        phone: profileForm.phone,
      });

      const nextUser = response.data?.user || null;
      startTransition(() => {
        setProfile(nextUser);
        setProfileForm({
          name: nextUser?.name || '',
          email: nextUser?.pendingEmail || nextUser?.email || '',
          department: nextUser?.department || '',
          phone: nextUser?.phone || '',
        });
        setIsEditing(false);
      });

      if (nextUser) login(nextUser);
      setFlash({ type: 'success', message: 'Profile updated successfully.' });
    } catch (error) {
      setProfileError(error.response?.data?.message || 'Could not update your profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirm password must match.');
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await api.patch('/users/me/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordSuccess('Password updated successfully');
      setFlash({ type: 'success', message: 'Password updated successfully' });
    } catch (error) {
      setPasswordError(error.response?.data?.message || 'Could not update your password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogoutAllDevices = async () => {
    setIsLoggingOutAll(true);
    try {
      await api.post('/users/me/logout-all-devices');
      await logout({ replace: true, state: { message: 'Logged out from all devices' } });
    } catch (error) {
      setPageError(error.response?.data?.message || 'Could not log out all devices.');
      setIsLoggingOutAll(false);
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <LoaderCircle className="h-8 w-8 animate-spin text-[#0047AB]" />
      </div>
    );
  }

  return (
    <div className="bg-[#F8FAFC] min-h-full pb-20 relative">
      {flash && (
        <div className="fixed top-20 left-4 right-4 z-50 rounded-xl bg-emerald-50 border border-emerald-200 p-4 shadow-sm flex items-center justify-between">
          <span className="text-sm font-medium text-emerald-700">{flash.message}</span>
          <button onClick={() => setFlash(null)}><X size={18} className="text-emerald-700"/></button>
        </div>
      )}

      {/* Hero Section */}
      <div className="bg-white px-4 pt-6 pb-4 border-b border-[#E2E8F0] shadow-sm flex flex-col items-center">
        <div className="h-20 w-20 rounded-full bg-[#0047AB]/10 flex items-center justify-center text-3xl font-bold text-[#0047AB] mb-3">
          {profile?.name?.charAt(0) || 'U'}
        </div>
        <h1 className="text-[20px] font-bold text-[#0F172A]">{profile?.name || 'User Name'}</h1>
        <p className="text-[14px] text-[#64748B] mb-2">{profile?.email || 'email@example.com'}</p>
        <div className="bg-[#E2E8F0] text-[#475569] text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          {profile?.role || 'Student'}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[#F8FAFC] px-4 py-3 border-b border-[#E2E8F0] flex gap-2 overflow-x-auto hide-scrollbar">
        {PROFILE_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-[#0047AB] text-white shadow-sm'
                : 'bg-white text-[#64748B] border border-[#E2E8F0]'
            }`}
          >
            <tab.Icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="px-4 py-4 space-y-4">
        {pageError && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {pageError}
          </div>
        )}

        {/* PERSONAL TAB */}
        {activeTab === 'personal' && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0]">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-[15px] font-bold text-[#0F172A]">Details</h2>
                {!isEditing && (
                  <button onClick={() => setIsEditing(true)} className="text-[#0047AB] text-[13px] font-semibold flex items-center gap-1">
                    <PencilLine size={14}/> Edit
                  </button>
                )}
              </div>
              
              {profileError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-700">
                  {profileError}
                </div>
              )}

              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Name</label>
                    <input type="text" name="name" value={profileForm.name} onChange={handleProfileInputChange} className="w-full mt-1 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[14px] text-[#0F172A] outline-none focus:border-[#0047AB]" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Email</label>
                    <input type="email" name="email" value={profileForm.email} onChange={handleProfileInputChange} className="w-full mt-1 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[14px] text-[#0F172A] outline-none focus:border-[#0047AB]" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Department</label>
                    <input type="text" name="department" value={profileForm.department} onChange={handleProfileInputChange} className="w-full mt-1 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[14px] text-[#0F172A] outline-none focus:border-[#0047AB]" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Phone</label>
                    <input type="text" name="phone" value={profileForm.phone} onChange={handleProfileInputChange} className="w-full mt-1 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[14px] text-[#0F172A] outline-none focus:border-[#0047AB]" />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={handleCancelEdit} className="flex-1 py-3 rounded-xl bg-[#F1F5F9] text-[#475569] font-semibold text-[14px]">Cancel</button>
                    <button onClick={handleSaveProfile} disabled={isSavingProfile} className="flex-1 py-3 rounded-xl bg-[#0047AB] text-white font-semibold text-[14px] disabled:opacity-70">
                      {isSavingProfile ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">College ID</span>
                    <span className="text-[14px] text-[#0F172A] font-medium">{profile?.collegeId || '--'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Department</span>
                    <span className="text-[14px] text-[#0F172A] font-medium">{profile?.department || '--'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Phone</span>
                    <span className="text-[14px] text-[#0F172A] font-medium">{profile?.phone || '--'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Member Since</span>
                    <span className="text-[14px] text-[#0F172A] font-medium">{formatDate(profile?.createdAt)}</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* SECURITY TAB */}
        {activeTab === 'security' && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0]">
              <h2 className="text-[15px] font-bold text-[#0F172A] mb-1">Change Password</h2>
              <p className="text-[12px] text-[#64748B] mb-4">Choose a strong, unique password.</p>
              
              {passwordError && <div className="mb-4 p-3 bg-red-50 text-red-700 text-[13px] rounded-xl">{passwordError}</div>}
              {passwordSuccess && <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-[13px] rounded-xl">{passwordSuccess}</div>}

              <form onSubmit={handleChangePassword} className="space-y-3">
                <input type="password" name="currentPassword" placeholder="Current Password" value={passwordForm.currentPassword} onChange={handlePasswordInputChange} className="w-full p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[14px] text-[#0F172A] outline-none focus:border-[#0047AB]" />
                <input type="password" name="newPassword" placeholder="New Password" value={passwordForm.newPassword} onChange={handlePasswordInputChange} className="w-full p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[14px] text-[#0F172A] outline-none focus:border-[#0047AB]" />
                
                <div className="bg-[#F1F5F9] p-3 rounded-xl border border-[#E2E8F0]">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-bold text-[#64748B] uppercase">Strength</span>
                    <span className={`text-[12px] font-semibold ${passwordStrength.textClassName}`}>{passwordForm.newPassword ? passwordStrength.label : '---'}</span>
                  </div>
                  <div className="flex gap-1 mb-2">
                    {[0, 1, 2, 3].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full ${i < completedPasswordRules ? passwordStrength.className : 'bg-[#CBD5E1]'}`}/>)}
                  </div>
                  <div className="text-[10px] text-[#64748B] grid grid-cols-2 gap-1">
                    {passwordRules.map(rule => (
                      <span key={rule.label} className={rule.test(passwordForm.newPassword) ? 'text-emerald-600' : ''}>
                        {rule.test(passwordForm.newPassword) ? '✓' : '○'} {rule.label}
                      </span>
                    ))}
                  </div>
                </div>

                <input type="password" name="confirmPassword" placeholder="Confirm New Password" value={passwordForm.confirmPassword} onChange={handlePasswordInputChange} className="w-full p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[14px] text-[#0F172A] outline-none focus:border-[#0047AB]" />
                <button type="submit" disabled={isChangingPassword} className="w-full py-3 mt-2 rounded-xl bg-[#0047AB] text-white font-semibold text-[14px] disabled:opacity-70">
                  {isChangingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0]">
              <h2 className="text-[15px] font-bold text-[#0F172A] mb-4">Active Sessions</h2>
              <div className="space-y-3 mb-4">
                {profile?.activeSessions?.length ? profile.activeSessions.map((session, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                    <div className="flex gap-3 items-center">
                      <div className="h-10 w-10 bg-[#0047AB]/10 text-[#0047AB] rounded-full flex items-center justify-center">
                        <MonitorSmartphone size={18}/>
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-[#0F172A]">{session.device || 'Unknown'}</p>
                        <p className="text-[11px] text-[#64748B]">{formatDateTime(session.lastActive)}</p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-[12px] text-[#64748B] text-center py-2">No active sessions.</p>
                )}
              </div>
              <button onClick={handleLogoutAllDevices} disabled={isLoggingOutAll} className="w-full py-3 flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 text-red-600 font-semibold text-[14px] active:bg-red-100 transition disabled:opacity-70">
                <LogOut size={16}/> {isLoggingOutAll ? 'Logging out...' : 'Logout from All Devices'}
              </button>
            </div>
          </>
        )}

        {/* USAGE TAB */}
        {activeTab === 'usage' && (
          <div className="space-y-3">
            {isLoadingUsage ? (
              <div className="py-10 flex justify-center"><LoaderCircle className="h-6 w-6 animate-spin text-[#0047AB]"/></div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm">
                    <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Orders</p>
                    <p className="text-[24px] font-bold text-[#0047AB]">{Number(usageSummary?.totalOrders || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm">
                    <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Spent</p>
                    <p className="text-[20px] font-bold text-[#0F172A] mt-1">{CURRENCY_FORMATTER.format(Number(usageSummary?.totalSpend || 0))}</p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm">
                  <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Most Used</p>
                  <p className="text-[16px] font-bold text-[#0F172A]">{usageSummary?.mostUsedService || 'No orders yet'}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm">
                  <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Orders This Month</p>
                  <p className="text-[16px] font-bold text-[#0F172A]">{Number(usageSummary?.ordersThisMonth || 0).toLocaleString('en-IN')}</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileProfile;
