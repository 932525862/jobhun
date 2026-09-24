const { getDb, getSetting } = require('../../database/db');
const { adminMainKb, adminVacancyKb, adminResumeKb, adminBannerKb, adminPublishTimeKb, adminPublishResumeTimeKb } = require('../../keyboards/admin_kb');
const { isAdmin, escapeMarkdown } = require('../../utils/helpers');
const { publishVacancyToChannel, publishResumeToChannel } = require('../../utils/channel');

async function showAdminMain(ctx) {
  if (!isAdmin(ctx.from.id)) return;

  const db = getDb();
  const hrCount       = db.prepare('SELECT COUNT(*) as cnt FROM hr_companies').get();
  const candCount     = db.prepare('SELECT COUNT(*) as cnt FROM candidates').get();
  const vacCount      = db.prepare("SELECT COUNT(*) as cnt FROM vacancies WHERE status = 'active'").get();
  const vacPending    = db.prepare("SELECT COUNT(*) as cnt FROM vacancies WHERE status = 'pending'").get();
  const resPending    = db.prepare("SELECT COUNT(*) as cnt FROM candidate_resumes WHERE status = 'pending'").get();
  const bannerPending = db.prepare("SELECT COUNT(*) as cnt FROM banners WHERE status = 'pending'").get();
  const appCount      = db.prepare('SELECT COUNT(*) as cnt FROM applications').get();
  const payPendHr     = db.prepare("SELECT COUNT(*) as cnt FROM payments WHERE status = 'pending' AND user_type = 'hr'").get();
  const payPendCand   = db.prepare("SELECT COUNT(*) as cnt FROM payments WHERE status = 'pending' AND user_type = 'candidate'").get();

  await ctx.reply(
    `🛠 *Admin Panel*\n\n` +
    `👥 HR kompaniyalar: *${hrCount.cnt}*\n` +
    `👤 Nomzodlar: *${candCount.cnt}*\n` +
    `📌 Aktiv e'lonlar: *${vacCount.cnt}*\n` +
    `📨 Jami arizalar: *${appCount.cnt}*\n\n` +
    `⏳ Kutilayotgan:\n` +
    `  📋 E'lonlar: *${vacPending.cnt}*\n` +
    `  📄 Rezyumalar: *${resPending.cnt}*\n` +
    `  🎨 Bannerlar: *${bannerPending.cnt}*\n` +
    `  💳 HR to'lovlar: *${payPendHr.cnt}*\n` +
    `  💳 Nomzod to'lovlar: *${payPendCand.cnt}*`,
    { parse_mode: 'Markdown', ...adminMainKb() }
  );
}

function registerAdminHandlers(bot, stage) {
  const checkAdmin = (ctx, next) => {
    if (!isAdmin(ctx.from.id)) return ctx.reply('❌ Sizda ruxsat yo\'q.');
    return next();
  };

  bot.hears('/admin', checkAdmin, (ctx) => showAdminMain(ctx));
  bot.command('admin', checkAdmin, (ctx) => showAdminMain(ctx));

  // ─── Web Panel ─────────────────────────────────────────────────────────────
  bot.hears('🌐 Web Panel', checkAdmin, async (ctx) => {
    const webUrl = process.env.WEB_APP_URL || `http://localhost:${process.env.PORT || 3000}`;
    const { Markup } = require('telegraf');
    const isHttps = webUrl.startsWith('https://');

    if (isHttps) {
      await ctx.reply(
        '🌐 *Web Admin Panelini ochish:*',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([[Markup.button.webApp('🚀 Admin Panel', webUrl + '?admin=1')]]),
        }
      );
    } else {
      await ctx.reply(
        `🌐 *Web Admin Paneli:*\n\n` +
        `Brauzerda quyidagi manzilni oching:\n\`${webUrl}\``,
        { parse_mode: 'Markdown' }
      );
    }
  });

  // ─── HR To'lovlar ─────────────────────────────────────────────────────────
  bot.hears('💳 HR To\'lovlar', checkAdmin, async (ctx) => {
    const db = getDb();
    const payments = db.prepare(`
      SELECT p.*, h.company_name, h.phone 
      FROM payments p
      JOIN hr_companies h ON h.user_id = p.user_id
      WHERE p.status = 'pending' AND p.user_type = 'hr'
      ORDER BY p.created_at DESC
    `).all();

    if (!payments.length) {
      return ctx.reply('✅ Kutilayotgan HR to\'lovlar yo\'q.');
    }

    await ctx.reply(`💳 *HR To'lovlar (${payments.length} ta):*`, { parse_mode: 'Markdown' });

    const { adminPaymentKb } = require('../../keyboards/admin_kb');
    for (const p of payments) {
      const text =
        `💳 *To'lov #${p.id}*\n` +
        `🏢 ${p.company_name}\n` +
        `📞 ${p.phone}\n` +
        `💰 ${parseInt(p.amount || 0).toLocaleString('uz-UZ')} so'm\n` +
        `📅 ${new Date(p.created_at).toLocaleString('uz-UZ')}`;

      if (p.check_file_id && p.check_file_id.startsWith('/uploads/')) {
        await ctx.reply(text, { parse_mode: 'Markdown', ...adminPaymentKb(p.id) });
      } else if (p.check_file_id) {
        await ctx.replyWithPhoto(p.check_file_id, { caption: text, parse_mode: 'Markdown', ...adminPaymentKb(p.id) });
      } else {
        await ctx.reply(text, { parse_mode: 'Markdown', ...adminPaymentKb(p.id) });
      }
    }
  });

  // ─── Nomzod To'lovlar ─────────────────────────────────────────────────────
  bot.hears('👤 Nomzod To\'lovlar', checkAdmin, async (ctx) => {
    const db = getDb();
    const payments = db.prepare(`
      SELECT p.*, c.full_name, c.phone 
      FROM payments p
      JOIN candidates c ON c.user_id = p.user_id
      WHERE p.status = 'pending' AND p.user_type = 'candidate'
      ORDER BY p.created_at DESC
    `).all();

    if (!payments.length) {
      return ctx.reply('✅ Kutilayotgan nomzod to\'lovlar yo\'q.');
    }

    await ctx.reply(`👤 *Nomzod To'lovlar (${payments.length} ta):*`, { parse_mode: 'Markdown' });

    const { adminPaymentKb } = require('../../keyboards/admin_kb');
    for (const p of payments) {
      const text =
        `👤 *To'lov #${p.id}*\n` +
        `Ism: ${p.full_name}\n` +
        `📞 ${p.phone}\n` +
        `💰 ${parseInt(p.amount || 0).toLocaleString('uz-UZ')} so'm\n` +
        `📅 ${new Date(p.created_at).toLocaleString('uz-UZ')}`;

      if (p.check_file_id && p.check_file_id.startsWith('/uploads/')) {
        await ctx.reply(text, { parse_mode: 'Markdown', ...adminPaymentKb(p.id) });
      } else if (p.check_file_id) {
        await ctx.replyWithPhoto(p.check_file_id, { caption: text, parse_mode: 'Markdown', ...adminPaymentKb(p.id) });
      } else {
        await ctx.reply(text, { parse_mode: 'Markdown', ...adminPaymentKb(p.id) });
      }
    }
  });

  // ─── Kutilayotgan E'lonlar ────────────────────────────────────────────────
  bot.hears('📋 Kutilayotgan E\'lonlar', checkAdmin, async (ctx) => {
    const db = getDb();
    const vacancies = db.prepare(`
      SELECT v.*, h.company_name as hr_company, h.phone as hr_phone
      FROM vacancies v
      JOIN hr_companies h ON h.user_id = v.hr_id
      WHERE v.status = 'pending'
      ORDER BY v.id DESC
    `).all();

    if (!vacancies.length) {
      return ctx.reply('✅ Kutilayotgan e\'lonlar yo\'q.');
    }

    await ctx.reply(`📋 *Kutilayotgan E'lonlar (${vacancies.length} ta):*`, { parse_mode: 'Markdown' });

    for (const vac of vacancies) {
      const text =
        `📌 *E'lon #${vac.id}*\n` +
        `🏢 Kompaniya: ${escapeMarkdown(vac.hr_company || '—')} \`${escapeMarkdown(vac.hr_phone || '—')}\`\n` +
        `💼 Lavozim: *${escapeMarkdown(vac.title || '—')}*\n` +
        `📂 Soha: ${escapeMarkdown(vac.category || '—')}\n` +
        `📍 Joylashuv: ${escapeMarkdown(vac.location || '—')}\n` +
        `💰 Maosh: ${escapeMarkdown(vac.salary || '—')}\n` +
        `🕐 ${new Date(vac.created_at || Date.now()).toLocaleString('uz-UZ')}`;

      await ctx.reply(text, { parse_mode: 'Markdown', ...adminVacancyKb(vac.id) });
    }
  });

  // ─── Kutilayotgan Rezyumalar ──────────────────────────────────────────────
  bot.hears('📄 Kutilayotgan Rezyumlar', checkAdmin, async (ctx) => {
    const db = getDb();
    const resumes = db.prepare(`
      SELECT cr.*, c.phone as cand_phone, c.full_name as cand_name_from_user
      FROM candidate_resumes cr
      JOIN candidates c ON c.user_id = cr.candidate_id
      WHERE cr.status = 'pending'
      ORDER BY cr.id DESC
    `).all();

    if (!resumes.length) {
      return ctx.reply('✅ Kutilayotgan rezyumalar yo\'q.');
    }

    await ctx.reply(`📄 *Kutilayotgan Rezyumalar (${resumes.length} ta):*`, { parse_mode: 'Markdown' });

    for (const res of resumes) {
      const text =
        `📄 *Rezyume #${res.id}*\n` +
        `👤 Ism: *${escapeMarkdown(res.full_name || res.cand_name_from_user || '—')}*\n` +
        `🎯 Lavozim: ${escapeMarkdown(res.position || '—')}\n` +
        `📂 Soha: ${escapeMarkdown(res.category || '—')}\n` +
        `📍 Shahar: ${escapeMarkdown(res.city || '—')}\n` +
        `📞 Telefon: ${escapeMarkdown(res.cand_phone || '—')}`;

      await ctx.reply(text, { parse_mode: 'Markdown', ...adminResumeKb(res.id) });
    }
  });

  // ─── Kutilayotgan Bannerlar ───────────────────────────────────────────────
  bot.hears('🎨 Kutilayotgan Bannerlar', checkAdmin, async (ctx) => {
    const db = getDb();
    const banners = db.prepare(`
      SELECT b.*, h.company_name, h.phone as hr_phone
      FROM banners b
      LEFT JOIN hr_companies h ON h.user_id = b.hr_id
      WHERE b.status = 'pending'
      ORDER BY b.id DESC
    `).all();

    if (!banners.length) {
      return ctx.reply('✅ Kutilayotgan bannerlar yo\'q.');
    }

    await ctx.reply(`🎨 *Kutilayotgan Bannerlar (${banners.length} ta):*`, { parse_mode: 'Markdown' });

    for (const banner of banners) {
      const companyName = escapeMarkdown(banner.company_name || '—');
      const hrPhone = escapeMarkdown(banner.hr_phone || '—');
      const bannerTitle = escapeMarkdown(banner.title || '—');
      const plan = escapeMarkdown(banner.plan || '—');
      const price = parseInt(banner.price || 0).toLocaleString('uz-UZ');

      const text =
        `🎨 *Banner \#${banner.id}*\n` +
        `🏢 Kompaniya: ${companyName} \`${hrPhone}\`\n` +
        `📝 Sarlavha: *${bannerTitle}*\n` +
        `📦 Tarif: ${plan}\n` +
        `📅 Muddat: ${banner.duration_days || '—'} kun\n` +
        `💰 Narx: ${price} so'm`;

      await ctx.reply(text, { parse_mode: 'Markdown', ...adminBannerKb(banner.id) });
    }
  });

  // ─── Statistika ───────────────────────────────────────────────────────────
  bot.hears('📊 Statistika', checkAdmin, async (ctx) => {
    const db = getDb();

    const stats = {
      hr_total:     db.prepare('SELECT COUNT(*) as c FROM hr_companies').get().c,
      hr_active:    db.prepare("SELECT COUNT(*) as c FROM hr_companies WHERE is_active=1").get().c,
      cand_total:   db.prepare('SELECT COUNT(*) as c FROM candidates').get().c,
      cand_active:  db.prepare("SELECT COUNT(*) as c FROM candidates WHERE is_active=1").get().c,
      vac_active:   db.prepare("SELECT COUNT(*) as c FROM vacancies WHERE status='active'").get().c,
      vac_pending:  db.prepare("SELECT COUNT(*) as c FROM vacancies WHERE status='pending'").get().c,
      vac_expired:  db.prepare("SELECT COUNT(*) as c FROM vacancies WHERE status='expired'").get().c,
      res_active:   db.prepare("SELECT COUNT(*) as c FROM candidate_resumes WHERE status='active'").get().c,
      res_pending:  db.prepare("SELECT COUNT(*) as c FROM candidate_resumes WHERE status='pending'").get().c,
      apps_total:   db.prepare('SELECT COUNT(*) as c FROM applications').get().c,
      pay_approved: db.prepare("SELECT COUNT(*) as c FROM payments WHERE status='approved'").get().c,
      pay_pending:  db.prepare("SELECT COUNT(*) as c FROM payments WHERE status='pending'").get().c,
      banner_active: db.prepare("SELECT COUNT(*) as c FROM banners WHERE status='active'").get().c,
    };

    await ctx.reply(
      `📊 *Umumiy Statistika*\n\n` +
      `👥 HR (jami/aktiv): ${stats.hr_total}/${stats.hr_active}\n` +
      `👤 Nomzodlar (jami/aktiv): ${stats.cand_total}/${stats.cand_active}\n\n` +
      `📌 E'lonlar:\n` +
      `  🟢 Aktiv: ${stats.vac_active}\n` +
      `  🟡 Kutilmoqda: ${stats.vac_pending}\n` +
      `  🔴 Tugagan: ${stats.vac_expired}\n\n` +
      `📄 Rezyumalar:\n` +
      `  🟢 Aktiv: ${stats.res_active}\n` +
      `  🟡 Kutilmoqda: ${stats.res_pending}\n\n` +
      `📨 Jami arizalar: ${stats.apps_total}\n` +
      `🎨 Aktiv bannerlar: ${stats.banner_active}\n\n` +
      `💳 To'lovlar:\n` +
      `  ✅ Tasdiqlangan: ${stats.pay_approved}\n` +
      `  ⏳ Kutilmoqda: ${stats.pay_pending}`,
      { parse_mode: 'Markdown' }
    );
  });

  // ─── Callbacks: Vakansiya tasdiqlash / rad etish ──────────────────────────
  bot.action(/^vac_approve_(\d+)$/, checkAdmin, async (ctx) => {
    await ctx.answerCbQuery('✅ Tasdiqlanmoqda...');
    const vacId = parseInt(ctx.match[1]);
    const db = getDb();
    const vac = db.prepare('SELECT * FROM vacancies WHERE id = ?').get(vacId);
    if (!vac || vac.status !== 'pending') {
      return ctx.editMessageText('⚠️ Bu e\'lon allaqachon ko\'rib chiqilgan.');
    }

    // Publish to channel immediately
    try {
      await publishVacancyToChannel(bot, vacId);
    } catch (e) {
      console.error('[vac_approve] publish error:', e.message);
    }

    // Notify HR
    if (vac.hr_id) {
      bot.telegram.sendMessage(vac.hr_id, '✅ *E\'loningiz tasdiqlandi va kanalga joylashtirildi!*', { parse_mode: 'Markdown' }).catch(() => {});
    }

    try {
      await ctx.editMessageText(`✅ TASDIQLANDI — E'lon #${vacId} kanalga joylashtirildi!`);
    } catch (_) {}

    // Offer publish time options
    try {
      await ctx.reply(
        `✅ *E'lon #${vacId} tasdiqlandi!*\n\n🕒 *Kanalga qachon joylashtirilsin?*`,
        { parse_mode: 'Markdown', ...adminPublishTimeKb(vacId) }
      );
    } catch (_) {}
  });

  bot.action(/^vac_reject_(\d+)$/, checkAdmin, async (ctx) => {
    await ctx.answerCbQuery('❌ Rad etilmoqda...');
    const vacId = parseInt(ctx.match[1]);
    const db = getDb();
    const vac = db.prepare('SELECT * FROM vacancies WHERE id = ?').get(vacId);
    if (!vac || vac.status !== 'pending') {
      return ctx.editMessageText('⚠️ Bu e\'lon allaqachon ko\'rib chiqilgan.');
    }

    db.prepare("UPDATE vacancies SET status = 'rejected' WHERE id = ?").run(vacId);

    if (vac.hr_id) {
      bot.telegram.sendMessage(vac.hr_id, '❌ *E\'loningiz rad etildi.*\n\nIltimos, ma\'lumotlarni tekshirib qayta yuboring.', { parse_mode: 'Markdown' }).catch(() => {});
    }

    try {
      await ctx.editMessageText(`❌ RAD ETILDI — E'lon #${vacId}`);
    } catch (_) {}
  });

  // ─── Callbacks: Rezyume tasdiqlash / rad etish ────────────────────────────
  bot.action(/^res_approve_(\d+)$/, checkAdmin, async (ctx) => {
    await ctx.answerCbQuery('✅ Tasdiqlanmoqda...');
    const resumeId = parseInt(ctx.match[1]);
    const db = getDb();
    const res = db.prepare('SELECT * FROM candidate_resumes WHERE id = ?').get(resumeId);
    if (!res || res.status !== 'pending') {
      return ctx.editMessageText('⚠️ Bu rezyume allaqachon ko\'rib chiqilgan.');
    }

    // Notify candidate
    if (res.candidate_id) {
      bot.telegram.sendMessage(res.candidate_id, '✅ *Rezyumeingiz tasdiqlandi va kanalga joylashtiriladi!*', { parse_mode: 'Markdown' }).catch(() => {});
    }

    try {
      await ctx.editMessageText(`✅ TASDIQLANDI — Rezyume #${resumeId}`);
    } catch (_) {}

    // Offer publish time options
    try {
      await ctx.reply(
        `✅ *Rezyume #${resumeId} tasdiqlandi!*\n\n🕒 *Kanalga qachon joylashtirilsin?*`,
        { parse_mode: 'Markdown', ...adminPublishResumeTimeKb(resumeId) }
      );
    } catch (_) {}
  });

  bot.action(/^res_reject_(\d+)$/, checkAdmin, async (ctx) => {
    await ctx.answerCbQuery('❌ Rad etilmoqda...');
    const resumeId = parseInt(ctx.match[1]);
    const db = getDb();
    const res = db.prepare('SELECT * FROM candidate_resumes WHERE id = ?').get(resumeId);
    if (!res || res.status !== 'pending') {
      return ctx.editMessageText('⚠️ Bu rezyume allaqachon ko\'rib chiqilgan.');
    }

    db.prepare("UPDATE candidate_resumes SET status = 'rejected' WHERE id = ?").run(resumeId);

    if (res.candidate_id) {
      bot.telegram.sendMessage(res.candidate_id, '❌ *Rezyumeingiz rad etildi.*\n\nIltimos, ma\'lumotlarni tekshirib qayta yuboring.', { parse_mode: 'Markdown' }).catch(() => {});
    }

    try {
      await ctx.editMessageText(`❌ RAD ETILDI — Rezyume #${resumeId}`);
    } catch (_) {}
  });

  // ─── Callbacks: Banner tasdiqlash / rad etish ─────────────────────────────
  bot.action(/^banner_approve_(\d+)$/, checkAdmin, async (ctx) => {
    await ctx.answerCbQuery('✅ Faollashtirilmoqda...');
    const bannerId = parseInt(ctx.match[1]);
    const db = getDb();
    const banner = db.prepare('SELECT * FROM banners WHERE id = ?').get(bannerId);
    if (!banner) {
      return ctx.editMessageText('⚠️ Banner topilmadi.');
    }
    if (banner.status === 'active') {
      return ctx.editMessageText('⚠️ Bu banner allaqachon aktiv.');
    }

    db.prepare(`
      UPDATE banners
      SET status = 'active',
          start_date = datetime('now'),
          end_date = datetime('now', '+' || duration_days || ' days')
      WHERE id = ?
    `).run(bannerId);

    if (banner.hr_id) {
      bot.telegram.sendMessage(
        banner.hr_id,
        `🎉 *Tabriklaymiz!*\n\nReklamangiz (_${banner.title || 'Banner'}_) tasdiqlandi va platformada faol bo'ldi!\nU *${banner.duration_days}* kun davomida ko'rsatiladi.`,
        { parse_mode: 'Markdown' }
      ).catch(() => {});
    }

    try {
      await ctx.editMessageText(`✅ FAOLLASHTIRILDI — Banner #${bannerId}`);
    } catch (_) {}
  });

  bot.action(/^banner_reject_(\d+)$/, checkAdmin, async (ctx) => {
    await ctx.answerCbQuery('❌ Rad etilmoqda...');
    const bannerId = parseInt(ctx.match[1]);
    const db = getDb();
    const banner = db.prepare('SELECT * FROM banners WHERE id = ?').get(bannerId);
    if (!banner) {
      return ctx.editMessageText('⚠️ Banner topilmadi.');
    }

    db.prepare("UPDATE banners SET status = 'rejected' WHERE id = ?").run(bannerId);

    if (banner.hr_id) {
      bot.telegram.sendMessage(
        banner.hr_id,
        `❌ *Reklamangiz rad etildi.*\n\nSabab: To'lov tasdiqlanmadi yoki ma'lumotlar noto'g'ri.\n\nIltimos, qayta urinib ko'ring.`,
        { parse_mode: 'Markdown' }
      ).catch(() => {});
    }

    try {
      await ctx.editMessageText(`❌ RAD ETILDI — Banner #${bannerId}`);
    } catch (_) {}
  });
}

module.exports = { showAdminMain, registerAdminHandlers };
