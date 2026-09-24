const { Scenes } = require('telegraf');
const { getDb, getSetting, setSetting } = require('../../database/db');
const { adminSettingsKb } = require('../../keyboards/admin_kb');
const { isAdmin } = require('../../utils/helpers');

// ─── Sozlamalar Scene ─────────────────────────────────────────────────────────
const adminSettingsScene = new Scenes.WizardScene(
  'admin_settings',

  // Step 0: Qaysi sozlamani o'zgartirish
  async (ctx) => {
    await ctx.reply('⚙️ *Sozlamalar*\n\nQaysi parametrni o\'zgartirmoqchisiz?', {
      parse_mode: 'Markdown',
      ...adminSettingsKb()
    });
    return ctx.wizard.next();
  },

  // Step 1: Yangi qiymat
  async (ctx) => {
    if (!ctx.message?.text) return ctx.reply('❌ Qiymatni kiriting:');

    const key = ctx.wizard.state.settingKey;
    if (!key) return ctx.scene.leave();

    setSetting(key, ctx.message.text.trim());

    await ctx.reply(`✅ *${key}* yangilandi: *${ctx.message.text.trim()}*`, {
      parse_mode: 'Markdown'
    });

    return ctx.scene.leave();
  }
);

function registerSettingsHandlers(bot, stage) {
  const checkAdmin = (ctx, next) => {
    if (!isAdmin(ctx.from.id)) return;
    return next();
  };

  // ─── Sozlamalar ───────────────────────────────────────────────────────
  bot.hears('⚙️ Sozlamalar', checkAdmin, async (ctx) => {
    await showSettings(ctx);
  });

  // Inline tugmalar — qaysi key o'zgartirilsin
  const settingKeys = [
    'hr_price', 'hr_tokens', 'hr_days',
    'candidate_price', 'candidate_tokens', 'candidate_days',
    'card_number', 'card_owner'
  ];

  for (const key of settingKeys) {
    bot.action(`set_${key}`, checkAdmin, async (ctx) => {
      await ctx.answerCbQuery();
      ctx.session.editingKey = key;

      const currentVal = getSetting(key) || '—';
      await ctx.reply(
        `✏️ *${key}* ni o'zgartirmoqchisiz\n\nJoriy qiymat: \`${currentVal}\`\n\nYangi qiymatni kiriting:`,
        { parse_mode: 'Markdown' }
      );
    });
  }

  // Matn kelganda — sozlama o'zgartirish
  bot.use(async (ctx, next) => {
    if (!isAdmin(ctx.from.id)) return next();
    if (!ctx.session?.editingKey) return next();
    if (!ctx.message?.text) return next();

    const key = ctx.session.editingKey;
    setSetting(key, ctx.message.text.trim());
    ctx.session.editingKey = null;

    await ctx.reply(
      `✅ *${key}* yangilandi!\n\nYangi qiymat: \`${ctx.message.text.trim()}\``,
      { parse_mode: 'Markdown' }
    );

    await showSettings(ctx);
    return;
  });
}

async function showSettings(ctx) {
  const keys = [
    'hr_price', 'hr_tokens', 'hr_days',
    'candidate_price', 'candidate_tokens', 'candidate_days',
    'card_number', 'card_owner'
  ];

  const labels = {
    hr_price: '💰 HR Narxi (so\'m)',
    hr_tokens: '🎫 HR Tokenlar soni',
    hr_days: '📅 HR Obuna muddati (kun)',
    candidate_price: '💰 Nomzod Narxi (so\'m)',
    candidate_tokens: '🎫 Nomzod Tokenlar soni',
    candidate_days: '📅 Nomzod Obuna muddati (kun)',
    card_number: '💳 Karta Raqami',
    card_owner: '👤 Karta Egasi',
  };

  let text = '⚙️ *Joriy Sozlamalar:*\n\n';
  for (const key of keys) {
    text += `${labels[key]}: \`${getSetting(key) || '—'}\`\n`;
  }
  text += '\n_O\'zgartirish uchun tugmani bosing:_';

  await ctx.reply(text, {
    parse_mode: 'Markdown',
    ...adminSettingsKb()
  });
}

module.exports = { adminSettingsScene, registerSettingsHandlers };
