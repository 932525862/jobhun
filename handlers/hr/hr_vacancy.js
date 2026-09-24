const { Scenes, Composer, Markup } = require('telegraf');
const { getDb, getSetting } = require('../../database/db');
const {
  hrMainKb,
  hrCreationTypeKb,
  hrCategoryKb,
  hrVacancyExtraFieldsKb,
  hrConfirmKb,
} = require('../../keyboards/hr_kb');
const { buildVacancyText, checkSceneCommand, cleanAndFixText, getHrCategoryPreset } = require('../../utils/helpers');
const { ADMIN_IDS } = require('../../config');

// ── Step 0: Creation Type selection
const step0 = async (ctx) => {
  ctx.wizard.state.vacancy = { extra_fields: [] };
  await ctx.reply(
    '📝 *E\'lon yaratish usulini tanlang:*',
    { parse_mode: 'Markdown', ...hrCreationTypeKb() }
  );
  return ctx.wizard.next();
};

// ── Step 1: Handle Creation Type choice -> Ask Category FIRST
const step1 = new Composer();
step1.action('create_type_wizard', async (ctx) => {
  await ctx.answerCbQuery();
  ctx.wizard.state.vacancy.creation_type = 'wizard';
  await ctx.reply(
    '📂 *E\'loningiz qaysi soha / yo\'nalishga tegishli?*\n_(Quyidagi yo\'nalishlardan birini tanlang):_',
    { parse_mode: 'Markdown', ...hrCategoryKb() }
  );
  return ctx.wizard.selectStep(2);
});

step1.action('create_type_manual', async (ctx) => {
  await ctx.answerCbQuery();
  ctx.wizard.state.vacancy.creation_type = 'manual';
  await ctx.reply(
    '📂 *E\'loningiz qaysi soha / yo\'nalishga tegishli?*\n_(Quyidagi yo\'nalishlardan birini tanlang):_',
    { parse_mode: 'Markdown', ...hrCategoryKb() }
  );
  return ctx.wizard.selectStep(2);
});

step1.use(async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (ctx.message) {
    return ctx.reply('⬆️ Iltimos, yuqoridagi tugmalardan birini tanlang:', hrCreationTypeKb());
  }
});

// ── Step 2: Category Input -> Ask Title
const step2 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (!ctx.message?.text) return ctx.reply('Iltimos, tugmalardan birini tanlang yoki matn kiriting:');
  ctx.wizard.state.vacancy.category = cleanAndFixText(ctx.message.text);

  await ctx.reply(
    '💼 *Lavozim nomini kiriting:*\n_(Misol: Sotuv menejeri, Call-markaz operatori)_',
    { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
  );
  return ctx.wizard.selectStep(3);
};

// ── Step 3: Title Input -> Ask Raw Text (Manual) OR Company Name (Wizard)
const step3 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (!ctx.message?.text) return ctx.reply('Iltimos, matn kiriting:');
  ctx.wizard.state.vacancy.title = cleanAndFixText(ctx.message.text);

  if (ctx.wizard.state.vacancy.creation_type === 'manual') {
    await ctx.reply(
      '📝 *Tayyor e\'lon matnini yuboring:*\n_(Barcha ma\'lumotlar, vazifalar, talablar va sharoitlar bilan)_',
      { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
    );
    return ctx.wizard.selectStep(4);
  } else {
    const db = getDb();
    const hr = db.prepare('SELECT company_name FROM hr_companies WHERE user_id = ?').get(ctx.from.id);
    await ctx.reply(
      `🏢 *Kompaniya nomini kiriting:*\n_(Avvalgi: ${hr ? hr.company_name : ''})_`,
      { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
    );
    return ctx.wizard.selectStep(4);
  }
};

// ── Step 4: Raw text (Manual) OR Company Name (Wizard)
const step4 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (!ctx.message?.text) return ctx.reply('Iltimos, matn kiriting:');

  if (ctx.wizard.state.vacancy.creation_type === 'manual') {
    ctx.wizard.state.vacancy.raw_text = cleanAndFixText(ctx.message.text);
    ctx.wizard.state.vacancy.extra_fields = [];
    await ctx.reply(
      '📝 *Nomzoddan qanday qo\'shimcha ma\'lumotlar olishni xohlaysiz?*\n_Keraklilarini belgilang, so\'ng "✔️ Tayyor" ni bosing:_',
      { parse_mode: 'Markdown', ...hrVacancyExtraFieldsKb([]) }
    );
    return ctx.wizard.selectStep(11);
  } else {
    ctx.wizard.state.vacancy.company_name = cleanAndFixText(ctx.message.text);
    await ctx.reply('📍 *Ish joyi manzilini kiriting:*\n_(Misol: Toshkent, Chilonzor tumani)_', {
      parse_mode: 'Markdown',
    });
    return ctx.wizard.selectStep(5);
  }
};

// ── Step 5: Location (Wizard)
const step5 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (!ctx.message?.text) return ctx.reply('Iltimos, matn kiriting:');
  ctx.wizard.state.vacancy.location = cleanAndFixText(ctx.message.text);
  await ctx.reply('💵 *Maoshni kiriting:*\n_(Misol: 3 000 000 — 5 000 000 so\'m)_', {
    parse_mode: 'Markdown',
  });
  return ctx.wizard.selectStep(6);
};

// ── Step 6: Salary (Wizard)
const step6 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (!ctx.message?.text) return ctx.reply('Iltimos, matn kiriting:');
  ctx.wizard.state.vacancy.salary = cleanAndFixText(ctx.message.text);
  await ctx.reply('🕐 *Ish vaqtini kiriting:*\n_(Misol: 9:00–18:00, Dushanba–Juma)_', {
    parse_mode: 'Markdown',
  });
  return ctx.wizard.selectStep(7);
};

// ── Step 7: Work time -> Ask Tasks with Category Hint
const step7 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (!ctx.message?.text) return ctx.reply('Iltimos, matn kiriting:');
  ctx.wizard.state.vacancy.work_time = cleanAndFixText(ctx.message.text);

  const preset = getHrCategoryPreset(ctx.wizard.state.vacancy.category);

  await ctx.reply(
    `🎯 *Asosiy vazifalarni kiriting:*\n${preset.tasksHint}`,
    { parse_mode: 'Markdown' }
  );
  return ctx.wizard.selectStep(8);
};

// ── Step 8: Tasks -> Ask Requirements with Category Hint
const step8 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (!ctx.message?.text) return ctx.reply('Iltimos, matn kiriting:');
  ctx.wizard.state.vacancy.tasks = cleanAndFixText(ctx.message.text);

  const preset = getHrCategoryPreset(ctx.wizard.state.vacancy.category);

  await ctx.reply(
    `✍️ *Talablarni kiriting:*\n${preset.reqHint}`,
    { parse_mode: 'Markdown' }
  );
  return ctx.wizard.selectStep(9);
};

// ── Step 9: Requirements -> Ask Conditions with Category Hint
const step9 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (!ctx.message?.text) return ctx.reply('Iltimos, matn kiriting:');
  ctx.wizard.state.vacancy.requirements = cleanAndFixText(ctx.message.text);

  const preset = getHrCategoryPreset(ctx.wizard.state.vacancy.category);

  await ctx.reply(
    `✅ *Ish sharoitlarini kiriting:*\n${preset.condHint}`,
    { parse_mode: 'Markdown' }
  );
  return ctx.wizard.selectStep(10);
};

// ── Step 10: Conditions -> Ask Extra Fields
const step10 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (!ctx.message?.text) return ctx.reply('Iltimos, matn kiriting:');
  ctx.wizard.state.vacancy.conditions = cleanAndFixText(ctx.message.text);

  await ctx.reply(
    '📝 *Nomzoddan qanday qo\'shimcha ma\'lumotlar olishni xohlaysiz?*\n_Keraklilarini belgilang, so\'ng "✔️ Tayyor" ni bosing:_',
    { parse_mode: 'Markdown', ...hrVacancyExtraFieldsKb([]) }
  );
  return ctx.wizard.selectStep(11);
};

// ── Step 11: Extra Fields Selection (Composer)
const step11 = new Composer();

step11.action(/^extra_toggle_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const field = ctx.match[1];
  if (!ctx.wizard.state.vacancy) ctx.wizard.state.vacancy = { extra_fields: [] };
  const selected = ctx.wizard.state.vacancy.extra_fields || [];
  const idx = selected.indexOf(field);
  if (idx === -1) selected.push(field);
  else selected.splice(idx, 1);
  ctx.wizard.state.vacancy.extra_fields = selected;

  try {
    await ctx.editMessageReplyMarkup(hrVacancyExtraFieldsKb(selected).reply_markup);
  } catch (_) {}
});

step11.action('extra_done', async (ctx) => {
  await ctx.answerCbQuery();
  const vacancy = ctx.wizard.state.vacancy;
  const previewText =
    buildVacancyText(vacancy, false) +
    '\n\n─────────────────────\n✅ *Ma\'lumotlar to\'g\'rimi?*';

  try {
    await ctx.editMessageText(previewText, {
      parse_mode: 'Markdown',
      ...hrConfirmKb(),
    });
  } catch (_) {
    await ctx.reply(previewText, {
      parse_mode: 'Markdown',
      ...hrConfirmKb(),
    });
  }
  return ctx.wizard.selectStep(12);
});

step11.use(async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (ctx.message) {
    return ctx.reply('⬆️ Yuqoridagi tugmalardan belgilang va *"✔️ Tayyor"* tugmasini bosing.');
  }
});

// ── Step 12: Confirmation Ha/Yo'q (Composer)
const step12 = new Composer();

step12.action('vac_confirm_yes', async (ctx) => {
  await ctx.answerCbQuery();

  const db = getDb();
  const hr = db.prepare('SELECT * FROM hr_companies WHERE user_id = ?').get(ctx.from.id);
  const vacancy = ctx.wizard.state.vacancy || {};

  const normNewTitle = (vacancy.title || '').trim().toLowerCase();
  const normNewCategory = (vacancy.category || 'Boshqa soha').trim().toLowerCase();

  const recentVacancies = db.prepare(`
    SELECT id, title, category, COALESCE(published_at, created_at, datetime('now')) as post_date
    FROM vacancies
    WHERE hr_id = ? AND status != 'deleted'
      AND datetime(COALESCE(published_at, created_at, datetime('now'))) >= datetime('now', '-3 days')
  `).all(ctx.from.id);

  const isDuplicate = recentVacancies.some(v => {
    const existingTitle = (v.title || '').trim().toLowerCase();
    const existingCat = (v.category || '').trim().toLowerCase();
    return existingTitle === normNewTitle && existingCat === normNewCategory;
  });

  if (isDuplicate) {
    await ctx.reply(
      `⚠️ *"${vacancy.title}" e'loni oxirgi 3 kun ichida allaqachon yaratilgan!*\n\nAynan bir xil e'lonni qayta chiqarish uchun 3 kun kutiladi. Siz boshqa soha yoki boshqa lavozim bo'yicha e'lon yaratishingiz mumkin.`,
      { parse_mode: 'Markdown', ...hrMainKb() }
    );
    return ctx.scene.leave();
  }

  const vacResult = db.prepare(`
    INSERT INTO vacancies
      (hr_id, title, category, company_name, location, salary, work_time, tasks, requirements, conditions, raw_text, creation_type, extra_fields, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `).run(
    ctx.from.id,
    vacancy.title,
    vacancy.category || 'Boshqa soha',
    vacancy.company_name || (hr ? hr.company_name : vacancy.title),
    vacancy.location || 'Toshkent shahri',
    vacancy.salary || 'Ko\'rsatilgan',
    vacancy.work_time || 'Ko\'rsatilgan',
    vacancy.tasks || '',
    vacancy.requirements || '',
    vacancy.conditions || '',
    vacancy.raw_text || '',
    vacancy.creation_type || 'wizard',
    JSON.stringify(vacancy.extra_fields || [])
  );
  const vacancyId = vacResult.lastInsertRowid;

  // Active subscription & tokens > 0
  if (hr && hr.is_active && hr.tokens > 0) {
    db.prepare('UPDATE hr_companies SET tokens = tokens - 1 WHERE user_id = ?').run(ctx.from.id);
    const remaining = db.prepare('SELECT tokens FROM hr_companies WHERE user_id = ?').get(ctx.from.id);

    try {
      await ctx.editMessageText(
        `✅ *E\'loningiz qabul qilindi!*\n\n` +
        `📌 *${vacancy.title}*\n` +
        `📂 Soha: *${vacancy.category || '—'}*\n\n` +
        `⏳ E\'loningiz admin tasdiqlaganidan so'ng kanalga joylashtiriladi.\n` +
        `🎫 Qolgan tokenlar: *${remaining.tokens}* ta`,
        { parse_mode: 'Markdown' }
      );
    } catch (_) {}

    await ctx.reply('👇 Quyidagi menyudan foydalanishingiz mumkin:', hrMainKb());

    // Admin ga bildirishnoma
    for (const adminId of ADMIN_IDS) {
      try {
        await ctx.telegram.sendMessage(
          adminId,
          `📌 *Yangi HR Vakansiyasi (Token orqali)*\n\n` +
          `🏢 Kompaniya: ${hr.company_name} (${hr.phone})\n` +
          `💼 Lavozim: *${vacancy.title}*\n` +
          `📂 Soha: *${vacancy.category || '—'}*\n` +
          `🔢 E\'lon ID: #${vacancyId}`,
          { parse_mode: 'Markdown' }
        );
      } catch (e) {
        console.error('[Notify Admin Vacancy] Xato:', e.message);
      }
    }

    return ctx.scene.leave();
  }

  // Token yo'q → to'lov so'rash
  ctx.session.pendingVacancyId = vacancyId;
  ctx.session.waitingHrCheck = true;

  try {
    await ctx.editMessageText('✅ *E\'lon ma\'lumotlari saqlandi!*\n\nEndi to\'lov amalga oshirilsin:', {
      parse_mode: 'Markdown',
    });
  } catch (_) {}

  await sendPaymentInfo(ctx, 'hr');
  await ctx.reply('👇 Quyidagi menyudan foydalanishingiz mumkin:', hrMainKb());
  return ctx.scene.leave();
});

step12.action('vac_confirm_no', async (ctx) => {
  await ctx.answerCbQuery();

  try {
    await ctx.editMessageText('✏️ Qaytadan boshlaylik.', {
      parse_mode: 'Markdown',
    });
  } catch (_) {}
  await ctx.reply('*"➕ Yangi E\'lon"* tugmasini bosing.', hrMainKb());
  return ctx.scene.leave();
});

step12.use(async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (ctx.message) {
    return ctx.reply('⬆️ Yuqoridagi *"✅ Ha, to\'g\'ri"* yoki *"✏️ Yo\'q, o\'zgartirish"* tugmalaridan birini tanlang.');
  }
});

const hrVacancyScene = new Scenes.WizardScene(
  'hr_vacancy',
  step0, step1, step2, step3, step4, step5, step6, step7, step8, step9, step10, step11, step12
);

// ── Global callbacks (scene tashqarisida) ────────────────────────────────────
function registerVacancyCallbacks(bot) {
  bot.action('check_sent', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.waitingHrCheck = true;
    await ctx.reply('📎 *To\'lov chekini (screenshot yoki rasm) yuboring:*', {
      parse_mode: 'Markdown',
    });
  });
}

// ── Chek qabul qilish (session asosida) ──────────────────────────────────────
async function handleHrPaymentCheck(ctx) {
  const hasFlag = ctx.session?.waitingHrCheck === true;
  if (!hasFlag) return false;

  const photo = ctx.message?.photo;
  const doc   = ctx.message?.document;
  const fileId = photo
    ? photo[photo.length - 1].file_id
    : doc?.mime_type?.startsWith('image') ? doc.file_id : null;

  if (!fileId) {
    await ctx.reply('❌ Iltimos, rasm yoki screenshot yuboring.');
    return true;
  }

  const db  = getDb();
  const hr  = db.prepare('SELECT * FROM hr_companies WHERE user_id = ?').get(ctx.from.id);
  const price = getSetting('hr_price') || '50000';

  const pendingVac = db.prepare(`
    SELECT id, title FROM vacancies
    WHERE hr_id = ? AND status = 'pending'
    ORDER BY id DESC LIMIT 1
  `).get(ctx.from.id);

  const payResult = db.prepare(`
    INSERT INTO payments (user_id, user_type, amount, check_file_id, status)
    VALUES (?, 'hr', ?, ?, 'pending')
  `).run(ctx.from.id, price, fileId);
  const paymentId = payResult.lastInsertRowid;

  const { adminPaymentKb } = require('../../keyboards/admin_kb');

  const info =
    `💳 *Yangi HR To\'lov!*\n\n` +
    `🏢 Kompaniya: ${hr ? hr.company_name : 'Noma\'lum'}\n` +
    `📞 Telefon: ${hr ? hr.phone : 'Noma\'lum'}\n` +
    `🆔 ID: ${ctx.from.id}\n` +
    `📌 E\'lon: ${pendingVac ? `#${pendingVac.id} — ${pendingVac.title}` : 'Yangi'}\n` +
    `💰 Summa: ${parseInt(price).toLocaleString('uz-UZ')} so\'m\n` +
    `🔢 To\'lov ID: #${paymentId}`;

  for (const adminId of ADMIN_IDS) {
    try {
      await ctx.telegram.sendPhoto(adminId, fileId, {
        caption: info,
        parse_mode: 'Markdown',
        ...adminPaymentKb(paymentId),
      });
    } catch (e) {
      console.error('[HR Check] Admin ga xato:', e.message);
    }
  }

  ctx.session.waitingHrCheck = false;

  await ctx.reply(
    '✅ *Chekingiz qabul qilindi!*\n\n' +
    '⏳ Admin tekshirib tasdiqlaydi.\n' +
    'Shundan so\'ng e\'loningiz *10–20 daqiqa* ichida kanalga joylashtiriladi.',
    { parse_mode: 'Markdown' }
  );

  return true;
}

// ── To'lov ma'lumotlarini yuborish ───────────────────────────────────────────
async function sendPaymentInfo(ctx, type = 'hr') {
  const isHr = type === 'hr';
  const price     = getSetting(isHr ? 'hr_price' : 'candidate_price') || (isHr ? '50000' : '20000');
  const tokens    = getSetting(isHr ? 'hr_tokens' : 'candidate_tokens') || (isHr ? '1' : '12');
  const days      = getSetting(isHr ? 'hr_days' : 'candidate_days') || (isHr ? '30' : '14');
  const cardNum   = getSetting('card_number') || '0000 0000 0000 0000';
  const cardOwner = getSetting('card_owner') || 'Karta egasi';

  const checkCallback = isHr ? 'check_sent' : 'cand_check_sent';

  const text =
    `💳 *To'lov Ma'lumotlari*\n\n` +
    `📦 Tarif: ${days} kun, ${tokens} ta ${isHr ? "e'lon" : "ariza"} tokeni\n` +
    `💰 Narx: *${parseInt(price).toLocaleString('uz-UZ')} so'm*\n\n` +
    `🏦 Karta: \`${cardNum}\`\n` +
    `👤 Egasi: *${cardOwner}*\n\n` +
    `📌 _To'lovni amalga oshirib, chekni (screenshot) ushbu yerga yuboring._`;

  return ctx.reply(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('✅ Chek yubordim', checkCallback)],
    ]),
  });
}

module.exports = {
  hrVacancyScene,
  registerVacancyCallbacks,
  handleHrPaymentCheck,
  sendPaymentInfo,
};

