const { getDb, getSetting } = require('../../database/db');
const { publishVacancyToChannel, publishResumeToChannel } = require('../../utils/channel');
const { addDays, FIELD_LABELS } = require('../../utils/helpers');

function registerPaymentHandlers(bot) {

  // ─── To'lovni tasdiqlash ─────────────────────────────────────────────────
  bot.action(/^pay_approve_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery('✅ Tasdiqlanmoqda...');

    const paymentId = parseInt(ctx.match[1]);
    const db = getDb();
    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);

    if (!payment || payment.status !== 'pending') {
      return editAdminMsg(ctx, '⚠️ Bu to\'lov allaqachon ko\'rib chiqilgan.');
    }

    db.prepare("UPDATE payments SET status = 'approved' WHERE id = ?").run(paymentId);

    if (payment.user_type === 'hr') {
      await approveHrPayment(ctx, bot, payment, db);
    } else {
      await approveCandidatePayment(ctx, bot, payment, db);
    }

    await editAdminMsg(ctx, `✅ TASDIQLANDI — To'lov #${paymentId}`);
  });

  // ─── To'lovni bekor qilish ────────────────────────────────────────────────
  bot.action(/^pay_reject_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery('❌ Bekor qilinmoqda...');

    const paymentId = parseInt(ctx.match[1]);
    const db = getDb();
    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);

    if (!payment || payment.status !== 'pending') {
      return ctx.answerCbQuery('⚠️ Allaqachon ko\'rib chiqilgan');
    }

    db.prepare("UPDATE payments SET status = 'rejected' WHERE id = ?").run(paymentId);

    // HR uchun vakansiyani bekor qilish
    if (payment.user_type === 'hr') {
      const pendingVac = db.prepare(`
        SELECT id FROM vacancies WHERE hr_id = ? AND status = 'pending'
        ORDER BY id DESC LIMIT 1
      `).get(payment.user_id);
      if (pendingVac) {
        db.prepare("DELETE FROM vacancies WHERE id = ?").run(pendingVac.id);
      }
    }

    // Nomzod uchun pending arizani va pending rezyumeni bekor qilish
    if (payment.user_type === 'candidate') {
      const pendingApp = db.prepare(`
        SELECT id FROM applications 
        WHERE candidate_id = ? 
        ORDER BY id DESC LIMIT 1
      `).get(payment.user_id);
      if (pendingApp) {
        db.prepare('DELETE FROM applications WHERE id = ?').run(pendingApp.id);
      }

      const pendingResume = db.prepare(`
        SELECT id FROM candidate_resumes 
        WHERE candidate_id = ? AND status = 'pending'
        ORDER BY id DESC LIMIT 1
      `).get(payment.user_id);
      if (pendingResume) {
        db.prepare("UPDATE candidate_resumes SET status = 'rejected' WHERE id = ?").run(pendingResume.id);
      }
    }

    // Foydalanuvchiga xabar
    try {
      await ctx.telegram.sendMessage(
        payment.user_id,
        '❌ *To\'lovingiz tasdiqlanmadi.*\n\n' +
        'Iltimos, to\'lov chekini tekshirib qayta yuboring.',
        { parse_mode: 'Markdown' }
      );
    } catch (e) {
      console.error('[Reject] Foydalanuvchiga xabar xato:', e.message);
    }

    await editAdminMsg(ctx, `❌ BEKOR QILINDI — To'lov #${paymentId}`);
  });

  // ─── E'lon vaqtini tanlash: Zudlik bilan ────────────────────────────────────
  bot.action(/^pub_now_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery('⚡️ Kanalga joylashtirilmoqda...');
    const vacId = parseInt(ctx.match[1]);
    const db = getDb();
    const vac = db.prepare('SELECT * FROM vacancies WHERE id = ?').get(vacId);

    await publishVacancyToChannel(bot, vacId);

    try {
      await ctx.editMessageText(
        `✅ *E'lon ZUDLIK BILAN kanalga joylashtirildi!*\n\n📌 E'lon: #${vacId} — *${vac ? vac.title : ''}*`,
        { parse_mode: 'Markdown' }
      );
    } catch (_) {}

    if (vac && vac.hr_id) {
      try {
        await ctx.telegram.sendMessage(
          vac.hr_id,
          `✅ *E\'loningiz kanalga joylashtirildi!*`,
          { parse_mode: 'Markdown' }
        );
      } catch (_) {}
    }
  });

  // ─── E'lon vaqtini tanlash: Kechiktirib (X daqiqa) ─────────────────────────
  bot.action(/^pub_delay_(\d+)_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery('⏱ Rejalashtirildi...');
    const vacId = parseInt(ctx.match[1]);
    const minutes = parseInt(ctx.match[2]);
    const db = getDb();
    const vac = db.prepare('SELECT * FROM vacancies WHERE id = ?').get(vacId);

    setTimeout(async () => {
      try {
        await publishVacancyToChannel(bot, vacId);
        if (vac && vac.hr_id) {
          await bot.telegram.sendMessage(
            vac.hr_id,
            '✅ *E\'loningiz kanalga joylashtirildi!*',
            { parse_mode: 'Markdown' }
          );
        }
      } catch (e) {
        console.error('[Scheduled Publish Error]:', e.message);
      }
    }, minutes * 60 * 1000);

    try {
      await ctx.editMessageText(
        `⏱ *E'lon ${minutes} daqiqadan so'ng kanalga joylashtiriladi.*\n\n📌 E'lon: #${vacId} — *${vac ? vac.title : ''}*`,
        { parse_mode: 'Markdown' }
      );
    } catch (_) {}

    if (vac && vac.hr_id) {
      try {
        await ctx.telegram.sendMessage(
          vac.hr_id,
          `⏳ *E\'loningiz *${minutes} daqiqa* ichida kanalga joylashtiriladi.*`,
          { parse_mode: 'Markdown' }
        );
      } catch (_) {}
    }
  });

  // ─── E'lon vaqtini tanlash: Boshqa vaqt (Daqiqa yozish) ──────────────────────
  bot.action(/^pub_custom_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const vacId = parseInt(ctx.match[1]);
    ctx.session.waitingPubDelayVacId = vacId;

    await ctx.reply(
      `✏️ *E'lon (#${vacId}) necha daqiqadan so'ng kanalga joylashtirilsin?*\n\n` +
      `_Iltimos, faqat daqiqa sonini kiriting (masalan: 45, 90 yoki 180):_`,
      { parse_mode: 'Markdown' }
    );
  });

  // ─── Rezyume vaqtini tanlash: Zudlik bilan ──────────────────────────────────
  bot.action(/^pub_res_now_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery('⚡️ Kanalga joylashtirilmoqda...');
    const resumeId = parseInt(ctx.match[1]);
    await publishResumeToChannel(bot, resumeId);

    try {
      await ctx.editMessageText(
        `✅ *Rezyume (#${resumeId}) ZUDLIK BILAN kanalga joylashtirildi!*`,
        { parse_mode: 'Markdown' }
      );
    } catch (_) {}
  });

  // ─── Rezyume vaqtini tanlash: Kechiktirib (X daqiqa) ───────────────────────
  bot.action(/^pub_res_delay_(\d+)_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery('⏱ Rejalashtirildi...');
    const resumeId = parseInt(ctx.match[1]);
    const minutes = parseInt(ctx.match[2]);

    setTimeout(async () => {
      try {
        await publishResumeToChannel(bot, resumeId);
      } catch (e) {
        console.error('[Scheduled Resume Publish Error]:', e.message);
      }
    }, minutes * 60 * 1000);

    try {
      await ctx.editMessageText(
        `⏱ *Rezyume (#${resumeId}) ${minutes} daqiqadan so'ng kanalga joylashtiriladi.*`,
        { parse_mode: 'Markdown' }
      );
    } catch (_) {}
  });

  // ─── Rezyume vaqtini tanlash: Boshqa vaqt (Daqiqa yozish) ────────────────────
  bot.action(/^pub_res_custom_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const resumeId = parseInt(ctx.match[1]);
    ctx.session.waitingPubDelayResumeId = resumeId;

    await ctx.reply(
      `✏️ *Rezyume (#${resumeId}) necha daqiqadan so'ng kanalga joylashtirilsin?*\n\n` +
      `_Iltimos, faqat daqiqa sonini kiriting (masalan: 20, 45 yoki 90):_`,
      { parse_mode: 'Markdown' }
    );
  });
}

// ─── Admin xabarini yangilash ─────────────────────────────────────────────────
async function editAdminMsg(ctx, prefix) {
  try {
    const msg = ctx.callbackQuery.message;
    const oldText = msg?.caption || msg?.text || '';
    const newText = `${prefix}\n\n${oldText}`.slice(0, 1024);

    if (msg?.photo) {
      await ctx.editMessageCaption(newText, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [] },
      });
    } else {
      await ctx.editMessageText(newText, {
        reply_markup: { inline_keyboard: [] },
      });
    }
  } catch (_) {}
}

// ─── HR to'lovini tasdiqlash ──────────────────────────────────────────────────
async function approveHrPayment(ctx, bot, payment, db) {
  const tokens = parseInt(getSetting('hr_tokens') || '8');
  const days   = parseInt(getSetting('hr_days')   || '14');
  const subEnd = addDays(days);

  db.prepare(`
    UPDATE hr_companies 
    SET tokens = ?, is_active = 1, subscription_end = ?
    WHERE user_id = ?
  `).run(tokens, subEnd, payment.user_id);

  const pendingVac = db.prepare(`
    SELECT id, title FROM vacancies WHERE hr_id = ? AND status = 'pending'
    ORDER BY id DESC LIMIT 1
  `).get(payment.user_id);

  if (pendingVac) {
    db.prepare('UPDATE hr_companies SET tokens = tokens - 1 WHERE user_id = ?').run(payment.user_id);

    await ctx.telegram.sendMessage(
      payment.user_id,
      `✅ *To\'lovingiz tasdiqlandi!*\n\n` +
      `🎫 Tokenlar: *${tokens}* ta (1 ta e'lon uchun ishlatildi)\n` +
      `📅 Obuna: *${days}* kun\n\n` +
      `⏳ E\'loningiz admin tomonidan belgilangan vaqtda kanalga joylashtiriladi.`,
      { parse_mode: 'Markdown' }
    );

    const { adminPublishTimeKb } = require('../../keyboards/admin_kb');
    try {
      await ctx.reply(
        `✅ *HR To'lovi Tasdiqlandi!*\n\n` +
        `📌 E'lon: #${pendingVac.id} — *${pendingVac.title}*\n\n` +
        `🕒 *E'lon kanalga qachon joylashtirilsin?*`,
        {
          parse_mode: 'Markdown',
          ...adminPublishTimeKb(pendingVac.id),
        }
      );
    } catch (_) {}
  } else {
    await ctx.telegram.sendMessage(
      payment.user_id,
      `✅ *To\'lovingiz tasdiqlandi!*\n\n` +
      `🎫 Tokenlar: *${tokens}* ta\n` +
      `📅 Obuna: *${days}* kun`,
      { parse_mode: 'Markdown' }
    );
  }
}

// ─── Nomzod to'lovini tasdiqlash ─────────────────────────────────────────────
async function approveCandidatePayment(ctx, bot, payment, db) {
  const tokens = parseInt(getSetting('candidate_tokens') || '12');
  const days   = parseInt(getSetting('candidate_days')   || '14');
  const subEnd = addDays(days);

  db.prepare(`
    UPDATE candidates 
    SET tokens = ?, is_active = 1, subscription_end = ?
    WHERE user_id = ?
  `).run(tokens, subEnd, payment.user_id);

  const candidate = db.prepare('SELECT * FROM candidates WHERE user_id = ?').get(payment.user_id);

  const pendingResume = db.prepare(`
    SELECT * FROM candidate_resumes 
    WHERE candidate_id = ? AND status = 'pending'
    ORDER BY id DESC LIMIT 1
  `).get(payment.user_id);

  if (pendingResume) {
    db.prepare('UPDATE candidates SET tokens = tokens - 1 WHERE user_id = ?').run(payment.user_id);

    // Default 20 minutda kanalga chiqarish
    setTimeout(async () => {
      try {
        await publishResumeToChannel(bot, pendingResume.id);
      } catch (e) {
        console.error('[Approved Resume Schedule Error]:', e.message);
      }
    }, 20 * 60 * 1000);

    await ctx.telegram.sendMessage(
      payment.user_id,
      `✅ *To\'lovingiz tasdiqlandi!*\n\n` +
      `🎫 Tokenlar: *${tokens}* ta\n` +
      `📅 Obuna: *${days}* kun\n\n` +
      `⏳ Rezyumeingiz *20 daqiqa* ichida kanalga joylashtiriladi.`,
      { parse_mode: 'Markdown' }
    );

    const { adminPublishResumeTimeKb } = require('../../keyboards/admin_kb');
    const { escapeMarkdown } = require('../../utils/helpers');
    try {
      await ctx.reply(
        `✅ *Nomzod To'lovi Tasdiqlandi!*\n\n` +
        `👤 Nomzod: *${escapeMarkdown(candidate ? candidate.full_name : '')}*\n` +
        `🎯 Lavozim: *${escapeMarkdown(pendingResume.position || '')}*\n` +
        `🔢 Rezyume ID: #${pendingResume.id}\n\n` +
        `🕒 *Rezyume kanalga qachon joylashtirilsin? (Standart: 20 minutda)*`,
        {
          parse_mode: 'Markdown',
          ...adminPublishResumeTimeKb(pendingResume.id),
        }
      );
    } catch (_) {}
  } else {
    await ctx.telegram.sendMessage(
      payment.user_id,
      `✅ *To\'lovingiz tasdiqlandi!*\n\n` +
      `🎫 Tokenlar: *${tokens}* ta\n` +
      `📅 Obuna: *${days}* kun`,
      { parse_mode: 'Markdown' }
    );
  }

  const pendingApp = db.prepare(`
    SELECT a.*, v.hr_id, v.title, v.extra_fields
    FROM applications a
    JOIN vacancies v ON v.id = a.vacancy_id
    WHERE a.candidate_id = ?
    ORDER BY a.id DESC LIMIT 1
  `).get(payment.user_id);

  if (pendingApp) {
    const extraFields = JSON.parse(pendingApp.extra_fields || '[]');
    const data = JSON.parse(pendingApp.data || '{}');

    const { buildResumeText } = require('../../utils/helpers');
    let hrText =
      `📨 *Yangi Ariza Keldi!*\n\n` +
      `💼 E\'lon: *${pendingApp.title}*\n\n` +
      `👤 Nomzod: ${candidate.full_name}\n` +
      `📞 Telefon: ${candidate.phone}\n\n` +
      buildResumeText(data, extraFields);

    try {
      await ctx.telegram.sendMessage(pendingApp.hr_id, hrText, { parse_mode: 'Markdown' });
    } catch (e) {
      console.error('[Cand App] HR ga yuborishda xato:', e.message);
    }
  }
}

module.exports = {
  registerPaymentHandlers,
  approveHrPayment,
  approveCandidatePayment,
};
