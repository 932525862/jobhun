const { Scenes, Markup } = require('telegraf');
const { getDb } = require('../../database/db');
const { hrMainKb } = require('../../keyboards/hr_kb');
const { checkSceneCommand, escapeMarkdown } = require('../../utils/helpers');

const hrRegisterScene = new Scenes.WizardScene(
  'hr_register',

  // Step 1: Kompaniya nomini so'rash
  async (ctx) => {
    await ctx.reply(
      '🏢 *Kompaniyangiz nomini kiriting:*',
      { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
    );
    return ctx.wizard.next();
  },

  // Step 2: Telefon raqamini so'rash
  async (ctx) => {
    if (await checkSceneCommand(ctx)) return;
    const companyName = ctx.message?.text?.trim();
    if (!companyName) {
      return ctx.reply('❌ Kompaniya nomini matn ko\'rinishida kiriting:');
    }
    ctx.wizard.state.companyName = companyName;

    await ctx.reply(
      '📞 *Telefon raqamingizni yuboring:*',
      {
        parse_mode: 'Markdown',
        ...Markup.keyboard([
          [Markup.button.contactRequest('📲 Raqamni Ulashish')]
        ]).resize()
      }
    );
    return ctx.wizard.next();
  },

  // Step 3: Saqlash
  async (ctx) => {
    if (await checkSceneCommand(ctx)) return;
    let phone = null;

    if (ctx.message?.contact) {
      phone = ctx.message.contact.phone_number;
    } else if (ctx.message?.text) {
      phone = ctx.message.text.trim();
    }

    if (!phone) {
      return ctx.reply('❌ Telefon raqamingizni yuboring yoki kiriting:');
    }

    const db = getDb();
    db.prepare(`
      INSERT OR IGNORE INTO hr_companies (user_id, company_name, phone)
      VALUES (?, ?, ?)
    `).run(ctx.from.id, ctx.wizard.state.companyName, phone);

    await ctx.reply(
      `✅ *Ro'yxatdan o'tdingiz!*\n\n🏢 Kompaniya: *${escapeMarkdown(ctx.wizard.state.companyName)}*\n📞 Telefon: *${escapeMarkdown(phone)}*`,
      { parse_mode: 'Markdown', ...hrMainKb() }
    );

    return ctx.scene.leave();
  }
);

module.exports = { hrRegisterScene };
