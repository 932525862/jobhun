const { CHANNEL_ID } = require('../config');
const { buildVacancyText } = require('./helpers');
const { applyButtonKb } = require('../keyboards/candidate_kb');
const { getDb } = require('../database/db');

/**
 * Kanalga vakansiya xabarini yuboradi
 */
async function publishVacancyToChannel(bot, vacancyId) {
  const db = getDb();
  const vacancy = db.prepare('SELECT * FROM vacancies WHERE id = ?').get(vacancyId);
  if (!vacancy) {
    console.error(`[publishVacancyToChannel] Vacancy #${vacancyId} topilmadi`);
    return;
  }

  // Faqat pending/approved/active statusdagi vakansiyalarni kanalga chiqarish
  if (!['pending', 'approved', 'active'].includes(vacancy.status)) {
    console.error(`[publishVacancyToChannel] Vacancy #${vacancyId} status: ${vacancy.status} — chiqarib bo'lmaydi`);
    return;
  }

  const text = buildVacancyText(vacancy, true);
  const kb = applyButtonKb(vacancyId);

  try {
    const msg = await bot.telegram.sendMessage(CHANNEL_ID, text, {
      parse_mode: 'Markdown',
      reply_markup: kb.reply_markup,
    });

    // Muddatni hisoblash (7 kun)
    const publishedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      UPDATE vacancies 
      SET status = 'active', channel_msg_id = ?, published_at = ?, expires_at = ?, last_activated = ?
      WHERE id = ?
    `).run(msg.message_id, publishedAt, expiresAt, publishedAt, vacancyId);

    return msg.message_id;
  } catch (err) {
    console.error('Kanalga yuborishda xato:', err.message);
  }
}

/**
 * Muddati o'tgan vakansiyadan "Ariza qoldirish" tugmasini olib tashlaydi
 */
async function deactivateVacancyButton(bot, vacancyId) {
  const db = getDb();
  const vacancy = db.prepare('SELECT * FROM vacancies WHERE id = ?').get(vacancyId);
  if (!vacancy) return;

  if (vacancy.channel_msg_id) {
    try {
      await bot.telegram.editMessageReplyMarkup(
        CHANNEL_ID,
        vacancy.channel_msg_id,
        undefined,
        { inline_keyboard: [] }
      );
    } catch (err) {
      console.error('Tugmani o\'chirishda xato:', err.message);
    }
  }

  db.prepare("UPDATE vacancies SET status = 'expired' WHERE id = ?").run(vacancyId);
}

/**
 * Tahrirlangan vakansiya matnini kanalda jonli yangilaydi
 */
async function updateChannelVacancyText(bot, vacancyId) {
  const db = getDb();
  const vacancy = db.prepare('SELECT * FROM vacancies WHERE id = ?').get(vacancyId);
  if (!vacancy || !vacancy.channel_msg_id || vacancy.status !== 'active') return;

  const text = buildVacancyText(vacancy, true);
  const kb = applyButtonKb(vacancyId);

  try {
    await bot.telegram.editMessageText(
      CHANNEL_ID,
      vacancy.channel_msg_id,
      undefined,
      text,
      {
        parse_mode: 'Markdown',
        reply_markup: kb.reply_markup,
      }
    );
  } catch (err) {
    console.error('Kanal xabarini tahrirlashda xato:', err.message);
  }
}

/**
 * Rezyumeni kanalga yuborish — DISABLED.
 * Resume yaratish, saqlash, PDF, preview va boshqa barcha resume funksiyalar
 * o'z holicha ishlaydi. Faqat Telegram kanalga yuborish o'chirilgan.
 *
 * Agar kelajakda kanalga yuborishni qayta yoqish kerak bo'lsa,
 * RESUME_CHANNEL_PUBLISH_ENABLED = true qilib qo'ying.
 */
const RESUME_CHANNEL_PUBLISH_ENABLED = false;

async function publishResumeToChannel(bot, resumeId) {
  if (!RESUME_CHANNEL_PUBLISH_ENABLED) {
    // Kanalga yuborish o'chirilgan. Resume faqat databaseda saqlanadi.
    // Status ni 'active' ga o'tkazish va sanalarni belgilash (kanal xabarsiz)
    const db = getDb();
    const resume = db.prepare('SELECT * FROM candidate_resumes WHERE id = ?').get(resumeId);
    if (!resume) return;

    const publishedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      UPDATE candidate_resumes 
      SET status = 'active', published_at = ?, expires_at = ?
      WHERE id = ?
    `).run(publishedAt, expiresAt, resumeId);

    // Nomzodga kanal yo'q, lekin PDF ni tayyorlab yuborish
    try {
      const { generateResumePdfFile } = require('../services/pdf_generator');
      const path = require('path');
      const fs = require('fs');
      const resumesDir = path.join(__dirname, '..', 'uploads', 'resumes');
      if (!fs.existsSync(resumesDir)) {
        fs.mkdirSync(resumesDir, { recursive: true });
      }
      const pdfPath = path.join(resumesDir, `Resume_${resume.id}_${(resume.full_name || 'candidate').replace(/\s+/g, '_')}.pdf`);
      await generateResumePdfFile(resume, pdfPath);

      if (bot && bot.telegram && fs.existsSync(pdfPath)) {
        await bot.telegram.sendDocument(
          resume.candidate_id,
          { source: pdfPath, filename: `Rezyume_${resume.full_name || 'Nomzod'}.pdf` },
          {
            caption: `✅ *Rezyumeingiz (#${resumeId}) muvaffaqiyatli yaratildi va saqlandi!*`,
            parse_mode: 'Markdown',
          }
        ).catch(() => {});
      } else if (bot && bot.telegram) {
        await bot.telegram.sendMessage(
          resume.candidate_id,
          `✅ *Rezyumeingiz (#${resumeId}) muvaffaqiyatli yaratildi va saqlandi!*`,
          { parse_mode: 'Markdown' }
        ).catch(() => {});
      }
    } catch (pdfErr) {
      console.error('[Resume PDF Notify] Xato:', pdfErr.message);
    }

    console.log(`[Resume #${resumeId}] Saqlandi va aktivlashtirildi (kanal: o'chirilgan)`);
    return null;
  }

  // ── Quyidagi kod faqat RESUME_CHANNEL_PUBLISH_ENABLED = true bo'lganda ishlaydi ──
  const db = getDb();
  const resume = db.prepare('SELECT * FROM candidate_resumes WHERE id = ?').get(resumeId);
  if (!resume) return;

  const { buildResumeChannelText } = require('./helpers');
  const { generateResumePdfFile } = require('../services/pdf_generator');
  const path = require('path');
  const fs = require('fs');

  const captionText = buildResumeChannelText(resume, true);
  const pdfPath = path.join(__dirname, '..', 'uploads', 'resumes', `Resume_${resume.id}_${(resume.full_name || 'candidate').replace(/\s+/g, '_')}.pdf`);

  try {
    await generateResumePdfFile(resume, pdfPath);

    let msg;
    if (fs.existsSync(pdfPath)) {
      msg = await bot.telegram.sendDocument(
        CHANNEL_ID,
        { source: pdfPath, filename: `Resume_${resume.full_name || 'Nomzod'}.pdf` },
        { caption: captionText, parse_mode: 'Markdown' }
      );
    } else {
      msg = await bot.telegram.sendMessage(CHANNEL_ID, captionText, { parse_mode: 'Markdown' });
    }

    const publishedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      UPDATE candidate_resumes 
      SET status = 'active', channel_msg_id = ?, published_at = ?, expires_at = ?
      WHERE id = ?
    `).run(msg.message_id, publishedAt, expiresAt, resumeId);

    try {
      if (fs.existsSync(pdfPath)) {
        await bot.telegram.sendDocument(
          resume.candidate_id,
          { source: pdfPath, filename: `Rezyume_${resume.full_name || 'Nomzod'}.pdf` },
          {
            caption: `✅ *Rezyumeingiz (#${resumeId}) PDF formatda muvaffaqiyatli yaratildi va kanalga joylashtirildi!*`,
            parse_mode: 'Markdown',
          }
        );
      } else {
        await bot.telegram.sendMessage(
          resume.candidate_id,
          `✅ *Rezyumeingiz (#${resumeId}) kanalga joylashtirildi!*`,
          { parse_mode: 'Markdown' }
        );
      }
    } catch (_) {}

    return msg.message_id;
  } catch (err) {
    console.error('[Publish Resume Channel PDF] Xato:', err.message);
  }
}

module.exports = {
  publishVacancyToChannel,
  deactivateVacancyButton,
  updateChannelVacancyText,
  publishResumeToChannel,
};
