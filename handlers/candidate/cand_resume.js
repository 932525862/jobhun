const { Scenes, Composer, Markup } = require('telegraf');
const { getDb, getSetting } = require('../../database/db');
const {
  candidateMainKb,
  candidateResumeCreationTypeKb,
  candidateResumeCategoryKb,
  candidateResumeConfirmKb,
} = require('../../keyboards/candidate_kb');
const {
  buildResumeChannelText,
  cleanAndFixText,
  checkSceneCommand,
  isCandidateRegistered,
  getCategoryPreset,
} = require('../../utils/helpers');
const { ADMIN_IDS } = require('../../config');
const { sendPaymentInfo } = require('../hr/hr_vacancy');

// ── Step 0: Creation Type Selection
const step0 = async (ctx) => {
  ctx.wizard.state.resume = {};
  await ctx.reply(
    '📄 *Rezyume yaratish usulini tanlang:*',
    { parse_mode: 'Markdown', ...candidateResumeCreationTypeKb() }
  );
  return ctx.wizard.next();
};

// ── Step 1: Choice handler (Composer)
const step1 = new Composer();
step1.action('res_type_wizard', async (ctx) => {
  await ctx.answerCbQuery();
  ctx.wizard.state.resume.creation_type = 'wizard';
  const db = getDb();
  const cand = db.prepare('SELECT full_name FROM candidates WHERE user_id = ?').get(ctx.from.id);
  await ctx.reply(
    `👤 *Ism va Familiyangizni kiriting:*\n_(Avvalgi: ${cand ? cand.full_name : ''})_`,
    { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
  );
  return ctx.wizard.selectStep(2);
});

step1.action('res_type_manual', async (ctx) => {
  await ctx.answerCbQuery();
  ctx.wizard.state.resume.creation_type = 'manual';
  const db = getDb();
  const cand = db.prepare('SELECT full_name FROM candidates WHERE user_id = ?').get(ctx.from.id);
  await ctx.reply(
    `👤 *Ism va Familiyangizni kiriting:*\n_(Avvalgi: ${cand ? cand.full_name : ''})_`,
    { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
  );
  return ctx.wizard.selectStep(2);
});

step1.use(async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (ctx.message) {
    return ctx.reply('⬆️ Iltimos, yuqoridagi tugmalardan birini tanlang:', candidateResumeCreationTypeKb());
  }
});

// ── Step 2: Full Name -> Asks for Category
const step2 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (!ctx.message?.text) return ctx.reply('Iltimos, matn kiriting:');
  ctx.wizard.state.resume.full_name = cleanAndFixText(ctx.message.text);

  await ctx.reply(
    '📂 *Qaysi soha bo\'yicha rezyume to\'ldirmoqchisiz?*\n_(Quyidagi yo\'nalishlardan birini tanlang):_',
    { parse_mode: 'Markdown', ...candidateResumeCategoryKb() }
  );
  return ctx.wizard.selectStep(3);
};

// ── Step 3: Category Input -> Asks for Desired Position with Category Hint
const step3 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (!ctx.message?.text) return ctx.reply('Iltimos, tugmalardan birini tanlang yoki sohani matn ko\'rinishida kiriting:');
  const cat = cleanAndFixText(ctx.message.text);
  ctx.wizard.state.resume.category = cat;

  const preset = getCategoryPreset(cat);

  await ctx.reply(
    `🎯 *Kutilayotgan lavozimni kiriting:*\n${preset.positionHint}`,
    { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
  );
  return ctx.wizard.selectStep(4);
};

// ── Step 4: Position Input -> Asks for Raw text (Manual) OR City (Wizard)
const step4 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (!ctx.message?.text) return ctx.reply('Iltimos, matn kiriting:');
  ctx.wizard.state.resume.position = cleanAndFixText(ctx.message.text);

  if (ctx.wizard.state.resume.creation_type === 'manual') {
    await ctx.reply(
      '📝 *Tayyor rezyume matnini yuboring:*\n_(Barcha ma\'lumotlar, tajriba, ko\'nikmalar va ta\'lim bilan)_',
      { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
    );
    return ctx.wizard.selectStep(5);
  } else {
    await ctx.reply(
      '📍 *Shahringizni kiriting:*\n_(Misol: Toshkent shahri, Samarqand)_',
      { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
    );
    return ctx.wizard.selectStep(5);
  }
};

// ── Step 5: Raw text (Manual) OR City (Wizard)
const step5 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (!ctx.message?.text) return ctx.reply('Iltimos, matn kiriting:');

  if (ctx.wizard.state.resume.creation_type === 'manual') {
    ctx.wizard.state.resume.raw_text = cleanAndFixText(ctx.message.text);
    return showResumePreview(ctx);
  } else {
    ctx.wizard.state.resume.city = cleanAndFixText(ctx.message.text);
    await ctx.reply(
      '💼 *Ish tajribangiz muddati:*\n_(Misol: 3 yil, 1.5 yil, Tajribasiz)_',
      { parse_mode: 'Markdown' }
    );
    return ctx.wizard.selectStep(6);
  }
};

// ── Step 6: Experience Years (Wizard)
const step6 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (!ctx.message?.text) return ctx.reply('Iltimos, matn kiriting:');
  ctx.wizard.state.resume.experience_years = cleanAndFixText(ctx.message.text);

  await ctx.reply(
    '💰 *Kutilayotgan maosh:*\n_(Misol: 6 000 000 — 10 000 000 so\'m, 800$)_',
    { parse_mode: 'Markdown' }
  );
  return ctx.wizard.selectStep(7);
};

// ── Step 7: Expected Salary (Wizard)
const step7 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (!ctx.message?.text) return ctx.reply('Iltimos, matn kiriting:');
  ctx.wizard.state.resume.expected_salary = cleanAndFixText(ctx.message.text);

  await ctx.reply(
    '🕐 *Ish turi / Bandlik formatini kiriting:*\n_(Misol: Ofis / Gibrid / Masofaviy)_',
    { parse_mode: 'Markdown' }
  );
  return ctx.wizard.selectStep(8);
};

// ── Step 8: Employment Type (Wizard)
const step8 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (!ctx.message?.text) return ctx.reply('Iltimos, matn kiriting:');
  ctx.wizard.state.resume.employment_type = cleanAndFixText(ctx.message.text);

  await ctx.reply(
    '📝 *O\'zingiz haqida qisqacha ma\'lumot:*\n_(2–4 jumla. Kuchli taraflaringiz va maqsadlaringiz haqida)_',
    { parse_mode: 'Markdown' }
  );
  return ctx.wizard.selectStep(9);
};

// ── Step 9: About Me -> Asks for Experience Details with Category Hint
const step9 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (!ctx.message?.text) return ctx.reply('Iltimos, matn kiriting:');
  ctx.wizard.state.resume.about_me = cleanAndFixText(ctx.message.text);

  const preset = getCategoryPreset(ctx.wizard.state.resume.category);

  await ctx.reply(
    `💼 *Ish tajribangiz tafsilotlari (Kompaniya va vazifalaringiz):*\n${preset.expHint}`,
    { parse_mode: 'Markdown' }
  );
  return ctx.wizard.selectStep(10);
};

// ── Step 10: Experience Details -> Asks for Skills with Category Hint
const step10 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (!ctx.message?.text) return ctx.reply('Iltimos, matn kiriting:');
  ctx.wizard.state.resume.experience_details = cleanAndFixText(ctx.message.text);

  const preset = getCategoryPreset(ctx.wizard.state.resume.category);

  await ctx.reply(
    `🧠 *Ko'nikma va bilimlar:*\n${preset.skillsHint}`,
    { parse_mode: 'Markdown' }
  );
  return ctx.wizard.selectStep(11);
};

// ── Step 11: Skills (Wizard)
const step11 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (!ctx.message?.text) return ctx.reply('Iltimos, matn kiriting:');
  ctx.wizard.state.resume.skills = cleanAndFixText(ctx.message.text);

  await ctx.reply(
    '🎓 *Ta\'limingiz (O\'quv yurti, mutaxassislik, bitirgan yilingiz):*\n_(Misol: TUIT, Kompyuter injiniringi — 2023)_',
    { parse_mode: 'Markdown' }
  );
  return ctx.wizard.selectStep(12);
};

// ── Step 12: Education (Wizard)
const step12 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (!ctx.message?.text) return ctx.reply('Iltimos, matn kiriting:');
  ctx.wizard.state.resume.education = cleanAndFixText(ctx.message.text);

  await ctx.reply(
    '🌐 *Til bilish darajalaringiz:*\n_(Misol:\n🇺🇿 O\'zbekcha — Ona tili\n🇷🇺 Ruscha — Erkin\n🇬🇧 Inglizcha — B2)_',
    { parse_mode: 'Markdown' }
  );
  return ctx.wizard.selectStep(13);
};

// ── Step 13: Languages (Wizard)
const step13 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (!ctx.message?.text) return ctx.reply('Iltimos, matn kiriting:');
  ctx.wizard.state.resume.languages = cleanAndFixText(ctx.message.text);

  await ctx.reply(
    '➕ *Qo\'shimcha ma\'lumotlar (Haydovchilik guvohnomasi, portfolio va h.k.):*\n_(Misol: B toifa guvohnoma, komandirovkaga tayyor)_',
    { parse_mode: 'Markdown' }
  );
  return ctx.wizard.selectStep(14);
};

// ── Step 14: Additional Info (Wizard)
const step14 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (!ctx.message?.text) return ctx.reply('Iltimos, matn kiriting:');
  ctx.wizard.state.resume.additional_info = cleanAndFixText(ctx.message.text);
  return showResumePreview(ctx);
};

// ── Show Preview Helper
async function showResumePreview(ctx) {
  const resume = ctx.wizard.state.resume;
  const previewText =
    buildResumeChannelText(resume, false) +
    '\n\n─────────────────────\n✅ *Ma\'lumotlar to\'g\'rimi?*';

  await ctx.reply(previewText, {
    parse_mode: 'Markdown',
    ...candidateResumeConfirmKb(),
  });
  return ctx.wizard.selectStep(15);
}

// ── Step 15: Confirmation (Composer)
const step15 = new Composer();

step15.action('res_ai_improve', async (ctx) => {
  await ctx.answerCbQuery('✨ AI matnni tahlil qilib, yaxshilamoqda...');

  const resume = ctx.wizard.state.resume || {};
  const { improveResumeText } = require('../../services/ai');

  try {
    const loadingMsg = await ctx.reply('🔄 *AI yordamida rezyume matni yaxshilanmoqda, iltimos kuting...*', { parse_mode: 'Markdown' });

    if (resume.creation_type === 'manual' && resume.raw_text) {
      resume.raw_text = await improveResumeText(resume.raw_text);
    } else {
      if (resume.about_me) {
        resume.about_me = await improveResumeText(resume.about_me);
      }
      if (resume.experience_details) {
        resume.experience_details = await improveResumeText(resume.experience_details);
      }
      if (resume.skills) {
        resume.skills = await improveResumeText(resume.skills);
      }
    }

    try {
      await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);
    } catch (_) {}

    await ctx.reply('✨ *Rezyume matni AI yordamida muvaffaqiyatli yaxshilandi!*', { parse_mode: 'Markdown' });
    return showResumePreview(ctx);
  } catch (err) {
    console.error('Bot AI Resume Error:', err);
    return ctx.reply(`⚠️ AI matnni yaxshilashda xatolik yuz berdi: ${err.message}`);
  }
});

step15.action('res_confirm_yes', async (ctx) => {
  await ctx.answerCbQuery();

  const db = getDb();
  const cand = db.prepare('SELECT * FROM candidates WHERE user_id = ?').get(ctx.from.id);
  const resume = ctx.wizard.state.resume;

  const resResult = db.prepare(`
    INSERT INTO candidate_resumes
      (candidate_id, full_name, position, category, city, experience_years, expected_salary, employment_type, about_me, experience_details, skills, education, languages, additional_info, raw_text, creation_type, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `).run(
    ctx.from.id,
    resume.full_name || cand?.full_name || 'Noma\'lum',
    resume.position || 'Mutaxassis',
    resume.category || 'Boshqa soha',
    resume.city || 'Toshkent shahri',
    resume.experience_years || '—',
    resume.expected_salary || '—',
    resume.employment_type || '—',
    resume.about_me || '',
    resume.experience_details || '',
    resume.skills || '',
    resume.education || '',
    resume.languages || '',
    resume.additional_info || '',
    resume.raw_text || '',
    resume.creation_type || 'wizard'
  );
  const resumeId = resResult.lastInsertRowid;

  // Active tokens check
  if (cand && cand.is_active && cand.tokens > 0) {
    db.prepare('UPDATE candidates SET tokens = tokens - 1 WHERE user_id = ?').run(ctx.from.id);
    const remaining = db.prepare('SELECT tokens FROM candidates WHERE user_id = ?').get(ctx.from.id);

    // Default 20 minutda kanalga joylash taymerini yoqish
    const { publishResumeToChannel } = require('../../utils/channel');
    setTimeout(async () => {
      try {
        await publishResumeToChannel(ctx.telegram, resumeId);
      } catch (e) {
        console.error('[Token Resume Schedule] Xato:', e.message);
      }
    }, 20 * 60 * 1000);

    try {
      await ctx.editMessageText(
        `✅ *Rezyumeingiz qabul qilindi!*\n\n` +
        `📌 *${resume.position}*\n` +
        `📂 Soha: *${resume.category || '—'}*\n\n` +
        `⏳ Rezyumeingiz *20 daqiqa* ichida kanalga joylashtiriladi.\n` +
        `🎫 Qolgan tokenlar: *${remaining.tokens}* ta`,
        { parse_mode: 'Markdown' }
      );
    } catch (_) {}

    await ctx.reply('👇 Quyidagi menyudan foydalanishingiz mumkin:', candidateMainKb());

    const { adminPublishResumeTimeKb } = require('../../keyboards/admin_kb');

    // Admin ga bildirishnoma
    for (const adminId of ADMIN_IDS) {
      try {
        await ctx.telegram.sendMessage(
          adminId,
          `📄 *Yangi Nomzod Rezyumesi (Token orqali)*\n\n` +
          `👤 Nomzod: ${cand.full_name} (${cand.phone})\n` +
          `🎯 Lavozim: *${resume.position}*\n` +
          `📂 Soha: *${resume.category || '—'}*\n` +
          `🔢 Rezyume ID: #${resumeId}\n\n` +
          `🕒 *Rezyume kanalga qachon joylashtirilsin? (Standart: 20 minutda)*`,
          {
            parse_mode: 'Markdown',
            ...adminPublishResumeTimeKb(resumeId),
          }
        );
      } catch (e) {
        console.error('[Notify Admin Resume] Xato:', e.message);
      }
    }

    return ctx.scene.leave();
  }

  // Token yetarli emas -> to'lov so'rash
  ctx.session.pendingResumeId = resumeId;
  ctx.session.waitingCandCheck = true;

  try {
    await ctx.editMessageText('✅ *Rezyume ma\'lumotlari saqlandi!*\n\nEndi to\'lov amalga oshirilsin:', {
      parse_mode: 'Markdown',
    });
  } catch (_) {}

  await sendPaymentInfo(ctx, 'candidate');
  await ctx.reply('👇 Quyidagi menyudan foydalanishingiz mumkin:', candidateMainKb());
  return ctx.scene.leave();
});

step15.action('res_confirm_no', async (ctx) => {
  await ctx.answerCbQuery();
  try {
    await ctx.editMessageText('✏️ Qaytadan boshlaylik.');
  } catch (_) {}
  await ctx.reply('*"📄 Rezyume Joylashtirish"* tugmasini bosing.', candidateMainKb());
  return ctx.scene.leave();
});

step15.use(async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (ctx.message) {
    return ctx.reply('⬆️ Yuqoridagi *"✅ Ha, to\'g\'ri"* yoki *"✏️ Yo\'q, o\'zgartirish"* tugmalaridan birini tanlang.');
  }
});

const candidateResumeScene = new Scenes.WizardScene(
  'candidate_resume',
  step0, step1, step2, step3, step4, step5, step6, step7, step8, step9, step10, step11, step12, step13, step14, step15
);

module.exports = { candidateResumeScene };
