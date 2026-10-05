import React, { startTransition, useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, ArrowLeft, Search, UserPlus, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContextObject';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Select,
  Badge,
  PageHeader,
  LoadingState,
  EmptyState
} from '../../components/ui';

const PAGE_SIZE = 20;

const INITIAL_STAFF_FORM = {
  name: '',
  email: '',
  department: '',
};

const ROLE_BADGE_STYLES = {
  Admin: 'danger',
  Faculty: 'primary',
  Staff: 'violet',
  Student: 'secondary',
};

const QUEUE_ASSIGNMENT_BADGE_STYLES = {
  All: 'secondary',
  Guest: 'warning',
  Student: 'primary',
  Faculty: 'success',
};

const ACTIVE_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

const ROLE_FILTER_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'Student', label: 'Student' },
  { value: 'Faculty', label: 'Faculty' },
  { value: 'Staff', label: 'Staff' },
  { value: 'Admin', label: 'Admin' },
];

const formatDate = (value) => {
  const date = value ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getVisiblePages = (currentPage, totalPages) => {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  const adjustedStart = Math.max(1, end - 4);

  return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
};

const UserManagement = () => {
  const { logout } = useContext(AuthContext);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [staffForm, setStaffForm] = useState(INITIAL_STAFF_FORM);
  const [staffSearchInput, setStaffSearchInput] = useState('');
  const [staffActiveFilter, setStaffActiveFilter] = useState('');
  const [pendingSearchInput, setPendingSearchInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);
  const [deletingStaffId, setDeletingStaffId] = useState('');
  const [togglingUserId, setTogglingUserId] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const visiblePages = useMemo(() => getVisiblePages(page, totalPages), [page, totalPages]);
  const filteredStaffUsers = useMemo(() => {
    const searchValue = staffSearchInput.trim().toLowerCase();

    return staffUsers.filter((user) => {
      const matchesSearch = !searchValue
        || user.name?.toLowerCase().includes(searchValue)
        || user.email?.toLowerCase().includes(searchValue)
        || user.collegeId?.toLowerCase().includes(searchValue)
        || user.department?.toLowerCase().includes(searchValue);
      const matchesStatus = !staffActiveFilter || String(user.isActive !== false) === staffActiveFilter;

      return matchesSearch && matchesStatus;
    });
  }, [staffActiveFilter, staffSearchInput, staffUsers]);
  const filteredPendingUsers = useMemo(() => {
    const searchValue = pendingSearchInput.trim().toLowerCase();

    if (!searchValue) {
      return pendingUsers;
    }

    return pendingUsers.filter((user) => (
      user.name?.toLowerCase().includes(searchValue)
      || user.email?.toLowerCase().includes(searchValue)
      || user.collegeId?.toLowerCase().includes(searchValue)
      || user.department?.toLowerCase().includes(searchValue)
    ));
  }, [pendingSearchInput, pendingUsers]);

  const setTemporarySuccess = (message) => {
    setSuccessMsg(message);
    window.clearTimeout(window.__reposysAdminSuccessTimeout);
    window.__reposysAdminSuccessTimeout = window.setTimeout(() => setSuccessMsg(''), 4000);
  };

  const loadUsers = async ({
    pageValue = page,
    searchValue = debouncedSearch,
    roleValue = roleFilter,
    activeValue = activeFilter,
  } = {}) => {
    setLoadingUsers(true);

    try {
      const response = await api.get('/admin/users', {
        params: {
          page: pageValue,
          limit: PAGE_SIZE,
          search: searchValue || undefined,
          role: roleValue || undefined,
          isActive: activeValue || undefined,
        },
      });

      startTransition(() => {
        setUsers(Array.isArray(response.data?.users) ? response.data.users : []);
        setTotalUsers(response.data?.total || 0);
        setTotalPages(response.data?.totalPages || 1);
      });
      setError('');
    } catch (loadError) {
      console.error('Error fetching users:', loadError);
      setError('Could not load users. Please check your admin privileges.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const refreshSupplementaryLists = async () => {
    setLoadingStaff(true);

    try {
      const [pendingSourceResponse, staffResponse] = await Promise.all([
        api.get('/admin/users', {
          params: {
            page: 1,
            limit: 100,
          },
        }),
        api.get('/admin/users', {
          params: {
            role: 'Staff',
            page: 1,
            limit: 100,
          },
        }),
      ]);

      const pendingSource = Array.isArray(pendingSourceResponse.data?.users) ? pendingSourceResponse.data.users : [];
      const staffRows = Array.isArray(staffResponse.data?.users) ? staffResponse.data.users : [];

      startTransition(() => {
        setPendingUsers(pendingSource.filter((user) => user.pendingRoleApproval));
        setStaffUsers(staffRows);
      });
    } catch (loadError) {
      console.error('Error loading admin support lists:', loadError);
      setPendingUsers([]);
      setStaffUsers([]);
      setError((current) => current || 'Could not load the latest staff and approval lists.');
    } finally {
      setLoadingStaff(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchInput]);

  useEffect(() => {
    loadUsers({
      pageValue: page,
      searchValue: debouncedSearch,
      roleValue: roleFilter,
      activeValue: activeFilter,
    });
  }, [activeFilter, debouncedSearch, page, roleFilter]);

  useEffect(() => {
    refreshSupplementaryLists();
  }, []);

  const handleStaffInputChange = (event) => {
    const { name, value } = event.target;
    setStaffForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSearchChange = (event) => {
    setSearchInput(event.target.value);
    setPage(1);
  };

  const handleRoleFilterChange = (event) => {
    setRoleFilter(event.target.value);
    setPage(1);
  };

  const handleActiveFilterChange = (event) => {
    setActiveFilter(event.target.value);
    setPage(1);
  };

  const handleRoleAction = async (userId, action) => {
    try {
      const endpoint = action === 'approve'
        ? `/admin/users/${userId}/approve-role`
        : `/admin/users/${userId}/reject-role`;

      const response = await api.patch(endpoint);
      setTemporarySuccess(response.data?.message || 'Role request updated.');
      await Promise.all([
        refreshSupplementaryLists(),
        loadUsers({ pageValue: page }),
      ]);
    } catch (actionError) {
      setError(actionError.response?.data?.message || 'Action failed.');
    }
  };

  const handleCreateStaff = async (event) => {
    event.preventDefault();
    setIsCreatingStaff(true);
    setError('');

    try {
      const payload = {
        name: staffForm.name.trim(),
        email: staffForm.email.trim(),
        department: staffForm.department.trim(),
      };

      const response = await api.post('/admin/users/create-staff', payload);

      startTransition(() => {
        setStaffForm(INITIAL_STAFF_FORM);
      });

      const recipientEmail = response.data?.email || payload.email;
      const successMessage = response.data?.mailMode === 'sandbox'
        ? `Staff account created. Login credentials were sent through Mailtrap sandbox for ${recipientEmail}. Check the Mailtrap inbox linked to the backend SMTP credentials.`
        : `Staff account created. Login credentials sent to ${recipientEmail}.`;

      setTemporarySuccess(successMessage);

      await Promise.all([
        refreshSupplementaryLists(),
        loadUsers({ pageValue: 1 }),
      ]);
      setPage(1);
    } catch (createError) {
      setError(createError.response?.data?.message || 'Could not create the staff account.');
    } finally {
      setIsCreatingStaff(false);
    }
  };

  const handleDeleteStaff = async (staffUser) => {
    if (!staffUser?._id) {
      return;
    }

    const confirmed = window.confirm(`Delete staff account for ${staffUser.name} (${staffUser.email})?`);
    if (!confirmed) {
      return;
    }

    setDeletingStaffId(staffUser._id);
    setError('');

    try {
      const response = await api.delete(`/admin/staff/${staffUser._id}`);
      setTemporarySuccess(response.data?.message || 'Staff account deleted successfully.');

      await Promise.all([
        refreshSupplementaryLists(),
        loadUsers({ pageValue: page }),
      ]);
    } catch (deleteError) {
      setError(deleteError.response?.data?.message || 'Could not delete the staff account.');
    } finally {
      setDeletingStaffId('');
    }
  };

  const handleToggleActive = async (selectedUser) => {
    if (!selectedUser?._id) {
      return;
    }

    const nextAction = selectedUser.isActive === false ? 'activate' : 'deactivate';
    const confirmed = window.confirm(`Are you sure you want to ${nextAction} this user?`);

    if (!confirmed) {
      return;
    }

    setTogglingUserId(selectedUser._id);
    setError('');

    try {
      const response = await api.patch(`/admin/users/${selectedUser._id}/toggle-active`);
      const updatedUser = response.data?.user;

      if (!updatedUser?._id) {
        throw new Error('Updated user details were not returned.');
      }

      startTransition(() => {
        setUsers((current) => current.map((user) => (
          user._id === updatedUser._id ? { ...user, ...updatedUser } : user
        )));
        setStaffUsers((current) => current.map((user) => (
          user._id === updatedUser._id ? { ...user, ...updatedUser } : user
        )));
        setPendingUsers((current) => current.map((user) => (
          user._id === updatedUser._id ? { ...user, ...updatedUser } : user
        )));
      });

      setTemporarySuccess(
        updatedUser.isActive === false
          ? `${updatedUser.email} has been deactivated and all active sessions were invalidated.`
          : `${updatedUser.email} has been activated.`
      );
    } catch (toggleError) {
      setError(toggleError.response?.data?.message || 'Could not update this user account.');
    } finally {
      setTogglingUserId('');
    }
  };

  const handleAssignmentChange = async (userId, newAssignment) => {
    const previousUsers = [...staffUsers];

    startTransition(() => {
      setStaffUsers((current) => current.map((u) => 
        u._id === userId ? { ...u, queueAssignment: newAssignment } : u
      ));
    });

    try {
      await api.patch(`/admin/users/${userId}/queue-assignment`, { queueAssignment: newAssignment });
      setTemporarySuccess('Queue assignment updated successfully.');
    } catch (err) {
      startTransition(() => {
        setStaffUsers(previousUsers);
      });
      setError(err.response?.data?.message || 'Could not update queue assignment.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader 
          title="User Management"
          description="Search the user base, manage staff accounts, and review faculty approvals."
          actions={
            <div className="flex items-center gap-3">
              <Button as={Link} to="/admin" variant="outline" icon={ArrowLeft}>
                Back to Admin
              </Button>
              <Button variant="dangerOutline" onClick={logout} icon={LogOut}>
                Logout
              </Button>
            </div>
          }
        />

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2 shadow-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}
        {successMsg && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-center gap-2 shadow-sm">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            {successMsg}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[3fr_5fr]">
          <Card>
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle>Create Staff Account</CardTitle>
              <CardDescription>Reposys will generate a temporary password automatically and email the login details to the new staff member.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form className="space-y-4" onSubmit={handleCreateStaff}>
                <Input
                  label="Full Name"
                  name="name"
                  value={staffForm.name}
                  onChange={handleStaffInputChange}
                  required
                  placeholder="Operations Staff"
                />
                <Input
                  label="Email"
                  type="email"
                  name="email"
                  value={staffForm.email}
                  onChange={handleStaffInputChange}
                  required
                  placeholder="staff@saintgits.org"
                />
                <Input
                  label="Department"
                  name="department"
                  value={staffForm.department}
                  onChange={handleStaffInputChange}
                  required
                  placeholder="Operations"
                />

                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800 flex items-start gap-2">
                  <UserPlus className="h-5 w-5 shrink-0 text-blue-500 mt-0.5" />
                  <p>A temporary password and login link will be emailed automatically after account creation.</p>
                </div>

                <Button
                  type="submit"
                  disabled={isCreatingStaff}
                  isLoading={isCreatingStaff}
                  className="w-full"
                >
                  Create Staff Account
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Staff Accounts</CardTitle>
                  <CardDescription>Admins can remove staff access at any time.</CardDescription>
                </div>
                <Badge variant="violet" className="px-3">
                  {filteredStaffUsers.length} Staff
                </Badge>
              </div>
            </CardHeader>
            <div className="border-b border-slate-100 p-4 bg-slate-50/50">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  icon={Search}
                  placeholder="Search name, email, ID..."
                  value={staffSearchInput}
                  onChange={(e) => setStaffSearchInput(e.target.value)}
                />
                <Select
                  value={staffActiveFilter}
                  onChange={(e) => setStaffActiveFilter(e.target.value)}
                  options={ACTIVE_FILTER_OPTIONS}
                />
              </div>
            </div>
            <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
              <div className="overflow-x-auto flex-1">
                {loadingStaff ? (
                  <div className="p-10">
                    <LoadingState message="Loading staff accounts..." />
                  </div>
                ) : filteredStaffUsers.length === 0 ? (
                  <div className="p-10">
                    <EmptyState 
                      title="No staff found" 
                      description="No staff accounts matched the current filters."
                      icon={Search}
                    />
                  </div>
                ) : (
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 whitespace-nowrap">Staff Member</th>
                        <th className="px-6 py-4 whitespace-nowrap">Department</th>
                        <th className="px-6 py-4 whitespace-nowrap">Queue Assignment</th>
                        <th className="px-6 py-4 whitespace-nowrap">Status</th>
                        <th className="px-6 py-4 text-center whitespace-nowrap">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStaffUsers.map((user) => (
                        <tr key={user._id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-900">{user.name}</div>
                            <div className="text-slate-500">{user.email}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{user.collegeId || 'No ID'}</div>
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {user.department || <span className="text-slate-400 italic">Not set</span>}
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={user.queueAssignment || 'All'}
                              onChange={(e) => handleAssignmentChange(user._id, e.target.value)}
                              className="mb-2 block w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs shadow-sm focus-visible:border-sky-500 focus:outline-none focus-visible:ring-1 focus-visible:ring-sky-500"
                            >
                              <option value="All">All types (General)</option>
                              <option value="Guest">Guest queue</option>
                              <option value="Student">Student queue</option>
                              <option value="Faculty">Faculty queue</option>
                            </select>
                            <Badge variant={QUEUE_ASSIGNMENT_BADGE_STYLES[user.queueAssignment || 'All'] || 'secondary'} className="text-[10px]">
                              {user.queueAssignment || 'All'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={user.isActive === false ? 'danger' : 'success'}>
                              {user.isActive === false ? 'Inactive' : 'Active'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Button
                              variant="dangerOutline"
                              size="sm"
                              onClick={() => handleDeleteStaff(user)}
                              disabled={deletingStaffId === user._id}
                              isLoading={deletingStaffId === user._id}
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {pendingUsers.length > 0 && (
          <Card className="border-blue-200 overflow-hidden">
            <div className="bg-sky-600 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-white">
                <AlertCircle className="h-5 w-5" />
                <h2 className="text-lg font-bold">Pending Faculty Approvals</h2>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-200" />
                <input
                  type="text"
                  value={pendingSearchInput}
                  onChange={(event) => setPendingSearchInput(event.target.value)}
                  placeholder="Search pending approvals..."
                  className="w-full rounded-lg bg-sky-700/50 border border-sky-500 py-2 pl-10 pr-4 text-sm text-white placeholder:text-sky-300 outline-none focus-visible:bg-sky-700 focus-visible:border-sky-400 focus-visible:ring-1 focus-visible:ring-sky-400 transition-all"
                />
              </div>
            </div>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-blue-50/50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3">Name & Email</th>
                      <th className="px-6 py-3">College ID</th>
                      <th className="px-6 py-3">Department</th>
                      <th className="px-6 py-3">Registered On</th>
                      <th className="px-6 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPendingUsers.length === 0 ? (
                      <tr>
                        <td className="px-6 py-8 text-center text-slate-500" colSpan={5}>
                          No pending approvals matched the current search.
                        </td>
                      </tr>
                    ) : filteredPendingUsers.map((user) => (
                      <tr key={user._id} className="hover:bg-sky-50/50 transition-colors">
                        <td className="px-6 py-3">
                          <div className="font-bold text-slate-900">{user.name}</div>
                          <div className="text-slate-500">{user.email}</div>
                        </td>
                        <td className="px-6 py-3 font-medium text-slate-700">{user.collegeId}</td>
                        <td className="px-6 py-3 text-slate-600">{user.department || <span className="italic text-slate-400">Not set</span>}</td>
                        <td className="px-6 py-3 text-slate-500">{formatDate(user.createdAt)}</td>
                        <td className="px-6 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                              onClick={() => handleRoleAction(user._id, 'approve')}
                              icon={CheckCircle2}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              className="bg-red-600 hover:bg-red-700 text-white border-0"
                              onClick={() => handleRoleAction(user._id, 'reject')}
                              icon={XCircle}
                            >
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="flex flex-col h-[800px]">
          <CardHeader className="border-b border-slate-100 pb-5 bg-slate-50/50">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <CardTitle>System Users Directory</CardTitle>
                <CardDescription>Search and manage all users registered on the platform.</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                <div className="w-full sm:w-auto sm:min-w-[240px]">
                  <Input
                    icon={Search}
                    placeholder="Search name, email, or ID..."
                    value={searchInput}
                    onChange={handleSearchChange}
                  />
                </div>
                <div className="w-full sm:w-auto sm:min-w-[160px]">
                  <Select
                    value={roleFilter}
                    onChange={handleRoleFilterChange}
                    options={ROLE_FILTER_OPTIONS}
                  />
                </div>
                <div className="w-full sm:w-auto sm:min-w-[160px]">
                  <Select
                    value={activeFilter}
                    onChange={handleActiveFilterChange}
                    options={ACTIVE_FILTER_OPTIONS}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 text-sm text-slate-500 bg-white">
            <span className="font-medium text-slate-700">Showing {users.length} of {totalUsers} users</span>
            <span>Page {page} of {totalPages}</span>
          </div>

          <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-white sticky top-0 z-10 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 shadow-sm">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap bg-white">User Details</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-white">Role</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-white">Status</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-white">Verification</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-white">Department</th>
                    <th className="px-6 py-4 text-center whitespace-nowrap bg-white">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={6} className="p-10">
                        <LoadingState message="Loading users directory..." />
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10">
                        <EmptyState 
                          title="No users found"
                          description="Try adjusting your search or filters."
                          icon={Search}
                        />
                      </td>
                    </tr>
                  ) : users.map((user) => (
                    <tr key={user._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="font-bold text-slate-900">{user.name}</div>
                        <div className="text-slate-500">{user.email}</div>
                        <div className="text-xs text-slate-400 mt-0.5">ID: {user.collegeId || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={ROLE_BADGE_STYLES[user.role] || 'secondary'}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={user.isActive === false ? 'danger' : 'success'}>
                          {user.isActive === false ? 'Inactive' : 'Active'}
                        </Badge>
                      </td>
                      <td className="px-6 py-3">
                        {user.pendingRoleApproval ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Approval Pending
                          </span>
                        ) : user.verified ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Verified
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">
                            Unverified
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-slate-600">
                        {user.department || <span className="italic text-slate-400">Not set</span>}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <Button
                          variant={user.isActive === false ? 'successOutline' : 'dangerOutline'}
                          size="sm"
                          onClick={() => handleToggleActive(user)}
                          disabled={togglingUserId === user._id}
                          isLoading={togglingUserId === user._id}
                        >
                          {user.isActive === false ? 'Activate' : 'Deactivate'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="border-t border-slate-200 bg-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
              <div className="text-sm font-medium text-slate-500">
                Page <span className="text-slate-900">{page}</span> of <span className="text-slate-900">{totalPages}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1 || loadingUsers}
                >
                  Previous
                </Button>

                <div className="hidden sm:flex gap-1">
                  {visiblePages.map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setPage(pageNumber)}
                      disabled={loadingUsers}
                      className={`h-9 w-9 rounded-md text-sm font-medium transition-colors ${
                        pageNumber === page
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page === totalPages || loadingUsers}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserManagement;
