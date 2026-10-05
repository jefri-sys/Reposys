const ActivityLog = require('../models/ActivityLog');

async function log({ actionType, performedBy, description, affectedRecordId, metadata }) {
  return ActivityLog.create({
    actionType,
    performedBy,
    description,
    affectedRecordId,
    metadata,
  });
}

module.exports = {
  log,
};
