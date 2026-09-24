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
  if (!vacancy) return;

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
  if (!vacancy || !vacancy.channel_msg_id) return;

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
 * Kanalga nomzod rezyumesini yuboradi
 */
async function publishResumeToChannel(bot, resumeId) {
  const db = getDb();
  const resume = db.prepare('SELECT * FROM candidate_resumes WHERE id = ?').get(resumeId);
  if (!resume) return;

  const { buildResumeChannelText } = require('./helpers');
  const text = buildResumeChannelText(resume, true);

  try {
    const msg = await bot.telegram.sendMessage(CHANNEL_ID, text, {
      parse_mode: 'Markdown',
    });

    // Muddatni hisoblash (14 kun)
    const publishedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      UPDATE candidate_resumes 
      SET status = 'active', channel_msg_id = ?, published_at = ?, expires_at = ?
      WHERE id = ?
    `).run(msg.message_id, publishedAt, expiresAt, resumeId);

    // Nomzodga xabar
    try {
      await bot.telegram.sendMessage(
        resume.candidate_id,
        `✅ *Rezyumeingiz (#${resumeId}) kanalga joylashtirildi!*`,
        { parse_mode: 'Markdown' }
      );
    } catch (_) {}

    return msg.message_id;
  } catch (err) {
    console.error('[Publish Resume Channel] Xato:', err.message);
  }
}

module.exports = {
  publishVacancyToChannel,
  deactivateVacancyButton,
  updateChannelVacancyText,
  publishResumeToChannel,
};
