const { Scenes, Composer, Markup } = require('telegraf');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { getDb } = require('../../database/db');
const {
  candidateMainKb,
  candidateResumeCreationTypeKb,
  candidateResumeCategoryKb,
  candidateResumeConfirmKb,
  candidateLanguageKb,
} = require('../../keyboards/candidate_kb');
const {
  buildResumeChannelText,
  cleanAndFixText,
  checkSceneCommand,
  getCategoryPreset,
} = require('../../utils/helpers');
const { ADMIN_IDS } = require('../../config');
const { sendPaymentInfo } = require('../hr/hr_vacancy');
const { improveResumeText } = require('../../services/ai');
const { generateResumePdfFile } = require('../../services/pdf_generator');

// Helper: Download file from URL and save to local path
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    proto.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
      }
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(destPath); });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

// ── Step 0: Creation Type Selection
const step0 = async (ctx) => {
  ctx.wizard.state.resume = {};
  await ctx.reply(
    '📄 *PDF Rezyume Yaratish:*',
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

// ── Step 4: Position Input -> Asks for Photo Upload (MAJBURIY)
const step4 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (!ctx.message?.text) return ctx.reply('Iltimos, matn kiriting:');
  ctx.wizard.state.resume.position = cleanAndFixText(ctx.message.text);

  await ctx.reply(
    '🖼 *Fotosuratingizni yuboring (PDF rezyume uchun MAJBURIY):*\n\n📷 Galereyadan rasm yuboring yoki\n📎 Fayl sifatida rasm yuboring\n\n_(Rasm aniq va sifatli bo\'lishi kerak)_',
    { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
  );
  return ctx.wizard.selectStep(5);
};

// ── Step 5: Photo Handler -> Asks for Contact (Phone & Telegram)
const step5 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;

  let localPhotoPath = '';
  const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  try {
    let fileId = '';
    let fileExt = '.jpg';

    // Photo from gallery (compressed)
    if (ctx.message?.photo && ctx.message.photo.length > 0) {
      const highestPhoto = ctx.message.photo[ctx.message.photo.length - 1];
      fileId = highestPhoto.file_id;
      fileExt = '.jpg';
    }
    // Document/file upload (uncompressed image)
    else if (ctx.message?.document && ctx.message.document.mime_type?.startsWith('image/')) {
      fileId = ctx.message.document.file_id;
      const origName = ctx.message.document.file_name || '';
      fileExt = path.extname(origName) || '.jpg';
    }
    else {
      return ctx.reply(
        '⚠️ *PDF Rezyume uchun fotosurat yuklash majburiy!*\n\n' +
        '📷 Galereyadan rasm yuboring yoki\n' +
        '📎 Fayl sifatida rasm yuboring',
        { parse_mode: 'Markdown' }
      );
    }

    // Download the photo from Telegram and save locally
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const fileUrl = fileLink.href || String(fileLink);
    const uniqueName = `resume_photo_${ctx.from.id}_${Date.now()}${fileExt}`;
    localPhotoPath = path.join(uploadsDir, uniqueName);

    await downloadFile(fileUrl, localPhotoPath);

    // Verify file was saved
    if (!fs.existsSync(localPhotoPath)) {
      return ctx.reply('⚠️ Rasmni saqlashda xatolik yuz berdi. Iltimos, qayta yuboring.');
    }

    ctx.wizard.state.resume.photo_url = localPhotoPath;

  } catch (err) {
    console.error('[Resume Photo] Error:', err.message);
    return ctx.reply('⚠️ Rasmni yuklab olishda xatolik. Iltimos, qayta yuboring.');
  }

  const db = getDb();
  const cand = db.prepare('SELECT phone FROM candidates WHERE user_id = ?').get(ctx.from.id);

  await ctx.reply(
    `📱 *Telefon raqamingizni kiriting:*\n_(Joriy: ${cand?.phone || 'kiritilmagan'})_`,
    {
      parse_mode: 'Markdown',
      ...Markup.keyboard([
        [Markup.button.contactRequest('📱 Telefon raqamni ulashish')],
      ]).resize(),
    }
  );
  return ctx.wizard.selectStep(6);
};

// ── Step 6: Phone -> Asks for Age
const step6 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;

  let phone = '';
  if (ctx.message?.contact?.phone_number) {
    phone = ctx.message.contact.phone_number;
    if (!phone.startsWith('+')) phone = '+' + phone;
  } else if (ctx.message?.text) {
    phone = cleanAndFixText(ctx.message.text);
  } else {
    return ctx.reply('Iltimos, telefon raqamingizni kiriting:');
  }

  ctx.wizard.state.resume.phone = phone;
  ctx.wizard.state.resume.telegram = ctx.from.username ? `@${ctx.from.username}` : '';

  await ctx.reply(
    '🎂 *Yoshingizni kiriting:*\n_(Misol: 24 yosh, 1999-yil)_',
    { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
  );
  return ctx.wizard.selectStep(7);
};

// ── Step 7: Age -> Asks for City
const step7 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (!ctx.message?.text) return ctx.reply('Iltimos, yoshingizni matn ko\'rinishida kiriting:');
  ctx.wizard.state.resume.age = cleanAndFixText(ctx.message.text);

  await ctx.reply(
    '📍 *Shahringizni kiriting:*\n_(Misol: Toshkent shahri, Samarqand)_',
    { parse_mode: 'Markdown' }
  );
  return ctx.wizard.selectStep(8);
};

// ── Step 8: City -> Asks for Experience Duration
const step8 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (!ctx.message?.text) return ctx.reply('Iltimos, shahar nomini kiriting:');
  ctx.wizard.state.resume.city = cleanAndFixText(ctx.message.text);

  await ctx.reply(
    '💼 *Ish tajribangiz muddati:*\n_(Misol: 3 yil, 1.5 yil, Tajribasiz)_',
    { parse_mode: 'Markdown' }
  );
  return ctx.wizard.selectStep(9);
};

// ── Step 9: Experience Duration -> Asks for Expected Salary
const step9 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (!ctx.message?.text) return ctx.reply('Iltimos, tajriba muddatini kiriting:');
  ctx.wizard.state.resume.experience_years = cleanAndFixText(ctx.message.text);

  await ctx.reply(
    '💰 *Kutilayotgan maosh:*\n_(Misol: 6 000 000 — 10 000 000 so\'m, 800$)_',
    { parse_mode: 'Markdown' }
  );
  return ctx.wizard.selectStep(10);
};

// ── Step 10: Expected Salary -> Asks for Employment Type
const step10 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (!ctx.message?.text) return ctx.reply('Iltimos, kutilayotgan maoshni kiriting:');
  ctx.wizard.state.resume.expected_salary = cleanAndFixText(ctx.message.text);

  await ctx.reply(
    '🕐 *Ish turi / Bandlik formatini kiriting:*\n_(Misol: Ofis / Gibrid / Masofaviy)_',
    { parse_mode: 'Markdown' }
  );
  return ctx.wizard.selectStep(11);
};

// ── Step 11: Employment Type -> Asks for About Me
const step11 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (!ctx.message?.text) return ctx.reply('Iltimos, bandlik formatini kiriting:');
  ctx.wizard.state.resume.employment_type = cleanAndFixText(ctx.message.text);

  await ctx.reply(
    '📝 *O\'zingiz haqida qisqacha ma\'lumot:*\n_(2–4 jumla. Kuchli taraflaringiz va maqsadlaringiz haqida)_',
    { parse_mode: 'Markdown' }
  );
  return ctx.wizard.selectStep(12);
};

// ── Step 12: About Me -> Asks for Experience Details with Category Hint
const step12 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (!ctx.message?.text) return ctx.reply('Iltimos, matn kiriting:');
  ctx.wizard.state.resume.about_me = cleanAndFixText(ctx.message.text);

  const preset = getCategoryPreset(ctx.wizard.state.resume.category);

  await ctx.reply(
    `💼 *Ish tajribangiz tafsilotlari (Kompaniya, yillar va vazifalaringiz):*\n${preset.expHint}`,
    { parse_mode: 'Markdown' }
  );
  return ctx.wizard.selectStep(13);
};

// ── Step 13: Experience Details -> Asks for Skills with Category Hint
const step13 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (!ctx.message?.text) return ctx.reply('Iltimos, matn kiriting:');
  ctx.wizard.state.resume.experience_details = cleanAndFixText(ctx.message.text);

  const preset = getCategoryPreset(ctx.wizard.state.resume.category);

  await ctx.reply(
    `🧠 *Ko'nikma va bilimlar:*\n${preset.skillsHint}`,
    { parse_mode: 'Markdown' }
  );
  return ctx.wizard.selectStep(14);
};

// ── Step 14: Skills -> Asks for Education with Category Hint
const step14 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (!ctx.message?.text) return ctx.reply('Iltimos, matn kiriting:');
  ctx.wizard.state.resume.skills = cleanAndFixText(ctx.message.text);

  const preset = getCategoryPreset(ctx.wizard.state.resume.category);

  await ctx.reply(
    `🎓 *Ta'limingiz (O'quv yurti, yo'nalish/bakalavr, bitirgan yilingiz):*\n${preset.eduHint || '_(Misol: 2019-2023 | TATU | Bakalavr, Dasturiy muhandislik)_'}`,
    { parse_mode: 'Markdown' }
  );
  return ctx.wizard.selectStep(15);
};

// ── Step 15: Education -> Asks for Languages (interactive selection)
const step15 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (!ctx.message?.text) return ctx.reply('Iltimos, ta\'lim ma\'lumotlarini kiriting:');
  ctx.wizard.state.resume.education = cleanAndFixText(ctx.message.text);

  // Initialize languages array for interactive selection
  ctx.wizard.state.resume._selectedLanguages = [];

  await ctx.reply(
    '🌐 *Til bilish darajalaringiz:*\n\n' +
    'Quyidagi tugmalar orqali tillarni tanlang yoki\nqo\'lda yozing (masalan: O\'zbekcha — Ona tili)\n\n' +
    '📝 _Bir nechta til tanlash mumkin. Tugallash uchun "✅ Tillarni Tasdiqlash" tugmasini bosing._',
    { parse_mode: 'Markdown', ...candidateLanguageKb([]) }
  );
  return ctx.wizard.selectStep(16);
};

// ── Step 16: Languages Handler (Composer for interactive language selection)
const step16 = new Composer();

// Language selection callback handlers
const LANGUAGE_OPTIONS = [
  { code: 'uz', name: "O'zbekcha", flag: '🇺🇿' },
  { code: 'ru', name: 'Ruscha', flag: '🇷🇺' },
  { code: 'en', name: 'Inglizcha', flag: '🇬🇧' },
  { code: 'tr', name: 'Turkcha', flag: '🇹🇷' },
  { code: 'de', name: 'Nemischa', flag: '🇩🇪' },
  { code: 'ko', name: 'Koreyscha', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabcha', flag: '🇸🇦' },
  { code: 'zh', name: 'Xitoycha', flag: '🇨🇳' },
];

const LEVEL_OPTIONS = [
  { code: 'native', label: 'Ona tili (Mukammal)', short: 'Ona tili' },
  { code: 'c1', label: 'C1 — Yuqori daraja', short: 'C1' },
  { code: 'b2', label: "B2 — O'rta-yuqori", short: 'B2' },
  { code: 'b1', label: "B1 — O'rta daraja", short: 'B1' },
  { code: 'a2', label: "A2 — Boshlang'ich", short: 'A2' },
  { code: 'a1', label: 'A1 — Boshlang\'ich', short: 'A1' },
];

// Handle language selection
LANGUAGE_OPTIONS.forEach(lang => {
  step16.action(`lang_select_${lang.code}`, async (ctx) => {
    await ctx.answerCbQuery(`${lang.flag} ${lang.name} tanlandi`);
    ctx.wizard.state.resume._currentLang = lang;

    // Show level selection for this language
    const levelButtons = LEVEL_OPTIONS.map(lv => [
      Markup.button.callback(`${lv.label}`, `lang_level_${lang.code}_${lv.code}`)
    ]);
    levelButtons.push([Markup.button.callback('⬅️ Orqaga', 'lang_back_to_list')]);

    try {
      await ctx.editMessageText(
        `${lang.flag} *${lang.name}* — Bilish darajangizni tanlang:`,
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard(levelButtons) }
      );
    } catch (_) {
      await ctx.reply(
        `${lang.flag} *${lang.name}* — Bilish darajangizni tanlang:`,
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard(levelButtons) }
      );
    }
  });
});

// Handle level selection
LANGUAGE_OPTIONS.forEach(lang => {
  LEVEL_OPTIONS.forEach(lv => {
    step16.action(`lang_level_${lang.code}_${lv.code}`, async (ctx) => {
      await ctx.answerCbQuery(`✅ ${lang.name} — ${lv.short}`);

      if (!ctx.wizard.state.resume._selectedLanguages) {
        ctx.wizard.state.resume._selectedLanguages = [];
      }

      // Remove if already exists (update level)
      ctx.wizard.state.resume._selectedLanguages = ctx.wizard.state.resume._selectedLanguages.filter(
        sl => sl.code !== lang.code
      );

      // Add new selection
      ctx.wizard.state.resume._selectedLanguages.push({
        code: lang.code,
        name: lang.name,
        flag: lang.flag,
        level: lv.short,
        label: lv.label
      });

      const selected = ctx.wizard.state.resume._selectedLanguages;
      const selectedText = selected.map(s => `${s.flag} ${s.name} — ${s.level}`).join('\n');

      try {
        await ctx.editMessageText(
          `🌐 *Tanlangan tillar:*\n${selectedText}\n\n` +
          `Yana til qo\'shish yoki "✅ Tillarni Tasdiqlash" tugmasini bosing:`,
          { parse_mode: 'Markdown', ...candidateLanguageKb(selected) }
        );
      } catch (_) {
        await ctx.reply(
          `🌐 *Tanlangan tillar:*\n${selectedText}\n\n` +
          `Yana til qo\'shish yoki "✅ Tillarni Tasdiqlash" tugmasini bosing:`,
          { parse_mode: 'Markdown', ...candidateLanguageKb(selected) }
        );
      }
    });
  });
});

// Back to language list
step16.action('lang_back_to_list', async (ctx) => {
  await ctx.answerCbQuery();
  const selected = ctx.wizard.state.resume._selectedLanguages || [];
  const selectedText = selected.length
    ? selected.map(s => `${s.flag} ${s.name} — ${s.level}`).join('\n') + '\n\n'
    : '';

  try {
    await ctx.editMessageText(
      `🌐 *Til bilish darajalaringiz:*\n\n${selectedText}` +
      `Quyidagi tugmalar orqali tillarni tanlang:`,
      { parse_mode: 'Markdown', ...candidateLanguageKb(selected) }
    );
  } catch (_) {}
});

// Confirm languages
step16.action('lang_confirm', async (ctx) => {
  await ctx.answerCbQuery('✅ Tillar tasdiqlandi');
  const selected = ctx.wizard.state.resume._selectedLanguages || [];

  if (selected.length === 0) {
    return ctx.reply('⚠️ Kamida bitta til tanlang yoki qo\'lda kiriting.');
  }

  // Format languages string for storage
  const langStr = selected.map(s => `${s.name} — ${s.level}`).join('\n');
  ctx.wizard.state.resume.languages = langStr;

  // Clean up temp data
  delete ctx.wizard.state.resume._selectedLanguages;
  delete ctx.wizard.state.resume._currentLang;

  const preset = getCategoryPreset(ctx.wizard.state.resume.category);

  await ctx.reply(
    `❤️ *Qiziqishlaringiz va sevimli mashg'ulotlaringiz:*\n${preset.interestsHint || '_(Misol: Texnologiyalar, Kitobxonlik, Sayohat, Sport)_'}`,
    { parse_mode: 'Markdown' }
  );
  return ctx.wizard.selectStep(17);
});

// Manual text input for languages (also supported)
step16.on('text', async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  const text = ctx.message.text.trim();
  if (!text) return;

  // If user typed languages manually, save and proceed
  ctx.wizard.state.resume.languages = cleanAndFixText(text);

  // Clean up temp data
  delete ctx.wizard.state.resume._selectedLanguages;
  delete ctx.wizard.state.resume._currentLang;

  const preset = getCategoryPreset(ctx.wizard.state.resume.category);

  await ctx.reply(
    `❤️ *Qiziqishlaringiz va sevimli mashg'ulotlaringiz:*\n${preset.interestsHint || '_(Misol: Texnologiyalar, Kitobxonlik, Sayohat, Sport)_'}`,
    { parse_mode: 'Markdown' }
  );
  return ctx.wizard.selectStep(17);
});

step16.use(async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
});

// ── Step 17: Interests -> Asks for Additional Info
const step17 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (!ctx.message?.text) return ctx.reply('Iltimos, qiziqishlaringizni kiriting:');
  ctx.wizard.state.resume.interests = cleanAndFixText(ctx.message.text);

  await ctx.reply(
    '➕ *Qo\'shimcha ma\'lumotlar (Haydovchilik guvohnomasi, portfolio va h.k.):*\n_(Misol: B toifa guvohnoma, komandirovkaga tayyor)_',
    { parse_mode: 'Markdown' }
  );
  return ctx.wizard.selectStep(18);
};

// ── Step 18: Additional Info -> Show Preview
const step18 = async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (!ctx.message?.text) return ctx.reply('Iltimos, matn kiriting:');
  ctx.wizard.state.resume.additional_info = cleanAndFixText(ctx.message.text);
  return showResumePreview(ctx);
};

// ── Show Preview Helper
async function showResumePreview(ctx) {
  const resume = ctx.wizard.state.resume;
  let previewText =
    `📄 *PDF REZYUME MA'LUMOTLARI:*` +
    `\n\n👤 *Ism-Familiya:* ${resume.full_name || '—'}` +
    `\n📂 *Soha:* ${resume.category || '—'}` +
    `\n🎯 *Lavozim:* ${resume.position || '—'}` +
    `\n📱 *Tel / Telegram:* ${resume.phone || '—'} | ${resume.telegram || '—'}` +
    `\n🎂 *Yosh:* ${resume.age || '—'}` +
    `\n📍 *Shahar:* ${resume.city || '—'}` +
    `\n💼 *Tajriba:* ${resume.experience_years || '—'}` +
    `\n💰 *Kutilgan maosh:* ${resume.expected_salary || '—'}` +
    `\n🕐 *Bandlik:* ${resume.employment_type || '—'}` +
    `\n🖼 *Rasm:* ${resume.photo_url ? '✅ Yuklandi' : '❌ Yo\'q'}` +
    `\n🎓 *Ta'lim:* ${resume.education || '—'}` +
    `\n🧠 *Ko'nikmalar:* ${resume.skills || '—'}` +
    `\n🌐 *Tillar:* ${resume.languages || '—'}` +
    `\n❤️ *Qiziqishlar:* ${resume.interests || '—'}` +
    `\n➕ *Qo'shimcha:* ${resume.additional_info || '—'}` +
    `\n\n─────────────────────\n✅ *Ma'lumotlar to'g'rimi? AI orqali yaxshilashingiz ham mumkin:*`;

  await ctx.reply(previewText, {
    parse_mode: 'Markdown',
    ...candidateResumeConfirmKb(),
  });
  return ctx.wizard.selectStep(19);
}

// ── Step 19: Confirmation (Composer)
const step19 = new Composer();

step19.action('res_ai_improve', async (ctx) => {
  await ctx.answerCbQuery('✨ AI matnlarni tahlil qilib, yaxshilamoqda...');

  const resume = ctx.wizard.state.resume || {};

  try {
    const loadingMsg = await ctx.reply('🔄 *AI yordamida barcha ma\'lumotlar tahlil qilinib, yaxshilanmoqda, iltimos kuting...*', { parse_mode: 'Markdown' });

    if (resume.about_me) {
      resume.about_me = await improveResumeText(resume.about_me);
    }
    if (resume.experience_details) {
      resume.experience_details = await improveResumeText(resume.experience_details);
    }
    if (resume.skills) {
      resume.skills = await improveResumeText(resume.skills);
    }
    if (resume.education) {
      resume.education = await improveResumeText(resume.education);
    }
    if (resume.interests) {
      resume.interests = await improveResumeText(resume.interests);
    }
    if (resume.additional_info) {
      resume.additional_info = await improveResumeText(resume.additional_info);
    }

    try {
      await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);
    } catch (_) {}

    await ctx.reply('✨ *Rezyume ma\'lumotlari AI yordamida muvaffaqiyatli yaxshilandi!*', { parse_mode: 'Markdown' });
    return showResumePreview(ctx);
  } catch (err) {
    console.error('Bot AI Resume Error:', err);
    return ctx.reply(`⚠️ AI matnni yaxshilashda xatolik yuz berdi: ${err.message}`);
  }
});

step19.action('res_confirm_yes', async (ctx) => {
  await ctx.answerCbQuery();

  const db = getDb();
  const cand = db.prepare('SELECT * FROM candidates WHERE user_id = ?').get(ctx.from.id);
  const resume = ctx.wizard.state.resume;

  // For photo: use local path if available (for base64 embedding in PDF)
  const photoValue = resume.photo_url || cand?.photo_url || '';

  const pdfData = {
    photo: photoValue,
    phone: resume.phone || cand?.phone || '',
    telegram: resume.telegram || (ctx.from.username ? `@${ctx.from.username}` : ''),
    age: resume.age || '',
    workHistory: resume.experience_details || '',
    eduHistory: resume.education || '',
    languages: resume.languages || '',
    interests: resume.interests || '',
    additionalInfo: resume.additional_info || ''
  };

  const resResult = db.prepare(`
    INSERT INTO candidate_resumes
      (candidate_id, full_name, position, category, city, experience_years, expected_salary, employment_type, about_me, experience_details, skills, education, languages, additional_info, raw_text, creation_type, pdf_data, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
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
    resume.creation_type || 'wizard',
    JSON.stringify(pdfData)
  );
  const resumeId = resResult.lastInsertRowid;

  // Active tokens check
  if (cand && cand.is_active && cand.tokens > 0) {
    db.prepare('UPDATE candidates SET tokens = tokens - 1 WHERE user_id = ?').run(ctx.from.id);
    const remaining = db.prepare('SELECT tokens FROM candidates WHERE user_id = ?').get(ctx.from.id);

    // Rezyumeni 'active' statusga o'tkazish (kanalga yubormasdan)
    const publishedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(`
      UPDATE candidate_resumes
      SET status = 'active', published_at = ?, expires_at = ?
      WHERE id = ?
    `).run(publishedAt, expiresAt, resumeId);

    // PDF rezyumeni nomzodga yuborish
    try {
      const { generateResumePdfFile } = require('../../services/pdf_generator');
      const resumesDir = require('path').join(__dirname, '..', '..', 'uploads', 'resumes');
      const fs = require('fs');
      if (!fs.existsSync(resumesDir)) fs.mkdirSync(resumesDir, { recursive: true });
      const pdfPath = require('path').join(resumesDir, `Resume_${resumeId}_${(resume.full_name || 'candidate').replace(/\s+/g, '_')}.pdf`);
      await generateResumePdfFile({ ...resume, id: resumeId }, pdfPath);
      if (fs.existsSync(pdfPath)) {
        await ctx.telegram.sendDocument(
          ctx.from.id,
          { source: pdfPath, filename: `Rezyume_${resume.full_name || 'Nomzod'}.pdf` },
          { caption: `✅ *PDF Rezyumeingiz tayyor!*`, parse_mode: 'Markdown' }
        );
      }
    } catch (pdfErr) {
      console.error('[Bot Resume PDF] Xato:', pdfErr.message);
    }

    try {
      await ctx.editMessageText(
        `✅ *PDF Rezyumeingiz muvaffaqiyatli yaratildi va saqlandi!*\n\n` +
        `📌 *${resume.position}*\n` +
        `📂 Soha: *${resume.category || '—'}*\n\n` +
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
          `📄 *Yangi Nomzod PDF Rezyumesi (Token orqali)*\n\n` +
          `👤 Nomzod: ${cand.full_name} (${cand.phone})\n` +
          `🎯 Lavozim: *${resume.position}*\n` +
          `📂 Soha: *${resume.category || '—'}*\n` +
          `🔢 Rezyume ID: #${resumeId}`,
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

step19.action('res_confirm_no', async (ctx) => {
  await ctx.answerCbQuery();
  try {
    await ctx.editMessageText('✏️ Qaytadan boshlaylik.');
  } catch (_) {}
  await ctx.reply('*"📄 Rezyume Joylashtirish"* tugmasini bosing.', candidateMainKb());
  return ctx.scene.leave();
});

step19.use(async (ctx) => {
  if (await checkSceneCommand(ctx)) return;
  if (ctx.message) {
    return ctx.reply('⬆️ Yuqoridagi *"✅ Ha, to\'g\'ri"* yoki *"✏️ Yo\'q, o\'zgartirish"* tugmalaridan birini tanlang.');
  }
});

const candidateResumeScene = new Scenes.WizardScene(
  'candidate_resume',
  step0, step1, step2, step3, step4, step5, step6, step7, step8, step9, step10, step11, step12, step13, step14, step15, step16, step17, step18, step19
);

module.exports = { candidateResumeScene };
