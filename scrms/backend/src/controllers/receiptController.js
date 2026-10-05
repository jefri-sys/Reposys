const orderController = require('./orderController');

exports.downloadReceipt = (req, res, next) => (
  orderController.downloadReceipt(req, res, next)
);
