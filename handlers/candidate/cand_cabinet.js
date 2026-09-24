const { Markup } = require('telegraf');
const { getDb, getSetting } = require('../../database/db');
const {
  candidateCabinetKb,
  candidateApplicationsKb,
  candidateAppDetailKb,
  candidateResumesKb,
  candidateResumeDetailKb,
  candidateMainKb,
} = require('../../keyboards/candidate_kb');
const { formatDate, buildResumeChannelText, isCandidateRegistered } = require('../../utils/helpers');
const { ADMIN_IDS } = require('../../config');

/**
 * Nomzod Kabineti Bosh sahifasini ko'rsatish
 */
async function showCandidateCabinet(ctx, isEdit = false) {
  const userId = ctx.from.id;

  if (!isCandidateRegistered(userId)) {
    await ctx.reply('⚠️ Siz hali ro\'yxatdan o\'tmagansiz. Avval ro\'yxatdan o\'ting:');
    return ctx.scene?.enter('candidate_register');
  }

  const db = getDb();
  const cand = db.prepare('SELECT * FROM candidates WHERE user_id = ?').get(userId);

  if (!cand) {
    return ctx.reply('❌ Nomzod ma\'lumotlari topilmadi. Qayta /start bosing.');
  }

  const appsCount = db.prepare(
    'SELECT COUNT(*) as cnt FROM applications WHERE candidate_id = ?'
  ).get(userId);

  const resumesCount = db.prepare(
    "SELECT COUNT(*) as cnt FROM candidate_resumes WHERE candidate_id = ? AND status != 'deleted'"
  ).get(userId);

  const text =
    `👤 *NOMZOD KABINETI*\n\n` +
    `👤 Ism: *${cand.full_name}*\n` +
    `📞 Telefon: *${cand.phone}*\n` +
    `📅 Ro'yxatdan o'tilgan: *${formatDate(cand.registered_at)}*\n\n` +
    `📊 *Statistika va Balans:*\n` +
    `🎫 Qolgan tokenlar: *${cand.tokens || 0}* ta\n` +
    `⭐ Obuna holati: ${cand.is_active ? '🟢 Aktiv' : '🔴 Nofaol'}` +
    `${cand.subscription_end ? ` _(Tugaydi: ${formatDate(cand.subscription_end)})_` : ''}\n` +
    `📋 Topshirilgan arizalar: *${appsCount.cnt}* ta\n` +
    `📄 Yaratilgan rezyumelar: *${resumesCount.cnt}* ta\n\n` +
    `👇 Quyidagi bo'limlardan birini tanlang:`;

  const kb = candidateCabinetKb({
    appsCount: appsCount.cnt,
    resumesCount: resumesCount.cnt,
  });

  if (isEdit && ctx.callbackQuery) {
    try {
      await ctx.editMessageText(text, { parse_mode: 'Markdown', ...kb });
      return;
    } catch (_) {}
  }

  await ctx.reply(text, { parse_mode: 'Markdown', ...kb });
}

/**
 * Topshirilgan arizalar ro'yxati
 */
async function showMyApplications(ctx) {
  const userId = ctx.from.id;
  const db = getDb();

  const apps = db.prepare(`
    SELECT a.*, v.title, v.company_name, v.salary, v.location
    FROM applications a
    LEFT JOIN vacancies v ON v.id = a.vacancy_id
    WHERE a.candidate_id = ?
    ORDER BY a.id DESC
  `).all(userId);

  if (!apps.length) {
    const text = '📭 *Siz hali hech qaysi vakansiyaga ariza topshirmagansiz.*\n\nKanaldagi e\'lonlardan o\'zingizga mosini topib, *"Ariza Qoldirish"* tugmasini bosing.';
    const kb = Markup.inlineKeyboard([
      [Markup.button.callback('⬅️ Kabinetga qaytish', 'cand_back_cabinet')],
    ]);
    try {
      await ctx.editMessageText(text, { parse_mode: 'Markdown', ...kb });
    } catch (_) {
      await ctx.reply(text, { parse_mode: 'Markdown', ...kb });
    }
    return;
  }

  let text = `📋 *Topshirilgan Arizalaringiz (${apps.length} ta):*\n\n_(Arizani tanlab, batafsil ko'rishingiz mumkin)_`;

  try {
    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...candidateApplicationsKb(apps),
    });
  } catch (_) {
    await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...candidateApplicationsKb(apps),
    });
  }
}

/**
 * Ariza detallarini ko'rsatish
 */
async function showApplicationDetail(ctx, appId) {
  const userId = ctx.from.id;
  const db = getDb();

  const app = db.prepare(`
    SELECT a.*, v.title, v.company_name, v.location, v.salary, v.extra_fields
    FROM applications a
    LEFT JOIN vacancies v ON v.id = a.vacancy_id
    WHERE a.id = ? AND a.candidate_id = ?
  `).get(appId, userId);

  if (!app) {
    return ctx.answerCbQuery('❌ Ariza topilmadi.');
  }

  const data = JSON.parse(app.data || '{}');
  const extraFields = JSON.parse(app.extra_fields || '[]');
  const { FIELD_LABELS } = require('../../utils/helpers');

  let text =
    `💼 *Ariza Tafsiloti (#${app.id})*\n\n` +
    `📌 Vakansiya: *${app.title || 'Noma\'lum'}*\n` +
    `🏢 Kompaniya: *${app.company_name || 'Noma\'lum'}*\n` +
    `📍 Manzil: ${app.location || '—'}\n` +
    `💵 Maosh: ${app.salary || '—'}\n` +
    `📅 Topshirilgan sana: *${formatDate(app.applied_at)}*\n\n` +
    `📝 *Yuborilgan ma'lumotlar:*\n`;

  for (const field of extraFields) {
    if (field === 'photo') {
      text += `${FIELD_LABELS[field] || field}: ✅ Rasm yuklangan\n`;
    } else {
      text += `${FIELD_LABELS[field] || field}: *${data[field] || '—'}*\n`;
    }
  }

  try {
    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...candidateAppDetailKb(),
    });
  } catch (_) {
    await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...candidateAppDetailKb(),
    });
  }
}

/**
 * Nomzod rezyumelari ro'yxati
 */
async function showMyResumes(ctx) {
  const userId = ctx.from.id;
  const db = getDb();

  const resumes = db.prepare(`
    SELECT * FROM candidate_resumes
    WHERE candidate_id = ? AND status != 'deleted'
    ORDER BY id DESC
  `).all(userId);

  if (!resumes.length) {
    const text = '📭 *Siz hali rezyume yaratmagansiz.*\n\nMenyudagi *"📄 Rezyume Joylashtirish"* tugmasini bosing.';
    const kb = Markup.inlineKeyboard([
      [Markup.button.callback('⬅️ Kabinetga qaytish', 'cand_back_cabinet')],
    ]);
    try {
      await ctx.editMessageText(text, { parse_mode: 'Markdown', ...kb });
    } catch (_) {
      await ctx.reply(text, { parse_mode: 'Markdown', ...kb });
    }
    return;
  }

  let text = `📄 *Sizning Rezyumelaringiz (${resumes.length} ta):*\n\n_(Rezyumeni tanlang)_`;

  try {
    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...candidateResumesKb(resumes),
    });
  } catch (_) {
    await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...candidateResumesKb(resumes),
    });
  }
}

/**
 * Rezyume detallarini ko'rsatish
 */
async function showResumeDetail(ctx, resumeId) {
  const userId = ctx.from.id;
  const db = getDb();

  const resume = db.prepare(`
    SELECT * FROM candidate_resumes
    WHERE id = ? AND candidate_id = ?
  `).get(resumeId, userId);

  if (!resume) {
    return ctx.answerCbQuery('❌ Rezyume topilmadi.');
  }

  const statusMap = {
    active: '🟢 Aktiv (Kanalda e\'lon qilingan)',
    pending: '🟡 Admin tasdiqlashini kutmoqda',
    expired: '🔴 Muddati tugagan',
    rejected: '⛔ Bekor qilingan',
    deleted: '🗑 O\'chirilgan',
  };

  const text =
    buildResumeChannelText(resume, false) +
    `\n\n📊 Status: *${statusMap[resume.status] || resume.status}*\n` +
    `📅 Yaratilgan: *${formatDate(resume.published_at || resume.created_at)}*\n` +
    `⏰ Tugash muddati: *${formatDate(resume.expires_at)}*`;

  try {
    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...candidateResumeDetailKb(resume),
    });
  } catch (_) {
    await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...candidateResumeDetailKb(resume),
    });
  }
}

/**
 * Rezyumeni qayta faollashtirish (Token ishlatib)
 */
async function reactivateCandidateResume(ctx, resumeId) {
  const userId = ctx.from.id;
  const db = getDb();

  const cand = db.prepare('SELECT * FROM candidates WHERE user_id = ?').get(userId);
  if (!cand || !cand.is_active || cand.tokens <= 0) {
    await ctx.answerCbQuery('❌ Tokeningiz yetarli emas!');
    return ctx.reply(
      '🎫 Rezyumeni qayta faollashtirish uchun sizda aktiv token yetarli emas.\n\n"💳 Token Xarid" tugmasi orqali paket sotib oling.',
      candidateMainKb()
    );
  }

  const resume = db.prepare('SELECT * FROM candidate_resumes WHERE id = ? AND candidate_id = ?').get(resumeId, userId);
  if (!resume) {
    return ctx.answerCbQuery('❌ Rezyume topilmadi.');
  }

  // Tokendan 1 ta ayirish
  db.prepare('UPDATE candidates SET tokens = tokens - 1 WHERE user_id = ?').run(userId);

  const newExpires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`
    UPDATE candidate_resumes
    SET status = 'pending', expires_at = ?
    WHERE id = ?
  `).run(newExpires, resumeId);

  await ctx.answerCbQuery('✅ Qayta faollashtirishga yuborildi!');

  // Admin bildirishnomasi
  for (const adminId of ADMIN_IDS) {
    try {
      await ctx.telegram.sendMessage(
        adminId,
        `📄 *Rezyume Qayta Faollashtirildi (Token ishlatildi)*\n\n` +
        `👤 Nomzod: ${cand.full_name} (${cand.phone})\n` +
        `🎯 Lavozim: *${resume.position}*\n` +
        `🔢 Rezyume ID: #${resume.id}`,
        { parse_mode: 'Markdown' }
      );
    } catch (_) {}
  }

  await ctx.reply(
    `✅ *Rezyumeingiz admin tasdiqlashiga yuborildi!*\n\n` +
    `🎫 Qolgan tokenlar: *${cand.tokens - 1}* ta`,
    { parse_mode: 'Markdown' }
  );

  await showCandidateCabinet(ctx);
}

/**
 * Rezyumeni o'chirish
 */
async function deleteCandidateResume(ctx, resumeId) {
  const userId = ctx.from.id;
  const db = getDb();

  const resume = db.prepare('SELECT * FROM candidate_resumes WHERE id = ? AND candidate_id = ?').get(resumeId, userId);
  if (!resume) {
    return ctx.answerCbQuery('❌ Rezyume topilmadi.');
  }

  db.prepare("UPDATE candidate_resumes SET status = 'deleted' WHERE id = ?").run(resumeId);

  await ctx.answerCbQuery('✅ Rezyume o\'chirildi!');

  try {
    await ctx.editMessageText('✅ *Rezyume muvaffaqiyatli o\'chirildi.*', { parse_mode: 'Markdown' });
  } catch (_) {
    await ctx.reply('✅ *Rezyume muvaffaqiyatli o\'chirildi.*', { parse_mode: 'Markdown' });
  }

  await showMyResumes(ctx);
}

/**
 * Tokenlar va obuna ma'lumotlarini ko'rsatish
 */
async function showCandidateTokenInfo(ctx) {
  const userId = ctx.from.id;
  const db = getDb();

  const cand = db.prepare('SELECT * FROM candidates WHERE user_id = ?').get(userId);
  const price = getSetting('candidate_price') || '20000';
  const tokens = getSetting('candidate_tokens') || '12';
  const days = getSetting('candidate_days') || '14';

  const text =
    `🎫 *Tokenlar va Obuna Ma'lumotlari*\n\n` +
    `👤 Nomzod: *${cand ? cand.full_name : ''}*\n` +
    `🎫 Qolgan tokenlar: *${cand ? cand.tokens : 0}* ta\n` +
    `⭐ Obuna holati: ${cand && cand.is_active ? '🟢 Aktiv' : '🔴 Nofaol'}\n` +
    `📅 Obuna tugaydi: *${formatDate(cand ? cand.subscription_end : null)}*\n\n` +
    `💳 *Joriy tarif paketi:*\n` +
    `• Narxi: *${parseInt(price).toLocaleString('uz-UZ')} so'm*\n` +
    `• Muxlat: *${days} kun*\n` +
    `• Tokenlar: *${tokens} ta ariza/rezyume tokeni*\n\n` +
    `_Yangi tokenlar xarid qilish uchun quyidagi tugmani bosing:_`;

  const kb = Markup.inlineKeyboard([
    [Markup.button.callback('💳 Token Sotib Olish', 'cand_buy_tokens')],
    [Markup.button.callback('⬅️ Kabinetga qaytish', 'cand_back_cabinet')],
  ]);

  try {
    await ctx.editMessageText(text, { parse_mode: 'Markdown', ...kb });
  } catch (_) {
    await ctx.reply(text, { parse_mode: 'Markdown', ...kb });
  }
}

/**
 * Nomzod kabineti callback'larini ro'yxatdan o'tkazish
 */
function registerCandidateCabinetCallbacks(bot) {
  bot.action('cand_my_apps', async (ctx) => {
    await ctx.answerCbQuery();
    await showMyApplications(ctx);
  });

  bot.action(/^cand_app_view_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const appId = parseInt(ctx.match[1]);
    await showApplicationDetail(ctx, appId);
  });

  bot.action('cand_my_resumes', async (ctx) => {
    await ctx.answerCbQuery();
    await showMyResumes(ctx);
  });

  bot.action(/^cand_res_view_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const resumeId = parseInt(ctx.match[1]);
    await showResumeDetail(ctx, resumeId);
  });

  bot.action(/^cand_res_reactivate_(\d+)$/, async (ctx) => {
    const resumeId = parseInt(ctx.match[1]);
    await reactivateCandidateResume(ctx, resumeId);
  });

  bot.action(/^cand_res_delete_(\d+)$/, async (ctx) => {
    const resumeId = parseInt(ctx.match[1]);
    await deleteCandidateResume(ctx, resumeId);
  });

  bot.action('cand_token_info', async (ctx) => {
    await ctx.answerCbQuery();
    await showCandidateTokenInfo(ctx);
  });

  bot.action('cand_buy_tokens', async (ctx) => {
    await ctx.answerCbQuery();
    const { sendPaymentInfo } = require('../hr/hr_vacancy');
    await sendPaymentInfo(ctx, 'candidate');
  });

  bot.action('cand_refresh_cabinet', async (ctx) => {
    await ctx.answerCbQuery('🔄 Yangilandi');
    await showCandidateCabinet(ctx, true);
  });

  bot.action('cand_back_cabinet', async (ctx) => {
    await ctx.answerCbQuery();
    await showCandidateCabinet(ctx, true);
  });
}

module.exports = {
  showCandidateCabinet,
  showMyApplications,
  showApplicationDetail,
  showMyResumes,
  showResumeDetail,
  reactivateCandidateResume,
  deleteCandidateResume,
  showCandidateTokenInfo,
  registerCandidateCabinetCallbacks,
};
