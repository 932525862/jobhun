

const { Scenes, Markup } = require('telegraf');
const { getDb } = require('../../database/db');
const { candidateMainKb } = require('../../keyboards/candidate_kb');
const { checkSceneCommand, escapeMarkdown } = require('../../utils/helpers');

const candidateRegisterScene = new Scenes.WizardScene(
  'candidate_register',

  // Step 1: Ism familiya
  async (ctx) => {
    await ctx.reply(
      '👤 *Ism va Familiyangizni kiriting:*\n_(Misol: Alijon Valiyev)_',
      { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
    );
    return ctx.wizard.next();
  },

  // Step 2: Telefon raqami
  async (ctx) => {
    if (await checkSceneCommand(ctx)) return;
    if (!ctx.message?.text) {
      return ctx.reply('❌ Ismingizni matn ko\'rinishida kiriting:');
    }
    const name = ctx.message.text.trim();
    if (name.length < 3) {
      return ctx.reply('❌ Iltimos, to\'liq ism familiyangizni kiriting:');
    }
    ctx.wizard.state.fullName = name;

    await ctx.reply(
      '📞 *Telefon raqamingizni yuboring:*',
      {
        parse_mode: 'Markdown',
        ...Markup.keyboard([
          [Markup.button.contactRequest('📲 Raqamni Ulashish')],
        ]).resize(),
      }
    );
    return ctx.wizard.next();
  },

  // Step 3: Saqlash va keyingi oqimga o'tish
  async (ctx) => {
    if (await checkSceneCommand(ctx)) return;
    let phone = null;

    if (ctx.message?.contact) {
      phone = ctx.message.contact.phone_number;
      // Telefon raqami +998 bilan boshlanishini ta'minlash
      if (!phone.startsWith('+')) phone = '+' + phone;
    } else if (ctx.message?.text) {
      phone = ctx.message.text.trim();
    }

    if (!phone) {
      return ctx.reply('❌ Telefon raqamingizni yuboring yoki qo\'lda kiriting:');
    }

    const db = getDb();
    db.prepare(`
      INSERT OR IGNORE INTO candidates (user_id, full_name, phone)
      VALUES (?, ?, ?)
    `).run(ctx.from.id, ctx.wizard.state.fullName, phone);

    await ctx.reply(
      `✅ *Ro\'yxatdan o\'tdingiz!*\n\n` +
      `👤 Ism: *${escapeMarkdown(ctx.wizard.state.fullName)}*\n` +
      `📞 Telefon: *${escapeMarkdown(phone)}*`,
      { parse_mode: 'Markdown', ...candidateMainKb() }
    );

    // Kutilayotgan vakansiya bormi?
    const vacancyId = ctx.session.pendingVacancyId;
    if (vacancyId) {
      await ctx.reply(
        '📝 Ariza to\'ldirishni boshlaymiz...',
        { reply_markup: { remove_keyboard: true } }
      );
      // enter() ichida leave() ham chaqiriladi
      return ctx.scene.enter('candidate_apply');
    }

    await ctx.reply(
      '🔍 Kanaldan o\'zingizga mos e\'lonni toping va "Ariza Qoldirish" tugmasini bosing.',
      { parse_mode: 'Markdown', ...candidateMainKb() }
    );
    return ctx.scene.leave();
  }
);

module.exports = { candidateRegisterScene };
