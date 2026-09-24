const { getDb } = require('../../database/db');
const { hrMainKb } = require('../../keyboards/hr_kb');
const { isHrRegistered } = require('../../utils/helpers');
const {
  showMyVacancies,
  showVacancyDetail,
  showMatchingCandidates,
  showMatchingCandidateDetail,
  showVacancyApplications,
  deleteVacancy,
  reactivateVacancy,
  showTokenInfo,
} = require('./hr_cabinet');
const { handleHrPaymentCheck } = require('./hr_vacancy');

function registerHrHandlers(bot, stage) {
  // ─── HR Start ─────────────────────────────────────────────────────────────
  bot.hears('/hr', async (ctx) => {
    const userId = ctx.from.id;

    if (!isHrRegistered(userId)) {
      return ctx.scene.enter('hr_register');
    }

    const db = getDb();
    const hr = db.prepare('SELECT * FROM hr_companies WHERE user_id = ?').get(userId);

    await ctx.reply(
      `👋 Xush kelibsiz, *${hr.company_name}*!\n\nQuyidagi bo'limlardan birini tanlang:`,
      { parse_mode: 'Markdown', ...hrMainKb() }
    );
  });

  // ─── HR Menyulari ────────────────────────────────────────────────────────
  bot.hears('📋 Mening E\'lonlarim', async (ctx) => {
    if (!isHrRegistered(ctx.from.id)) return ctx.scene.enter('hr_register');
    await showMyVacancies(ctx);
  });

  bot.hears('➕ Yangi E\'lon', async (ctx) => {
    if (!isHrRegistered(ctx.from.id)) return ctx.scene.enter('hr_register');
    return ctx.scene.enter('hr_vacancy');
  });

  bot.hears('🎫 Token Limiti', async (ctx) => {
    if (!isHrRegistered(ctx.from.id)) return ctx.scene.enter('hr_register');
    await showTokenInfo(ctx);
  });

  // ─── Vakansiya detallariga o'tish ─────────────────────────────────────
  bot.action(/^vac_detail_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    await showVacancyDetail(ctx, parseInt(ctx.match[1]));
  });

  // ─── Mos Keluvchi Nomzodlar Ro'yxati ─────────────────────────────────
  bot.action(/^vac_matching_cands_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    await showMatchingCandidates(ctx, parseInt(ctx.match[1]));
  });

  // ─── Mos Keluvchi Nomzod Rezyumesi Detali ─────────────────────────────
  bot.action(/^hr_view_cand_res_(\d+)_vac_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const resumeId = parseInt(ctx.match[1]);
    const vacancyId = parseInt(ctx.match[2]);
    await showMatchingCandidateDetail(ctx, resumeId, vacancyId);
  });

  // ─── Arizalar ─────────────────────────────────────────────────────────
  bot.action(/^vac_apps_(\d+)$/, async (ctx) => {
    await showVacancyApplications(ctx, parseInt(ctx.match[1]));
  });

  // ─── O'chirish ────────────────────────────────────────────────────────
  bot.action(/^vac_delete_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    await deleteVacancy(ctx, parseInt(ctx.match[1]), bot);
  });

  // ─── Tahrirlash menyusi ───────────────────────────────────────────────
  bot.action(/^vac_edit_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const { showEditFieldsMenu } = require('./hr_cabinet');
    await showEditFieldsMenu(ctx, parseInt(ctx.match[1]));
  });

  // ─── Maydonni tahrirlash ───────────────────────────────────────────────
  bot.action(/^vac_ef_(\d+)_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const vacancyId = parseInt(ctx.match[1]);
    const fieldKey = ctx.match[2];
    const { promptEditField } = require('./hr_cabinet');
    await promptEditField(ctx, vacancyId, fieldKey);
  });

  // ─── Qayta faollashtirish ──────────────────────────────────────────
  bot.action(/^vac_reactivate_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    await reactivateVacancy(ctx, parseInt(ctx.match[1]), bot);
  });

  // ─── Ro'yxat orqaga ───────────────────────────────────────────────────
  bot.action('vac_list_back', async (ctx) => {
    await ctx.answerCbQuery();
    await showMyVacancies(ctx);
  });

  // ─── Ariza ko'rish ────────────────────────────────────────────────────
  bot.action(/^view_app_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const db = getDb();
    const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(parseInt(ctx.match[1]));
    if (!app) return;

    const vacancy = db.prepare('SELECT extra_fields FROM vacancies WHERE id = ?').get(app.vacancy_id);
    const data = JSON.parse(app.data || '{}');
    const extraFields = JSON.parse(vacancy?.extra_fields || '[]');
    const { FIELD_LABELS } = require('../../utils/helpers');

    let text = `📋 *Batafsil Ariza #${app.id}*\n\n`;
    for (const field of extraFields) {
      if (field === 'photo') continue;
      text += `${FIELD_LABELS[field] || field}: *${data[field] || '—'}*\n`;
    }

    await ctx.reply(text, { parse_mode: 'Markdown' });

    // Rasm borsa alohida yuborish
    if (extraFields.includes('photo') && data.photo) {
      await ctx.replyWithPhoto(data.photo);
    }
  });

  // ─── Noop (hech narsa qilmasin) ──────────────────────────────────────
  bot.action('noop', (ctx) => ctx.answerCbQuery());
}

module.exports = { registerHrHandlers };
