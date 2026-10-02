const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { ADMIN_IDS } = require('../config');

function getDbPath() {
  const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const defaultPath = path.join(__dirname, '..', 'jobhunt.db');
  if (isVercel) {
    const tmpDbPath = path.join('/tmp', 'jobhunt.db');
    if (!fs.existsSync(tmpDbPath)) {
      if (fs.existsSync(defaultPath)) {
        try { fs.copyFileSync(defaultPath, tmpDbPath); } catch (e) { console.error('Error copying DB:', e.message); }
      }
    }
    return tmpDbPath;
  }
  return defaultPath;
}

let db;

function getDb() {
  if (!db) {
    const dbPath = getDbPath();
    db = new Database(dbPath);
    try { db.pragma('journal_mode = WAL'); } catch (_) {}
    try { db.pragma('foreign_keys = ON'); } catch (_) {}
    initDb();
  }
  return db;
}

function initDb() {
  db.exec(`
    -- Adminlar
    CREATE TABLE IF NOT EXISTS admins (
      user_id INTEGER PRIMARY KEY
    );

    -- HR kompaniyalar
    CREATE TABLE IF NOT EXISTS hr_companies (
      user_id       INTEGER PRIMARY KEY,
      company_name  TEXT NOT NULL,
      phone         TEXT NOT NULL,
      registered_at TEXT DEFAULT (datetime('now')),
      subscription_end TEXT DEFAULT NULL,
      tokens        INTEGER DEFAULT 0,
      is_active     INTEGER DEFAULT 0
    );

    -- Vakansiyalar
    CREATE TABLE IF NOT EXISTS vacancies (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      hr_id           INTEGER NOT NULL,
      title           TEXT NOT NULL,
      category        TEXT DEFAULT '',
      company_name    TEXT NOT NULL,
      location        TEXT NOT NULL,
      salary          TEXT NOT NULL,
      work_time       TEXT NOT NULL,
      requirements    TEXT NOT NULL,
      tasks           TEXT DEFAULT '',
      conditions      TEXT DEFAULT '',
      raw_text        TEXT DEFAULT '',
      creation_type   TEXT DEFAULT 'wizard',
      extra_fields    TEXT DEFAULT '[]',
      status          TEXT DEFAULT 'pending',
      channel_msg_id  INTEGER DEFAULT NULL,
      published_at    TEXT DEFAULT NULL,
      expires_at      TEXT DEFAULT NULL,
      last_activated  TEXT DEFAULT NULL,
      FOREIGN KEY(hr_id) REFERENCES hr_companies(user_id)
    );

    -- Nomzodlar
    CREATE TABLE IF NOT EXISTS candidates (
      user_id           INTEGER PRIMARY KEY,
      full_name         TEXT NOT NULL,
      phone             TEXT NOT NULL,
      registered_at     TEXT DEFAULT (datetime('now')),
      subscription_end  TEXT DEFAULT NULL,
      tokens            INTEGER DEFAULT 0,
      is_active         INTEGER DEFAULT 0
    );

    -- Arizalar
    CREATE TABLE IF NOT EXISTS applications (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      vacancy_id   INTEGER NOT NULL,
      candidate_id INTEGER NOT NULL,
      data         TEXT DEFAULT '{}',
      applied_at   TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(vacancy_id) REFERENCES vacancies(id),
      FOREIGN KEY(candidate_id) REFERENCES candidates(user_id)
    );

    -- Nomzod Rezyumelari
    CREATE TABLE IF NOT EXISTS candidate_resumes (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id       INTEGER NOT NULL,
      full_name          TEXT NOT NULL,
      position           TEXT NOT NULL,
      category           TEXT DEFAULT '',
      city               TEXT NOT NULL,
      experience_years   TEXT NOT NULL,
      expected_salary    TEXT NOT NULL,
      employment_type    TEXT NOT NULL,
      about_me           TEXT DEFAULT '',
      experience_details TEXT DEFAULT '',
      skills             TEXT DEFAULT '',
      education          TEXT DEFAULT '',
      languages          TEXT DEFAULT '',
      additional_info    TEXT DEFAULT '',
      raw_text           TEXT DEFAULT '',
      creation_type      TEXT DEFAULT 'wizard',
      status             TEXT DEFAULT 'pending',
      channel_msg_id     INTEGER DEFAULT NULL,
      published_at       TEXT DEFAULT NULL,
      expires_at         TEXT DEFAULT NULL,
      FOREIGN KEY(candidate_id) REFERENCES candidates(user_id)
    );

    -- To'lovlar
    CREATE TABLE IF NOT EXISTS payments (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      user_type   TEXT NOT NULL,
      amount      TEXT NOT NULL,
      check_file_id TEXT DEFAULT NULL,
      status      TEXT DEFAULT 'pending',
      created_at  TEXT DEFAULT (datetime('now'))
    );

    -- Sozlamalar (key-value)
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- Reklama Bannerlari
    CREATE TABLE IF NOT EXISTS banners (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      hr_id        INTEGER NOT NULL,
      company_name TEXT NOT NULL,
      title        TEXT NOT NULL,
      subtitle     TEXT DEFAULT '',
      description  TEXT DEFAULT '',
      cta_text     TEXT DEFAULT 'Batafsil',
      color_from   TEXT DEFAULT '#0066FF',
      color_to     TEXT DEFAULT '#00d2ff',
      vacancy_id   INTEGER DEFAULT NULL,
      plan         TEXT DEFAULT 'standard',
      duration_days INTEGER DEFAULT 3,
      price        INTEGER DEFAULT 0,
      status       TEXT DEFAULT 'pending',
      check_file_id TEXT DEFAULT NULL,
      image_url    TEXT DEFAULT NULL,
      views        INTEGER DEFAULT 0,
      clicks       INTEGER DEFAULT 0,
      start_date   TEXT DEFAULT NULL,
      end_date     TEXT DEFAULT NULL,
      created_at   TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(hr_id) REFERENCES hr_companies(user_id)
    );

    -- Rezyume HR-larga yuborish to'lovlari
    CREATE TABLE IF NOT EXISTS resume_sends (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id INTEGER NOT NULL,
      resume_id    INTEGER NOT NULL,
      payment_id   INTEGER DEFAULT NULL,
      amount       TEXT DEFAULT '20000',
      vacancy_ids  TEXT DEFAULT '[]',
      status       TEXT DEFAULT 'pending',
      sent_count   INTEGER DEFAULT 0,
      created_at   TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(candidate_id) REFERENCES candidates(user_id),
      FOREIGN KEY(resume_id) REFERENCES candidate_resumes(id)
    );

    -- Har bir HR-ga yuborilgan rezume statusi tarixi (dublikat oldini olish)
    CREATE TABLE IF NOT EXISTS resume_send_items (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      send_id      INTEGER NOT NULL,
      candidate_id INTEGER NOT NULL,
      resume_id    INTEGER NOT NULL,
      vacancy_id   INTEGER NOT NULL,
      hr_id        INTEGER NOT NULL,
      status       TEXT DEFAULT 'pending',
      error_msg    TEXT DEFAULT NULL,
      sent_at      TEXT DEFAULT NULL,
      created_at   TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(send_id) REFERENCES resume_sends(id),
      FOREIGN KEY(resume_id) REFERENCES candidate_resumes(id),
      FOREIGN KEY(vacancy_id) REFERENCES vacancies(id)
    );

    -- HR nomzod kontakti ochish tarixi (duplicate tracking & access control)
    CREATE TABLE IF NOT EXISTS contact_access (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      hr_id        INTEGER NOT NULL,
      candidate_id INTEGER NOT NULL,
      resume_id    INTEGER NOT NULL,
      vacancy_id   INTEGER DEFAULT NULL,
      created_at   TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(hr_id) REFERENCES hr_companies(user_id),
      FOREIGN KEY(candidate_id) REFERENCES candidates(user_id),
      FOREIGN KEY(resume_id) REFERENCES candidate_resumes(id)
    );
  `);

  // Migratsiyalar (mavjud baza uchun)
  const columnsToAdd = [
    { table: 'vacancies', col: 'tasks', type: "TEXT DEFAULT ''" },
    { table: 'vacancies', col: 'conditions', type: "TEXT DEFAULT ''" },
    { table: 'vacancies', col: 'raw_text', type: "TEXT DEFAULT 'wizard'" },
    { table: 'vacancies', col: 'creation_type', type: "TEXT DEFAULT 'wizard'" },
    { table: 'vacancies', col: 'category', type: "TEXT DEFAULT ''" },
    { table: 'vacancies', col: 'created_at', type: "TEXT DEFAULT NULL" },
    { table: 'candidate_resumes', col: 'category', type: "TEXT DEFAULT ''" },
    { table: 'candidate_resumes', col: 'created_at', type: "TEXT DEFAULT NULL" },
    { table: 'candidate_resumes', col: 'updated_at', type: "TEXT DEFAULT NULL" },
    { table: 'candidate_resumes', col: 'pdf_data', type: "TEXT DEFAULT '{}'" },
    { table: 'banners', col: 'image_url', type: "TEXT DEFAULT NULL" },
    { table: 'payments', col: 'service_type', type: "TEXT DEFAULT 'token_purchase'" },
    { table: 'payments', col: 'target_id', type: "INTEGER DEFAULT NULL" },
    { table: 'resume_sends', col: 'amount', type: "TEXT DEFAULT '20000'" },
    { table: 'resume_sends', col: 'vacancy_ids', type: "TEXT DEFAULT '[]'" },
    { table: 'hr_companies', col: 'contact_credits', type: "INTEGER DEFAULT 20" },
  ];
  for (const { table, col, type } of columnsToAdd) {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
    } catch (_) {}
  }
  try {
    db.exec(`UPDATE vacancies SET created_at = datetime('now') WHERE created_at IS NULL`);
    db.exec(`UPDATE candidate_resumes SET created_at = datetime('now') WHERE created_at IS NULL`);
    db.exec(`UPDATE hr_companies SET contact_credits = 20 WHERE contact_credits IS NULL`);
  } catch (_) {}

  // Default sozlamalar
  const defaults = {
    hr_price: '50000',
    hr_tokens: '8',
    hr_days: '14',
    candidate_price: '20000',
    candidate_tokens: '12',
    candidate_days: '14',
    card_number: '0000 0000 0000 0000',
    card_owner: 'Karta egasi',
    banner_price_3day:  '99000',
    banner_price_7day:  '199000',
    banner_price_14day: '349000',
    resume_send_price: '15000',
    contact_pack_price: '20000',
    contact_pack_count: '20',
  };

  const insertSetting = db.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
  );
  for (const [key, value] of Object.entries(defaults)) {
    insertSetting.run(key, value);
  }

  // Adminlarni qo'shish
  const insertAdmin = db.prepare('INSERT OR IGNORE INTO admins (user_id) VALUES (?)');
  for (const id of ADMIN_IDS) {
    insertAdmin.run(id);
  }
}

function getSetting(key) {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setSetting(key, value) {
  getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
}

module.exports = { getDb, getSetting, setSetting };
