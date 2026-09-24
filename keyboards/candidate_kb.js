const { Markup } = require('telegraf');
const { BOT_USERNAME } = require('../config');

function candidateApplyConfirmKb() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Tasdiqlash', 'apply_confirm_yes'),
      Markup.button.callback('✏️ O\'zgartirish', 'apply_confirm_no'),
    ],
  ]);
}

function candidatePaymentKb() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✅ Chek yubordim', 'cand_check_sent')],
  ]);
}

function candidateMainKb() {
  return Markup.keyboard([
    ['👤 Nomzod Kabineti', '📄 Rezyume Joylashtirish'],
    ['📱 Asosiy Menyu'],
  ]).resize();
}

function candidateCabinetKb(stats = { appsCount: 0, resumesCount: 0 }) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(`📋 Topshirilgan Arizalar (${stats.appsCount})`, 'cand_my_apps')],
    [Markup.button.callback(`📄 Mening Rezyumelarim (${stats.resumesCount})`, 'cand_my_resumes')],
    [
      Markup.button.callback('🎫 Token & Obuna', 'cand_token_info'),
      Markup.button.callback('💳 Token Xarid', 'cand_buy_tokens'),
    ],
    [Markup.button.callback('🔄 Yangilash', 'cand_refresh_cabinet')],
  ]);
}

function candidateApplicationsKb(apps = []) {
  const buttons = apps.map((app) => [
    Markup.button.callback(
      `💼 ${app.title || 'Vakansiya'} (${app.company_name || 'Kompaniya'})`,
      `cand_app_view_${app.id}`
    ),
  ]);
  buttons.push([Markup.button.callback('⬅️ Kabinetga qaytish', 'cand_back_cabinet')]);
  return Markup.inlineKeyboard(buttons);
}

function candidateAppDetailKb() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('⬅️ Arizalarga qaytish', 'cand_my_apps')],
    [Markup.button.callback('🏠 Kabinetga qaytish', 'cand_back_cabinet')],
  ]);
}

function candidateResumesKb(resumes = []) {
  const buttons = resumes.map((res) => {
    const statusMap = {
      active: '🟢',
      pending: '🟡',
      expired: '🔴',
      rejected: '⛔',
    };
    const icon = statusMap[res.status] || '📄';
    return [
      Markup.button.callback(
        `${icon} ${res.position} (${res.city || 'Toshkent'})`,
        `cand_res_view_${res.id}`
      ),
    ];
  });
  buttons.push([Markup.button.callback('⬅️ Kabinetga qaytish', 'cand_back_cabinet')]);
  return Markup.inlineKeyboard(buttons);
}

function candidateResumeDetailKb(resume) {
  const buttons = [];
  if (resume.status === 'expired' || resume.status === 'active') {
    buttons.push([
      Markup.button.callback('🔄 Qayta faollashtirish (1 token)', `cand_res_reactivate_${resume.id}`),
    ]);
  }
  if (resume.status !== 'deleted') {
    buttons.push([
      Markup.button.callback('🗑 Rezyumeni o\'chirish', `cand_res_delete_${resume.id}`),
    ]);
  }
  buttons.push([Markup.button.callback('⬅️ Rezyumelarga qaytish', 'cand_my_resumes')]);
  buttons.push([Markup.button.callback('🏠 Kabinetga qaytish', 'cand_back_cabinet')]);
  return Markup.inlineKeyboard(buttons);
}

function candidateResumeCreationTypeKb() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🤖 Bot orqali yaratish', 'res_type_wizard')],
    [Markup.button.callback('✍️ Tayyor rezyumeni yuborish (qo\'lda)', 'res_type_manual')],
  ]);
}

function candidateResumeCategoryKb() {
  return Markup.keyboard([
    ['💼 Sotuv menejeri', '📞 Call-center operatori'],
    ['🚚 Savdo agenti', '🏢 Administrator'],
    ['📱 SMM mutaxassisi', '🎬 Video montajchi'],
    ['🛵 Kuryer', '💻 Dasturchi'],
    ['👨‍🏫 O‘qituvchi', '⚙️ Boshqa soha'],
  ]).resize();
}

function candidateResumeConfirmKb() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Ha, to\'g\'ri', 'res_confirm_yes'),
      Markup.button.callback('✏️ Yo\'q, o\'zgartirish', 'res_confirm_no'),
    ],
  ]);
}

/**
 * Kanalga joylanadigan "Ariza Qoldirish" tugmasi.
 * Deep link orqali botga yo'naltiradi.
 */
function applyButtonKb(vacancyId) {
  return Markup.inlineKeyboard([
    [Markup.button.url(
      '📝 Ariza Qoldirish',
      `https://t.me/${BOT_USERNAME}?start=apply_${vacancyId}`
    )],
  ]);
}

module.exports = {
  candidateMainKb,
  candidateCabinetKb,
  candidateApplicationsKb,
  candidateAppDetailKb,
  candidateResumesKb,
  candidateResumeDetailKb,
  candidateApplyConfirmKb,
  candidatePaymentKb,
  candidateResumeCreationTypeKb,
  candidateResumeCategoryKb,
  candidateResumeConfirmKb,
  applyButtonKb,
};


