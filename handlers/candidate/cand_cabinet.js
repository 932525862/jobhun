const { Markup } = require('telegraf');
const { getDb, getSetting } = require('../../database/db');
const {
  candidateCabinetKb,
  candidateApplicationsKb,
  candidateAppDetailKb,
  candidateResumesKb,
  candidateResumeDetailKb,
  candidateResumeSendKb,
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

  let text = `📄 *Sizning Rezyumelaringiz (${resumes.length} ta):*\n\n_(Rezyumeni tanlang va ko'ring yoki tahrirlang)_`;

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
 * Rezyume detallarini ko'rsatish (statistika bilan)
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

  // Shu rezyume kategoriyasiga mos statistika
  const cat = (resume.category || '').trim();
  let statsText = '';
  if (cat) {
    const matchingVacs = db.prepare(`
      SELECT COUNT(*) as cnt FROM vacancies
      WHERE status = 'active'
      AND (
        category = ?
        OR (length(?) > 0 AND (INSTR(LOWER(category), LOWER(?)) > 0 OR INSTR(LOWER(?), LOWER(category)) > 0))
      )
    `).get(cat, cat, cat, cat);

    const matchingResumes = db.prepare(`
      SELECT COUNT(*) as cnt FROM candidate_resumes
      WHERE status IN ('active', 'pending')
      AND candidate_id != ?
      AND (
        category = ?
        OR (length(?) > 0 AND (INSTR(LOWER(category), LOWER(?)) > 0 OR INSTR(LOWER(?), LOWER(category)) > 0))
      )
    `).get(userId, cat, cat, cat, cat);

    statsText =
      `\n\n📊 *"${cat}" sohasidagi statistika:*\n` +
      `💼 Mos vakansiyalar (aktiv): *${matchingVacs.cnt}* ta\n` +
      `👥 Shu sohada ish qidiruvchilar: *${matchingResumes.cnt}* ta`;
  }

  const text =
    buildResumeChannelText(resume, false) +
    `\n\n📊 Status: *${statusMap[resume.status] || resume.status}*\n` +
    `📅 Yaratilgan: *${formatDate(resume.published_at || resume.created_at)}*\n` +
    `⏰ Tugash muddati: *${formatDate(resume.expires_at)}*` +
    statsText;

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
 * Rezyumeni HR-larga yuborish — statistika va tasdiqlash
 */
async function showResumeSendToHrs(ctx, resumeId) {
  const userId = ctx.from.id;
  const db = getDb();

  const resume = db.prepare(`
    SELECT * FROM candidate_resumes WHERE id = ? AND candidate_id = ?
  `).get(resumeId, userId);

  if (!resume) {
    return ctx.answerCbQuery('❌ Rezyume topilmadi.');
  }

  const cat = (resume.category || '').trim();

  // Shu kategoriyaga mos aktiv vakansiyali HR-lar soni
  const matchingHrs = db.prepare(`
    SELECT COUNT(DISTINCT hr_id) as cnt FROM vacancies
    WHERE status = 'active'
    AND (
      category = ?
      OR (length(?) > 0 AND (INSTR(LOWER(category), LOWER(?)) > 0 OR INSTR(LOWER(?), LOWER(category)) > 0))
    )
  `).get(cat, cat, cat, cat);

  const matchingVacs = db.prepare(`
    SELECT COUNT(*) as cnt FROM vacancies
    WHERE status = 'active'
    AND (
      category = ?
      OR (length(?) > 0 AND (INSTR(LOWER(category), LOWER(?)) > 0 OR INSTR(LOWER(?), LOWER(category)) > 0))
    )
  `).get(cat, cat, cat, cat);

  const price = getSetting('resume_send_price') || '15000';
  const cardNum = getSetting('card_number') || '0000 0000 0000 0000';
  const cardOwner = getSetting('card_owner') || 'Karta egasi';

  const text =
    `📨 *Rezyumeni HR-larga Yuborish*\n\n` +
    `📄 Rezyume: *${resume.position}*\n` +
    `📂 Soha: *${cat || '—'}*\n\n` +
    `📊 *Mos HR Statistikasi:*\n` +
    `💼 Aktiv vakansiyalar: *${matchingVacs.cnt}* ta\n` +
    `👔 Mos HR kompaniyalar: *${matchingHrs.cnt}* ta\n\n` +
    `💡 Rezyumeni yuborish orqali *${matchingHrs.cnt}* ta HR kabinetida \`Mos Nomzodlar\` bo'limiga tushadi!\n\n` +
    `💰 To'lov: *${parseInt(price).toLocaleString('uz-UZ')} so'm*\n` +
    `🏦 Karta: \`${cardNum}\`\n` +
    `👤 Egasi: *${cardOwner}*\n\n` +
    `✅ To'lovdan so'ng rezyumengiz darhol mos HR-larning kabinetiga yuboriladi!`;

  try {
    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...candidateResumeSendKb(resumeId),
    });
  } catch (_) {
    await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...candidateResumeSendKb(resumeId),
    });
  }
}

/**
 * Rezyume yuborish to'lovi tasdiqlash — to'lov ma'lumotlarini yuborish
 */
async function confirmResumeSend(ctx, resumeId) {
  const userId = ctx.from.id;
  const db = getDb();

  const resume = db.prepare(`
    SELECT * FROM candidate_resumes WHERE id = ? AND candidate_id = ?
  `).get(resumeId, userId);

  if (!resume) {
    return ctx.answerCbQuery('❌ Rezyume topilmadi.');
  }

  // Allaqachon yuborilganmi tekshirish
  const existing = db.prepare(`
    SELECT * FROM resume_sends WHERE resume_id = ? AND candidate_id = ? AND status = 'completed'
  `).get(resumeId, userId);

  if (existing) {
    return ctx.answerCbQuery('ℹ️ Bu rezyume allaqachon HR-larga yuborilgan!');
  }

  const price = getSetting('resume_send_price') || '15000';

  // To'lov yozuvini yaratish
  const payResult = db.prepare(`
    INSERT INTO payments (user_id, user_type, amount, status)
    VALUES (?, 'resume_send', ?, 'pending')
  `).run(userId, price);
  const paymentId = payResult.lastInsertRowid;

  // resume_sends yozuvini yaratish
  db.prepare(`
    INSERT OR REPLACE INTO resume_sends (candidate_id, resume_id, payment_id, status)
    VALUES (?, ?, ?, 'pending')
  `).run(userId, resumeId, paymentId);

  // Session'da saqlaymiz
  ctx.session.pendingResumeSendId = resumeId;
  ctx.session.pendingResumeSendPaymentId = paymentId;
  ctx.session.waitingResumeSendCheck = true;

  const cardNum = getSetting('card_number') || '0000 0000 0000 0000';
  const cardOwner = getSetting('card_owner') || 'Karta egasi';

  const text =
    `💳 *To'lov Ma'lumotlari — Rezyume Yuborish*\n\n` +
    `📄 Rezyume: *${resume.position}*\n` +
    `💰 Narx: *${parseInt(price).toLocaleString('uz-UZ')} so'm*\n\n` +
    `🏦 Karta: \`${cardNum}\`\n` +
    `👤 Egasi: *${cardOwner}*\n\n` +
    `📌 _To'lovni amalga oshirib, chekni (screenshot) ushbu yerga yuboring._`;

  try {
    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('✅ Chek yubordim', 'cand_resume_send_check_sent')],
        [Markup.button.callback('⬅️ Bekor qilish', `cand_res_view_${resumeId}`)],
      ]),
    });
  } catch (_) {
    await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('✅ Chek yubordim', 'cand_resume_send_check_sent')],
        [Markup.button.callback('⬅️ Bekor qilish', `cand_res_view_${resumeId}`)],
      ]),
    });
  }
}

/**
 * Rezyumeni tahrirlash — maydon tanlash menyusi
 */
async function showResumeEditMenu(ctx, resumeId) {
  const userId = ctx.from.id;
  const db = getDb();

  const resume = db.prepare(`
    SELECT * FROM candidate_resumes WHERE id = ? AND candidate_id = ?
  `).get(resumeId, userId);

  if (!resume) {
    return ctx.answerCbQuery('❌ Rezyume topilmadi.');
  }

  const buttons = [
    [Markup.button.callback('🎯 Lavozim', `cand_res_edit_field_${resumeId}_position`)],
    [Markup.button.callback('📂 Soha', `cand_res_edit_field_${resumeId}_category`)],
    [Markup.button.callback('📍 Shahar', `cand_res_edit_field_${resumeId}_city`)],
    [Markup.button.callback('💼 Tajriba muddati', `cand_res_edit_field_${resumeId}_experience_years`)],
    [Markup.button.callback('💰 Kutilgan maosh', `cand_res_edit_field_${resumeId}_expected_salary`)],
    [Markup.button.callback('🕐 Bandlik turi', `cand_res_edit_field_${resumeId}_employment_type`)],
    [Markup.button.callback("📝 O'zim haqimda", `cand_res_edit_field_${resumeId}_about_me`)],
    [Markup.button.callback('💼 Tajriba tafsiloti', `cand_res_edit_field_${resumeId}_experience_details`)],
    [Markup.button.callback("🧠 Ko'nikmalar", `cand_res_edit_field_${resumeId}_skills`)],
    [Markup.button.callback("🎓 Ta'lim", `cand_res_edit_field_${resumeId}_education`)],
    [Markup.button.callback('🌐 Tillar', `cand_res_edit_field_${resumeId}_languages`)],
    [Markup.button.callback('⬅️ Rezyumega qaytish', `cand_res_view_${resumeId}`)],
  ];

  const text = `✏️ *"${resume.position}" rezyumesini tahrirlash*\n\nQaysi qismini o'zgartirmoqchisiz?`;

  try {
    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons),
    });
  } catch (_) {
    await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons),
    });
  }
}

// Tahrirlash uchun ruxsat berilgan maydonlar
const RESUME_FIELD_LABELS = {
  position: 'Lavozim',
  category: 'Soha / Kategoriya',
  city: 'Shahar',
  experience_years: 'Tajriba muddati',
  expected_salary: 'Kutilgan maosh',
  employment_type: 'Bandlik turi',
  about_me: "O'zim haqimda",
  experience_details: 'Tajriba tafsiloti',
  skills: "Ko'nikmalar",
  education: "Ta'lim",
  languages: 'Tillar',
};

const ALLOWED_RESUME_EDIT_FIELDS = Object.keys(RESUME_FIELD_LABELS);

/**
 * Rezyume maydonini o'zgartirish — input qabul qilish
 */
async function handleResumeEditInput(ctx) {
  const state = ctx.session?.editingResume;
  if (!state) return false;

  const { resumeId, fieldKey } = state;
  const text = ctx.message?.text?.trim();

  if (!text) {
    await ctx.reply("❌ Iltimos, yangi ma'lumotni matn ko'rinishida yuboring:");
    return true;
  }

  if (!ALLOWED_RESUME_EDIT_FIELDS.includes(fieldKey)) {
    ctx.session.editingResume = null;
    return false;
  }

  const db = getDb();
  db.prepare(`UPDATE candidate_resumes SET ${fieldKey} = ? WHERE id = ? AND candidate_id = ?`)
    .run(text, resumeId, ctx.from.id);

  ctx.session.editingResume = null;

  // Rezyume tahrirlangandan so'ng PDF variantini yangilaymiz
  try {
    const resume = db.prepare('SELECT * FROM candidate_resumes WHERE id = ?').get(resumeId);
    if (resume) {
      const { generateResumePdfFile } = require('../../services/pdf_generator');
      const path = require('path');
      const fs = require('fs');
      const resumesDir = path.join(__dirname, '..', '..', 'uploads', 'resumes');
      if (!fs.existsSync(resumesDir)) fs.mkdirSync(resumesDir, { recursive: true });
      const pdfPath = path.join(resumesDir, `Resume_${resume.id}_${(resume.full_name || 'candidate').replace(/\s+/g, '_')}.pdf`);
      await generateResumePdfFile(resume, pdfPath);
    }
  } catch (err) {
    console.error('[Resume Edit PDF] Xato:', err.message);
  }

  await ctx.reply(
    `✅ *${RESUME_FIELD_LABELS[fieldKey]} muvaffaqiyatli yangilandi!*`,
    { parse_mode: 'Markdown', ...candidateMainKb() }
  );

  // Yangilangan rezyumeni ko'rsatish
  await showResumeDetail(ctx, resumeId);
  return true;
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
      "🎫 Rezyumeni qayta faollashtirish uchun sizda aktiv token yetarli emas.\n\n\"💳 Token Xarid\" tugmasi orqali paket sotib oling.",
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

  await ctx.answerCbQuery("✅ Rezyume o'chirildi!");

  try {
    await ctx.editMessageText("✅ *Rezyume muvaffaqiyatli o'chirildi.*", { parse_mode: 'Markdown' });
  } catch (_) {
    await ctx.reply("✅ *Rezyume muvaffaqiyatli o'chirildi.*", { parse_mode: 'Markdown' });
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
 * Rezyume to'lov cheki qabul qilish (foto/document) — index.js'dan chaqiriladi
 */
async function handleResumeSendPaymentCheck(ctx, bot) {
  if (!ctx.session?.waitingResumeSendCheck) return false;

  const userId = ctx.from.id;
  const resumeId = ctx.session.pendingResumeSendId;
  const paymentId = ctx.session.pendingResumeSendPaymentId;
  if (!resumeId) return false;

  let fileId = null;
  if (ctx.message?.photo) {
    fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
  } else if (ctx.message?.document) {
    fileId = ctx.message.document.file_id;
  }

  if (!fileId) return false;

  const db = getDb();

  // To'lov yozuvini yangilash
  if (paymentId) {
    db.prepare(`UPDATE payments SET check_file_id = ? WHERE id = ?`).run(fileId, paymentId);
  }

  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);

  ctx.session.waitingResumeSendCheck = false;
  ctx.session.pendingResumeSendId = null;
  ctx.session.pendingResumeSendPaymentId = null;

  await ctx.reply(
    "✅ *Chekingiz qabul qilindi!*\n\n" +
    "⏳ Admin tekshirib tasdiqlaydi.\n" +
    "Shundan so'ng rezyumengiz mos HR kompaniyalar kabinetiga yuboriladi.",
    { parse_mode: 'Markdown' }
  );

  // Admin ga bildirish
  const cand = db.prepare('SELECT * FROM candidates WHERE user_id = ?').get(userId);
  const resume = db.prepare('SELECT * FROM candidate_resumes WHERE id = ?').get(resumeId);
  const price = getSetting('resume_send_price') || '15000';

  const { adminPaymentKb } = require('../../keyboards/admin_kb');
  for (const adminId of ADMIN_IDS) {
    try {
      const text =
        `📨 *Rezyume HR-ga Yuborish To'lovi*\n\n` +
        `👤 Nomzod: *${cand ? cand.full_name : ''}* (${cand ? cand.phone : ''})\n` +
        `🎯 Lavozim: *${resume ? resume.position : ''}*\n` +
        `📂 Soha: *${resume ? resume.category : ''}*\n` +
        `🔢 To'lov ID: #${paymentId || ''}\n` +
        `💰 Miqdor: ${parseInt(price).toLocaleString('uz-UZ')} so'm`;

      await ctx.telegram.sendPhoto(adminId, fileId, {
        caption: text,
        parse_mode: 'Markdown',
        ...adminPaymentKb(paymentId || 0),
      });
    } catch (e) {
      console.error('[ResumeSend] Admin ga xabar xato:', e.message);
      try {
        await ctx.telegram.sendMessage(adminId,
          `📨 *Rezyume HR-ga Yuborish To'lovi*\n\n` +
          `👤 Nomzod: *${cand ? cand.full_name : ''}* (${cand ? cand.phone : ''})\n` +
          `🎯 Lavozim: *${resume ? resume.position : ''}*\n` +
          `💰 Miqdor: ${parseInt(price).toLocaleString('uz-UZ')} so'm`,
          { parse_mode: 'Markdown', ...adminPaymentKb(paymentId || 0) }
        );
      } catch (_) {}
    }
  }

  return true;
}

/**
 * Admin resume yuborish to'lovini tasdiqlash — HR-larga yuborish
 * payments.js'dan chaqiriladi
 */
async function approveResumeSendPayment(ctx, bot, payment, db) {
  const userId = payment.user_id;

  // resume_sends dan resumeId ni topish
  const sendRecord = db.prepare(`
    SELECT * FROM resume_sends
    WHERE candidate_id = ? AND payment_id = ?
    ORDER BY id DESC LIMIT 1
  `).get(userId, payment.id);

  if (!sendRecord) {
    // Eng oxirgi pending bo'lgan resume_send ni ko'rish
    const latestSend = db.prepare(`
      SELECT * FROM resume_sends
      WHERE candidate_id = ? AND status = 'pending'
      ORDER BY id DESC LIMIT 1
    `).get(userId);

    if (!latestSend) {
      await ctx.telegram.sendMessage(userId, "✅ *To'lovingiz tasdiqlandi!*", { parse_mode: 'Markdown' });
      return;
    }

    return doResumeSendToHrs(ctx, bot, db, latestSend, userId);
  }

  return doResumeSendToHrs(ctx, bot, db, sendRecord, userId);
}

async function doResumeSendToHrs(ctx, bot, db, sendRecord, userId) {
  const resume = db.prepare('SELECT * FROM candidate_resumes WHERE id = ?').get(sendRecord.resume_id);
  if (!resume) return;

  const cat = (resume.category || '').trim();

  // Shu kategoriyaga mos vakansiyali HR-larni topish
  const matchingHrs = db.prepare(`
    SELECT DISTINCT h.user_id, h.company_name
    FROM hr_companies h
    JOIN vacancies v ON v.hr_id = h.user_id
    WHERE v.status = 'active'
    AND (
      v.category = ?
      OR (length(?) > 0 AND (INSTR(LOWER(v.category), LOWER(?)) > 0 OR INSTR(LOWER(?), LOWER(v.category)) > 0))
    )
  `).all(cat, cat, cat, cat);

  const cand = db.prepare('SELECT * FROM candidates WHERE user_id = ?').get(userId);
  const { buildResumeChannelText } = require('../../utils/helpers');

  let sentCount = 0;
  for (const hr of matchingHrs) {
    try {
      const hrText =
        `🎯 *Sizga Mos Nomzod Rezyumesi Keldi!*\n\n` +
        `_(Nomzod rezyumesini HR-larga maxsus yuborish xizmati orqali keldi)_\n\n` +
        buildResumeChannelText(resume, false) +
        `\n\n📞 Bog'lanish: \`${cand ? cand.phone : '—'}\``;

      await bot.telegram.sendMessage(hr.user_id, hrText, { parse_mode: 'Markdown' });
      sentCount++;
    } catch (e) {
      console.error(`[ResumeSend] HR ${hr.user_id} ga yuborishda xato:`, e.message);
    }
  }

  // resume_sends ni yangilash
  db.prepare(`
    UPDATE resume_sends SET status = 'completed', sent_count = ?
    WHERE id = ?
  `).run(sentCount, sendRecord.id);

  // Nomzodga xabar
  try {
    await ctx.telegram.sendMessage(
      userId,
      `✅ *Rezyumengiz HR-larga yuborildi!*\n\n` +
      `📨 Jami *${sentCount}* ta HR kompaniyaga yuborildi.\n` +
      `📂 Soha: *${cat || '—'}*\n\n` +
      `_HR-lar siz bilan bog'lanishini kuting._`,
      { parse_mode: 'Markdown' }
    );
  } catch (e) {
    console.error('[ResumeSend] Nomzodga xabar yuborishda xato:', e.message);
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

  // Rezyumeni HR-larga yuborish — statistika ko'rsatish
  bot.action(/^cand_res_send_hrs_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const resumeId = parseInt(ctx.match[1]);
    await showResumeSendToHrs(ctx, resumeId);
  });

  // Yuborish to'lovini boshlash
  bot.action(/^cand_res_send_confirm_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const resumeId = parseInt(ctx.match[1]);
    await confirmResumeSend(ctx, resumeId);
  });

  // Chek yuborish tayyorligi
  bot.action('cand_resume_send_check_sent', async (ctx) => {
    await ctx.answerCbQuery("✅ Chek kutilmoqda...");
    await ctx.reply(
      "📸 *Iltimos, to'lov chekini (screenshot) yuboring:*",
      { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
    );
  });

  // Rezyumeni tahrirlash menyusi
  bot.action(/^cand_res_edit_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const resumeId = parseInt(ctx.match[1]);
    await showResumeEditMenu(ctx, resumeId);
  });

  // Rezyume maydonini tahrirlash
  bot.action(/^cand_res_edit_field_(\d+)_(\w+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const resumeId = parseInt(ctx.match[1]);
    const fieldKey = ctx.match[2];

    if (!ALLOWED_RESUME_EDIT_FIELDS.includes(fieldKey)) {
      return ctx.answerCbQuery("❌ Noto'g'ri maydon.");
    }

    ctx.session.editingResume = { resumeId, fieldKey };

    const label = RESUME_FIELD_LABELS[fieldKey] || fieldKey;
    await ctx.reply(
      `✏️ *Yangi "${label}" qiymatini yuboring:*\n\n_(Bekor qilish uchun /menu bosing)_`,
      { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
    );
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
  showResumeSendToHrs,
  confirmResumeSend,
  showResumeEditMenu,
  handleResumeEditInput,
  reactivateCandidateResume,
  deleteCandidateResume,
  showCandidateTokenInfo,
  handleResumeSendPaymentCheck,
  approveResumeSendPayment,
  registerCandidateCabinetCallbacks,
};
