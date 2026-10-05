const mongoose = require('mongoose');

const agentTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  isUsed: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('AgentToken', agentTokenSchema);
