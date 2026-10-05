const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Order = require('../models/Order');
const User = require('../models/User');
const {
  sendEmail,
  isSandboxMail,
  buildEmailChangeVerificationEmail,
} = require('../config/nodemailer');
const { serializeUser } = require('../utils/serializeUser');
const { getPrimaryFrontendUrl } = require('../config/origins');

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ACTIVE_SPEND_MATCH = {
  $or: [
    { status: 'Completed' },
    { paymentStatus: 'Paid' },
  ],
};

const withSandboxSuffix = (message) => (
  isSandboxMail()
    ? `${message} Note: current email delivery is using Mailtrap sandbox, so messages go to the test inbox instead of a real mailbox.`
    : message
);

exports.getMe = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      user: serializeUser(req.user),
    });
  } catch (error) {
    next(error);
  }
};

exports.updateMe = async (req, res, next) => {
  try {
    const updates = {};
    let emailChange = null;

    if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
      const name = String(req.body.name || '').trim();

      if (!name) {
        return res.status(400).json({ success: false, message: 'Name is required' });
      }

      updates.name = name;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'department')) {
      updates.department = String(req.body.department || '').trim();
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'phone')) {
      updates.phone = String(req.body.phone || '').trim();
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'email')) {
      const normalizedEmail = String(req.body.email || '').trim().toLowerCase();

      if (!normalizedEmail) {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }

      if (!EMAIL_REGEX.test(normalizedEmail)) {
        return res.status(400).json({ success: false, message: 'Enter a valid email address' });
      }

      if (normalizedEmail !== req.user.email) {
        const existingUser = await User.findOne({
          email: normalizedEmail,
          _id: { $ne: req.user._id },
        });

        if (existingUser) {
          return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

        req.user.pendingEmail = normalizedEmail;
        req.user.emailChangeToken = hashedToken;
        req.user.emailChangeTokenExpiry = Date.now() + 24 * 60 * 60 * 1000;
        emailChange = {
          rawToken,
          newEmail: normalizedEmail,
          currentEmail: req.user.email,
        };
      }
    }

    Object.assign(req.user, updates);
    await req.user.save();

    if (emailChange) {
      const verificationUrl = `${getPrimaryFrontendUrl()}/verify-email?token=${emailChange.rawToken}`;

      try {
        await sendEmail(
          emailChange.newEmail,
          'Reposys - Confirm Your New Email',
          buildEmailChangeVerificationEmail({
            name: req.user.name,
            verificationLink: verificationUrl,
            currentEmail: emailChange.currentEmail,
            newEmail: emailChange.newEmail,
          })
        );
      } catch (emailError) {
        console.error('Failed to send email change verification:', emailError);
        req.user.pendingEmail = undefined;
        req.user.emailChangeToken = undefined;
        req.user.emailChangeTokenExpiry = undefined;
        await req.user.save();

        return res.status(500).json({
          success: false,
          message: 'We could not send the verification email. Please try again later or contact support.',
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: emailChange
        ? withSandboxSuffix('Profile updated. Check your new email address to confirm the email change.')
        : 'Profile updated successfully.',
      user: serializeUser(req.user),
    });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
      });
    }

    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const passwordMatches = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatches) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long, contain 1 uppercase letter, 1 number, and 1 special character',
      });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

exports.logoutAllDevices = async (req, res, next) => {
  try {
    req.user.sessionInvalidatedAt = new Date();
    req.user.activeSessions = [];
    await req.user.save();

    return res.status(200).json({
      success: true,
      message: 'Logged out from all devices successfully',
    });
  } catch (error) {
    next(error);
  }
};

exports.getUsageSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [
      totalOrders,
      spendSummary,
      mostUsedServiceSummary,
      ordersThisMonth,
    ] = await Promise.all([
      Order.countDocuments({ userId }),
      Order.aggregate([
        {
          $match: {
            userId,
            ...ACTIVE_SPEND_MATCH,
          },
        },
        {
          $group: {
            _id: null,
            totalSpend: { $sum: { $ifNull: ['$estimatedCost', 0] } },
          },
        },
      ]),
      Order.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: '$serviceType',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 1 },
      ]),
      Order.countDocuments({
        userId,
        createdAt: {
          $gte: startOfMonth,
          $lt: startOfNextMonth,
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      totalOrders,
      totalSpend: Number(spendSummary[0]?.totalSpend) || 0,
      mostUsedService: mostUsedServiceSummary[0]?._id || null,
      memberSince: req.user.createdAt,
      ordersThisMonth,
    });
  } catch (error) {
    next(error);
  }
};
