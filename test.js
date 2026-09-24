const { getDb, getSetting } = require('./database/db');

async function runTests() {
  const db = getDb();
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✅ ${name}`);
      passed++;
    } catch (e) {
      console.error(`  ❌ ${name}: ${e.message}`);
      failed++;
    }
  }

  console.log('\n═══════════════════════════════════');
  console.log('   JobHunt Bot — Test Suite');
  console.log('═══════════════════════════════════\n');

  // ── DB Jadvallar ─────────────────────────────────────────────────────
  console.log('📊 DB Jadvallar:');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
  const requiredTables = ['admins','hr_companies','vacancies','candidates','applications','payments','settings'];
  for (const t of requiredTables) {
    test(`Jadval "${t}" mavjud`, () => { if (!tables.includes(t)) throw new Error('Jadval yo\'q'); });
  }

  // ── Settings ─────────────────────────────────────────────────────────
  console.log('\n⚙️ Sozlamalar:');
  const settingsKeys = ['hr_price','hr_tokens','hr_days','candidate_price','candidate_tokens','candidate_days','card_number','card_owner'];
  for (const k of settingsKeys) {
    test(`"${k}" sozlamasi bor`, () => { if (!getSetting(k)) throw new Error('Qiymat yo\'q'); });
  }

  // ── HR CRUD ──────────────────────────────────────────────────────────
  console.log('\n👔 HR operatsiyalari:');

  test('HR qo\'shish', () => {
    db.prepare('INSERT OR REPLACE INTO hr_companies (user_id, company_name, phone) VALUES (?, ?, ?)').run(9001, 'Test Kompaniya', '+998991234567');
    const hr = db.prepare('SELECT * FROM hr_companies WHERE user_id = 9001').get();
    if (!hr) throw new Error('HR saqlanmadi');
    if (hr.company_name !== 'Test Kompaniya') throw new Error('Noto\'g\'ri nom');
  });

  test('HR token yangilash', () => {
    db.prepare('UPDATE hr_companies SET tokens = 8, is_active = 1, subscription_end = ? WHERE user_id = 9001').run('2026-10-01');
    const hr = db.prepare('SELECT tokens, is_active FROM hr_companies WHERE user_id = 9001').get();
    if (hr.tokens !== 8) throw new Error('Tokenlar noto\'g\'ri');
  });

  test('HR token ayirish', () => {
    db.prepare('UPDATE hr_companies SET tokens = tokens - 1 WHERE user_id = 9001').run();
    const hr = db.prepare('SELECT tokens FROM hr_companies WHERE user_id = 9001').get();
    if (hr.tokens !== 7) throw new Error('Ayirish ishlamadi');
  });

  // ── Vakansiya CRUD ───────────────────────────────────────────────────
  console.log('\n📌 Vakansiya operatsiyalari:');

  test('Vakansiya qo\'shish', () => {
    db.prepare(`INSERT OR REPLACE INTO vacancies 
      (id, hr_id, title, company_name, location, salary, work_time, requirements, extra_fields, status)
      VALUES (9001, 9001, 'Test Vakansiya', 'Test Kompaniya', 'Toshkent', '5 000 000', '9-18', 'Tajriba', '["full_name","experience"]', 'active')
    `).run();
    const v = db.prepare('SELECT * FROM vacancies WHERE id = 9001').get();
    if (!v) throw new Error('Vakansiya saqlanmadi');
  });

  test('Extra fields JSON parse', () => {
    const v = db.prepare('SELECT extra_fields FROM vacancies WHERE id = 9001').get();
    const fields = JSON.parse(v.extra_fields);
    if (!Array.isArray(fields) || fields[0] !== 'full_name') throw new Error('JSON noto\'g\'ri');
  });

  test('Vakansiyani tahrirlash (Title, Salary, Location)', () => {
    db.prepare('UPDATE vacancies SET salary = ?, location = ? WHERE id = 9001 AND hr_id = 9001')
      .run('6 000 000 — 12 000 000 so\'m', 'Toshkent, Yunusobod');
    const v = db.prepare('SELECT salary, location FROM vacancies WHERE id = 9001').get();
    if (v.salary !== '6 000 000 — 12 000 000 so\'m') throw new Error('Maosh tahrirlanmadi');
    if (v.location !== 'Toshkent, Yunusobod') throw new Error('Manzil tahrirlanmadi');
  });

  test('Vakansiyani expired qilish', () => {
    db.prepare("UPDATE vacancies SET status = 'expired' WHERE id = 9001").run();
    const v = db.prepare('SELECT status FROM vacancies WHERE id = 9001').get();
    if (v.status !== 'expired') throw new Error('Status o\'zgarmadi');
  });

  test('Vakansiyani qayta faollashtirish', () => {
    db.prepare("UPDATE vacancies SET status = 'active', expires_at = ? WHERE id = 9001").run('2026-10-01');
    const v = db.prepare('SELECT status FROM vacancies WHERE id = 9001').get();
    if (v.status !== 'active') throw new Error('Aktiv bo\'lmadi');
  });

  test('Aynan bir xil vakansiyani 3 kun ichida qayta chiqarishni taqiqlash (Smart Duplicate Check)', () => {
    const title = 'Test Vakansiya';
    const normTitle = title.trim().toLowerCase();

    const recentVacancies = db.prepare(`
      SELECT id, title, category, COALESCE(published_at, created_at, datetime('now')) as post_date
      FROM vacancies
      WHERE hr_id = 9001 AND status != 'deleted'
        AND datetime(COALESCE(published_at, created_at, datetime('now'))) >= datetime('now', '-3 days')
    `).all();

    const isDuplicate = recentVacancies.some(v => {
      const existingTitle = (v.title || '').trim().toLowerCase();
      return existingTitle === normTitle;
    });

    if (!isDuplicate) throw new Error('Dublikat vakansiya 3 kun ichida to\'g\'ri aniqlanmadi');
  });

  // ── Nomzod CRUD ──────────────────────────────────────────────────────
  console.log('\n👤 Nomzod operatsiyalari:');

  test('Nomzod qo\'shish', () => {
    db.prepare('INSERT OR REPLACE INTO candidates (user_id, full_name, phone) VALUES (?, ?, ?)').run(9002, 'Alijon Valiyev', '+998991111111');
    const c = db.prepare('SELECT * FROM candidates WHERE user_id = 9002').get();
    if (!c) throw new Error('Nomzod saqlanmadi');
  });

  test('Ariza qo\'shish', () => {
    const data = JSON.stringify({ full_name: 'Alijon Valiyev', experience: '3 yil' });
    db.prepare('INSERT INTO applications (vacancy_id, candidate_id, data) VALUES (9001, 9002, ?)').run(data);
    const app = db.prepare('SELECT * FROM applications WHERE vacancy_id = 9001 AND candidate_id = 9002').get();
    if (!app) throw new Error('Ariza saqlanmadi');
    const parsed = JSON.parse(app.data);
    if (parsed.experience !== '3 yil') throw new Error('Data noto\'g\'ri');
  });

  test('Arizalar sonini hisoblash', () => {
    const cnt = db.prepare('SELECT COUNT(*) as c FROM applications WHERE vacancy_id = 9001').get();
    if (cnt.c !== 1) throw new Error('Son noto\'g\'ri');
  });

  // ── To'lov CRUD ──────────────────────────────────────────────────────
  console.log('\n💳 To\'lov operatsiyalari:');

  test('To\'lov qo\'shish', () => {
    db.prepare("INSERT INTO payments (user_id, user_type, amount, check_file_id) VALUES (9002, 'candidate', '20000', 'file_test_123')").run();
    const p = db.prepare("SELECT * FROM payments WHERE user_id = 9002 AND status = 'pending'").get();
    if (!p) throw new Error('To\'lov saqlanmadi');
  });

  test('To\'lovni tasdiqlash', () => {
    const p = db.prepare("SELECT id FROM payments WHERE user_id = 9002").get();
    db.prepare("UPDATE payments SET status = 'approved' WHERE id = ?").run(p.id);
    const updated = db.prepare("SELECT status FROM payments WHERE id = ?").get(p.id);
    if (updated.status !== 'approved') throw new Error('Status noto\'g\'ri');
  });

  test('sendPaymentInfo funksiyasi mavjudligi', () => {
    const { sendPaymentInfo } = require('./handlers/hr/hr_vacancy');
    if (typeof sendPaymentInfo !== 'function') throw new Error('sendPaymentInfo funksiyasi aniqlanmagan');
  });

  // ── Tozalash ─────────────────────────────────────────────────────────
  db.prepare('DELETE FROM applications WHERE vacancy_id = 9001').run();
  db.prepare('DELETE FROM payments WHERE user_id IN (9001, 9002)').run();
  db.prepare('DELETE FROM vacancies WHERE id = 9001').run();
  db.prepare('DELETE FROM hr_companies WHERE user_id = 9001').run();
  db.prepare('DELETE FROM candidates WHERE user_id = 9002').run();

  // ── Natija ──────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════');
  console.log(`  ✅ O'tdi: ${passed} | ❌ Xato: ${failed}`);
  console.log('═══════════════════════════════════\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test xatosi:', err.message);
  process.exit(1);
});
