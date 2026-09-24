const { Markup } = require('telegraf');

// ─── Admin klaviaturalari ───────────────────────────────────────────────────

function adminMainKb() {
  return Markup.keyboard([
    ['💳 HR To\'lovlar', '👤 Nomzod To\'lovlar'],
    ['📋 Kutilayotgan E\'lonlar', '📄 Kutilayotgan Rezyumlar'],
    ['🎨 Kutilayotgan Bannerlar', '📊 Statistika'],
    ['⚙️ Sozlamalar', '🌐 Web Panel'],
  ]).resize();
}

function adminPaymentKb(paymentId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Tasdiqlash', `pay_approve_${paymentId}`),
      Markup.button.callback('❌ Bekor qilish', `pay_reject_${paymentId}`),
    ],
  ]);
}

function adminSettingsKb() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('💰 HR Narxi', 'set_hr_price')],
    [Markup.button.callback('🎫 HR Tokenlar', 'set_hr_tokens')],
    [Markup.button.callback('📅 HR Muddat (kun)', 'set_hr_days')],
    [Markup.button.callback('💰 Nomzod Narxi', 'set_candidate_price')],
    [Markup.button.callback('🎫 Nomzod Tokenlar', 'set_candidate_tokens')],
    [Markup.button.callback('📅 Nomzod Muddat (kun)', 'set_candidate_days')],
    [Markup.button.callback('💳 Karta Raqami', 'set_card_number')],
    [Markup.button.callback('👤 Karta Egasi', 'set_card_owner')],
  ]);
}

function adminPublishTimeKb(vacancyId) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('⚡️ Zudlik bilan (Darhol)', `pub_now_${vacancyId}`)],
    [
      Markup.button.callback('⏱ 15 daqiqada', `pub_delay_${vacancyId}_15`),
      Markup.button.callback('⏱ 30 daqiqada', `pub_delay_${vacancyId}_30`),
    ],
    [
      Markup.button.callback('🕒 1 soatda', `pub_delay_${vacancyId}_60`),
      Markup.button.callback('🕒 2 soatda', `pub_delay_${vacancyId}_120`),
    ],
    [Markup.button.callback('✏️ Boshqa vaqt (daqiqa yozish)', `pub_custom_${vacancyId}`)],
  ]);
}

function adminPublishResumeTimeKb(resumeId) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('⚡️ Zudlik bilan (Darhol)', `pub_res_now_${resumeId}`)],
    [
      Markup.button.callback('⏱ 20 daqiqada (Tavsiya)', `pub_res_delay_${resumeId}_20`),
      Markup.button.callback('⏱ 45 daqiqada', `pub_res_delay_${resumeId}_45`),
    ],
    [
      Markup.button.callback('🕒 1 soatda', `pub_res_delay_${resumeId}_60`),
      Markup.button.callback('🕒 2 soatda', `pub_res_delay_${resumeId}_120`),
    ],
    [Markup.button.callback('✏️ Boshqa vaqt (daqiqa yozish)', `pub_res_custom_${resumeId}`)],
  ]);
}

// ─── Admin vacancy inline keyboard ───────────────────────────────────────────
function adminVacancyKb(vacancyId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Tasdiqlash', `vac_approve_${vacancyId}`),
      Markup.button.callback('❌ Rad etish', `vac_reject_${vacancyId}`),
    ],
  ]);
}

// ─── Admin resume inline keyboard ─────────────────────────────────────────────
function adminResumeKb(resumeId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Tasdiqlash', `res_approve_${resumeId}`),
      Markup.button.callback('❌ Rad etish', `res_reject_${resumeId}`),
    ],
  ]);
}

// ─── Admin banner inline keyboard ─────────────────────────────────────────────
function adminBannerKb(bannerId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Faollashtirish', `banner_approve_${bannerId}`),
      Markup.button.callback('❌ Rad etish', `banner_reject_${bannerId}`),
    ],
  ]);
}

module.exports = {
  adminMainKb,
  adminPaymentKb,
  adminSettingsKb,
  adminPublishTimeKb,
  adminPublishResumeTimeKb,
  adminVacancyKb,
  adminResumeKb,
  adminBannerKb,
};
