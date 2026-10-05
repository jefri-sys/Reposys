const roleGuard = (...roles) => {
  return (req, res, next) => {
    // Requires verifyToken to explicitly run first so req.user exists
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    next();
  };
};

exports.roleGuard = roleGuard;
exports.allowRoles = roleGuard;
