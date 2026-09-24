const { Markup } = require('telegraf');
const { getDb } = require('../../database/db');
const {
  hrVacancyListKb,
  hrVacancyDetailKb,
} = require('../../keyboards/hr_kb');
const { deactivateVacancyButton, publishVacancyToChannel } = require('../../utils/channel');
const { formatDate, buildVacancyText } = require('../../utils/helpers');

// ─── Mening E'lonlarim ────────────────────────────────────────────────────────
async function showMyVacancies(ctx) {
  const db = getDb();
  const vacancies = db.prepare(`
    SELECT * FROM vacancies WHERE hr_id = ? ORDER BY id DESC
  `).all(ctx.from.id);

  if (!vacancies.length) {
    return ctx.reply('📭 Sizda hali e\'lon yo\'q. "Yangi E\'lon" tugmasini bosing!');
  }

  await ctx.reply(
    '📋 *Sizning e\'lonlaringiz:*\n_(E\'lonni tanlang)_',
    { parse_mode: 'Markdown', ...hrVacancyListKb(vacancies) }
  );
}

// ─── E'lon detalini ko'rsatish ─────────────────────────────────────────────
async function showVacancyDetail(ctx, vacancyId) {
  const db = getDb();
  const vacancy = db.prepare('SELECT * FROM vacancies WHERE id = ? AND hr_id = ?').get(vacancyId, ctx.from.id);

  if (!vacancy) {
    return ctx.answerCbQuery('❌ E\'lon topilmadi');
  }

  const appsCount = db.prepare('SELECT COUNT(*) as cnt FROM applications WHERE vacancy_id = ?').get(vacancyId);

  let matchingCandCount = 0;
  if (vacancy.status === 'active') {
    const cat = (vacancy.category || '').trim();
    const row = db.prepare(`
      SELECT COUNT(*) as cnt FROM candidate_resumes cr
      WHERE cr.status != 'deleted' AND cr.status != 'rejected'
      AND (
        cr.category = ?
        OR (length(?) > 0 AND (INSTR(LOWER(cr.category), LOWER(?)) > 0 OR INSTR(LOWER(?), LOWER(cr.category)) > 0))
        OR (length(?) > 0 AND (INSTR(LOWER(cr.position), LOWER(?)) > 0 OR INSTR(LOWER(?), LOWER(cr.position)) > 0))
      )
    `).get(cat, cat, cat, cat, cat, cat, cat);
    matchingCandCount = row ? row.cnt : 0;
  }

  const statusMap = {
    active: '🟢 Aktiv',
    expired: '🔴 Muddati tugagan',
    pending: '🟡 Admin tasdiqlashini kutmoqda',
    deleted: '⛔ O\'chirilgan',
  };

  const text =
    buildVacancyText(vacancy) +
    `\n\n📊 Status: ${statusMap[vacancy.status] || vacancy.status}\n` +
    `📅 Chiqarilgan: ${formatDate(vacancy.published_at)}\n` +
    `⏰ Tugaydi: ${formatDate(vacancy.expires_at)}\n` +
    `📨 Arizalar: ${appsCount.cnt} ta`;

  try {
    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...hrVacancyDetailKb(vacancy, matchingCandCount)
    });
  } catch {
    await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...hrVacancyDetailKb(vacancy, matchingCandCount)
    });
  }
}

// ─── Mos keluvchi nomzodlar ro'yxati ──────────────────────────────────────────
async function showMatchingCandidates(ctx, vacancyId) {
  const db = getDb();
  const vacancy = db.prepare('SELECT * FROM vacancies WHERE id = ? AND hr_id = ?').get(vacancyId, ctx.from.id);

  if (!vacancy) {
    return ctx.answerCbQuery('❌ E\'lon topilmadi');
  }

  if (vacancy.status !== 'active') {
    return ctx.answerCbQuery('⚠️ Mos nomzodlar faqat aktiv e\'lonlar uchun ko\'rsatiladi');
  }

  const cat = (vacancy.category || '').trim();
  const candidates = db.prepare(`
    SELECT cr.*, c.phone as cand_phone, c.full_name as cand_name
    FROM candidate_resumes cr
    JOIN candidates c ON c.user_id = cr.candidate_id
    WHERE cr.status != 'deleted' AND cr.status != 'rejected'
    AND (
      cr.category = ?
      OR (length(?) > 0 AND (INSTR(LOWER(cr.category), LOWER(?)) > 0 OR INSTR(LOWER(?), LOWER(cr.category)) > 0))
      OR (length(?) > 0 AND (INSTR(LOWER(cr.position), LOWER(?)) > 0 OR INSTR(LOWER(?), LOWER(cr.position)) > 0))
    )
    ORDER BY cr.id DESC
  `).all(cat, cat, cat, cat, cat, cat, cat);

  if (!candidates.length) {
    const text = `📭 *Ushbu e'lon bo'yicha mos keluvchi nomzodlar topilmadi.*\n\n📌 E'lon: *${vacancy.title}*\n📂 Soha: *${vacancy.category || '—'}*`;
    const kb = Markup.inlineKeyboard([
      [Markup.button.callback('⬅️ E\'longa qaytish', `vac_detail_${vacancyId}`)],
    ]);
    try {
      await ctx.editMessageText(text, { parse_mode: 'Markdown', ...kb });
    } catch (_) {
      await ctx.reply(text, { parse_mode: 'Markdown', ...kb });
    }
    return;
  }

  let text = `🎯 *"${vacancy.title}" bo'yicha Mos Nomzodlar (${candidates.length} ta):*\n\n_(Nomzodni tanlab, rezyumesi va telefon raqamini ko'rishingiz mumkin)_`;

  const buttons = candidates.map((c) => [
    Markup.button.callback(
      `👤 ${c.full_name || c.cand_name} — ${c.position} (${c.city || 'Toshkent'})`,
      `hr_view_cand_res_${c.id}_vac_${vacancyId}`
    ),
  ]);

  buttons.push([Markup.button.callback('⬅️ E\'longa qaytish', `vac_detail_${vacancyId}`)]);

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

// ─── Mos keluvchi nomzod rezyumesini ko'rish ──────────────────────────────
async function showMatchingCandidateDetail(ctx, resumeId, vacancyId) {
  const db = getDb();
  const vacancy = db.prepare('SELECT * FROM vacancies WHERE id = ? AND hr_id = ?').get(vacancyId, ctx.from.id);
  if (!vacancy) return ctx.answerCbQuery('❌ E\'lon topilmadi');

  const resume = db.prepare(`
    SELECT cr.*, c.phone as cand_phone, c.full_name as cand_name
    FROM candidate_resumes cr
    JOIN candidates c ON c.user_id = cr.candidate_id
    WHERE cr.id = ?
  `).get(resumeId);

  if (!resume) {
    return ctx.answerCbQuery('❌ Nomzod rezyumesi topilmadi');
  }

  const { buildResumeChannelText, escapeMarkdown } = require('../../utils/helpers');

  const text =
    `🎯 *MOS NOMZOD REZYUMESI*\n\n` +
    `👤 Nomzod: *${escapeMarkdown(resume.full_name || resume.cand_name)}*\n` +
    `📞 Telefon: \`${escapeMarkdown(resume.cand_phone)}\` _(Bog'lanish uchun)_\n\n` +
    buildResumeChannelText(resume, false);

  const buttons = [
    [Markup.button.url('📞 Telefon qilish', `tel:${(resume.cand_phone || '').replace(/[^+\d]/g, '')}`)],
    [Markup.button.callback('⬅️ Mos nomzodlarga qaytish', `vac_matching_cands_${vacancyId}`)],
    [Markup.button.callback('🏠 E\'longa qaytish', `vac_detail_${vacancyId}`)],
  ];

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

// ─── Arizalarni ko'rish ───────────────────────────────────────────────────────
async function showVacancyApplications(ctx, vacancyId) {
  const db = getDb();
  const vacancy = db.prepare('SELECT * FROM vacancies WHERE id = ? AND hr_id = ?').get(vacancyId, ctx.from.id);
  if (!vacancy) return ctx.answerCbQuery('❌ Topilmadi');

  const apps = db.prepare(`
    SELECT a.*, c.full_name, c.phone 
    FROM applications a
    JOIN candidates c ON c.user_id = a.candidate_id
    WHERE a.vacancy_id = ?
    ORDER BY a.id DESC
  `).all(vacancyId);

  if (!apps.length) {
    return ctx.answerCbQuery('📭 Hali ariza yo\'q');
  }

  await ctx.answerCbQuery(`📨 ${apps.length} ta ariza`);

  for (const app of apps) {
    const data = JSON.parse(app.data || '{}');
    const extraFields = JSON.parse(vacancy.extra_fields || '[]');

    let text = `📨 *Ariza #${app.id}*\n👤 ${app.full_name} | 📞 ${app.phone}\n\n`;

    for (const field of extraFields) {
      if (field === 'photo') continue; // rasm alohida
      const { FIELD_LABELS } = require('../../utils/helpers');
      text += `${FIELD_LABELS[field] || field}: ${data[field] || '—'}\n`;
    }

    const buttons = [[
      Markup.button.callback('👁 Arizani ko\'rish', `view_app_${app.id}`)
    ]];

    await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });
  }
}

// ─── E'lonni o'chirish ────────────────────────────────────────────────────────
async function deleteVacancy(ctx, vacancyId, bot) {
  const db = getDb();
  const vacancy = db.prepare('SELECT * FROM vacancies WHERE id = ? AND hr_id = ?').get(vacancyId, ctx.from.id);
  if (!vacancy) return ctx.answerCbQuery('❌ Topilmadi');

  // Kanaldan tugmani olib tashlash
  if (vacancy.channel_msg_id) {
    await deactivateVacancyButton(bot, vacancyId);
  }

  db.prepare("UPDATE vacancies SET status = 'deleted' WHERE id = ?").run(vacancyId);

  await ctx.answerCbQuery('✅ E\'lon o\'chirildi');
  await ctx.editMessageText('✅ *E\'lon muvaffaqiyatli o\'chirildi.*', { parse_mode: 'Markdown' });
}

// ─── E'lonni qayta faollashtirish ──────────────────────────────────────────
async function reactivateVacancy(ctx, vacancyId, bot) {
  const db = getDb();
  const hr = db.prepare('SELECT * FROM hr_companies WHERE user_id = ?').get(ctx.from.id);

  if (!hr.is_active || hr.tokens <= 0) {
    await ctx.answerCbQuery('❌ Token yetarli emas!');
    return ctx.reply('🎫 Tokenlaringiz tugagan. Yangi tarif sotib oling.');
  }

  // Tokendan ayirish
  db.prepare('UPDATE hr_companies SET tokens = tokens - 1 WHERE user_id = ?').run(ctx.from.id);

  // E'lonni qayta faollashtirish
  const newExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`
    UPDATE vacancies SET status = 'active', expires_at = ?, last_activated = datetime('now')
    WHERE id = ?
  `).run(newExpires, vacancyId);

  // Kanalga qayta e'lon (tugmani qayta qo'shish)
  await publishVacancyToChannel(bot, vacancyId);

  await ctx.answerCbQuery('✅ E\'lon qayta faollashtirildi!');
  await ctx.editMessageText(
    `✅ *E\'lon qayta faollashtirildi!*\n\n🗓 Yangi muddat: 7 kun\n🎫 Qolgan tokenlar: ${hr.tokens - 1}`,
    { parse_mode: 'Markdown' }
  );
}

// ─── Token Limiti ─────────────────────────────────────────────────────────────
async function showTokenInfo(ctx) {
  const db = getDb();
  const hr = db.prepare('SELECT * FROM hr_companies WHERE user_id = ?').get(ctx.from.id);
  const { formatDate } = require('../../utils/helpers');

  const text =
    `🎫 *Token Ma'lumotlari*\n\n` +
    `✅ Obuna holati: ${hr.is_active ? '🟢 Aktiv' : '🔴 Faol emas'}\n` +
    `🎫 Qolgan tokenlar: *${hr.tokens}* ta\n` +
    `📅 Obuna tugaydi: ${formatDate(hr.subscription_end)}\n\n` +
    `_1 ta e\'lon = 1 ta token_\n` +
    `_24 soatda faqat 1 ta e\'lon berish mumkin_`;

  await ctx.reply(text, { parse_mode: 'Markdown' });
}

// ─── E'lonni tahrirlash ───────────────────────────────────────────────────────
const FIELD_NAMES = {
  title: 'Lavozim nomi (Sarlavha)',
  category: 'Soha / Kategoriya',
  company_name: 'Kompaniya nomi',
  location: 'Ish joyi manzil',
  salary: 'Maosh',
  work_time: 'Ish vaqti',
  tasks: 'Asosiy vazifalar',
  requirements: 'Talablar',
  conditions: 'Ish sharoitlari',
  raw_text: 'Tayyor e\'lon matni',
};

async function showEditFieldsMenu(ctx, vacancyId) {
  const db = getDb();
  const vacancy = db.prepare('SELECT * FROM vacancies WHERE id = ? AND hr_id = ?').get(vacancyId, ctx.from.id);
  if (!vacancy) return ctx.answerCbQuery('❌ E\'lon topilmadi');

  const { hrEditFieldsKb } = require('../../keyboards/hr_kb');
  try {
    await ctx.editMessageText(
      `✏️ *"${vacancy.title}" e'lonini tahrirlash*\n\nQaysi qismini o'zgartirmoqchisiz?`,
      { parse_mode: 'Markdown', ...hrEditFieldsKb(vacancy) }
    );
  } catch (_) {
    await ctx.reply(
      `✏️ *"${vacancy.title}" e'lonini tahrirlash*\n\nQaysi qismini o'zgartirmoqchisiz?`,
      { parse_mode: 'Markdown', ...hrEditFieldsKb(vacancy) }
    );
  }
}

async function promptEditField(ctx, vacancyId, fieldKey) {
  const db = getDb();
  const vacancy = db.prepare('SELECT * FROM vacancies WHERE id = ? AND hr_id = ?').get(vacancyId, ctx.from.id);
  if (!vacancy) return ctx.answerCbQuery('❌ Topilmadi');

  ctx.session.editingVacancy = { vacancyId, fieldKey };

  const label = FIELD_NAMES[fieldKey] || fieldKey;
  await ctx.reply(
    `✏️ *Yangi "${label}" qiymatini matn ko'rinishida yuboring:*\n\n` +
    `_(Bekor qilish uchun /menu bosing)_`,
    { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
  );
}

async function handleFieldEditInput(ctx, bot) {
  const state = ctx.session?.editingVacancy;
  if (!state) return false;

  const { vacancyId, fieldKey } = state;
  const text = ctx.message?.text?.trim();

  if (!text) {
    await ctx.reply('❌ Iltimos, yangi ma\'lumotni matn ko\'rinishida yuboring:');
    return true;
  }

  const allowedFields = ['title', 'category', 'company_name', 'location', 'salary', 'work_time', 'tasks', 'requirements', 'conditions', 'raw_text'];
  if (!allowedFields.includes(fieldKey)) {
    ctx.session.editingVacancy = null;
    return false;
  }

  const db = getDb();
  db.prepare(`UPDATE vacancies SET ${fieldKey} = ? WHERE id = ? AND hr_id = ?`).run(text, vacancyId, ctx.from.id);

  ctx.session.editingVacancy = null;

  const { updateChannelVacancyText } = require('../../utils/channel');
  await updateChannelVacancyText(bot, vacancyId);

  const { hrMainKb } = require('../../keyboards/hr_kb');
  await ctx.reply('✅ *E\'lon ma\'lumoti muvaffaqiyatli saqlandi!*', { parse_mode: 'Markdown', ...hrMainKb() });

  await showVacancyDetail(ctx, vacancyId);
  return true;
}

module.exports = {
  showMyVacancies,
  showVacancyDetail,
  showMatchingCandidates,
  showMatchingCandidateDetail,
  showVacancyApplications,
  deleteVacancy,
  reactivateVacancy,
  showTokenInfo,
  showEditFieldsMenu,
  promptEditField,
  handleFieldEditInput,
};
