const cron = require('node-cron');
const SystemConfig = require('../models/SystemConfig');

const startShopScheduler = (io) => {

  // Runs every minute
  cron.schedule('* * * * *', async () => {
    try {
      // Get current IST time
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istTime = new Date(now.getTime() + istOffset);
      const hours = istTime.getUTCHours();
      const minutes = istTime.getUTCMinutes();
      const day = istTime.getUTCDay();

      const currentMinutes = hours * 60 + minutes;
      const openMinutes = 9 * 60;
      const closeMinutes = 17 * 60;

      const shouldBeOpen = day !== 0 &&
                           currentMinutes >= openMinutes &&
                           currentMinutes < closeMinutes;

      // Read current config
      const config = await SystemConfig.getInstance();

      if (!config) return;

      // Only act if mode is 'schedule'
      // If Force Open or Force Close is active, do nothing
      if (config.shopMode !== 'schedule') return;

      // Only emit if state is actually changing
      // Use the exact same isOpen field name as the controller
      const currentlyOpen = config.isManuallyOpen;
      if (currentlyOpen === shouldBeOpen) return;

      // State is changing — update and emit
      config.isManuallyOpen = shouldBeOpen;
      await config.save();

      // Emit the exact same Socket.io event with the exact same
      // payload structure as Force Open and Force Close emit
      // This ensures the existing banner behaviour works correctly
      const eventName = shouldBeOpen ? 'shop_opened' : 'shop_closed';
      io.emit(eventName, {
        type: eventName,
      });

      console.log(
        `[ShopScheduler] Shop ${shouldBeOpen ? 'opened' : 'closed'} ` +
        `automatically at ${hours}:${String(minutes).padStart(2, '0')} IST`
      );

    } catch (err) {
      console.error('[ShopScheduler] Cron error:', err);
    }
  });

  console.log('[ShopScheduler] Shop schedule cron started');
};

module.exports = { startShopScheduler };
