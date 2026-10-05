const Notification = require('../models/Notification');
const socketHandler = require('../socket/socketHandler');

const buildNotificationPayload = (notification) => ({
  type: 'notification',
  notification: {
    title: notification.title,
    message: notification.message,
    type: notification.type,
    urgency: notification.urgency || 'Normal',
    relatedEntity: notification.relatedEntity || null,
    createdAt: notification.createdAt,
  },
});

const resolveRoleRoom = (recipientRole) => {
  if (recipientRole === 'Staff') {
    return 'staff';
  }

  if (recipientRole === 'Admin') {
    return 'admin';
  }

  return null;
};

async function createNotification({ recipientId, recipientRole, recipientType, relatedEntity, title, message, type, urgency }) {
  const resolvedRecipientType = recipientType 
    || (recipientRole === 'Staff' || recipientRole === 'Admin' ? recipientRole : 'User');

  const notification = await Notification.create({
    recipientId: recipientId || null,
    recipientRole: recipientRole || null,
    recipientType: resolvedRecipientType,
    relatedEntity: relatedEntity || null,
    title,
    message,
    type,
    urgency: urgency || 'Normal',
  });

  let io;
  try {
    io = socketHandler.getIO();
  } catch (error) {
    return notification;
  }

  const payload = buildNotificationPayload(notification);

  if (recipientId) {
    io.to(`user:${recipientId}`).emit('notification', payload);
  }

  if (recipientRole) {
    const roleRoom = resolveRoleRoom(recipientRole);
    if (roleRoom) {
      io.to(roleRoom).emit('notification', payload);
    }
  }

  return notification;
}

async function createAdminNotification({ title, message, relatedEntity, urgency = 'Normal' }) {
  const notification = await Notification.create({
    recipientType: 'Admin',
    relatedEntity: relatedEntity || null,
    title,
    message,
    type: 'system',
    urgency,
  });

  let io;
  try {
    io = socketHandler.getIO();
  } catch (error) {
    return notification;
  }

  const payload = buildNotificationPayload(notification);

  if (urgency === 'Urgent') {
    io.to('admin').emit('urgent_notification', payload);
  } else {
    io.to('admin').emit('notification', payload);
  }

  return notification;
}

async function createStaffNotification({ title, message, relatedEntity, type = 'system' }) {
  const notification = await Notification.create({
    recipientType: 'Staff',
    relatedEntity: relatedEntity || null,
    title,
    message,
    type,
    urgency: 'Normal',
  });

  let io;
  try {
    io = socketHandler.getIO();
  } catch (error) {
    return notification;
  }

  const payload = buildNotificationPayload(notification);
  io.to('staff').emit('notification', payload);

  return notification;
}

/**
 * Targeted per-staff notification for new orders.
 * order must have: { _id, tokenNumber, serviceType, isGuest, userRole, userId }
 * Resolves which staff members should be notified based on their queueAssignment,
 * creates an individual Notification record per recipient, and emits to user:{staffId}.
 * Falls back to all active Staff if no specific-assignment staff exists.
 */
async function createTargetedStaffNotification({ order, title, message }) {
  const User = require('../models/User');

  // Determine what "type" this order is
  let orderType;
  if (order.isGuest) {
    orderType = 'Guest';
  } else {
    orderType = order.userRole || 'Student'; // userRole is 'Student' or 'Faculty'
  }

  // Find all active staff
  const allActiveStaff = await User.find({ role: 'Staff', isActive: true }).select('_id queueAssignment');

  // Staff with 'All' always get notified
  const allAssignedStaff = allActiveStaff.filter((s) => s.queueAssignment === 'All' || !s.queueAssignment);

  // Staff with the specific matching assignment
  const specificAssignedStaff = allActiveStaff.filter((s) => s.queueAssignment === orderType);

  // Merge unique recipients
  const targetIds = new Set([
    ...allAssignedStaff.map((s) => s._id.toString()),
    ...specificAssignedStaff.map((s) => s._id.toString()),
  ]);

  // Fallback: if no one is targeted yet (no specific + no All), notify everyone
  if (targetIds.size === 0) {
    allActiveStaff.forEach((s) => targetIds.add(s._id.toString()));
  }

  if (targetIds.size === 0) {
    return [];
  }

  let io;
  try {
    io = socketHandler.getIO();
  } catch (_) {
    io = null;
  }

  // Create a Notification record for each targeted staff member and emit
  const notifications = await Promise.all(
    [...targetIds].map(async (staffId) => {
      const notification = await Notification.create({
        recipientId: staffId,
        recipientType: 'Staff',
        relatedEntity: order.tokenNumber || null,
        title,
        message,
        type: 'order_update',
        urgency: 'Normal',
      });

      if (io) {
        const payload = buildNotificationPayload(notification);
        io.to(`user:${staffId}`).emit('notification', payload);
      }

      return notification;
    })
  );

  return notifications;
}

module.exports = {
  createNotification,
  createAdminNotification,
  createStaffNotification,
  createTargetedStaffNotification,
};

