import { startTransition, useContext, useEffect, useState } from 'react';
import {
  LoaderCircle,
  LogOut,
  MonitorSmartphone,
  PencilLine,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContextObject';
import api from '../../services/api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  LoadingState,
  PageHeader,
  Badge
} from '../../components/ui';

const PROFILE_TABS = [
  { id: 'personal', label: 'Personal Information', Icon: UserRound },
  { id: 'security', label: 'Account Security', Icon: ShieldCheck },
  { id: 'usage', label: 'Usage Summary', Icon: MonitorSmartphone },
];

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const passwordRules = [
  { label: 'At least 8 characters', test: (value) => value.length >= 8 },
  { label: 'One uppercase letter', test: (value) => /[A-Z]/.test(value) },
  { label: 'One number', test: (value) => /\d/.test(value) },
  { label: 'One special character', test: (value) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value) },
];

const strengthPalette = [
  { label: 'Too weak', className: 'bg-red-500', textClassName: 'text-red-700' },
  { label: 'Weak', className: 'bg-orange-500', textClassName: 'text-orange-700' },
  { label: 'Fair', className: 'bg-yellow-500', textClassName: 'text-yellow-700' },
  { label: 'Strong', className: 'bg-emerald-500', textClassName: 'text-emerald-700' },
];

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

const getPasswordStrength = (value) => {
  const score = passwordRules.reduce((count, rule) => count + (rule.test(value) ? 1 : 0), 0);
  return {
    score,
    ...strengthPalette[Math.max(0, Math.min(score, strengthPalette.length) - 1)],
  };
};

const TabButton = ({ tab, isActive, onSelect }) => {
  const { Icon } = tab;

  return (
    <button
      type="button"
      onClick={() => onSelect(tab.id)}
      className={[
        'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
        isActive
          ? 'bg-sky-600 text-white shadow-sm'
          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300',
      ].join(' ')}
    >
      <Icon className="h-4 w-4" />
      {tab.label}
    </button>
  );
};

const ProfileField = ({ label, value, children }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
    {children || <p className="mt-1 text-sm font-medium text-slate-900">{value || '--'}</p>}
  </div>
);

const SummaryCard = ({ label, value, helper }) => (
  <Card>
    <CardContent className="p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </CardContent>
  </Card>
);

const Profile = () => {
  const { login, logout } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('personal');
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

    const timeoutId = window.setTimeout(() => {
      setFlash(null);
    }, 3200);

    return () => {
      window.clearTimeout(timeoutId);
    };
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

    if (!trimmedName) {
      setProfileError('Name is required.');
      return;
    }

    if (!trimmedEmail) {
      setProfileError('Email is required.');
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

      setFlash({
        type: 'success',
        message: response.data?.message || 'Profile updated successfully.',
      });
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

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordSuccess(response.data?.message || 'Password updated successfully');
      setFlash({
        type: 'success',
        message: response.data?.message || 'Password updated successfully',
      });
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
      await logout({
        replace: true,
        state: { message: 'You have been logged out from all devices' },
      });
    } catch (error) {
      setPageError(error.response?.data?.message || 'Could not log out all devices.');
      setIsLoggingOutAll(false);
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoadingState message="Loading profile..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      {flash && (
        <div className="fixed right-6 top-6 z-50 rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-emerald-700 shadow-lg">
          {flash.message}
        </div>
      )}

      <div className="mx-auto max-w-5xl space-y-6">
        <Card className="overflow-hidden border-0 shadow-sm">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Account</p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                  My Profile
                </h1>
                <p className="mt-2 text-sm text-slate-600 max-w-md">
                  Update your personal details, keep your account secure, and review how you use the reprography service.
                </p>
              </div>

              <div className="rounded-xl border border-white/60 bg-white/60 px-5 py-4 shadow-sm backdrop-blur-sm min-w-[200px]">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current account</p>
                <p className="mt-2 text-lg font-bold text-slate-900">{profile?.name || 'User'}</p>
                <p className="text-sm text-slate-600">{profile?.email || '--'}</p>
                <Badge variant="primary" className="mt-3">
                  {profile?.role || 'Student'}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {pageError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
            {pageError}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {PROFILE_TABS.map((tab) => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onSelect={setActiveTab}
            />
          ))}
        </div>

        {activeTab === 'personal' && (
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-slate-100">
                <div>
                  <CardTitle>Profile details</CardTitle>
                  <CardDescription>Update your personal information</CardDescription>
                </div>
                {!isEditing ? (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} icon={PencilLine}>
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={handleCancelEdit}>Cancel</Button>
                    <Button size="sm" onClick={handleSaveProfile} isLoading={isSavingProfile}>Save</Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-6">
                {profileError && (
                  <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {profileError}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Name"
                    name="name"
                    value={profileForm.name}
                    onChange={handleProfileInputChange}
                    placeholder="Enter your full name"
                    disabled={!isEditing}
                  />
                  <Input
                    label="Email"
                    name="email"
                    type="email"
                    value={profileForm.email}
                    onChange={handleProfileInputChange}
                    placeholder="Enter your email address"
                    disabled={!isEditing}
                  />
                  <Input
                    label="Department"
                    name="department"
                    value={profileForm.department}
                    onChange={handleProfileInputChange}
                    placeholder="Enter your department"
                    disabled={!isEditing}
                  />
                  <Input
                    label="Phone"
                    name="phone"
                    value={profileForm.phone}
                    onChange={handleProfileInputChange}
                    placeholder="Enter your phone number"
                    disabled={!isEditing}
                  />
                </div>

                {profile?.pendingEmail && (
                  <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Email change pending verification at {profile.pendingEmail}. Your current email stays active until that link is verified.
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <ProfileField label="Current Email" value={profile?.email} />
              <ProfileField label="College ID" value={profile?.collegeId} />
              <ProfileField label="Role" value={profile?.role} />
              <ProfileField label="Member Since" value={formatDate(profile?.createdAt)} />
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
            <Card>
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle>Change password</CardTitle>
                <CardDescription>Choose a strong password that you do not reuse on any other site.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {passwordError && (
                  <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {passwordError}
                  </div>
                )}

                {passwordSuccess && (
                  <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {passwordSuccess}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <Input
                    label="Current Password"
                    name="currentPassword"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordInputChange}
                    placeholder="Enter current password"
                  />
                  <Input
                    label="New Password"
                    name="newPassword"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordInputChange}
                    placeholder="Create a new password"
                  />

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Strength</p>
                      <p className={`text-sm font-semibold ${passwordStrength.textClassName}`}>
                        {passwordForm.newPassword ? passwordStrength.label : 'Start typing'}
                      </p>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {[0, 1, 2, 3].map((index) => (
                        <div
                          key={index}
                          className={`h-1.5 rounded-full ${index < completedPasswordRules ? passwordStrength.className : 'bg-slate-200'}`}
                        />
                      ))}
                    </div>

                    <div className="space-y-1">
                      {passwordRules.map((rule) => {
                        const passed = rule.test(passwordForm.newPassword);
                        return (
                          <p key={rule.label} className={`text-xs ${passed ? 'text-emerald-700' : 'text-slate-500'}`}>
                            {passed ? '✓ Meets' : '○ Needs'}: {rule.label}
                          </p>
                        );
                      })}
                    </div>
                  </div>

                  <Input
                    label="Confirm New Password"
                    name="confirmPassword"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordInputChange}
                    placeholder="Re-enter your new password"
                  />

                  <Button type="submit" isLoading={isChangingPassword} className="w-full sm:w-auto mt-4">
                    Update Password
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle>Active Sessions</CardTitle>
                <CardDescription>Devices currently signed in</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {profile?.activeSessions?.length ? profile.activeSessions.map((session) => (
                    <div key={session.sessionId || session.lastActive} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-md text-blue-600">
                          <MonitorSmartphone className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{session.device || 'Unknown device'}</p>
                          <p className="text-xs text-slate-500">Last active: {formatDateTime(session.lastActive)}</p>
                        </div>
                      </div>
                      <Badge variant="success">Active</Badge>
                    </div>
                  )) : (
                    <div className="p-6 text-center text-sm text-slate-500">
                      No active sessions recorded yet.
                    </div>
                  )}
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                  <Button 
                    variant="dangerOutline" 
                    className="w-full" 
                    icon={LogOut}
                    onClick={handleLogoutAllDevices}
                    isLoading={isLoggingOutAll}
                  >
                    Logout from All Devices
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'usage' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Usage Summary</h2>
              <p className="text-sm text-slate-500">How you use Reposys</p>
            </div>

            {isLoadingUsage ? (
              <div className="py-12">
                <LoadingState message="Loading usage summary..." />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <SummaryCard
                  label="Total Orders"
                  value={Number(usageSummary?.totalOrders || 0).toLocaleString('en-IN')}
                  helper="All orders tied to your account."
                />
                <SummaryCard
                  label="Total Spent"
                  value={CURRENCY_FORMATTER.format(Number(usageSummary?.totalSpend || 0))}
                  helper="Spend across completed or paid orders."
                />
                <SummaryCard
                  label="Most Used Service"
                  value={usageSummary?.mostUsedService || 'No orders yet'}
                  helper="Your most frequent reprography service."
                />
                <SummaryCard
                  label="Member Since"
                  value={formatDate(usageSummary?.memberSince)}
                  helper="The date your Reposys account was created."
                />
                <SummaryCard
                  label="Orders This Month"
                  value={Number(usageSummary?.ordersThisMonth || 0).toLocaleString('en-IN')}
                  helper="Requests placed in the current calendar month."
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
