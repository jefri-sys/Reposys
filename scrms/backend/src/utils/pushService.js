const webPush = require('web-push');
const User = require('../models/User');

const vapidEmail = process.env.VAPID_EMAIL;
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
let pushConfigured = false;

const resolveVapidSubject = (value) => {
  if (!value) {
    return '';
  }

  if (value.startsWith('mailto:') || value.startsWith('https://') || value.startsWith('http://')) {
    return value;
  }

  return `mailto:${value}`;
};

if (vapidEmail && vapidPublicKey && vapidPrivateKey) {
  try {
    webPush.setVapidDetails(
      resolveVapidSubject(vapidEmail),
      vapidPublicKey,
      vapidPrivateKey
    );
    pushConfigured = true;
  } catch (error) {
    console.warn('[pushService] Invalid VAPID configuration:', error.message);
  }
} else {
  console.warn('[pushService] VAPID environment variables are not fully configured.');
}

async function sendPushToUser(userId, payload) {
  if (!pushConfigured) {
    return;
  }

  try {
    const user = await User.findById(userId).select('pushSubscription').lean();

    if (!user || !user.pushSubscription) {
      return;
    }

    await webPush.sendNotification(
      user.pushSubscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url || payload.data?.url || '/',
        data: {
          url: payload.url || payload.data?.url || '/',
          ...payload.data
        },
        icon: '/icon-192.png',
        badge: '/icon-192.png'
      }),
      {
        urgency: 'high',
        TTL: 86400
      }
    );
  } catch (err) {
    if (err.statusCode === 410) {
      await User.findByIdAndUpdate(userId, { pushSubscription: null });
    }

    console.error('[pushService] Push failed for user', userId, err.message);
  }
}

async function sendPushToRole(role, payload) {
  if (!pushConfigured) {
    return;
  }

  const users = await User.find({
    role,
    pushSubscription: { $ne: null },
    isActive: true
  }).select('pushSubscription').lean();

  const results = await Promise.allSettled(
    users.map((user) =>
      webPush.sendNotification(
        user.pushSubscription,
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          url: payload.url || payload.data?.url || '/',
          data: {
            url: payload.url || payload.data?.url || '/',
            ...payload.data
          },
          icon: '/icon-192.png',
          badge: '/icon-192.png'
        }),
        {
          urgency: 'high',
          TTL: 86400
        }
      ).catch(async (err) => {
        if (err.statusCode === 410) {
          await User.findByIdAndUpdate(user._id, { pushSubscription: null });
        }

        throw err;
      })
    )
  );

  const failed = results.filter((result) => result.status === 'rejected').length;

  if (failed > 0) {
    console.error(`[pushService] ${failed}/${users.length} push(es) failed for role ${role}`);
  }
}

module.exports = {
  sendPushToUser,
  sendPushToRole
};
