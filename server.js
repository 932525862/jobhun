const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');

const { getDb, getSetting, setSetting } = require('./database/db');
const { ADMIN_IDS, BOT_TOKEN } = require('./config');
const {
  isAdmin,
  isHrRegistered,
  isCandidateRegistered,
  cleanAndFixText,
  buildVacancyText,
  buildResumeChannelText,
  FIELD_LABELS,
  getCategoryPreset,
  getHrCategoryPreset,
} = require('./utils/helpers');
const { publishVacancyToChannel, publishResumeToChannel, deactivateVacancyButton, updateChannelVacancyText } = require('./utils/channel');
const { adminPaymentKb, adminPublishResumeTimeKb, adminVacancyKb, adminResumeKb, adminBannerKb } = require('./keyboards/admin_kb');

const { Telegraf } = require('telegraf');

// Create uploads directory safely
const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const UPLOADS_DIR = isVercel ? path.join('/tmp', 'uploads') : path.join(__dirname, 'uploads');
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (err) {
  console.error('Warning creating UPLOADS_DIR:', err.message);
}

// Multer storage for payment receipts and candidate application photos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

let defaultBotInstance = null;

function createServer(providedBot) {
  if (!providedBot && !defaultBotInstance && BOT_TOKEN) {
    defaultBotInstance = new Telegraf(BOT_TOKEN);
  }
  const bot = providedBot || defaultBotInstance;
  const app = express();

  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Static files: Telegram Web App frontend
  app.use(express.static(path.join(__dirname, 'public')));
  // Uploaded files (receipts, photos)
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Helper function to validate Telegram initData (HMAC-SHA256)
  function validateInitData(initData) {
    if (!initData || !BOT_TOKEN) return false;
    try {
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get('hash');
      urlParams.delete('hash');

      const params = Array.from(urlParams.entries())
        .map(([key, val]) => `${key}=${val}`)
        .sort()
        .join('\n');

      const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
      const calculatedHash = crypto.createHmac('sha256', secretKey).update(params).digest('hex');

      return calculatedHash === hash;
    } catch (_) {
      return false;
    }
  }

  // ── Auth & Profile ────────────────────────────────────────────────────────────
  app.post('/api/auth', (req, res) => {
    try {
      const { userId, initData } = req.body;
      const uid = parseInt(userId);

      if (!uid || isNaN(uid)) {
        return res.status(400).json({ error: 'Foydalanuvchi ID topilmadi' });
      }

      const db = getDb();

      const admin = isAdmin(uid);
      const hr = db.prepare('SELECT * FROM hr_companies WHERE user_id = ?').get(uid);
      const candidate = db.prepare('SELECT * FROM candidates WHERE user_id = ?').get(uid);

      let role = 'guest';
      if (admin) role = 'admin';
      else if (hr) role = 'hr';
      else if (candidate) role = 'candidate';

      const settings = {
        hr_price: getSetting('hr_price') || '50000',
        hr_tokens: getSetting('hr_tokens') || '8',
        hr_days: getSetting('hr_days') || '14',
        candidate_price: getSetting('candidate_price') || '20000',
        candidate_tokens: getSetting('candidate_tokens') || '12',
        candidate_days: getSetting('candidate_days') || '14',
        card_number: getSetting('card_number') || '0000 0000 0000 0000',
        card_owner: getSetting('card_owner') || 'Karta egasi',
        banner_price_3day: getSetting('banner_price_3day') || '99000',
        banner_price_7day: getSetting('banner_price_7day') || '199000',
        banner_price_14day: getSetting('banner_price_14day') || '349000',
      };

      res.json({
        success: true,
        userId: uid,
        role,
        isAdmin: admin,
        hr: hr || null,
        candidate: candidate || null,
        settings,
      });
    } catch (err) {
      console.error('[API /api/auth]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── BANNERS ────────────────────────────────────────────────────────
  app.get('/api/banners/active', (req, res) => {
    try {
      const db = getDb();
      // Update expired banners automatically
      db.prepare(`UPDATE banners SET status = 'expired' WHERE status = 'active' AND end_date <= datetime('now')`).run();
      
      const banners = db.prepare(`
        SELECT * FROM banners 
        WHERE status = 'active' AND start_date <= datetime('now') AND end_date > datetime('now')
        ORDER BY RANDOM() -- Rotate them randomly or by highest plan
      `).all();

      res.json({ success: true, banners });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Registration ──────────────────────────────────────────────────────────────
  app.post('/api/register/hr', (req, res) => {
    try {
      const { userId, companyName, phone } = req.body;
      const uid = parseInt(userId);
      if (!uid || !companyName || !phone) {
        return res.status(400).json({ error: 'Barcha maydonlarni to\'ldiring' });
      }

      const db = getDb();
      const existing = db.prepare('SELECT * FROM hr_companies WHERE user_id = ?').get(uid);

      const days = parseInt(getSetting('hr_days') || '14');
      const tokens = parseInt(getSetting('hr_tokens') || '8');
      const subEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

      if (existing) {
        db.prepare(`
          UPDATE hr_companies
          SET company_name = ?, phone = ?
          WHERE user_id = ?
        `).run(cleanAndFixText(companyName), phone.trim(), uid);
      } else {
        db.prepare(`
          INSERT INTO hr_companies (user_id, company_name, phone, subscription_end, tokens, is_active)
          VALUES (?, ?, ?, ?, ?, 1)
        `).run(uid, cleanAndFixText(companyName), phone.trim(), subEnd, tokens);
      }

      const updated = db.prepare('SELECT * FROM hr_companies WHERE user_id = ?').get(uid);
      res.json({ success: true, hr: updated });
    } catch (err) {
      console.error('[API /api/register/hr]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/register/candidate', (req, res) => {
    try {
      const { userId, fullName, phone } = req.body;
      const uid = parseInt(userId);
      if (!uid || !fullName || !phone) {
        return res.status(400).json({ error: 'Barcha maydonlarni to\'ldiring' });
      }

      const db = getDb();
      const existing = db.prepare('SELECT * FROM candidates WHERE user_id = ?').get(uid);

      const days = parseInt(getSetting('candidate_days') || '14');
      const tokens = parseInt(getSetting('candidate_tokens') || '12');
      const subEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

      if (existing) {
        db.prepare(`
          UPDATE candidates
          SET full_name = ?, phone = ?
          WHERE user_id = ?
        `).run(cleanAndFixText(fullName), phone.trim(), uid);
      } else {
        db.prepare(`
          INSERT INTO candidates (user_id, full_name, phone, subscription_end, tokens, is_active)
          VALUES (?, ?, ?, ?, ?, 1)
        `).run(uid, cleanAndFixText(fullName), phone.trim(), subEnd, tokens);
      }

      const updated = db.prepare('SELECT * FROM candidates WHERE user_id = ?').get(uid);
      res.json({ success: true, candidate: updated });
    } catch (err) {
      console.error('[API /api/register/candidate]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Vacancies (Public & HR) ───────────────────────────────────────────────────
  app.get('/api/vacancies', (req, res) => {
    try {
      const { category, search } = req.query;
      const db = getDb();

      let sql = `SELECT * FROM vacancies WHERE status = 'active'`;
      const params = [];

      if (category && category !== 'all') {
        sql += ` AND (category = ? OR INSTR(LOWER(category), LOWER(?)) > 0)`;
        params.push(category, category);
      }

      if (search) {
        sql += ` AND (INSTR(LOWER(title), LOWER(?)) > 0 OR INSTR(LOWER(company_name), LOWER(?)) > 0 OR INSTR(LOWER(requirements), LOWER(?)) > 0 OR INSTR(LOWER(raw_text), LOWER(?)) > 0)`;
        params.push(search, search, search, search);
      }

      sql += ` ORDER BY published_at DESC, id DESC`;

      const vacancies = db.prepare(sql).all(...params);
      res.json({ success: true, vacancies });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/vacancies/:id', (req, res) => {
    try {
      const db = getDb();
      const vacancy = db.prepare(`
        SELECT v.*,
          (SELECT COUNT(*) FROM applications a WHERE a.vacancy_id = v.id) as apps_count
        FROM vacancies v WHERE v.id = ?
      `).get(req.params.id);
      if (!vacancy) return res.status(404).json({ error: 'Vakansiya topilmadi' });

      let extraFields = [];
      try {
        extraFields = JSON.parse(vacancy.extra_fields || '[]');
      } catch (_) {}

      res.json({ success: true, vacancy, extraFields });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get('/api/hr/banners', (req, res) => {
    try {
      const uid = parseInt(req.query.userId);
      if (!uid) return res.status(400).json({ error: 'userId talab qilinadi' });

      const db = getDb();
      const banners = db.prepare(`SELECT * FROM banners WHERE hr_id = ? ORDER BY id DESC`).all(uid);
      res.json({ success: true, banners });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/hr/banners', upload.single('image'), (req, res) => {
    try {
      const {
        userId, companyName, title, subtitle, description, ctaText,
        colorFrom, colorTo, vacancyId, plan, durationDays, price
      } = req.body;
      
      const hrId = parseInt(userId);
      if (!hrId) return res.status(400).json({ error: 'userId talab qilinadi' });
      
      const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
      if (!imagePath) return res.status(400).json({ error: 'Banner rasmi majburiy!' });

      const db = getDb();
      const insert = db.prepare(`
        INSERT INTO banners (
          hr_id, company_name, title, subtitle, description, cta_text,
          color_from, color_to, vacancy_id, plan, duration_days, price, image_url, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `);
      
      insert.run(
        hrId, companyName || 'Kompaniya', title, subtitle || '', description || '', ctaText || 'Batafsil',
        colorFrom || '#0066FF', colorTo || '#00d2ff', vacancyId ? parseInt(vacancyId) : null,
        plan || 'standard', parseInt(durationDays) || 3, parseInt(price) || 0, imagePath
      );

      const bannerId = db.prepare('SELECT last_insert_rowid() as id').get().id;
      const hr = db.prepare('SELECT * FROM hr_companies WHERE user_id = ?').get(hrId);

      // Notify admins in Telegram with approve/reject buttons
      for (const adminId of ADMIN_IDS) {
        bot.telegram.sendMessage(
          adminId,
          `🎨 *Yangi Banner So'rovi!*\n\n` +
          `🏢 Kompaniya: ${companyName || hr?.company_name || '—'}\n` +
          `📝 Sarlavha: *${title || '—'}*\n` +
          `📦 Tarif: ${plan || 'standard'}\n` +
          `📅 Muddat: ${durationDays || 3} kun\n` +
          `💰 Narx: ${parseInt(price || 0).toLocaleString('uz-UZ')} so'm\n` +
          `🔢 Banner ID: #${bannerId}`,
          { parse_mode: 'Markdown', ...adminBannerKb(bannerId) }
        ).catch(() => {});
      }

      res.json({ success: true, message: 'Banner to\'lov va tasdiqlash uchun yuborildi!' });
    } catch (err) {
      console.error('[API /api/hr/banners POST]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });


  app.get('/api/hr/vacancies', (req, res) => {
    try {
      const uid = parseInt(req.query.userId);
      if (!uid) return res.status(400).json({ error: 'userId talab qilinadi' });

      const db = getDb();
      const vacancies = db.prepare(`
        SELECT v.*, 
          (SELECT COUNT(*) FROM applications a WHERE a.vacancy_id = v.id) as apps_count
        FROM vacancies v
        WHERE v.hr_id = ? AND v.status != 'deleted'
        ORDER BY v.id DESC
      `).all(uid);

      res.json({ success: true, vacancies });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/hr/vacancies', (req, res) => {
    try {
      const {
        userId,
        title,
        category,
        companyName,
        location,
        salary,
        workTime,
        tasks,
        requirements,
        conditions,
        rawText,
        creationType,
        extraFields,
      } = req.body;

      const uid = parseInt(userId);
      if (!uid || !title) {
        return res.status(400).json({ error: 'Sarlavha kiritilishi shart' });
      }

      const db = getDb();
      const hr = db.prepare('SELECT * FROM hr_companies WHERE user_id = ?').get(uid);

      if (!hr) {
        return res.status(403).json({ error: 'HR sifatida ro\'yxatdan o\'tmagansiz' });
      }

      // 🧠 Smart Anti-Duplicate Check: Allow unlimited postings per day, but block identical vacancies in last 3 days (72 hours)
      const cleanTitle = cleanAndFixText(title);
      const cleanCat = category || 'Boshqa soha';
      const normNewTitle = cleanTitle.trim().toLowerCase();
      const normNewCategory = cleanCat.trim().toLowerCase();

      const recentVacancies = db.prepare(`
        SELECT id, title, category, COALESCE(published_at, created_at, datetime('now')) as post_date
        FROM vacancies
        WHERE hr_id = ? AND status != 'deleted'
          AND datetime(COALESCE(published_at, created_at, datetime('now'))) >= datetime('now', '-3 days')
      `).all(uid);

      const isDuplicate = recentVacancies.some(v => {
        const existingTitle = (v.title || '').trim().toLowerCase();
        const existingCat = (v.category || '').trim().toLowerCase();
        return existingTitle === normNewTitle && existingCat === normNewCategory;
      });

      if (isDuplicate) {
        return res.status(400).json({
          error: `⚠️ "${cleanTitle}" e'loni oxirgi 3 kun ichida allaqachon yaratilgan! Bir xil e'lonni qayta chiqarish uchun 3 kun o'tishi kerak. Boshqa vakansiya yoki boshqa lavozim bo'yicha e'lon yaratishingiz mumkin.`
        });
      }

      const resInsert = db.prepare(`
        INSERT INTO vacancies
          (hr_id, title, category, company_name, location, salary, work_time, tasks, requirements, conditions, raw_text, creation_type, extra_fields, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `).run(
        uid,
        cleanAndFixText(title),
        category || 'Boshqa soha',
        companyName ? cleanAndFixText(companyName) : hr.company_name,
        location ? cleanAndFixText(location) : 'Toshkent shahri',
        salary ? cleanAndFixText(salary) : 'Ko\'rsatilgan',
        workTime ? cleanAndFixText(workTime) : 'Ko\'rsatilgan',
        tasks ? cleanAndFixText(tasks) : '',
        requirements ? cleanAndFixText(requirements) : '',
        conditions ? cleanAndFixText(conditions) : '',
        rawText ? cleanAndFixText(rawText) : '',
        creationType || 'wizard',
        JSON.stringify(extraFields || [])
      );

      const vacancyId = resInsert.lastInsertRowid;

      if (hr.is_active && hr.tokens > 0) {
        db.prepare('UPDATE hr_companies SET tokens = tokens - 1 WHERE user_id = ?').run(uid);
        const remaining = db.prepare('SELECT tokens FROM hr_companies WHERE user_id = ?').get(uid);

        // Notify Admins with approve/reject buttons
        for (const adminId of ADMIN_IDS) {
          try {
            bot.telegram.sendMessage(
              adminId,
              `📌 *Yangi HR Vakansiyasi (Web App)*\n\n` +
              `🏢 Kompaniya: ${hr.company_name} (${hr.phone})\n` +
              `💼 Lavozim: *${title}*\n` +
              `📂 Soha: *${category || '—'}*\n` +
              `🔢 E'lon ID: #${vacancyId}`,
              { parse_mode: 'Markdown', ...adminVacancyKb(vacancyId) }
            ).catch(() => {});
          } catch (_) {}
        }

        return res.json({
          success: true,
          vacancyId,
          tokenUsed: true,
          remainingTokens: remaining.tokens,
          message: 'E\'loningiz qabul qilindi va admin tasdiqlashiga yuborildi!'
        });
      } else {
        return res.json({
          success: true,
          vacancyId,
          tokenUsed: false,
          requiresPayment: true,
          message: 'E\'lon saqlandi. E\'lonni aktivlashtirish uchun tarif to\'lovini amalga oshiring.'
        });
      }
    } catch (err) {
      console.error('[API /api/hr/vacancies POST]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/hr/vacancies/:id', (req, res) => {
    try {
      const vacancyId = parseInt(req.params.id);
      const { userId, fieldKey, fieldValue } = req.body;
      const uid = parseInt(userId);

      const db = getDb();
      const vacancy = db.prepare('SELECT * FROM vacancies WHERE id = ? AND hr_id = ?').get(vacancyId, uid);
      if (!vacancy) return res.status(404).json({ error: 'E\'lon topilmadi yoki sizga tegishli emas' });

      if (fieldKey && fieldValue !== undefined) {
        const allowedFields = ['title', 'category', 'company_name', 'location', 'salary', 'work_time', 'tasks', 'requirements', 'conditions', 'raw_text'];
        if (!allowedFields.includes(fieldKey)) {
          return res.status(400).json({ error: 'Tahrirlash ruxsat etilmagan maydon' });
        }
        db.prepare(`UPDATE vacancies SET ${fieldKey} = ? WHERE id = ? AND hr_id = ?`).run(cleanAndFixText(fieldValue), vacancyId, uid);
      } else {
        const allowedFields = ['title', 'category', 'company_name', 'location', 'salary', 'work_time', 'tasks', 'requirements', 'conditions', 'raw_text'];
        const setClauses = [];
        const params = [];
        const bodyObj = req.body.data || req.body;

        for (const key of allowedFields) {
          if (bodyObj[key] !== undefined) {
            setClauses.push(`${key} = ?`);
            params.push(cleanAndFixText(bodyObj[key]));
          }
        }

        if (setClauses.length > 0) {
          params.push(vacancyId, uid);
          db.prepare(`UPDATE vacancies SET ${setClauses.join(', ')} WHERE id = ? AND hr_id = ?`).run(...params);
        }
      }

      if (vacancy.status === 'active' && vacancy.channel_msg_id) {
        updateChannelVacancyText(bot, vacancyId);
      }

      res.json({ success: true, message: 'Ma\'lumot muvaffaqiyatli tahrirlandi' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/hr/vacancies/:id/reactivate', (req, res) => {
    try {
      const vacancyId = parseInt(req.params.id);
      const { userId } = req.body;
      const uid = parseInt(userId);

      const db = getDb();
      const hr = db.prepare('SELECT * FROM hr_companies WHERE user_id = ?').get(uid);

      if (!hr || !hr.is_active || hr.tokens <= 0) {
        return res.status(400).json({ error: 'Tokeningiz yetarli emas' });
      }

      db.prepare('UPDATE hr_companies SET tokens = tokens - 1 WHERE user_id = ?').run(uid);

      const newExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      db.prepare(`
        UPDATE vacancies SET status = 'active', expires_at = ?, last_activated = datetime('now')
        WHERE id = ? AND hr_id = ?
      `).run(newExpires, vacancyId, uid);

      publishVacancyToChannel(bot, vacancyId);

      res.json({ success: true, message: 'E\'lon qayta faollashtirildi!', remainingTokens: hr.tokens - 1 });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/hr/vacancies/:id', (req, res) => {
    try {
      const vacancyId = parseInt(req.params.id);
      const uid = parseInt(req.query.userId || req.body.userId);

      const db = getDb();
      const vacancy = db.prepare('SELECT * FROM vacancies WHERE id = ? AND hr_id = ?').get(vacancyId, uid);
      if (!vacancy) return res.status(404).json({ error: 'E\'lon topilmadi' });

      if (vacancy.channel_msg_id) {
        deactivateVacancyButton(bot, vacancyId);
      }

      db.prepare("UPDATE vacancies SET status = 'deleted' WHERE id = ?").run(vacancyId);

      res.json({ success: true, message: 'E\'lon o\'chirildi' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/hr/vacancies/:id/applications', (req, res) => {
    try {
      const vacancyId = parseInt(req.params.id);
      const uid = parseInt(req.query.userId);

      const db = getDb();
      const vacancy = db.prepare('SELECT * FROM vacancies WHERE id = ? AND hr_id = ?').get(vacancyId, uid);
      if (!vacancy) return res.status(404).json({ error: 'E\'lon topilmadi' });

      const apps = db.prepare(`
        SELECT a.*, c.full_name, c.phone
        FROM applications a
        JOIN candidates c ON c.user_id = a.candidate_id
        WHERE a.vacancy_id = ?
        ORDER BY a.id DESC
      `).all(vacancyId);

      res.json({ success: true, vacancy, applications: apps });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/hr/vacancies/:id/matching-candidates', (req, res) => {
    try {
      const vacancyId = parseInt(req.params.id);
      const uid = parseInt(req.query.userId);

      const db = getDb();
      const vacancy = db.prepare('SELECT * FROM vacancies WHERE id = ? AND hr_id = ?').get(vacancyId, uid);
      if (!vacancy) return res.status(404).json({ error: 'E\'lon topilmadi' });

      const cat = (vacancy.category || '').trim();
      const candidates = db.prepare(`
        SELECT cr.*, c.phone as cand_phone, c.full_name as cand_name
        FROM candidate_resumes cr
        JOIN candidates c ON c.user_id = cr.candidate_id
        WHERE cr.status != 'deleted' AND cr.status != 'rejected'
        AND (
          cr.category = ?
          OR (length(?) > 0 AND (INSTR(LOWER(cr.category), LOWER(?)) > 0 OR INSTR(LOWER(?), LOWER(cr.category)) > 0))
          OR (length(?) > 0 AND (INSTR(LOWER(cr.position), LOWER(?)) > 0 OR INSTR(LOWER(?), LOWER(cr.position)) > 0))
        )
        ORDER BY cr.id DESC
      `).all(cat, cat, cat, cat, cat, cat, cat);

      res.json({ success: true, vacancy, matchingCandidates: candidates });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Resumes (Public & Candidate) ──────────────────────────────────────────────
  app.get('/api/resumes', (req, res) => {
    try {
      const { category, search } = req.query;
      const db = getDb();

      let sql = `SELECT cr.*, c.phone as cand_phone FROM candidate_resumes cr JOIN candidates c ON c.user_id = cr.candidate_id WHERE cr.status = 'active'`;
      const params = [];

      if (category && category !== 'all') {
        sql += ` AND (cr.category = ? OR INSTR(LOWER(cr.category), LOWER(?)) > 0)`;
        params.push(category, category);
      }

      if (search) {
        sql += ` AND (INSTR(LOWER(cr.position), LOWER(?)) > 0 OR INSTR(LOWER(cr.full_name), LOWER(?)) > 0 OR INSTR(LOWER(cr.skills), LOWER(?)) > 0 OR INSTR(LOWER(cr.raw_text), LOWER(?)) > 0)`;
        params.push(search, search, search, search);
      }

      sql += ` ORDER BY cr.published_at DESC, cr.id DESC`;

      const resumes = db.prepare(sql).all(...params);
      res.json({ success: true, resumes });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/resumes/:id', (req, res) => {
    try {
      const db = getDb();
      const resume = db.prepare(`
        SELECT cr.*, c.phone as cand_phone
        FROM candidate_resumes cr
        JOIN candidates c ON c.user_id = cr.candidate_id
        WHERE cr.id = ?
      `).get(req.params.id);

      if (!resume) return res.status(404).json({ error: 'Rezyume topilmadi' });
      res.json({ success: true, resume });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/candidate/resumes', (req, res) => {
    try {
      const uid = parseInt(req.query.userId);
      if (!uid) return res.status(400).json({ error: 'userId talab qilinadi' });

      const db = getDb();
      const resumes = db.prepare(`
        SELECT * FROM candidate_resumes
        WHERE candidate_id = ? AND status != 'deleted'
        ORDER BY id DESC
      `).all(uid);

      res.json({ success: true, resumes });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/candidate/resumes', (req, res) => {
    try {
      const {
        userId,
        fullName,
        category,
        position,
        city,
        experienceYears,
        expectedSalary,
        employmentType,
        aboutMe,
        experienceDetails,
        skills,
        education,
        languages,
        additionalInfo,
        rawText,
        creationType,
      } = req.body;

      const uid = parseInt(userId);
      if (!uid || !position) {
        return res.status(400).json({ error: 'Lavozim kiritilishi shart' });
      }

      const db = getDb();
      const cand = db.prepare('SELECT * FROM candidates WHERE user_id = ?').get(uid);
      if (!cand) {
        return res.status(403).json({ error: 'Nomzod sifatida ro\'yxatdan o\'tmagansiz' });
      }

      const resInsert = db.prepare(`
        INSERT INTO candidate_resumes
          (candidate_id, full_name, position, category, city, experience_years, expected_salary, employment_type, about_me, experience_details, skills, education, languages, additional_info, raw_text, creation_type, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `).run(
        uid,
        fullName ? cleanAndFixText(fullName) : cand.full_name,
        cleanAndFixText(position),
        category || 'Boshqa soha',
        city ? cleanAndFixText(city) : 'Toshkent shahri',
        experienceYears || '—',
        expectedSalary || '—',
        employmentType || '—',
        aboutMe ? cleanAndFixText(aboutMe) : '',
        experienceDetails ? cleanAndFixText(experienceDetails) : '',
        skills ? cleanAndFixText(skills) : '',
        education ? cleanAndFixText(education) : '',
        languages ? cleanAndFixText(languages) : '',
        additionalInfo ? cleanAndFixText(additionalInfo) : '',
        rawText ? cleanAndFixText(rawText) : '',
        creationType || 'wizard'
      );

      const resumeId = resInsert.lastInsertRowid;

      if (cand.is_active && cand.tokens > 0) {
        db.prepare('UPDATE candidates SET tokens = tokens - 1 WHERE user_id = ?').run(uid);
        const remaining = db.prepare('SELECT tokens FROM candidates WHERE user_id = ?').get(uid);

        // Schedule publish in 20 min or notify admin
        setTimeout(() => {
          try {
            publishResumeToChannel(bot, resumeId);
          } catch (_) {}
        }, 20 * 60 * 1000);

        for (const adminId of ADMIN_IDS) {
          try {
            bot.telegram.sendMessage(
              adminId,
              `📄 *Yangi Nomzod Rezyumesi (Web App)*\n\n` +
              `👤 Nomzod: ${cand.full_name} (${cand.phone})\n` +
              `🎯 Lavozim: *${position}*\n` +
              `📂 Soha: *${category || '—'}*\n` +
              `🔢 Rezyume ID: #${resumeId}`,
              { parse_mode: 'Markdown', ...adminResumeKb(resumeId) }
            ).catch(() => {});
          } catch (_) {}
        }

        return res.json({
          success: true,
          resumeId,
          tokenUsed: true,
          remainingTokens: remaining.tokens,
          message: 'Rezyumeingiz qabul qilindi va 20 daqiqa ichida kanalga joylashtiriladi!'
        });
      } else {
        return res.json({
          success: true,
          resumeId,
          tokenUsed: false,
          requiresPayment: true,
          message: 'Rezyume saqlandi. Joylashtirish uchun tarif to\'lovini amalga oshiring.'
        });
      }
    } catch (err) {
      console.error('[API /api/candidate/resumes POST]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/candidate/resumes/:id/reactivate', (req, res) => {
    try {
      const resumeId = parseInt(req.params.id);
      const { userId } = req.body;
      const uid = parseInt(userId);

      const db = getDb();
      const cand = db.prepare('SELECT * FROM candidates WHERE user_id = ?').get(uid);

      if (!cand || !cand.is_active || cand.tokens <= 0) {
        return res.status(400).json({ error: 'Tokeningiz yetarli emas' });
      }

      db.prepare('UPDATE candidates SET tokens = tokens - 1 WHERE user_id = ?').run(uid);

      const newExpires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      db.prepare(`
        UPDATE candidate_resumes
        SET status = 'pending', expires_at = ?
        WHERE id = ? AND candidate_id = ?
      `).run(newExpires, resumeId, uid);

      res.json({ success: true, message: 'Rezyume qayta faollashtirishga yuborildi!', remainingTokens: cand.tokens - 1 });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/candidate/resumes/:id', (req, res) => {
    try {
      const resumeId = parseInt(req.params.id);
      const uid = parseInt(req.query.userId || req.body.userId);

      const db = getDb();
      db.prepare("UPDATE candidate_resumes SET status = 'deleted' WHERE id = ? AND candidate_id = ?").run(resumeId, uid);
      res.json({ success: true, message: 'Rezyume o\'chirildi' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Applications ─────────────────────────────────────────────────────────────
  app.post('/api/vacancies/:id/apply', upload.single('photo'), (req, res) => {
    try {
      const vacancyId = parseInt(req.params.id);
      const { userId, answers } = req.body;
      const uid = parseInt(userId);

      if (!uid) return res.status(400).json({ error: 'userId talab qilinadi' });

      const db = getDb();
      const vacancy = db.prepare('SELECT * FROM vacancies WHERE id = ? AND status = \'active\'').get(vacancyId);
      if (!vacancy) return res.status(404).json({ error: 'Vakansiya topilmadi yoki yopilgan' });

      const candidate = db.prepare('SELECT * FROM candidates WHERE user_id = ?').get(uid);
      if (!candidate) return res.status(403).json({ error: 'Avval nomzod sifatida ro\'yxatdan o\'ting' });

      let parsedAnswers = {};
      try {
        parsedAnswers = typeof answers === 'string' ? JSON.parse(answers) : (answers || {});
      } catch (_) {}

      // If photo file uploaded via form-data
      if (req.file) {
        parsedAnswers.photo = `/uploads/${req.file.filename}`;
      }

      const appResult = db.prepare(`
        INSERT INTO applications (vacancy_id, candidate_id, data)
        VALUES (?, ?, ?)
      `).run(vacancyId, uid, JSON.stringify(parsedAnswers));

      const appId = appResult.lastInsertRowid;

      // Notify HR on Telegram
      let hrText =
        `📨 *Yangi Ariza Keldi (Web App)!*\n\n` +
        `💼 E'lon: *${vacancy.title}*\n\n` +
        `👤 Nomzod: ${candidate.full_name}\n` +
        `📞 Telefon: ${candidate.phone}\n\n`;

      const extraFields = JSON.parse(vacancy.extra_fields || '[]');
      for (const field of extraFields) {
        if (field === 'photo') continue;
        hrText += `${FIELD_LABELS[field] || field}: ${parsedAnswers[field] || '—'}\n`;
      }

      bot.telegram.sendMessage(vacancy.hr_id, hrText, { parse_mode: 'Markdown' }).catch(() => {});

      if (req.file) {
        bot.telegram.sendPhoto(vacancy.hr_id, { source: req.file.path }, { caption: `📸 ${candidate.full_name}` }).catch(() => {});
      }

      res.json({ success: true, appId, message: 'Arizangiz muvaffaqiyatli yuborildi!' });
    } catch (err) {
      console.error('[API /api/vacancies/:id/apply]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/candidate/applications', (req, res) => {
    try {
      const uid = parseInt(req.query.userId);
      if (!uid) return res.status(400).json({ error: 'userId talab qilinadi' });

      const db = getDb();
      const apps = db.prepare(`
        SELECT a.*, v.title, v.company_name, v.salary, v.location, v.extra_fields
        FROM applications a
        LEFT JOIN vacancies v ON v.id = a.vacancy_id
        WHERE a.candidate_id = ?
        ORDER BY a.id DESC
      `).all(uid);

      res.json({ success: true, applications: apps });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Payments & Upload ─────────────────────────────────────────────────────────
  app.get('/api/payments/info', (req, res) => {
    try {
      res.json({
        success: true,
        hr_price: getSetting('hr_price') || '50000',
        hr_tokens: getSetting('hr_tokens') || '8',
        hr_days: getSetting('hr_days') || '14',
        candidate_price: getSetting('candidate_price') || '20000',
        candidate_tokens: getSetting('candidate_tokens') || '12',
        candidate_days: getSetting('candidate_days') || '14',
        card_number: getSetting('card_number') || '0000 0000 0000 0000',
        card_owner: getSetting('card_owner') || 'Karta egasi',
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/payments/upload', upload.single('check_photo'), (req, res) => {
    try {
      const { userId, userType } = req.body;
      const uid = parseInt(userId);
      const type = userType === 'hr' ? 'hr' : 'candidate';

      if (!uid) return res.status(400).json({ error: 'userId talab qilinadi' });
      if (!req.file) return res.status(400).json({ error: 'Chek rasmi yuklanmadi' });

      const db = getDb();
      const priceKey = type === 'hr' ? 'hr_price' : 'candidate_price';
      const price = getSetting(priceKey) || (type === 'hr' ? '50000' : '20000');
      const fileUrl = `/uploads/${req.file.filename}`;

      const payResult = db.prepare(`
        INSERT INTO payments (user_id, user_type, amount, check_file_id, status)
        VALUES (?, ?, ?, ?, 'pending')
      `).run(uid, type, price, fileUrl);
      const paymentId = payResult.lastInsertRowid;

      let userInfo = null;
      if (type === 'hr') {
        userInfo = db.prepare('SELECT * FROM hr_companies WHERE user_id = ?').get(uid);
      } else {
        userInfo = db.prepare('SELECT * FROM candidates WHERE user_id = ?').get(uid);
      }

      const info =
        `💳 *Yangi ${type.toUpperCase()} To'lov (Web App)*\n\n` +
        `👤 Ism/Kompaniya: ${userInfo ? (userInfo.company_name || userInfo.full_name) : 'Noma\'lum'}\n` +
        `📞 Telefon: ${userInfo ? userInfo.phone : 'Noma\'lum'}\n` +
        `🆔 ID: ${uid}\n` +
        `💰 Summa: ${parseInt(price).toLocaleString('uz-UZ')} so'm\n` +
        `🔢 To'lov ID: #${paymentId}`;

      // Notify admins via Telegram
      for (const adminId of ADMIN_IDS) {
        try {
          bot.telegram.sendPhoto(adminId, { source: req.file.path }, {
            caption: info,
            parse_mode: 'Markdown',
            ...adminPaymentKb(paymentId),
          }).catch(() => {});
        } catch (_) {}
      }

      res.json({
        success: true,
        paymentId,
        message: 'Chekingiz qabul qilindi! Admin tekshirib 10-20 daqiqa ichida tasdiqlaydi.'
      });
    } catch (err) {
      console.error('[API /api/payments/upload]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Admin Panel API ───────────────────────────────────────────────────────────
  function checkAdminApi(req, res, next) {
    const uid = parseInt(req.query.userId || req.body.userId);
    if (!uid || !isAdmin(uid)) {
      return res.status(403).json({ error: 'Admin ruxsati mavjud emas' });
    }
    next();
  }

  app.get('/api/admin/stats', checkAdminApi, (req, res) => {
    try {
      const db = getDb();
      const stats = {
        hr_total: db.prepare('SELECT COUNT(*) as c FROM hr_companies').get().c,
        hr_active: db.prepare("SELECT COUNT(*) as c FROM hr_companies WHERE is_active=1").get().c,
        cand_total: db.prepare('SELECT COUNT(*) as c FROM candidates').get().c,
        cand_active: db.prepare("SELECT COUNT(*) as c FROM candidates WHERE is_active=1").get().c,
        vac_active: db.prepare("SELECT COUNT(*) as c FROM vacancies WHERE status='active'").get().c,
        vac_pending: db.prepare("SELECT COUNT(*) as c FROM vacancies WHERE status='pending'").get().c,
        vac_expired: db.prepare("SELECT COUNT(*) as c FROM vacancies WHERE status='expired'").get().c,
        resumes_pending: db.prepare("SELECT COUNT(*) as c FROM candidate_resumes WHERE status='pending'").get().c,
        apps_total: db.prepare('SELECT COUNT(*) as c FROM applications').get().c,
        pay_approved: db.prepare("SELECT COUNT(*) as c FROM payments WHERE status='approved'").get().c,
        pay_pending: db.prepare("SELECT COUNT(*) as c FROM payments WHERE status='pending'").get().c,
      };
      res.json({ success: true, stats });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  // ── ADMIN BANNERS ──────────────────────────────────────────────────────────
  app.get('/api/admin/banners', checkAdminApi, (req, res) => {
    try {
      const db = getDb();
      const banners = db.prepare(`SELECT * FROM banners ORDER BY id DESC`).all();
      res.json({ success: true, banners });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/banners/:id/approve', checkAdminApi, (req, res) => {
    try {
      const db = getDb();
      const banner = db.prepare('SELECT * FROM banners WHERE id = ?').get(req.params.id);
      if (!banner) return res.status(404).json({ error: 'Banner topilmadi' });

      if (banner.status === 'active') {
        return res.status(400).json({ error: 'Bu banner allaqachon aktiv' });
      }

      db.prepare(`
        UPDATE banners 
        SET status = 'active', 
            start_date = datetime('now'), 
            end_date = datetime('now', '+' || duration_days || ' days')
        WHERE id = ?
      `).run(banner.id);

      // Send notification to HR via bot
      bot.telegram.sendMessage(banner.hr_id, `🎉 Tabriklaymiz!\n\nSizning reklamangiz (${banner.title}) tasdiqlandi va platformada faol bo'ldi! U ${banner.duration_days} kun davomida ko'rsatiladi.`).catch(() => {});

      res.json({ success: true, message: 'Banner faollashtirildi' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/banners/:id/reject', checkAdminApi, (req, res) => {
    try {
      const { reason } = req.body;
      const db = getDb();
      const banner = db.prepare('SELECT * FROM banners WHERE id = ?').get(req.params.id);
      if (!banner) return res.status(404).json({ error: 'Banner topilmadi' });

      db.prepare(`UPDATE banners SET status = 'rejected' WHERE id = ?`).run(banner.id);

      // Send notification
      bot.telegram.sendMessage(banner.hr_id, `❌ Sizning reklamangiz (${banner.title}) rad etildi.\n\nSabab: ${reason || 'Ma\'lumotlar noto\'g\'ri yoki to\'lov tasdiqlanmadi.'}`).catch(() => {});

      res.json({ success: true, message: 'Banner rad etildi' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


  app.get('/api/admin/payments', checkAdminApi, (req, res) => {
    try {
      const db = getDb();
      const payments = db.prepare(`
        SELECT p.*,
          COALESCE(h.company_name, c.full_name, 'Noma\'lum') as name,
          COALESCE(h.phone, c.phone, '—') as phone
        FROM payments p
        LEFT JOIN hr_companies h ON h.user_id = p.user_id AND p.user_type = 'hr'
        LEFT JOIN candidates c ON c.user_id = p.user_id AND p.user_type = 'candidate'
        WHERE p.status = 'pending'
        ORDER BY p.id DESC
      `).all();

      res.json({ success: true, payments });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/payments/:id/approve', checkAdminApi, (req, res) => {
    try {
      const paymentId = parseInt(req.params.id);
      const db = getDb();
      const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);
      if (!payment) return res.status(404).json({ error: 'To\'lov topilmadi' });

      db.prepare("UPDATE payments SET status = 'approved' WHERE id = ?").run(paymentId);

      const isHr = payment.user_type === 'hr';
      const days = parseInt(getSetting(isHr ? 'hr_days' : 'candidate_days') || (isHr ? '14' : '14'));
      const tokens = parseInt(getSetting(isHr ? 'hr_tokens' : 'candidate_tokens') || (isHr ? '8' : '12'));
      const subEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

      if (isHr) {
        db.prepare(`
          UPDATE hr_companies
          SET is_active = 1, subscription_end = ?, tokens = tokens + ?
          WHERE user_id = ?
        `).run(subEnd, tokens, payment.user_id);

        const pendingVac = db.prepare(`
          SELECT id FROM vacancies WHERE hr_id = ? AND status = 'pending' ORDER BY id DESC LIMIT 1
        `).get(payment.user_id);

        if (pendingVac) {
          publishVacancyToChannel(bot, pendingVac.id);
        }

        bot.telegram.sendMessage(
          payment.user_id,
          `✅ *To'lovingiz tasdiqlandi!*\n\n` +
          `🎫 Qo'shilgan tokenlar: *${tokens}* ta\n` +
          `⭐ Obuna muddati: *${days} kun*`,
          { parse_mode: 'Markdown' }
        ).catch(() => {});
      } else {
        db.prepare(`
          UPDATE candidates
          SET is_active = 1, subscription_end = ?, tokens = tokens + ?
          WHERE user_id = ?
        `).run(subEnd, tokens, payment.user_id);

        const pendingRes = db.prepare(`
          SELECT id FROM candidate_resumes WHERE candidate_id = ? AND status = 'pending' ORDER BY id DESC LIMIT 1
        `).get(payment.user_id);

        if (pendingRes) {
          publishResumeToChannel(bot, pendingRes.id);
        }

        bot.telegram.sendMessage(
          payment.user_id,
          `✅ *To'lovingiz tasdiqlandi!*\n\n` +
          `🎫 Qo'shilgan tokenlar: *${tokens}* ta\n` +
          `⭐ Obuna muddati: *${days} kun*`,
          { parse_mode: 'Markdown' }
        ).catch(() => {});
      }

      res.json({ success: true, message: 'To\'lov tasdiqlandi!' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/payments/:id/reject', checkAdminApi, (req, res) => {
    try {
      const paymentId = parseInt(req.params.id);
      const { reason } = req.body;
      const db = getDb();

      const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);
      if (!payment) return res.status(404).json({ error: 'To\'lov topilmadi' });

      db.prepare("UPDATE payments SET status = 'rejected' WHERE id = ?").run(paymentId);

      bot.telegram.sendMessage(
        payment.user_id,
        `❌ *To'lovingiz rad etildi.*\n\n${reason ? `Sabab: ${reason}` : 'Qayta urinib ko\'ring.'}`,
        { parse_mode: 'Markdown' }
      ).catch(() => {});

      res.json({ success: true, message: 'To\'lov rad etildi' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/vacancies/pending', checkAdminApi, (req, res) => {
    try {
      const db = getDb();
      const vacancies = db.prepare(`
        SELECT v.*, h.company_name as hr_company, h.phone as hr_phone
        FROM vacancies v
        JOIN hr_companies h ON h.user_id = v.hr_id
        WHERE v.status = 'pending'
        ORDER BY v.id DESC
      `).all();

      res.json({ success: true, vacancies });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/vacancies/:id/approve', checkAdminApi, (req, res) => {
    try {
      const vacancyId = parseInt(req.params.id);
      const { delayMinutes } = req.body;
      const minutes = parseInt(delayMinutes) || 0;

      const db = getDb();
      const vac = db.prepare('SELECT * FROM vacancies WHERE id = ?').get(vacancyId);
      if (!vac) return res.status(404).json({ error: 'Vakansiya topilmadi' });

      if (minutes === 0) {
        publishVacancyToChannel(bot, vacancyId);
        if (vac.hr_id) {
          bot.telegram.sendMessage(vac.hr_id, '✅ *E\'loningiz kanalga joylashtirildi!*', { parse_mode: 'Markdown' }).catch(() => {});
        }
      } else {
        setTimeout(() => {
          publishVacancyToChannel(bot, vacancyId).catch(() => {});
        }, minutes * 60 * 1000);

        if (vac.hr_id) {
          bot.telegram.sendMessage(vac.hr_id, `⏳ *E'loningiz ${minutes} daqiqa ichida kanalga joylashtiriladi.*`, { parse_mode: 'Markdown' }).catch(() => {});
        }
      }

      res.json({ success: true, message: `Vakansiya tasdiqlandi (${minutes === 0 ? 'Zudlik bilan' : minutes + ' daqiqada'})` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/vacancies/:id/reject', checkAdminApi, (req, res) => {
    try {
      const vacancyId = parseInt(req.params.id);
      const { reason } = req.body;
      const db = getDb();

      const vac = db.prepare('SELECT * FROM vacancies WHERE id = ?').get(vacancyId);
      if (!vac) return res.status(404).json({ error: 'Vakansiya topilmadi' });

      db.prepare("UPDATE vacancies SET status = 'rejected' WHERE id = ?").run(vacancyId);

      if (vac.hr_id) {
        bot.telegram.sendMessage(vac.hr_id, `❌ *E'loningiz rad etildi.*\n\n${reason ? `Sabab: ${reason}` : ''}`, { parse_mode: 'Markdown' }).catch(() => {});
      }

      res.json({ success: true, message: 'Vakansiya rad etildi' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/resumes/pending', checkAdminApi, (req, res) => {
    try {
      const db = getDb();
      const resumes = db.prepare(`
        SELECT cr.*, c.phone as cand_phone
        FROM candidate_resumes cr
        JOIN candidates c ON c.user_id = cr.candidate_id
        WHERE cr.status = 'pending'
        ORDER BY cr.id DESC
      `).all();

      res.json({ success: true, resumes });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/resumes/:id/approve', checkAdminApi, (req, res) => {
    try {
      const resumeId = parseInt(req.params.id);
      const { delayMinutes } = req.body;
      const minutes = parseInt(delayMinutes) || 0;

      const db = getDb();
      const resRow = db.prepare('SELECT * FROM candidate_resumes WHERE id = ?').get(resumeId);
      if (!resRow) return res.status(404).json({ error: 'Rezyume topilmadi' });

      if (minutes === 0) {
        publishResumeToChannel(bot, resumeId);
      } else {
        setTimeout(() => {
          publishResumeToChannel(bot, resumeId).catch(() => {});
        }, minutes * 60 * 1000);
      }

      res.json({ success: true, message: `Rezyume tasdiqlandi (${minutes === 0 ? 'Zudlik bilan' : minutes + ' daqiqada'})` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/resumes/:id/reject', checkAdminApi, (req, res) => {
    try {
      const resumeId = parseInt(req.params.id);
      const { reason } = req.body;
      const db = getDb();

      const resRow = db.prepare('SELECT * FROM candidate_resumes WHERE id = ?').get(resumeId);
      if (!resRow) return res.status(404).json({ error: 'Rezyume topilmadi' });

      db.prepare("UPDATE candidate_resumes SET status = 'rejected' WHERE id = ?").run(resumeId);

      if (resRow.candidate_id) {
        bot.telegram.sendMessage(resRow.candidate_id, `❌ *Rezyumeingiz rad etildi.*\n\n${reason ? `Sabab: ${reason}` : ''}`, { parse_mode: 'Markdown' }).catch(() => {});
      }

      res.json({ success: true, message: 'Rezyume rad etildi' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/settings', checkAdminApi, (req, res) => {
    try {
      const settings = {
        hr_price: getSetting('hr_price') || '50000',
        hr_tokens: getSetting('hr_tokens') || '8',
        hr_days: getSetting('hr_days') || '14',
        candidate_price: getSetting('candidate_price') || '20000',
        candidate_tokens: getSetting('candidate_tokens') || '12',
        candidate_days: getSetting('candidate_days') || '14',
        card_number: getSetting('card_number') || '0000 0000 0000 0000',
        card_owner: getSetting('card_owner') || 'Karta egasi',
        banner_price_3day: getSetting('banner_price_3day') || '99000',
        banner_price_7day: getSetting('banner_price_7day') || '199000',
        banner_price_14day: getSetting('banner_price_14day') || '349000',
      };
      res.json({ success: true, settings });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/settings', checkAdminApi, (req, res) => {
    try {
      const { settings } = req.body;
      if (settings && typeof settings === 'object') {
        for (const [k, v] of Object.entries(settings)) {
          setSetting(k, String(v));
        }
      }
      res.json({ success: true, message: 'Sozlamalar saqlandi!' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return app;
}

module.exports = { createServer };
