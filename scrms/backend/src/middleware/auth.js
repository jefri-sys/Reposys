const jwt = require('jsonwebtoken');
const User = require('../models/User');
const GuestSession = require('../models/GuestSession');
const { resolveSessionDeviceLabel } = require('../utils/sessionDevice');

const isGuestRequestAllowed = (req) => {
  const requestPath = `${req.baseUrl || ''}${req.path || ''}`;

  return (
    (req.method === 'POST' && requestPath === '/api/guest/end-session')
    || (req.method === 'POST' && requestPath === '/api/orders/create')
    || (req.method === 'POST' && requestPath === '/api/documents/upload')
    || (req.method === 'POST' && requestPath === '/api/documents/upload-multiple')
    || (req.method === 'GET' && /^\/api\/documents\/[^/]+\/url$/.test(requestPath))
    || (req.method === 'GET' && /^\/api\/orders\/[^/]+$/.test(requestPath))
    || (req.method === 'PATCH' && /^\/api\/orders\/[^/]+\/cancel$/.test(requestPath))
    || (req.method === 'GET' && /^\/api\/orders\/[^/]+\/receipt$/.test(requestPath))
    || (req.method === 'GET' && requestPath === '/api/auth/me')
  );
};

const isPublicRequestAllowed = (req) => {
  const requestPath = `${req.baseUrl || ''}${req.path || ''}`.replace(/\/+$/, '');

  return req.method === 'POST' && requestPath === '/api/contact';
};

exports.verifyToken = async (req, res, next) => {
  try {
    if (isPublicRequestAllowed(req)) {
      return next();
    }

    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token. Please log in.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Session expired. Please log in.' });
      }
      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, message: 'Invalid token.' });
      }
      throw err;
    }

    if (decoded.role === 'Guest') {
      if (!decoded.email || !decoded.sessionId) {
        return res.status(401).json({ success: false, message: 'Invalid guest token.' });
      }

      if (!isGuestRequestAllowed(req)) {
        return res.status(403).json({
          success: false,
          message: 'Guest access is limited to kiosk order creation and document upload.',
        });
      }

      const guestSession = await GuestSession.findOne({
        email: decoded.email,
        sessionId: decoded.sessionId,
        isActive: true,
      });

      if (!guestSession) {
        return res.status(401).json({ success: false, message: 'Guest session expired. Start a new one.' });
      }

      req.authSessionId = decoded.sessionId;
      req.user = {
        role: 'Guest',
        email: decoded.email,
        sessionId: decoded.sessionId,
        isGuest: true,
      };
      return next();
    }

    // Fetch full user (excluding password)
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists.' });
    }

    if (user.sessionInvalidatedAt) {
      // decoded.iat is in seconds, Date is in ms
      const issuedAtTimeMs = decoded.iat * 1000;
      if (issuedAtTimeMs < user.sessionInvalidatedAt.getTime()) {
        return res.status(401).json({ success: false, message: 'Session invalidated.' });
      }
    }

    req.authSessionId = decoded.sessionId || null;

    if (decoded.sessionId) {
      const now = Date.now();
      const userAgentLabel = resolveSessionDeviceLabel(req.headers['user-agent']);
      const activeSessions = Array.isArray(user.activeSessions) ? [...user.activeSessions] : [];
      const matchingSession = activeSessions.find((session) => session?.sessionId === decoded.sessionId);
      let shouldPersistSessions = false;

      if (matchingSession) {
        if (!matchingSession.device) {
          matchingSession.device = userAgentLabel;
          shouldPersistSessions = true;
        }

        const lastActiveTime = matchingSession.lastActive
          ? new Date(matchingSession.lastActive).getTime()
          : 0;

        if (!lastActiveTime || now - lastActiveTime > 60 * 1000) {
          matchingSession.lastActive = new Date(now);
          shouldPersistSessions = true;
        }
      } else {
        activeSessions.push({
          sessionId: decoded.sessionId,
          device: userAgentLabel,
          lastActive: new Date(now),
        });
        shouldPersistSessions = true;
      }

      if (shouldPersistSessions) {
        user.activeSessions = activeSessions
          .sort((left, right) => {
            const leftTime = left?.lastActive ? new Date(left.lastActive).getTime() : 0;
            const rightTime = right?.lastActive ? new Date(right.lastActive).getTime() : 0;
            return rightTime - leftTime;
          })
          .slice(0, 10);

        await user.save();
      }
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
