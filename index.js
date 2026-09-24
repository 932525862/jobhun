require('dotenv').config();

const { Telegraf, Scenes, session, Markup } = require('telegraf');
const { BOT_TOKEN, ADMIN_IDS } = require('./config');
const { getDb } = require('./database/db');

// ── Scenes ────────────────────────────────────────────────────────────────────
const { hrRegisterScene }    = require('./handlers/hr/hr_register');
const { hrVacancyScene,
        registerVacancyCallbacks,
        handleHrPaymentCheck }   = require('./handlers/hr/hr_vacancy');
const { candidateRegisterScene } = require('./handlers/candidate/cand_register');
const { candidateApplyScene,
        registerApplyCallbacks,
        handleCandidatePaymentCheck } = require('./handlers/candidate/cand_apply');
const { candidateResumeScene } = require('./handlers/candidate/cand_resume');
const { adminSettingsScene,
        registerSettingsHandlers }   = require('./handlers/admin/settings');

// ── Handlers ──────────────────────────────────────────────────────────────────
const { registerHrHandlers }    = require('./handlers/hr/hr_main');
const { registerAdminHandlers } = require('./handlers/admin/admin_main');
const { registerPaymentHandlers } = require('./handlers/admin/payments');

// ── Utils ─────────────────────────────────────────────────────────────────────
const { startScheduler } = require('./utils/scheduler');
const { isAdmin, isHrRegistered, isCandidateRegistered } = require('./utils/helpers');

// ─────────────────────────────────────────────────────────────────────────────
const bot = new Telegraf(BOT_TOKEN);

// ── Session + Stage ───────────────────────────────────────────────────────────
const stage = new Scenes.Stage([
  hrRegisterScene,
  hrVacancyScene,
  candidateRegisterScene,
  candidateApplyScene,
  candidateResumeScene,
  adminSettingsScene,
]);

bot.use(session());
bot.use(stage.middleware());

const { createServer } = require('./server');
const PORT = process.env.PORT || 3000;
const getWebAppUrl = () => process.env.WEB_APP_URL || `http://localhost:${PORT}`;

// ── /start ────────────────────────────────────────────────────────────────────
bot.start(async (ctx) => {
  const payload = ctx.startPayload || '';
  const webAppUrl = getWebAppUrl();
  const targetUrl = payload ? `${webAppUrl}?start_param=${payload}` : webAppUrl;
  const isHttps = webAppUrl.startsWith('https://');
  const userId = ctx.from.id;

  // ── Admin uchun maxsus ko'rinish ─────────────────────────────────────────
  if (isAdmin(userId)) {
    const { adminMainKb } = require('./keyboards/admin_kb');
    const db = getDb();
    const payPendHr   = db.prepare("SELECT COUNT(*) as c FROM payments WHERE status='pending' AND user_type='hr'").get().c;
    const payPendCand = db.prepare("SELECT COUNT(*) as c FROM payments WHERE status='pending' AND user_type='candidate'").get().c;
    const vacPending  = db.prepare("SELECT COUNT(*) as c FROM vacancies WHERE status='pending'").get().c;
    const resPending  = db.prepare("SELECT COUNT(*) as c FROM candidate_resumes WHERE status='pending'").get().c;

    let adminMsg = '🛠 *Admin Paneli*\n\nQuyidagi amallardan birini tanlang:';
    const alerts = [];
    if (payPendHr + payPendCand > 0) alerts.push(`💳 ${payPendHr + payPendCand} ta to'lov kutilmoqda`);
    if (vacPending > 0) alerts.push(`📋 ${vacPending} ta e'lon kutilmoqda`);
    if (resPending > 0) alerts.push(`📄 ${resPending} ta rezyume kutilmoqda`);
    if (alerts.length > 0) adminMsg += '\n\n⚠️ ' + alerts.join('\n⚠️ ');

    return ctx.reply(adminMsg, { parse_mode: 'Markdown', ...adminMainKb() });
  }

  // ── Oddiy foydalanuvchilar uchun Web App havolasi ─────────────────────────
  if (isHttps) {
    const webAppButton = Markup.button.webApp('🚀 Web App\'ni Ochish', targetUrl);
    await ctx.reply(
      '👋 *JobHunt — Korporativ Bandlik Portali!*\n\n' +
      '⚡ Barcha funksiyalar (Vakansiyalar, Rezyumelar, Ariza topshirish, Shaxsiy kabinet) **Telegram Web App** ichida ishlaydi!\n\n' +
      '📌 Saytga kirganingizda 2 xil kirish rejimini tanlaysiz:\n' +
      '👔 **HR bo\'lib kirish** — Ish beruvchilar uchun\n' +
      '👤 **Nomzod bo\'lib kirish** — Ish qidiruvchilar uchun\n\n' +
      '👇 Pastdagi tugma orqali Web App\'ni oching:',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[webAppButton]]),
      }
    );
  } else {
    // HTTP URL'lar Telegram inline tugmalarida ishlamaydi — oddiy xabar yuboramiz
    await ctx.reply(
      '👋 *JobHunt — Korporativ Bandlik Portali!*\n\n' +
      '⚡ Botdagi barcha funksiyalar Telegram Web App formatiga o\'tkazildi!\n\n' +
      '📌 Saytda 2 ta asosiy kirish rejimi mavjud:\n' +
      '👔 **HR bo\'lib kirish** — Ish beruvchilar uchun\n' +
      '👤 **Nomzod bo\'lib kirish** — Ish qidiruvchilar uchun\n\n' +
      `🌐 Web App manzili:\n\`${targetUrl}\`\n\n` +
      '_Brauzerda yuqoridagi manzilni oching._',
      { parse_mode: 'Markdown' }
    );
  }
});

// ── Rol tanlash ───────────────────────────────────────────────────────────────
bot.hears('👔 HR (Ish beruvchi)', async (ctx) => {
  if (isAdmin(ctx.from.id)) return;
  if (isHrRegistered(ctx.from.id)) {
    const db = getDb();
    const hr = db.prepare('SELECT * FROM hr_companies WHERE user_id = ?').get(ctx.from.id);
    const { hrMainKb } = require('./keyboards/hr_kb');
    return ctx.reply(
      `👋 Xush kelibsiz, *${hr.company_name}*! Quyidagi bo\'limlardan birini tanlang:`,
      { parse_mode: 'Markdown', ...hrMainKb() }
    );
  }
  return ctx.scene.enter('hr_register');
});

bot.hears('👤 Nomzod (Ish qidiruvchi)', async (ctx) => {
  if (isAdmin(ctx.from.id)) return;
  if (isCandidateRegistered(ctx.from.id)) {
    const db = getDb();
    const cand = db.prepare('SELECT * FROM candidates WHERE user_id = ?').get(ctx.from.id);
    const { candidateMainKb } = require('./keyboards/candidate_kb');
    return ctx.reply(
      `👋 Xush kelibsiz, *${cand.full_name}*!\n\n` +
      `Kanaldan o\'zingizga mos e\'lonni topib, *"Ariza Qoldirish"* tugmasini bosing yoki rezyume joylashtiring.`,
      { parse_mode: 'Markdown', ...candidateMainKb() }
    );
  }
  return ctx.scene.enter('candidate_register');
});

bot.hears('📄 Rezyume Joylashtirish', async (ctx) => {
  if (isAdmin(ctx.from.id)) return;
  if (!isCandidateRegistered(ctx.from.id)) {
    return ctx.scene.enter('candidate_register');
  }
  return ctx.scene.enter('candidate_resume');
});

// ─── Menu Tiklash (Barcha foydalanuvchilar uchun) ───────────────────────────
async function handleMenuRestore(ctx) {
  if (ctx.scene) {
    try {
      await ctx.scene.leave();
    } catch (_) {}
  }
  const userId = ctx.from.id;
  if (isAdmin(userId)) {
    const { adminMainKb } = require('./keyboards/admin_kb');
    return ctx.reply('🛠 *Admin Paneli*', { parse_mode: 'Markdown', ...adminMainKb() });
  }
  if (isHrRegistered(userId)) {
    const db = getDb();
    const hr = db.prepare('SELECT * FROM hr_companies WHERE user_id = ?').get(userId);
    const { hrMainKb } = require('./keyboards/hr_kb');
    return ctx.reply(`📱 *Asosiy Menyu*\n\n👋 Xush kelibsiz, *${hr.company_name}*!`, { parse_mode: 'Markdown', ...hrMainKb() });
  }
  if (isCandidateRegistered(userId)) {
    const db = getDb();
    const cand = db.prepare('SELECT * FROM candidates WHERE user_id = ?').get(userId);
    const { candidateMainKb } = require('./keyboards/candidate_kb');
    return ctx.reply(`📱 *Asosiy Menyu*\n\n👋 Xush kelibsiz, *${cand.full_name}*!\n\nKanaldan o\'zingizga mos e\'lonni topib, *"Ariza Qoldirish"* tugmasini bosing.`, { parse_mode: 'Markdown', ...candidateMainKb() });
  }
  return ctx.reply(
    '👋 *JobHunt Botiga Xush Kelibsiz!*\n\nSiz qaysi toifadasiz?',
    {
      parse_mode: 'Markdown',
      ...Markup.keyboard([
        ['👔 HR (Ish beruvchi)', '👤 Nomzod (Ish qidiruvchi)'],
      ]).resize(),
    }
  );
}

const { showCandidateCabinet, registerCandidateCabinetCallbacks } = require('./handlers/candidate/cand_cabinet');

bot.command('menu', handleMenuRestore);
bot.command('kabinet', (ctx) => showCandidateCabinet(ctx));
bot.command('profile', (ctx) => showCandidateCabinet(ctx));
bot.hears('📱 Asosiy Menyu', handleMenuRestore);
bot.hears(['👤 Nomzod Kabineti', '👤 Profilim'], (ctx) => showCandidateCabinet(ctx));

// ── Handler'larni bog'lash ───────────────────────────────────────────────────
registerAdminHandlers(bot, stage);
registerSettingsHandlers(bot, stage);
registerPaymentHandlers(bot);
registerHrHandlers(bot, stage);
registerVacancyCallbacks(bot);
registerApplyCallbacks(bot);
registerCandidateCabinetCallbacks(bot);

// ── HR: Vakansiya maydonini tahrirlash matnini qabul qilish ───────────────────
const { handleFieldEditInput } = require('./handlers/hr/hr_cabinet');
bot.use(async (ctx, next) => {
  if (ctx.session?.editingVacancy && ctx.message?.text) {
    const handled = await handleFieldEditInput(ctx, bot);
    if (handled) return;
  }
  return next();
});

// ── Admin: Maxsus e'lon vaqtini kiritish ───────────────────────────────────────
const { publishVacancyToChannel, publishResumeToChannel } = require('./utils/channel');
bot.use(async (ctx, next) => {
  if (ctx.session?.waitingPubDelayVacId && ctx.message?.text && isAdmin(ctx.from.id)) {
    const vacId = ctx.session.waitingPubDelayVacId;
    const text = ctx.message.text.trim();
    const minutes = parseInt(text);

    if (isNaN(minutes) || minutes < 0) {
      return ctx.reply('❌ Iltimos, to\'g\'ri musbat raqam kiriting (masalan: 45):');
    }

    ctx.session.waitingPubDelayVacId = null;
    const db = getDb();
    const vac = db.prepare('SELECT * FROM vacancies WHERE id = ?').get(vacId);

    if (minutes === 0) {
      await publishVacancyToChannel(bot, vacId);
      await ctx.reply(`✅ *E'lon (#${vacId}) ZUDLIK BILAN kanalga joylashtirildi!*`, { parse_mode: 'Markdown' });
      if (vac && vac.hr_id) {
        try {
          await bot.telegram.sendMessage(vac.hr_id, '✅ *E\'loningiz kanalga joylashtirildi!*', { parse_mode: 'Markdown' });
        } catch (_) {}
      }
    } else {
      setTimeout(async () => {
        try {
          await publishVacancyToChannel(bot, vacId);
          if (vac && vac.hr_id) {
            await bot.telegram.sendMessage(vac.hr_id, '✅ *E\'loningiz kanalga joylashtirildi!*', { parse_mode: 'Markdown' });
          }
        } catch (e) {
          console.error('[Custom Publish Error]:', e.message);
        }
      }, minutes * 60 * 1000);

      await ctx.reply(`⏱ *E'lon (#${vacId}) ${minutes} daqiqadan so'ng kanalga joylashtiriladi!*`, { parse_mode: 'Markdown' });
      if (vac && vac.hr_id) {
        try {
          await bot.telegram.sendMessage(vac.hr_id, `⏳ *E\'loningiz *${minutes} daqiqa* ichida kanalga joylashtiriladi.*`, { parse_mode: 'Markdown' });
        } catch (_) {}
      }
    }
    return;
  }

  // ── Admin: Maxsus rezyume vaqtini kiritish ─────────────────────────────────
  if (ctx.session?.waitingPubDelayResumeId && ctx.message?.text && isAdmin(ctx.from.id)) {
    const resumeId = ctx.session.waitingPubDelayResumeId;
    const text = ctx.message.text.trim();
    const minutes = parseInt(text);

    if (isNaN(minutes) || minutes < 0) {
      return ctx.reply('❌ Iltimos, to\'g\'ri musbat raqam kiriting (masalan: 20):');
    }

    ctx.session.waitingPubDelayResumeId = null;

    if (minutes === 0) {
      await publishResumeToChannel(bot, resumeId);
      await ctx.reply(`✅ *Rezyume (#${resumeId}) ZUDLIK BILAN kanalga joylashtirildi!*`, { parse_mode: 'Markdown' });
    } else {
      setTimeout(async () => {
        try {
          await publishResumeToChannel(bot, resumeId);
        } catch (e) {
          console.error('[Custom Resume Publish Error]:', e.message);
        }
      }, minutes * 60 * 1000);

      await ctx.reply(`⏱ *Rezyume (#${resumeId}) ${minutes} daqiqadan so'ng kanalga joylashtiriladi!*`, { parse_mode: 'Markdown' });
    }
    return;
  }
  return next();
});

// ── Rasm / Hujjat qabul qilish (cheklar) ─────────────────────────────────────
bot.on(['photo', 'document'], async (ctx, next) => {
  // HR cheki
  const hrHandled = await handleHrPaymentCheck(ctx);
  if (hrHandled) return;

  // Nomzod cheki
  const candHandled = await handleCandidatePaymentCheck(ctx, bot);
  if (candHandled) return;

  return next();
});

// ── Xato ushlash ──────────────────────────────────────────────────────────────
bot.catch((err, ctx) => {
  console.error(`[Bot Xato] updateType=${ctx?.updateType}:`, err.message);
  try {
    ctx.reply('⚠️ Xato yuz berdi. Qaytadan urinib ko\'ring yoki /start bosing.')
      .catch(() => {});
  } catch (_) {}
});

// ── Ishga tushirish ───────────────────────────────────────────────────────────
async function main() {
  // DB ni initsializatsiya
  getDb();
  console.log('✅ Ma\'lumotlar bazasi tayyor');

  // Express API & Web App serverini ishga tushirish (Koyeb va barcha interfeyslar uchun 0.0.0.0)
  const app = createServer(bot);
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Express API va Telegram Web App 0.0.0.0:${PORT} da ishga tushdi`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} allaqachon band. Portni bo'shatish yoki bitta jarayonni to'xtatish kerak.`);
    } else {
      console.error(`❌ Server xatosi:`, err.message);
    }
  });

  // Telegram bot initsializatsiyasi
  try {
    // Webhook'ni o'chirib polling rejimga o'tish (409 xatolikni oldini olish)
    await bot.telegram.deleteWebhook({ drop_pending_updates: false });
    console.log('🔗 Webhook o\'chirildi, polling rejimi yoqildi.');

    const botInfo = await bot.telegram.getMe();

    // BOT_USERNAME ni avtomatik o'rnatish
    const cfg = require('./config');
    if (!process.env.BOT_USERNAME || process.env.BOT_USERNAME === 'jobhuntbot') {
      cfg.BOT_USERNAME = botInfo.username;
    }

    // Bot komandalari menyusini va Web App Chat Menu Button o'rnatish
    try {
      const webAppUrl = getWebAppUrl();
      await bot.telegram.setMyCommands([
        { command: 'start', description: '🌐 Web App\'ni ochish / Admin panel' },
        { command: 'admin', description: '🛠 Admin paneli (faqat admin uchun)' },
        { command: 'menu', description: '📱 Asosiy menyu' },
        { command: 'kabinet', description: '👤 Nomzod kabineti' },
      ]);

      if (webAppUrl.startsWith('https://')) {
        await bot.telegram.setChatMenuButton({
          type: 'web_app',
          text: '🌐 Web App',
          web_app: { url: webAppUrl },
        });
        console.log(`✅ Chat Menu Button o'rnatildi: ${webAppUrl}`);
      } else {
        console.log(`ℹ️ WEB_APP_URL HTTPS emas (${webAppUrl}). Chat Menu Button o'tkazib yuborildi.`);
      }
    } catch (e) {
      console.error('Bot komandalari / Menu button o\'rnatishda xato:', e.message);
    }

    // Scheduler
    startScheduler(bot);

    console.log(`🤖 Bot @${botInfo.username} ishga tushdi!`);
    console.log(`👤 Admin IDlar: ${ADMIN_IDS.join(', ')}`);
    console.log(`📢 Kanal: ${process.env.CHANNEL_ID || 'belgilanmagan'}`);
    console.log(`🔗 Deep link: https://t.me/${botInfo.username}?start=apply_<vakansiyaId>`);
  } catch (err) {
    console.error('⚠️ Telegram API ga bog\'lanishda xatolik yuz berdi (bot keyinroq qayta urinadi):', err.message);
    // Scheduler'ni shunday ham ishga tushirish
    try { startScheduler(bot); } catch (_) {}
  }

  // Bot polling'ni DOIM ishga tushirish (getMe muvaffaqiyatli bo'lsin yoki bo'lmasin)
  function launchBot(retryDelay = 5000) {
    bot.launch().then(() => {
      console.log('🔴 Bot polling to\'xtatildi.');
    }).catch((err) => {
      console.error(`❌ Bot polling xatosi: ${err.message}. ${retryDelay / 1000} soniyadan so'ng qayta uriniladi...`);
      setTimeout(() => launchBot(Math.min(retryDelay * 2, 60000)), retryDelay);
    });
    console.log('🟢 Bot polling boshlandi — xabarlar qabul qilinmoqda...');
  }

  launchBot();
}

main().catch((err) => {
  console.error('❌ Ishga tushirishda kutilmagan xato:', err.message);
});

process.once('SIGINT',  () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

