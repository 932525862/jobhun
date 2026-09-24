const { Scenes, Composer, Markup } = require('telegraf');
const { getDb, getSetting } = require('../../database/db');
const { candidateApplyConfirmKb } = require('../../keyboards/candidate_kb');
const { adminPaymentKb } = require('../../keyboards/admin_kb');
const { buildResumeText, FIELD_LABELS, FIELD_TYPES } = require('../../utils/helpers');
const { ADMIN_IDS } = require('../../config');

// ─── Scene ID helper ──────────────────────────────────────────────────────────
function inApplyScene(ctx) {
  return ctx.scene?.current?.id === 'candidate_apply';
}

// ─── Step 0: Vakansiyani yuklash va birinchi maydonni so'rash ───────────────────
const step0 = async (ctx) => {
  const vacancyId = ctx.session.pendingVacancyId;
  if (!vacancyId) {
    await ctx.reply('❌ Xato: vakansiya tanlanmagan. Kanaldan e\'lonni qayta tanlang.');
    return ctx.scene.leave();
  }

  const db = getDb();
  const vacancy = db.prepare(`
    SELECT * FROM vacancies WHERE id = ? AND status = 'active'
  `).get(vacancyId);

  if (!vacancy) {
    await ctx.reply('❌ Bu vakansiya topilmadi yoki muddati tugagan.');
    return ctx.scene.leave();
  }

  const extraFields = JSON.parse(vacancy.extra_fields || '[]');

  if (extraFields.length === 0) {
    ctx.wizard.state.vacancy = vacancy;
    ctx.wizard.state.extraFields = [];
    ctx.wizard.state.data = {};
    ctx.wizard.state.currentField = 0;
    await showApplyPreview(ctx);
    ctx.wizard.cursor = 2;
    return;
  }

  ctx.wizard.state.vacancy = vacancy;
  ctx.wizard.state.extraFields = extraFields;
  ctx.wizard.state.currentField = 0;
  ctx.wizard.state.data = {};

  await ctx.reply(
    `📝 *${vacancy.title}* uchun ariza to'ldirish boshlanadi.\n\n` +
    `Jami ${extraFields.length} ta savol bor. Boshlaylik!`,
    { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
  );

  await askNextField(ctx);
  return ctx.wizard.next();
};

const { checkSceneCommand } = require('../../utils/helpers');

// ─── Step 1: Maydonlarni ketma-ket yig'ish ──────────────────────────────────
const step1 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  const fields = ctx.wizard.state.extraFields;
  const idx = ctx.wizard.state.currentField;
  const field = fields[idx];

  if (!field) {
    await showApplyPreview(ctx);
    return ctx.wizard.next();
  }

  if (FIELD_TYPES[field] === 'photo') {
    if (!ctx.message?.photo) {
      return ctx.reply('❌ Iltimos, rasm yuboring (foto sifatida):');
    }
    ctx.wizard.state.data[field] = ctx.message.photo[ctx.message.photo.length - 1].file_id;
  } else {
    if (!ctx.message?.text) {
      return ctx.reply('❌ Matn kiriting:');
    }
    ctx.wizard.state.data[field] = ctx.message.text.trim();
  }

  ctx.wizard.state.currentField++;

  if (ctx.wizard.state.currentField < fields.length) {
    await askNextField(ctx);
  } else {
    await showApplyPreview(ctx);
    return ctx.wizard.next();
  }
};

// ─── Step 2: Tasdiqlash (Composer) ───────────────────────────────────────────
const step2 = new Composer();

step2.action('apply_confirm_yes', async (ctx) => {
  await ctx.answerCbQuery();
  await saveApplication(ctx);
});

step2.action('apply_confirm_no', async (ctx) => {
  await ctx.answerCbQuery();

  ctx.wizard.state.currentField = 0;
  ctx.wizard.state.data = {};

  try {
    await ctx.editMessageText('✏️ Qaytadan to\'ldiramiz...');
  } catch (_) {}

  if (ctx.wizard.state.extraFields.length > 0) {
    await askNextField(ctx);
    ctx.wizard.cursor = 1;
  } else {
    await showApplyPreview(ctx);
  }
});

step2.action('cand_check_sent', async (ctx) => {
  await ctx.answerCbQuery();
  ctx.session.waitingCandCheck = true;
  await ctx.reply(
    '📎 *To\'lov chekini (screenshot yoki rasm) yuboring:*',
    { parse_mode: 'Markdown' }
  );
});

step2.use(async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (ctx.message?.photo || ctx.message?.document) {
    await handleCandidatePaymentCheck(ctx);
    return;
  }
  if (ctx.message?.text) {
    return ctx.reply('⬆️ Yuqoridagi tugmalardan birini tanlang.');
  }
});

const candidateApplyScene = new Scenes.WizardScene(
  'candidate_apply',
  step0, step1, step2
);

// ─── Keyingi maydonni so'rash ────────────────────────────────────────────────
async function askNextField(ctx) {
  const fields = ctx.wizard.state.extraFields;
  const idx = ctx.wizard.state.currentField;
  const field = fields[idx];
  const label = FIELD_LABELS[field] || field;
  const total = fields.length;
  const progress = `_(${idx + 1}/${total})_`;

  if (FIELD_TYPES[field] === 'photo') {
    await ctx.reply(`🖼 *Rasmingizni yuboring:* ${progress}`, {
      parse_mode: 'Markdown',
      reply_markup: { remove_keyboard: true },
    });
  } else {
    let hint = '';
    if (field === 'birth_date') hint = '\n_(Misol: 15.05.2000)_';
    if (field === 'languages') hint = '\n_(Misol: O\'zbek — ona tili, Ingliz — B2, Rus — B1)_';
    if (field === 'expected_salary') hint = '\n_(Misol: 5 000 000 so\'m)_';

    await ctx.reply(`✏️ *${label}:* ${progress}${hint}`, {
      parse_mode: 'Markdown',
      reply_markup: { remove_keyboard: true },
    });
  }
}

// ─── Ariza previewni ko'rsatish ──────────────────────────────────────────────
async function showApplyPreview(ctx) {
  const { extraFields, data, vacancy } = ctx.wizard.state;

  const resumeText =
    `📋 *Sizning Arizangiz:*\n\n` +
    `💼 E\'lon: *${vacancy.title}*\n` +
    `🏢 Kompaniya: ${vacancy.company_name}\n\n` +
    buildResumeText(data, extraFields) +
    '\n─────────────────────\n✅ *Ma\'lumotlar to\'g\'rimi?*';

  await ctx.reply(resumeText, {
    parse_mode: 'Markdown',
    ...candidateApplyConfirmKb(),
  });
}

// ─── Global Callbacks ────────────────────────────────────────────────────────
function registerApplyCallbacks(bot) {
  bot.action('cand_check_sent', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.waitingCandCheck = true;
    await ctx.reply(
      '📎 *To\'lov chekini (screenshot yoki rasm) yuboring:*',
      { parse_mode: 'Markdown' }
    );
  });
}

// ─── Nomzod chekini qabul qilish ─────────────────────────────────────────────
async function handleCandidatePaymentCheck(ctx) {
  const inScene = inApplyScene(ctx);
  const hasFlag = ctx.session?.waitingCandCheck === true;

  if (!inScene && !hasFlag) return false;

  if (inScene && !ctx.wizard?.state?.waitingPayment) return false;

  const photo = ctx.message?.photo;
  const doc = ctx.message?.document;
  const fileId = photo
    ? photo[photo.length - 1].file_id
    : doc?.mime_type?.startsWith('image') ? doc.file_id : null;

  if (!fileId) {
    if (inScene || hasFlag) await ctx.reply('❌ Iltimos, rasm yoki screenshot yuboring.');
    return (inScene || hasFlag);
  }

  const db = getDb();
  const candidate = db.prepare('SELECT * FROM candidates WHERE user_id = ?').get(ctx.from.id);
  const price = getSetting('candidate_price') || '20000';

  const vacancy = ctx.wizard?.state?.vacancy || null;
  const data = ctx.wizard?.state?.data || {};

  let appId = null;
  if (vacancy && vacancy.id) {
    const appResult = db.prepare(`
      INSERT INTO applications (vacancy_id, candidate_id, data)
      VALUES (?, ?, ?)
    `).run(vacancy.id, ctx.from.id, JSON.stringify(data));
    appId = appResult.lastInsertRowid;
    ctx.session.pendingAppId = appId;
  }

  const payResult = db.prepare(`
    INSERT INTO payments (user_id, user_type, amount, check_file_id, status)
    VALUES (?, 'candidate', ?, ?, 'pending')
  `).run(ctx.from.id, price, fileId);
  const paymentId = payResult.lastInsertRowid;

  const info =
    `👤 *Yangi Nomzod To\'lov!*\n\n` +
    `Ism: ${candidate ? candidate.full_name : 'Noma\'lum'}\n` +
    `Tel: ${candidate ? candidate.phone : 'Noma\'lum'}\n` +
    `🆔 ID: ${ctx.from.id}\n` +
    `💼 E\'lon: ${vacancy ? vacancy.title : 'Token Xarid / Rezyume'}\n` +
    `💰 Summa: ${parseInt(price).toLocaleString('uz-UZ')} so\'m\n` +
    `🔢 To\'lov ID: #${paymentId}` +
    `${appId ? `\n📋 Ariza ID: #${appId}` : ''}`;

  for (const adminId of ADMIN_IDS) {
    try {
      await ctx.telegram.sendPhoto(adminId, fileId, {
        caption: info,
        parse_mode: 'Markdown',
        ...adminPaymentKb(paymentId),
      });
    } catch (e) {
      console.error('[Cand Check] Admin ga xato:', e.message);
    }
  }

  await ctx.reply(
    '✅ *Chekingiz qabul qilindi!*\n\n' +
    'Admin tekshirib tasdiqlaydi. Shundan so\'ng arizangiz HR ga yuboriladi.',
    { parse_mode: 'Markdown' }
  );

  ctx.session.waitingCandCheck = false;

  if (inApplyScene(ctx)) await ctx.scene.leave();
  return true;
}

// ─── Arizani saqlash va HR ga yuborish ───────────────────────────────────────
async function saveApplication(ctx) {
  const db = getDb();
  const { vacancy, data, extraFields } = ctx.wizard.state;

  db.prepare(`
    INSERT INTO applications (vacancy_id, candidate_id, data)
    VALUES (?, ?, ?)
  `).run(vacancy.id, ctx.from.id, JSON.stringify(data));

  const candidate = db.prepare('SELECT * FROM candidates WHERE user_id = ?').get(ctx.from.id);

  let hrText =
    `📨 *Yangi Ariza Keldi!*\n\n` +
    `💼 E\'lon: *${vacancy.title}*\n\n` +
    `👤 Nomzod: ${candidate ? candidate.full_name : 'Noma\'lum'}\n` +
    `📞 Telefon: ${candidate ? candidate.phone : 'Noma\'lum'}\n\n`;

  for (const field of extraFields) {
    if (field === 'photo') continue;
    hrText += `${FIELD_LABELS[field] || field}: ${data[field] || '—'}\n`;
  }

  try {
    await ctx.telegram.sendMessage(vacancy.hr_id, hrText, { parse_mode: 'Markdown' });
    if (extraFields.includes('photo') && data.photo) {
      await ctx.telegram.sendPhoto(vacancy.hr_id, data.photo, {
        caption: `📸 ${candidate ? candidate.full_name : ''}`,
      });
    }
  } catch (e) {
    console.error('[Apply] HR ga xabar xato:', e.message);
  }

  try {
    await ctx.editMessageText(
      `✅ *Arizangiz muvaffaqiyatli yuborildi!*\n\n` +
      `HR siz bilan tez orada bog\'lanadi.`,
      { parse_mode: 'Markdown' }
    );
  } catch (_) {
    await ctx.reply(
      `✅ *Arizangiz muvaffaqiyatli yuborildi!*\n\nHR siz bilan tez orada bog\'lanadi.`,
      { parse_mode: 'Markdown' }
    );
  }

  const { candidateMainKb } = require('../../keyboards/candidate_kb');
  await ctx.reply('👇 Quyidagi menyudan foydalanishingiz mumkin:', candidateMainKb());
  return ctx.scene.leave();
}

// ─── To'lov ma'lumotlari ─────────────────────────────────────────────────────
async function sendCandidatePaymentInfo(ctx) {
  const price     = getSetting('candidate_price')  || '20000';
  const tokens    = getSetting('candidate_tokens') || '12';
  const days      = getSetting('candidate_days')   || '14';
  const cardNum   = getSetting('card_number')  || '0000 0000 0000 0000';
  const cardOwner = getSetting('card_owner') || 'Karta egasi';

  await ctx.reply(
    `💳 *To\'lov Ma\'lumotlari*\n\n` +
    `📦 Tarif: ${days} kun, ${tokens} ta ariza tokeni\n` +
    `💰 Narx: *${parseInt(price).toLocaleString('uz-UZ')} so\'m*\n\n` +
    `🏦 Karta: \`${cardNum}\`\n` +
    `👤 Egasi: *${cardOwner}*\n\n` +
    `📌 _To\'lovni amalga oshirib, chekni (screenshot) ushbu yerga yuboring._`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('✅ Chek yubordim', 'cand_check_sent')],
      ]),
    }
  );
}

module.exports = {
  candidateApplyScene,
  registerApplyCallbacks,
  handleCandidatePaymentCheck,
  saveApplication,
};
