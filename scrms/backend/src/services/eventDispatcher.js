// Phase 1 Events:
// PAYMENT_VERIFIED  — fired after online/wallet payment confirmed
// CASH_CONFIRMED    — fired after staff confirms cash collected
// PRINT_JOB_CREATED — fired after AutomationService creates a PrintJob
// ORDER_CANCELLED   — fired after user or admin cancels an In_Queue order

const EventEmitter = require('events');
const emitter = new EventEmitter();
emitter.setMaxListeners(20);

const emit = (eventName, payload) => {
  try {
    emitter.emit(eventName, payload);
  } catch (err) {
    console.error('[EventDispatcher] Error emitting event:', eventName, err.message);
  }
};

const on = (eventName, handler) => {
  emitter.on(eventName, handler);
};

const off = (eventName, handler) => {
  emitter.off(eventName, handler);
};

const getRegisteredEvents = () => {
  return emitter.eventNames();
};

module.exports = {
  emit,
  on,
  off,
  getRegisteredEvents,
};
