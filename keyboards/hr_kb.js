const { Markup } = require('telegraf');

// ─── HR klaviaturalari ───────────────────────────────────────────────────────

function hrMainKb() {
  return Markup.keyboard([
    ['📋 Mening E\'lonlarim', '➕ Yangi E\'lon'],
    ['🎫 Token Limiti', '📱 Asosiy Menyu'],
  ]).resize();
}

function hrCreationTypeKb() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🤖 Bot orqali yaratish', 'create_type_wizard')],
    [Markup.button.callback('✍️ Tayyor e\'lonni yuborish (qo\'lda)', 'create_type_manual')],
  ]);
}

function hrVacancyExtraFieldsKb(selected = []) {
  const fields = [
    { key: 'full_name',   label: '👤 Ism Familiya' },
    { key: 'birth_date',  label: '🎂 Tug\'ilgan kun' },
    { key: 'expected_salary', label: '💵 Kutilgan maosh' },
    { key: 'languages',   label: '🌐 Til bilish darajasi' },
    { key: 'photo',       label: '🖼 Rasm yuklash' },
    { key: 'education',   label: '🎓 Ta\'lim (o\'qiyaptimi)' },
    { key: 'certificate', label: '📜 Sertifikat bormi' },
    { key: 'experience',  label: '💼 Tajriba bormi' },
    { key: 'portfolio',   label: '🗂 Portfolio' },
    { key: 'telegram',    label: '📱 Telegram username' },
  ];

  const buttons = fields.map(f => {
    const isSelected = selected.includes(f.key);
    return [Markup.button.callback(
      `${isSelected ? '✅' : '⬜'} ${f.label}`,
      `extra_toggle_${f.key}`
    )];
  });

  buttons.push([Markup.button.callback('✔️ Tayyor', 'extra_done')]);
  return Markup.inlineKeyboard(buttons);
}

function hrConfirmKb() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✨ AI bilan e\'lonni yaxshilash', 'vac_ai_improve'),
    ],
    [
      Markup.button.callback('✅ Ha, to\'g\'ri', 'vac_confirm_yes'),
      Markup.button.callback('✏️ Yo\'q, o\'zgartirish', 'vac_confirm_no'),
    ],
  ]);
}

function hrPaymentConfirmKb() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✅ Chek yubordim', 'check_sent')],
  ]);
}

function hrVacancyListKb(vacancies) {
  const buttons = vacancies.map(v => [
    Markup.button.callback(`📌 ${v.title} — ${v.status === 'active' ? '🟢' : v.status === 'expired' ? '🔴' : '🟡'}`, `vac_detail_${v.id}`)
  ]);
  return Markup.inlineKeyboard(buttons);
}

function hrCategoryKb() {
  return Markup.keyboard([
    ['💼 Sotuv menejeri', '📞 Call-center operatori'],
    ['🚚 Savdo agenti', '🏢 Administrator'],
    ['📱 SMM mutaxassisi', '🎬 Video montajchi'],
    ['🛵 Kuryer', '💻 Dasturchi'],
    ['👨‍🏫 O‘qituvchi', '⚙️ Boshqa soha'],
  ]).resize();
}

function hrVacancyDetailKb(vacancy, matchingCandCount = 0) {
  const buttons = [];
  if (vacancy.status === 'active') {
    buttons.push([Markup.button.callback('📨 Arizalar', `vac_apps_${vacancy.id}`)]);
    buttons.push([
      Markup.button.callback(
        `🎯 Mos keluvchi nomzodlar (${matchingCandCount} ta)`,
        `vac_matching_cands_${vacancy.id}`
      ),
    ]);
    buttons.push([Markup.button.callback('✏️ E\'lonni tahrirlash', `vac_edit_${vacancy.id}`)]);
    buttons.push([Markup.button.callback('🗑 E\'lonni o\'chirish', `vac_delete_${vacancy.id}`)]);
  } else if (vacancy.status === 'pending') {
    buttons.push([Markup.button.callback('✏️ E\'lonni tahrirlash', `vac_edit_${vacancy.id}`)]);
    buttons.push([Markup.button.callback('⏳ Admin tasdiqlashini kutmoqda...', 'noop')]);
  } else if (vacancy.status === 'expired') {
    buttons.push([Markup.button.callback('📨 Arizalar', `vac_apps_${vacancy.id}`)]);
    buttons.push([Markup.button.callback('✏️ E\'lonni tahrirlash', `vac_edit_${vacancy.id}`)]);
    buttons.push([Markup.button.callback('🔄 Qayta faollashtirish', `vac_reactivate_${vacancy.id}`)]);
  }
  buttons.push([Markup.button.callback('🔙 Orqaga', 'vac_list_back')]);
  return Markup.inlineKeyboard(buttons);
}

function hrEditFieldsKb(vacancy) {
  const buttons = [];
  if (vacancy.creation_type === 'manual') {
    buttons.push([Markup.button.callback('💼 Lavozim nomi', `vac_ef_${vacancy.id}_title`)]);
    buttons.push([Markup.button.callback('📂 Soha / Kategoriya', `vac_ef_${vacancy.id}_category`)]);
    buttons.push([Markup.button.callback('📝 Tayyor e\'lon matni', `vac_ef_${vacancy.id}_raw_text`)]);
  } else {
    buttons.push([Markup.button.callback('💼 Lavozim nomi', `vac_ef_${vacancy.id}_title`)]);
    buttons.push([Markup.button.callback('📂 Soha / Kategoriya', `vac_ef_${vacancy.id}_category`)]);
    buttons.push([Markup.button.callback('🏢 Kompaniya nomi', `vac_ef_${vacancy.id}_company_name`)]);
    buttons.push([Markup.button.callback('📍 Ish joyi manzil', `vac_ef_${vacancy.id}_location`)]);
    buttons.push([Markup.button.callback('💵 Maosh', `vac_ef_${vacancy.id}_salary`)]);
    buttons.push([Markup.button.callback('🕒 Ish vaqti', `vac_ef_${vacancy.id}_work_time`)]);
    buttons.push([Markup.button.callback('🎯 Asosiy vazifalar', `vac_ef_${vacancy.id}_tasks`)]);
    buttons.push([Markup.button.callback('✍️ Talablar', `vac_ef_${vacancy.id}_requirements`)]);
    buttons.push([Markup.button.callback('✅ Ish sharoitlari', `vac_ef_${vacancy.id}_conditions`)]);
  }
  buttons.push([Markup.button.callback('🔙 Orqaga', `vac_detail_${vacancy.id}`)]);
  return Markup.inlineKeyboard(buttons);
}

module.exports = {
  hrMainKb,
  hrCreationTypeKb,
  hrCategoryKb,
  hrVacancyExtraFieldsKb,
  hrConfirmKb,
  hrPaymentConfirmKb,
  hrVacancyListKb,
  hrVacancyDetailKb,
  hrEditFieldsKb,
};
