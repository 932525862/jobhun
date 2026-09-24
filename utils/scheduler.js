const cron = require('node-cron');
const { getDb } = require('../database/db');
const { deactivateVacancyButton } = require('./channel');

/**
 * Schedulerni ishga tushiradi:
 * 1. Har 10 daqiqa: muddati o'tgan vakansiyalarni expired qilish
 * 2. Har 1 soat: muddati o'tgan obunalarni tekshirish va tokenlarni 0 ga aylantirish
 */
function startScheduler(bot) {
  // Har 10 daqiqa — vakansiyalar muddatini tekshirish
  cron.schedule('*/10 * * * *', async () => {
    try {
      const db = getDb();
      const now = new Date().toISOString();

      // Muddati o'tgan aktiv vakansiyalar
      const expired = db.prepare(`
        SELECT id FROM vacancies 
        WHERE status = 'active' AND expires_at < ?
      `).all(now);

      for (const v of expired) {
        await deactivateVacancyButton(bot, v.id);
        console.log(`[Scheduler] Vakansiya #${v.id} expired qilindi`);
      }

      // Muddati o'tgan aktiv rezyumelar
      db.prepare(`
        UPDATE candidate_resumes 
        SET status = 'expired'
        WHERE status = 'active' AND expires_at < ?
      `).run(now);
    } catch (err) {
      console.error('[Scheduler] Vakansiya tekshiruvda xato:', err.message);
    }
  });

  // Har 1 soat — obunalar muddatini tekshirish
  cron.schedule('0 * * * *', () => {
    try {
      const db = getDb();
      const now = new Date().toISOString();

      // HR obunalari tugagan
      db.prepare(`
        UPDATE hr_companies 
        SET tokens = 0, is_active = 0 
        WHERE is_active = 1 AND subscription_end < ?
      `).run(now);

      // Nomzod obunalari tugagan
      db.prepare(`
        UPDATE candidates 
        SET tokens = 0, is_active = 0 
        WHERE is_active = 1 AND subscription_end < ?
      `).run(now);

      console.log('[Scheduler] Obunalar tekshirildi');
    } catch (err) {
      console.error('[Scheduler] Obuna tekshiruvda xato:', err.message);
    }
  });

  console.log('[Scheduler] Ishga tushdi ✅');
}

module.exports = { startScheduler };
