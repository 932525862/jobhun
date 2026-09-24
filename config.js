require('dotenv').config();

module.exports = {
  BOT_TOKEN:    process.env.BOT_TOKEN || '',
  ADMIN_IDS:    (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(Boolean),
  CHANNEL_ID:   process.env.CHANNEL_ID || '',
  BOT_USERNAME: process.env.BOT_USERNAME || 'jobhuntbot',
};
