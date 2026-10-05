const sortSessions = (sessions = []) => [...sessions].sort((left, right) => {
  const leftTime = left?.lastActive ? new Date(left.lastActive).getTime() : 0;
  const rightTime = right?.lastActive ? new Date(right.lastActive).getTime() : 0;
  return rightTime - leftTime;
});

const serializeUser = (user) => ({
  _id: user?._id,
  id: user?._id ? String(user._id) : user?.id,
  name: user?.name || '',
  email: user?.email || '',
  pendingEmail: user?.pendingEmail || '',
  collegeId: user?.collegeId || '',
  department: user?.department || '',
  role: user?.role || '',
  queueAssignment: user?.queueAssignment || 'All',
  verified: Boolean(user?.verified),
  pendingRole: user?.pendingRole || null,
  pendingRoleApproval: Boolean(user?.pendingRoleApproval),
  isActive: user?.isActive !== false,
  phone: user?.phone || '',
  totalOrders: Number(user?.totalOrders) || 0,
  totalSpend: Number(user?.totalSpend) || 0,
  activeSessions: sortSessions(Array.isArray(user?.activeSessions) ? user.activeSessions : []).map((session) => ({
    sessionId: session?.sessionId || '',
    device: session?.device || 'Unknown device',
    lastActive: session?.lastActive || null,
  })),
  createdAt: user?.createdAt || null,
  updatedAt: user?.updatedAt || null,
});

module.exports = {
  serializeUser,
};
