const { getDb } = require('../database/db');

// Barcha qo'shimcha maydon nomlari (human-readable)
const FIELD_LABELS = {
  full_name:       '👤 Ism Familiya',
  birth_date:      '🎂 Tug\'ilgan kun',
  expected_salary: '💵 Kutilgan maosh',
  languages:       '🌐 Til bilish darajasi',
  photo:           '🖼 Rasm',
  education:       '🎓 Ta\'lim (o\'qiyaptimi)',
  certificate:     '📜 Sertifikat',
  experience:      '💼 Tajriba',
  portfolio:       '🗂 Portfolio',
  telegram:        '📱 Telegram username',
};

// Matnli maydonlarmi yoki maxsus (photo, education, certificate, experience)
const FIELD_TYPES = {
  full_name:       'text',
  birth_date:      'text',
  expected_salary: 'text',
  languages:       'text',
  photo:           'photo',
  education:       'text',
  certificate:     'text',
  experience:      'text',
  portfolio:       'text',
  telegram:        'text',
};

// Sana + kunlarni hisoblash
function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function formatDate(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function isExpired(isoStr) {
  if (!isoStr) return true;
  return new Date(isoStr) < new Date();
}

// Resume ko'rinishini yaratish
function buildResumeText(data, extraFields) {
  let text = '📄 *Ariza Ma\'lumotlari:*\n\n';
  for (const field of extraFields) {
    const label = FIELD_LABELS[field] || field;
    const value = data[field] || '—';
    if (field !== 'photo') {
      text += `${escapeMarkdown(label)}: *${escapeMarkdown(value)}*\n`;
    } else {
      text += `${escapeMarkdown(label)}: ✅ Yuklandi\n`;
    }
  }
  return text;
}

function formatBulletList(text) {
  if (!text) return '• Ko\'rsatilmagan';
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
        return `• ${line.replace(/^[•\-\*]\s*/, '')}`;
      }
      return `• ${line}`;
    })
    .join('\n');
}

function makeHashtag(title) {
  if (!title) return 'vakansiya';
  const tag = title
    .toLowerCase()
    .replace(/['`’]/g, '')
    .replace(/[^a-z0-9а-яоʻgʻo'g'яёe]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/__+/g, '_');
  return tag || 'vakansiya';
}

// Vakansiya kartochkasi matni (isForChannel === true bo'lsa nomzoddan so'raladigan maydonlar chiqarilmaydi)
function buildVacancyText(vacancy, isForChannel = false) {
  let fields = [];
  if (Array.isArray(vacancy.extra_fields)) {
    fields = vacancy.extra_fields;
  } else if (typeof vacancy.extra_fields === 'string') {
    try {
      fields = JSON.parse(vacancy.extra_fields || '[]');
    } catch (_) {
      fields = [];
    }
  }

  let text =
    `🚀 @jobhunt_uz — Toshkentdagi eng faol vakansiyalar kanali\n\n` +
    `📍 Toshkent shahri\n\n` +
    `💼 *${escapeMarkdown((vacancy.title || '').toUpperCase())}*\n\n`;

  if (vacancy.creation_type === 'manual' && vacancy.raw_text) {
    if (vacancy.category) {
      text += `📂 Soha: ${escapeMarkdown(vacancy.category)}\n\n`;
    }
    text += `${escapeMarkdown(vacancy.raw_text.trim())}\n\n`;
  } else {
    if (vacancy.category) {
      text += `📂 Soha: ${escapeMarkdown(vacancy.category)}\n`;
    }
    text +=
      `🏢 Kompaniya: ${escapeMarkdown(vacancy.company_name || '—')}\n` +
      `📍 Manzil: ${escapeMarkdown(vacancy.location || '—')}\n` +
      `💵 Maosh: ${escapeMarkdown(vacancy.salary || '—')}\n` +
      `🕒 Ish vaqti: ${escapeMarkdown(vacancy.work_time || '—')}\n\n`;

    if (vacancy.tasks) {
      text += `🎯 *Asosiy vazifalar:*\n${escapeMarkdown(formatBulletList(vacancy.tasks))}\n\n`;
    }
    if (vacancy.requirements) {
      text += `✍️ *Talablar:*\n${escapeMarkdown(formatBulletList(vacancy.requirements))}\n\n`;
    }
    if (vacancy.conditions) {
      text += `✅ *Ish sharoitlari:*\n${escapeMarkdown(formatBulletList(vacancy.conditions))}\n\n`;
    }
  }

  const tagTitle = escapeMarkdown(makeHashtag(vacancy.title));

  text +=
    `📢 Vakansiya yoki reklama joylashtirish:\n👉 @jobhunt_Ad\n\n` +
    `🔥 Eng sara ish e’lonlari:\n👉 @jobhunt_uz\n\n` +
    `#jobhuntuz #${tagTitle} #toshkent #vakansiya`;

  if (!isForChannel) {
    const fieldLabels = fields.map(f => FIELD_LABELS[f] || f).join('\n• ');
    if (fieldLabels) {
      text += `\n\n─────────────────────\n📝 *Nomzoddan so'raladigan ma'lumotlar:*\n• ${escapeMarkdown(fieldLabels)}`;
    }
  }

  return text;
}

// HR profil tekshirish
function isHrRegistered(userId) {
  const row = getDb().prepare('SELECT user_id FROM hr_companies WHERE user_id = ?').get(userId);
  return !!row;
}

// Nomzod tekshirish
function isCandidateRegistered(userId) {
  const row = getDb().prepare('SELECT user_id FROM candidates WHERE user_id = ?').get(userId);
  return !!row;
}

// Admin tekshirish
function isAdmin(userId) {
  const row = getDb().prepare('SELECT user_id FROM admins WHERE user_id = ?').get(userId);
  return !!row;
}

/**
 * Scene ichida buyruqlar (/start, /menu, /hr, /admin va h.k.) yuborilganda
 * scene dan chiqish va mos harakatni bajarish.
 */
async function checkSceneCommand(ctx) {
  const text = ctx.message?.text;
  if (!text) return false;

  const isCmd =
    text.startsWith('/start') ||
    text.startsWith('/menu') ||
    text.startsWith('/hr') ||
    text.startsWith('/kabinet') ||
    text.startsWith('/profile') ||
    text.startsWith('/admin') ||
    text.startsWith('/cancel') ||
    text === '📱 Asosiy Menyu' ||
    text === '👤 Nomzod Kabineti' ||
    text === '👤 Profilim' ||
    text === '❌ Bekor qilish' ||
    text.toLowerCase() === 'bekor qilish';

  if (!isCmd) return false;

  try {
    await ctx.scene.leave();
  } catch (_) {}

  const { Markup } = require('telegraf');

  if (text.startsWith('/kabinet') || text.startsWith('/profile') || text === '👤 Nomzod Kabineti' || text === '👤 Profilim') {
    const { showCandidateCabinet } = require('../handlers/candidate/cand_cabinet');
    await showCandidateCabinet(ctx);
    return true;
  }

  if (text.startsWith('/start') || text.startsWith('/menu') || text === '📱 Asosiy Menyu') {
    const userId = ctx.from.id;
    if (isAdmin(userId)) {
      const { adminMainKb } = require('../keyboards/admin_kb');
      await ctx.reply('🛠 *Admin Paneli*', { parse_mode: 'Markdown', ...adminMainKb() });
      return true;
    }
    if (isHrRegistered(userId)) {
      const db = getDb();
      const hr = db.prepare('SELECT * FROM hr_companies WHERE user_id = ?').get(userId);
      const { hrMainKb } = require('../keyboards/hr_kb');
      await ctx.reply(`📱 *Asosiy Menyu*\n\n👋 Xush kelibsiz, *${hr.company_name}*!`, { parse_mode: 'Markdown', ...hrMainKb() });
      return true;
    }
    if (isCandidateRegistered(userId)) {
      const db = getDb();
      const cand = db.prepare('SELECT * FROM candidates WHERE user_id = ?').get(userId);
      const { candidateMainKb } = require('../keyboards/candidate_kb');
      await ctx.reply(`📱 *Asosiy Menyu*\n\n👋 Xush kelibsiz, *${cand.full_name}*!\n\nKanaldan o'zingizga mos e'lonni topib, *"Ariza Qoldirish"* tugmasini bosing.`, { parse_mode: 'Markdown', ...candidateMainKb() });
      return true;
    }
    await ctx.reply(
      '👋 *JobHunt Botiga Xush Kelibsiz!*\n\nSiz qaysi toifadasiz?',
      {
        parse_mode: 'Markdown',
        ...Markup.keyboard([
          ['👔 HR (Ish beruvchi)', '👤 Nomzod (Ish qidiruvchi)'],
        ]).resize(),
      }
    );
    return true;
  }

  if (text.startsWith('/hr')) {
    const userId = ctx.from.id;
    if (isHrRegistered(userId)) {
      const db = getDb();
      const hr = db.prepare('SELECT * FROM hr_companies WHERE user_id = ?').get(userId);
      const { hrMainKb } = require('../keyboards/hr_kb');
      await ctx.reply(`👋 Xush kelibsiz, *${hr.company_name}*!`, { parse_mode: 'Markdown', ...hrMainKb() });
    } else {
      await ctx.scene.enter('hr_register');
    }
    return true;
  }

  if (text.startsWith('/admin') && isAdmin(ctx.from.id)) {
    const { adminMainKb } = require('../keyboards/admin_kb');
    await ctx.reply('🛠 *Admin Paneli*', { parse_mode: 'Markdown', ...adminMainKb() });
    return true;
  }

  await ctx.reply('❌ Amaliyot bekor qilindi.');
  return true;
}

/**
 * Telegram Markdown (V1) maxsus belgilarni zararsizlantirish (escaping)
 */
function escapeMarkdown(text) {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/([_*`\[])/g, '\\$1');
}

// Rezyume kategoriyalari va ularga mos dinamik namuna (hint) lar
const RESUME_CATEGORIES = [
  '💼 Sotuv menejeri',
  '📞 Call-center operatori',
  '🚚 Savdo agenti',
  '🏢 Administrator',
  '📱 SMM mutaxassisi',
  '🎬 Video montajchi',
  '🛵 Kuryer',
  '💻 Dasturchi',
  '👨‍🏫 O‘qituvchi',
  '⚙️ Boshqa soha',
];

const RESUME_CATEGORY_PRESETS = {
  'Sotuv menejeri': {
    positionHint: '_(Misol: B2B Sotuv menejeri, Katta sotuv konsultanti, Magazin menejeri)_',
    skillsHint: '_(Misol: CRM tizimlari · Muzokara olib borish · Sotuv voronkasi · B2B sotuv · KPI)_',
    expHint: '_(Misol:\nKatta sotuvchi — "Artel" (2023-2024)\n• Oylik rejam 120% ga bajarilgan, 50+ mijozlar bilan muloqot)_',
  },
  'Call-center operatori': {
    positionHint: '_(Misol: Call-markaz operatori, Kiruvchi qo\'ng\'iroqlar menejeri)_',
    skillsHint: '_(Misol: Xushmuomalalik · Qizg\'in muloqot · Chidamli ish rejimi · MS Office · IP-telefoniya)_',
    expHint: '_(Misol:\nOperator — "Express Pay" (2023)\n• Kuniga 100+ mijozga xizmat ko\'rsatish, savollarga javob berish)_',
  },
  'Savdo agenti': {
    positionHint: '_(Misol: Hududiy savdo agenti, Ekskluziv agent, Supervaizer)_',
    skillsHint: '_(Misol: Mijozlar bazasi · Mahsulot taqdimoti · Toshkent shahrini bilish · Haydovchilik)_',
    expHint: '_(Misol:\nSavdo agenti — "Crafers" (2022-2024)\n• 80+ do\'konlar bazasini boshqarish va yetkazib berish nazorati)_',
  },
  'Administrator': {
    positionHint: '_(Misol: Resepshn administrator, Ofis menejer, O\'quv markaz admini)_',
    skillsHint: '_(Misol: Hujjatshunoslik · MS Office · Mehmonlarni kutib olish · Muloqot madaniyati · Tashkilotchilik)_',
    expHint: '_(Misol:\nAdministrator — "Najot Ta\'lim" (2023-2024)\n• O\'quvchilarni ro\'yxatga olish, qo\'ng\'iroqlarga javob berish)_',
  },
  'SMM mutaxassisi': {
    positionHint: '_(Misol: SMM-menedjer, Targetolog, Content Maker, Kopirayter)_',
    skillsHint: '_(Misol: Target reklama · Canva / Photoshop · Copywriting · Reels / Shorts · Instagram / Telegram)_',
    expHint: '_(Misol:\nSMM Menedjer — Media Agentlik (2023)\n• 5 ta brend sahifasini yuritish, 20% obunachilar o\'sishi)_',
  },
  'Video montajchi': {
    positionHint: '_(Misol: Video montajchi, Motion Designer, Mobilograf)_',
    skillsHint: '_(Misol: Adobe Premiere Pro · After Effects · CapCut · Color grading · Sound design)_',
    expHint: '_(Misol:\nMontajchi — YouTube Studio (2022-2024)\n• 50+ videolarni montaj qilish va effektlar berish)_',
  },
  'Kuryer': {
    positionHint: '_(Misol: Avto-kuryer, Moto/Piyoda kuryer, Ekspress yetkazib beruvchi)_',
    skillsHint: '_(Misol: Shaharni mukammal bilish · Haydovchilik (B/C) · Navigatsiya · Mas\'uliyatlilik · Xushmuomalalik)_',
    expHint: '_(Misol:\nKuryer — "Yandex Express" (2023-2024)\n• Buyurtmalarni vaqtida va bexato yetkazish)_',
  },
  'Dasturchi': {
    positionHint: '_(Misol: Frontend Developer, Backend Node.js, Mobile Developer, Fullstack)_',
    skillsHint: '_(Misol: JavaScript · React · Node.js · Git · SQL · REST API)_',
    expHint: '_(Misol:\nFrontend Dev — IT Park (2022-2024)\n• React va Next.js loyihalarini ishlab chiqish)_',
  },
  'O‘qituvchi': {
    positionHint: '_(Misol: Matematika o\'qituvchisi, Ingliz tili (IELTS) mentori, Boshlang\'ich sinf)_',
    skillsHint: '_(Misol: Interfaol metodlar · Pedagogik mahorat · Dars ishlanmalari tuzish · CEFR/IELTS certificate)_',
    expHint: '_(Misol:\nIngliz tili mentori — O\'quv markaz (2022-2024)\n• 40+ o\'quvchiga IELTS 7+ natija ko\'rsatish)_',
  },
  'Boshqa soha': {
    positionHint: '_(Misol: Tikuvchi, Oshpaz, Omborchi, Texnik, Farrosh)_',
    skillsHint: '_(Misol: Sohangizga oid asosiy mahorat va ko\'nikmalaringiz)_',
    expHint: '_(Misol:\nKorxonada ishlagan joyingiz va bajargan vazifalaringiz)_',
  },
};

function getCategoryPreset(catText) {
  if (!catText) return RESUME_CATEGORY_PRESETS['Boshqa soha'];
  const clean = catText.replace(/^[^\w\dа-яА-Яo'g'O'G']+/u, '').trim().toLowerCase();
  for (const [key, preset] of Object.entries(RESUME_CATEGORY_PRESETS)) {
    const keyClean = key.toLowerCase();
    if (clean.includes(keyClean) || keyClean.includes(clean)) {
      return preset;
    }
  }
  return RESUME_CATEGORY_PRESETS['Boshqa soha'];
}

// HR Vakansiyalari uchun sohaga mos dinamik namuna (hint) lar
const HR_CATEGORY_PRESETS = {
  'Sotuv menejeri': {
    tasksHint: '_(Misol:\n• Mijozlar bilan muloqot qilish va sotuv voronkasini yuritish\n• CRM tizimida ishlash va shartnomalar tuzish)_',
    reqHint: '_(Misol:\n• Kamida 1 yil sotuv sohasida tajriba\n• Xushmuomalalik va muzokara olib borish mahorati)_',
    condHint: '_(Misol:\n• Shinam ofis, bepul tushlik va korporativ aloqa\n• KPI bo\'yicha yuqori bonuslar)_',
  },
  'Call-center operatori': {
    tasksHint: '_(Misol:\n• Kiruvchi va chiquvchi qo\'ng\'iroqlarga javob berish\n• Mijozlar savollariga aniq va xushmuomala javob berish)_',
    reqHint: '_(Misol:\n• O\'zbek va rus tillarida erkin so\'zlasha olish\n• Chidamli ish rejimi va kompyuter savodxonligi)_',
    condHint: '_(Misol:\n• Qulay ish jadvali va ahil jamoa\n• O\'z vaqtida beriladigan oylik maosh)_',
  },
  'Savdo agenti': {
    tasksHint: '_(Misol:\n• Belgilangan hududdagi do\'konlarga tashrif buyurish\n• Buyurtmalar yig\'ish va mahsulot taqdimotini o\'tkazish)_',
    reqHint: '_(Misol:\n• Toshkent shahrini yaxshi bilish\n• Shaxsiy avtomobil yoki B toifa haydovchilik guvohnomasi)_',
    condHint: '_(Misol:\n• Benzin va telefon xarajatlari qoplanadi\n• Sotuv hajmiga qarab yuqori foizlar)_',
  },
  'Administrator': {
    tasksHint: '_(Misol:\n• Ofisga kelgan mehmonlarni kutib olish va yo\'naltirish\n• Hujjatlar va qo\'ng\'iroqlarni tartibga solish)_',
    reqHint: '_(Misol:\n• MS Office (Word, Excel) dasturlarini bilish\n• Mas\'uliyatlilik va tartiblilik)_',
    condHint: '_(Misol:\n• Shinam ofis va bepul tushlik\n• Rasmiy ishga joylashish (Mehnat daftarchasi)_',
  },
  'SMM mutaxassisi': {
    tasksHint: '_(Misol:\n• Ijtimoiy tarmoqlar (Instagram, Telegram) uchun kontent plan tuzish\n• Reels va postlar tayyorlash, target reklama sozlash)_',
    reqHint: '_(Misol:\n• SMM sohasida kamida 1 yil tajriba (portfolio bilan)\n• Canva / Photoshop va video montaj dasturlarini bilish)_',
    condHint: '_(Misol:\n• Gibrid yoki ofis formati\n• Ijodiy erkinlik va doimiy o\'sish imkoniyati)_',
  },
  'Video montajchi': {
    tasksHint: '_(Misol:\n• Videolarni professional montaj qilish va ranglar berish\n• TikTok/Reels uchun qisqa qiziqarli videolar tayyorlash)_',
    reqHint: '_(Misol:\n• Adobe Premiere Pro / After Effects dasturlarini a\'lo bilish\n• Montaj portfolio mavjudligi)_',
    condHint: '_(Misol:\n• Zamonaviy kuchli kompyuter va qulay ish o\'rni\n• O\'z vaqtida to\'lanadigan munosib maosh)_',
  },
  'Kuryer': {
    tasksHint: '_(Misol:\n• Buyurtmalarni belgilangan manzilga tez va bexato yetkazib berish\n• Mijozlar bilan xushmuomala bo\'lish)_',
    reqHint: '_(Misol:\n• Toshkent shahrini mukammal bilish\n• Haydovchilik guvohnomasi va mas\'uliyatlilik)_',
    condHint: '_(Misol:\n• Qulay grafik va kunlik/haftalik to\'lovlar\n• Yoqilg\'i va aloqa xarajatlari qoplanadi)_',
  },
  'Dasturchi': {
    tasksHint: '_(Misol:\n• Veb yoki mobil ilovalar funksionalini ishlab chiqish\n• Kodni optimallashtirish va testlash)_',
    reqHint: '_(Misol:\n• JavaScript / React / Node.js bo\'yicha kamida 1.5 yil tajriba\n• Git va REST API lar bilan ishlash)_',
    condHint: '_(Misol:\n• Zamonaviy IT ofis yoki Masofaviy ish\n• Xalqaro loyihalarda ishlash va yuqori maosh)_',
  },
  'O‘qituvchi': {
    tasksHint: '_(Misol:\n• O\'quvchilarga interfaol usulda dars o\'tish\n• O\'zlashtirishni tekshirish va sinovlar o\'tkazish)_',
    reqHint: '_(Misol:\n• Oliy ma\'lumot (pedagogik yo\'nalish)\n• O\'z fani bo\'yicha kuchli bilim va sertifikatlar (CEFR/IELTS/h.k.)_)',
    condHint: '_(Misol:\n• Qulay dars jadvali\n• O\'quvchilar soniga qarab rag\'batlantirish va bonuslar)_',
  },
  'Boshqa soha': {
    tasksHint: '_(Misol:\n• Korxonada bajariladigan asosiy vazifalaringiz)_',
    reqHint: '_(Misol:\n• Nomzoddan talab qilinadigan bilim va tajriba)_',
    condHint: '_(Misol:\n• Korxona tomonidan beriladigan sharoitlar va imtiyozlar)_',
  },
};

function getHrCategoryPreset(catText) {
  if (!catText) return HR_CATEGORY_PRESETS['Boshqa soha'];
  const clean = catText.replace(/^[^\w\dа-яА-Яo'g'O'G']+/u, '').trim().toLowerCase();
  for (const [key, preset] of Object.entries(HR_CATEGORY_PRESETS)) {
    const keyClean = key.toLowerCase();
    if (clean.includes(keyClean) || keyClean.includes(clean)) {
      return preset;
    }
  }
  return HR_CATEGORY_PRESETS['Boshqa soha'];
}

/**
 * Imlo va grammatika hamda formatlashni avtomatik to'g'rilash (Auto-corrector)
 */
function cleanAndFixText(text) {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text.trim();

  // Normalize apostrophes (o', g', O', G')
  cleaned = cleaned.replace(/[`'′’`‘]/g, "'");

  // Fix Uzbek specific apostrophe spacing ("o ' zbek" -> "o'zbek")
  cleaned = cleaned.replace(/([ogOG])\s*'\s*/g, "$1'");

  // Fix repeating commas or periods (e.g. "React ,,github" -> "React, github")
  cleaned = cleaned.replace(/,\s*,+/g, ',');
  cleaned = cleaned.replace(/\.\s*\.+/g, '.');

  // Fix spacing before punctuation (e.g. "word ,word" -> "word, word")
  cleaned = cleaned.replace(/\s+([,.!?:;])/g, '$1');
  cleaned = cleaned.replace(/([,.!?:;])(?=[^\s,.!?:;\d])/g, '$1 ');

  // Fix multiple spaces
  cleaned = cleaned.replace(/[ \t]+/g, ' ');

  // Fix multiple blank lines (max 2 consecutive newlines)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Auto-capitalize first letter of each sentence
  cleaned = cleaned.replace(/(^\s*|[.!?]\s+)([a-zа-яo'g'])/gi, (match, prefix, char) => {
    return prefix + char.toUpperCase();
  });

  return cleaned.trim();
}

/**
 * Rezyume kartochkasi matni (Exact template)
 */
function buildResumeChannelText(resume, isForChannel = false) {
  let body = `👤 *${escapeMarkdown((resume.full_name || 'Noma\'lum').toUpperCase())}*\n\n`;

  if (resume.category) {
    body += `📂 *Сфера:* ${escapeMarkdown(resume.category)}\n`;
  }

  if (resume.creation_type === 'manual' && resume.raw_text) {
    body += `🎯 *Желаемая должность:* ${escapeMarkdown(resume.position || '—')}\n\n`;
    body += `${escapeMarkdown(resume.raw_text.trim())}\n\n`;
  } else {
    body +=
      `🎯 *Желаемая должность:* ${escapeMarkdown(resume.position || '—')}\n` +
      `📍 *Город:* ${escapeMarkdown(resume.city || 'Toshkent')}\n` +
      `💼 *Опыт работы:* ${escapeMarkdown(resume.experience_years || '—')}\n` +
      `💰 *Зарплатные ожидания:* ${escapeMarkdown(resume.expected_salary || '—')}\n` +
      `🕐 *Тип занятости:* ${escapeMarkdown(resume.employment_type || '—')}\n\n`;

    if (resume.about_me) {
      body += `📝 *О себе*\n\n${escapeMarkdown(resume.about_me)}\n\n`;
    }
    if (resume.experience_details) {
      body += `💼 *Опыт работы*\n\n${escapeMarkdown(resume.experience_details)}\n\n`;
    }
    if (resume.skills) {
      body += `🧠 *Навыки*\n\n${escapeMarkdown(resume.skills)}\n\n`;
    }
    if (resume.education) {
      body += `🎓 *Образование*\n\n${escapeMarkdown(resume.education)}\n\n`;
    }
    if (resume.languages) {
      body += `🌐 *Языки*\n\n${escapeMarkdown(resume.languages)}\n\n`;
    }
    if (resume.additional_info) {
      body += `➕ *Дополнительно*\n\n${escapeMarkdown(resume.additional_info)}\n\n`;
    }
  }

  const expDate = resume.expires_at ? formatDate(resume.expires_at) : formatDate(addDays(14));

  const tagPos = escapeMarkdown(makeHashtag(resume.position));
  const tagCat = resume.category ? escapeMarkdown(makeHashtag(resume.category)) : '';

  body +=
    `━━━━━━━━━━━━━━\n\n` +
    `🟢 *Статус:* Ищу работу\n` +
    `📅 *CV активно до:* ${expDate}\n\n` +
    `#resume #${tagPos}${tagCat ? ` #${tagCat}` : ''} #toshkent #nomzod`;

  return body;
}

module.exports = {
  FIELD_LABELS,
  FIELD_TYPES,
  addDays,
  formatDate,
  isExpired,
  buildResumeText,
  buildVacancyText,
  buildResumeChannelText,
  cleanAndFixText,
  escapeMarkdown,
  RESUME_CATEGORIES,
  RESUME_CATEGORY_PRESETS,
  getCategoryPreset,
  HR_CATEGORY_PRESETS,
  getHrCategoryPreset,
  isHrRegistered,
  isCandidateRegistered,
  isAdmin,
  checkSceneCommand,
};

