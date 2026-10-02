const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

/**
 * Escapes HTML special characters
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Converts a local file path to a base64 data URI for embedding in HTML
 */
function fileToBase64DataUri(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return '';
    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    let mimeType = 'image/jpeg';
    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.gif') mimeType = 'image/gif';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.svg') mimeType = 'image/svg+xml';
    return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
  } catch (err) {
    console.error('[PDF] fileToBase64DataUri error:', err.message);
    return '';
  }
}

const PDF_LABELS = {
  uz: {
    contacts: 'Kontaktlar',
    skills: 'Ko\'nikmalar',
    languages: 'Tillar',
    interests: 'Qiziqishlar',
    aboutMe: 'Men haqimda',
    workExperience: 'Ish Tajribasi',
    education: 'Ta\'lim',
    projects: 'Asosiy loyihalar',
    additionalInfo: 'Qo\'shimcha ma\'lumotlar',
    age: 'Yosh',
    experience: 'Tajriba',
    employment: 'Ish formati',
    salary: 'Kutilayotgan maosh',
    watermark: 'JobHunt Bot orqali yaratilgan rezyume'
  },
  ru: {
    contacts: 'Контакты',
    skills: 'Навыки',
    languages: 'Языки',
    interests: 'Интересы',
    aboutMe: 'Обо мне',
    workExperience: 'Опыт работы',
    education: 'Образование',
    projects: 'Ключевые проекты',
    additionalInfo: 'Дополнительная информация',
    age: 'Возраст',
    experience: 'Опыт работы',
    employment: 'Формат работы',
    salary: 'Желаемая зарплата',
    watermark: 'Создано через JobHunt Bot'
  }
};

/**
 * Generates standalone HTML document for A4 PDF resume - Professional Design
 */
function buildResumePdfHtml(resumeData, reqLang = 'uz') {
  const selectedLang = (resumeData.lang || reqLang || 'uz').toLowerCase() === 'ru' ? 'ru' : 'uz';
  const labels = PDF_LABELS[selectedLang] || PDF_LABELS.uz;

  const pData = typeof resumeData.pdf_data === 'string'
    ? JSON.parse(resumeData.pdf_data || '{}')
    : (resumeData.pdf_data || {});

  const fullName = resumeData.full_name || resumeData.fullName || 'Nomzod';
  const position = resumeData.position || 'Mutaxassis';
  const category = resumeData.category || 'Boshqa soha';
  const city = resumeData.city || 'Toshkent shahri';
  const experienceYears = resumeData.experience_years || resumeData.experienceYears || '—';
  const expectedSalary = resumeData.expected_salary || resumeData.expectedSalary || '—';
  const employmentType = resumeData.employment_type || resumeData.employmentType || '—';
  const aboutMe = resumeData.about_me || resumeData.aboutMe || '';
  const experienceDetails = resumeData.experience_details || resumeData.experienceDetails || '';
  const skillsStr = resumeData.skills || '';
  const educationStr = resumeData.education || pData.eduHistory || '';
  const languagesStr = resumeData.languages || pData.languages || '';
  const additionalInfoStr = resumeData.additional_info || resumeData.additionalInfo || pData.additionalInfo || '';

  // Photo: support local file path (base64 embed) or URL
  const rawPhoto = pData.photo || resumeData.photo_url || '';
  let photo = rawPhoto;
  if (rawPhoto && !rawPhoto.startsWith('http') && !rawPhoto.startsWith('data:')) {
    // It's a local file path - convert to base64
    const absPath = path.isAbsolute(rawPhoto) ? rawPhoto : path.join(__dirname, '..', rawPhoto);
    photo = fileToBase64DataUri(absPath);
  }

  const phone = pData.phone || resumeData.phone || resumeData.cand_phone || '';
  const rawTelegram = pData.telegram || resumeData.telegram_username || '';
  const telegram = rawTelegram ? (rawTelegram.startsWith('@') ? rawTelegram : '@' + rawTelegram) : '';
  const age = pData.age || '';
  const interestsStr = pData.interests || '';

  // Parse Skills & Progress percentages
  const skillsList = [];
  if (skillsStr) {
    const defaultPercents = [90, 85, 85, 75, 70, 70, 80, 75, 65, 60];
    const items = skillsStr.split(/[\n,·•]/).map(s => s.trim()).filter(Boolean);
    items.forEach((item, idx) => {
      const match = item.match(/^(.*?)(?:\s+(\d{1,3})%|\s*\((\d{1,3})%\))?$/);
      if (match) {
        const name = (match[1] || item).trim();
        const percent = parseInt(match[2] || match[3] || defaultPercents[idx % defaultPercents.length], 10);
        if (name) {
          skillsList.push({ name, percent: Math.min(100, Math.max(10, percent)) });
        }
      }
    });
  }

  // Parse Languages
  const languagesList = [];
  if (languagesStr) {
    const langItems = languagesStr.split(/[\n,·•]/).map(s => s.trim()).filter(Boolean);
    langItems.forEach(item => {
      const parts = item.split(/[-—:]/);
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const level = parts[1].trim();
        let percent = 70;
        if (/mukammal|ona|rodnoy|native|100%/i.test(level)) percent = 100;
        else if (/c2|95%/i.test(level)) percent = 95;
        else if (/c1|yuqori|85%/i.test(level)) percent = 85;
        else if (/b2|o'rta|orta|75%/i.test(level)) percent = 75;
        else if (/b1|65%/i.test(level)) percent = 65;
        else if (/a2|boshlang'ich|55%/i.test(level)) percent = 55;
        else if (/a1|45%/i.test(level)) percent = 45;
        languagesList.push({ name, level, percent });
      } else if (item) {
        languagesList.push({ name: item, level: 'B2', percent: 75 });
      }
    });
  }

  // Parse Interests
  const interestsList = interestsStr ? interestsStr.split(/[\n,·•]/).map(s => s.trim()).filter(Boolean) : [];

  // Parse Work History
  const rawWork = pData.workHistory || experienceDetails || '';
  const workEntries = [];
  if (rawWork) {
    const lines = rawWork.split('\n').map(l => l.trim()).filter(Boolean);
    let currentEntry = null;
    lines.forEach(line => {
      if (line.includes('|')) {
        if (currentEntry) workEntries.push(currentEntry);
        const parts = line.split('|').map(p => p.trim());
        currentEntry = {
          dates: parts[0] || '',
          role: parts[1] || position,
          company: parts[2] || '',
          description: parts.slice(3).join(' | ')
        };
      } else if (currentEntry) {
        currentEntry.description = (currentEntry.description ? currentEntry.description + '\n' : '') + line;
      } else {
        workEntries.push({
          dates: experienceYears !== 'Tajribasiz' ? experienceYears : '',
          role: position,
          company: city,
          description: line
        });
      }
    });
    if (currentEntry) workEntries.push(currentEntry);
  }

  // Parse Education History
  const rawEdu = pData.eduHistory || educationStr || '';
  const eduEntries = [];
  if (rawEdu) {
    const lines = rawEdu.split('\n').map(l => l.trim()).filter(Boolean);
    lines.forEach(line => {
      if (line.includes('|')) {
        const parts = line.split('|').map(p => p.trim());
        eduEntries.push({
          dates: parts[0] || '',
          institution: parts[1] || '',
          degree: parts.slice(2).join(' | ')
        });
      } else {
        eduEntries.push({
          dates: '',
          institution: line,
          degree: ''
        });
      }
    });
  }

  // Parse Projects if present
  const rawProjects = pData.projects || '';
  const projectEntries = [];
  if (rawProjects) {
    const lines = rawProjects.split('\n').map(l => l.trim()).filter(Boolean);
    lines.forEach(line => {
      if (line.includes('|')) {
        const parts = line.split('|').map(p => p.trim());
        const tagsStr = parts[3] || '';
        projectEntries.push({
          name: parts[0] || '',
          url: parts[1] || '',
          desc: parts[2] || '',
          tags: tagsStr ? tagsStr.split(/[,·•]/).map(t => t.trim()).filter(Boolean) : []
        });
      }
    });
  }

  return `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(fullName)} - Rezyume</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    @page { margin: 0; size: A4; }
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif;
      background: #ffffff;
      color: #1e293b;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-size: 11px;
      line-height: 1.5;
    }

    .pdf-cv-container {
      width: 794px;
      min-height: 1123px;
      display: flex;
      background: #ffffff;
      margin: 0 auto;
      position: relative;
      overflow: hidden;
    }

    /* ═══════════════════════════════════ SIDEBAR ═══════════════════════════════════ */
    .pdf-sidebar {
      width: 268px;
      background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
      padding: 0;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      position: relative;
    }

    /* Accent line on the right edge of sidebar */
    .pdf-sidebar::after {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: 3px;
      height: 100%;
      background: linear-gradient(180deg, #3b82f6 0%, #06b6d4 50%, #8b5cf6 100%);
    }

    /* Photo Section */
    .pdf-photo-section {
      padding: 28px 24px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .pdf-photo-wrapper,
    .pdf-avatar-box {
      width: 140px;
      height: 140px;
      min-width: 140px;
      min-height: 140px;
      max-width: 140px;
      max-height: 140px;
      border-radius: 50%;
      overflow: hidden !important;
      border: 3px solid rgba(59, 130, 246, 0.6);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      background: #1e3a5f;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
      flex-shrink: 0;
      position: relative;
    }

    .pdf-photo-img,
    .pdf-avatar-box img,
    .pdf-photo-wrapper img {
      width: 100% !important;
      height: 100% !important;
      max-width: 100% !important;
      max-height: 100% !important;
      object-fit: cover !important;
      display: block;
    }

    .pdf-cv-container img,
    .pdf-sidebar img {
      max-width: 100% !important;
      max-height: 100% !important;
      object-fit: cover;
    }

    .pdf-photo-placeholder {
      color: #64748b;
      font-size: 48px;
    }

    /* Sidebar Sections */
    .pdf-sidebar-body {
      padding: 0 22px 24px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .pdf-sidebar-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .pdf-sidebar-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 10.5px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.2);
      margin-bottom: 2px;
    }

    .pdf-sidebar-title i {
      color: #3b82f6;
      font-size: 12px;
      width: 14px;
    }

    /* Contact Items */
    .pdf-contact-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .pdf-contact-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 11px;
      color: #cbd5e1;
      word-break: break-all;
      line-height: 1.3;
    }

    .pdf-contact-icon {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: rgba(59, 130, 246, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .pdf-contact-icon i {
      color: #3b82f6;
      font-size: 11px;
    }

    /* Skills */
    .pdf-skill-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .pdf-skill-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #e2e8f0;
    }

    .pdf-skill-name {
      font-weight: 500;
    }

    .pdf-skill-percent {
      font-size: 10px;
      color: #64748b;
      font-weight: 600;
    }

    .pdf-progress-bar {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 4px;
      overflow: hidden;
    }

    .pdf-progress-fill {
      height: 100%;
      border-radius: 4px;
      background: linear-gradient(90deg, #3b82f6 0%, #06b6d4 100%);
    }

    /* Languages */
    .pdf-lang-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .pdf-lang-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .pdf-lang-name {
      font-size: 11px;
      font-weight: 500;
      color: #e2e8f0;
    }

    .pdf-lang-level {
      font-size: 9.5px;
      color: #3b82f6;
      font-weight: 600;
      background: rgba(59, 130, 246, 0.15);
      padding: 2px 8px;
      border-radius: 10px;
    }

    .pdf-lang-dots {
      display: flex;
      gap: 4px;
    }

    .pdf-lang-dot {
      width: 16px;
      height: 4px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.1);
    }

    .pdf-lang-dot.active {
      background: linear-gradient(90deg, #3b82f6 0%, #06b6d4 100%);
    }

    /* Interests */
    .pdf-interests-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .pdf-interest-chip {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #cbd5e1;
      padding: 4px 10px;
      border-radius: 14px;
      font-size: 10px;
      font-weight: 500;
    }

    /* ═══════════════════════════════════ MAIN CONTENT ═══════════════════════════════════ */
    .pdf-main-content {
      flex: 1;
      padding: 0;
      display: flex;
      flex-direction: column;
      background: #ffffff;
    }

    /* Header */
    .pdf-header-block {
      padding: 28px 28px 20px;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border-bottom: 1px solid #e2e8f0;
    }

    .pdf-header-name {
      font-size: 28px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px 0;
      line-height: 1.15;
      letter-spacing: -0.5px;
    }

    .pdf-header-position {
      font-size: 14px;
      font-weight: 600;
      color: #3b82f6;
      margin: 0 0 14px 0;
      letter-spacing: 0.3px;
    }

    .pdf-header-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .pdf-stat-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #ffffff;
      padding: 5px 12px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      font-size: 10.5px;
      font-weight: 600;
      color: #475569;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    .pdf-stat-item i {
      color: #3b82f6;
      font-size: 10px;
    }

    /* Section Wrapper */
    .pdf-sections-body {
      padding: 20px 28px 28px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .pdf-main-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .pdf-section-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
      position: relative;
    }

    .pdf-section-title::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      width: 40px;
      height: 2px;
      background: linear-gradient(90deg, #3b82f6 0%, #06b6d4 100%);
      border-radius: 1px;
    }

    .pdf-section-icon {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: #ffffff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      flex-shrink: 0;
    }

    /* About Text */
    .pdf-about-text {
      font-size: 11px;
      line-height: 1.7;
      color: #475569;
      white-space: pre-wrap;
      padding: 10px 14px;
      background: #f8fafc;
      border-radius: 8px;
      border-left: 3px solid #3b82f6;
    }

    /* Timeline */
    .pdf-timeline-list {
      display: flex;
      flex-direction: column;
      gap: 0;
      position: relative;
      padding-left: 16px;
    }

    .pdf-timeline-list::before {
      content: '';
      position: absolute;
      left: 5px;
      top: 6px;
      bottom: 6px;
      width: 2px;
      background: #e2e8f0;
    }

    .pdf-timeline-item {
      display: flex;
      gap: 14px;
      padding: 10px 0;
      position: relative;
    }

    .pdf-timeline-item::before {
      content: '';
      position: absolute;
      left: -14px;
      top: 16px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #3b82f6;
      border: 2px solid #ffffff;
      box-shadow: 0 0 0 2px #3b82f6;
      z-index: 1;
    }

    .pdf-timeline-dates {
      width: 88px;
      font-size: 10px;
      font-weight: 600;
      color: #3b82f6;
      flex-shrink: 0;
      padding-top: 1px;
      letter-spacing: 0.2px;
    }

    .pdf-timeline-body {
      flex: 1;
      padding-bottom: 2px;
    }

    .pdf-timeline-role {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.3;
      margin-bottom: 2px;
    }

    .pdf-timeline-org {
      font-size: 10.5px;
      color: #64748b;
      font-weight: 500;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .pdf-timeline-org::before {
      content: '';
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: #94a3b8;
      flex-shrink: 0;
    }

    .pdf-timeline-desc {
      font-size: 10.5px;
      line-height: 1.6;
      color: #475569;
    }

    /* Project Cards */
    .pdf-projects-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .pdf-project-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      transition: all 0.2s;
    }

    .pdf-project-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .pdf-project-title {
      font-size: 11.5px;
      font-weight: 700;
      color: #0f172a;
    }

    .pdf-project-url {
      font-size: 10px;
      color: #3b82f6;
      font-weight: 600;
    }

    .pdf-project-desc {
      font-size: 10.5px;
      color: #475569;
      margin-bottom: 6px;
      line-height: 1.5;
    }

    .pdf-project-techs {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .pdf-tech-chip {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      color: #1d4ed8;
      font-size: 9px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 10px;
    }

    /* Additional Info */
    .pdf-additional-text {
      font-size: 11px;
      line-height: 1.7;
      color: #475569;
      white-space: pre-wrap;
      padding: 10px 14px;
      background: #f8fafc;
      border-radius: 8px;
      border-left: 3px solid #8b5cf6;
    }

    /* Footer Watermark */
    .pdf-footer {
      padding: 10px 28px;
      text-align: right;
      font-size: 8px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      margin-top: auto;
    }
  </style>
</head>
<body>
  <div class="pdf-cv-container">
    <!-- LEFT SIDEBAR -->
    <div class="pdf-sidebar">
      <div class="pdf-photo-section">
        <div class="pdf-photo-wrapper">
          ${photo ? `<img src="${escapeHtml(photo)}" alt="Photo" class="pdf-photo-img" crossorigin="anonymous">` : `<div class="pdf-photo-placeholder"><i class="fa-solid fa-user"></i></div>`}
        </div>
      </div>

      <div class="pdf-sidebar-body">
        ${(phone || telegram || city) ? `
          <div class="pdf-sidebar-section">
            <div class="pdf-sidebar-title"><i class="fa-solid fa-address-book"></i> ${labels.contacts}</div>
            <div class="pdf-contact-list">
              ${phone ? `<div class="pdf-contact-item"><div class="pdf-contact-icon"><i class="fa-solid fa-phone"></i></div> ${escapeHtml(phone)}</div>` : ''}
              ${telegram ? `<div class="pdf-contact-item"><div class="pdf-contact-icon"><i class="fa-brands fa-telegram"></i></div> ${escapeHtml(telegram)}</div>` : ''}
              ${city ? `<div class="pdf-contact-item"><div class="pdf-contact-icon"><i class="fa-solid fa-location-dot"></i></div> ${escapeHtml(city)}</div>` : ''}
            </div>
          </div>
        ` : ''}

        ${skillsList.length ? `
          <div class="pdf-sidebar-section">
            <div class="pdf-sidebar-title"><i class="fa-solid fa-code"></i> ${labels.skills}</div>
            ${skillsList.map(s => `
              <div class="pdf-skill-item">
                <div class="pdf-skill-header">
                  <span class="pdf-skill-name">${escapeHtml(s.name)}</span>
                  <span class="pdf-skill-percent">${s.percent}%</span>
                </div>
                <div class="pdf-progress-bar">
                  <div class="pdf-progress-fill" style="width: ${s.percent}%;"></div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${languagesList.length ? `
          <div class="pdf-sidebar-section">
            <div class="pdf-sidebar-title"><i class="fa-solid fa-language"></i> ${labels.languages}</div>
            ${languagesList.map(l => {
              // Create 5 dot indicators based on level
              const totalDots = 5;
              const activeDots = Math.round(l.percent / 20);
              let dotsHtml = '';
              for (let i = 0; i < totalDots; i++) {
                dotsHtml += `<div class="pdf-lang-dot ${i < activeDots ? 'active' : ''}"></div>`;
              }
              return `
              <div class="pdf-lang-item">
                <div class="pdf-lang-header">
                  <span class="pdf-lang-name">${escapeHtml(l.name)}</span>
                  <span class="pdf-lang-level">${escapeHtml(l.level)}</span>
                </div>
                <div class="pdf-lang-dots">${dotsHtml}</div>
              </div>
            `}).join('')}
          </div>
        ` : ''}

        ${interestsList.length ? `
          <div class="pdf-sidebar-section">
            <div class="pdf-sidebar-title"><i class="fa-solid fa-heart"></i> ${labels.interests}</div>
            <div class="pdf-interests-wrap">
              ${interestsList.map(item => `<span class="pdf-interest-chip">${escapeHtml(item)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </div>

    <!-- MAIN RIGHT CONTENT -->
    <div class="pdf-main-content">
      <div class="pdf-header-block">
        <h1 class="pdf-header-name">${escapeHtml(fullName)}</h1>
        <div class="pdf-header-position">${escapeHtml(position)}</div>
        <div class="pdf-header-stats">
          ${age ? `<div class="pdf-stat-item"><i class="fa-solid fa-cake-candles"></i> ${labels.age}: ${escapeHtml(age)}</div>` : ''}
          ${experienceYears ? `<div class="pdf-stat-item"><i class="fa-solid fa-briefcase"></i> ${labels.experience}: ${escapeHtml(experienceYears)}</div>` : ''}
          ${employmentType ? `<div class="pdf-stat-item"><i class="fa-solid fa-building"></i> ${labels.employment}: ${escapeHtml(employmentType)}</div>` : ''}
          ${expectedSalary ? `<div class="pdf-stat-item"><i class="fa-solid fa-wallet"></i> ${labels.salary}: ${escapeHtml(expectedSalary)}</div>` : ''}
        </div>
      </div>

      <div class="pdf-sections-body">
        ${aboutMe ? `
          <div class="pdf-main-section">
            <div class="pdf-section-title">
              <span class="pdf-section-icon"><i class="fa-solid fa-user"></i></span>
              ${labels.aboutMe}
            </div>
            <div class="pdf-about-text">${escapeHtml(aboutMe)}</div>
          </div>
        ` : ''}

        ${workEntries.length ? `
          <div class="pdf-main-section">
            <div class="pdf-section-title">
              <span class="pdf-section-icon"><i class="fa-solid fa-briefcase"></i></span>
              ${labels.workExperience}
            </div>
            <div class="pdf-timeline-list">
              ${workEntries.map(w => `
                <div class="pdf-timeline-item">
                  <div class="pdf-timeline-dates">${escapeHtml(w.dates || '')}</div>
                  <div class="pdf-timeline-body">
                    <div class="pdf-timeline-role">${escapeHtml(w.role || position)}</div>
                    <div class="pdf-timeline-org">${escapeHtml(w.company || city)}</div>
                    ${w.description ? `<div class="pdf-timeline-desc">${escapeHtml(w.description)}</div>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${eduEntries.length ? `
          <div class="pdf-main-section">
            <div class="pdf-section-title">
              <span class="pdf-section-icon"><i class="fa-solid fa-graduation-cap"></i></span>
              ${labels.education}
            </div>
            <div class="pdf-timeline-list">
              ${eduEntries.map(e => `
                <div class="pdf-timeline-item">
                  <div class="pdf-timeline-dates">${escapeHtml(e.dates || '')}</div>
                  <div class="pdf-timeline-body">
                    <div class="pdf-timeline-role">${escapeHtml(e.institution || '')}</div>
                    ${e.degree ? `<div class="pdf-timeline-org">${escapeHtml(e.degree)}</div>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${projectEntries.length ? `
          <div class="pdf-main-section">
            <div class="pdf-section-title">
              <span class="pdf-section-icon"><i class="fa-solid fa-laptop-code"></i></span>
              ${labels.projects}
            </div>
            <div class="pdf-projects-list">
              ${projectEntries.map(p => `
                <div class="pdf-project-card">
                  <div class="pdf-project-header">
                    <span class="pdf-project-title">${escapeHtml(p.name)}</span>
                    ${p.url ? `<span class="pdf-project-url">${escapeHtml(p.url)}</span>` : ''}
                  </div>
                  ${p.desc ? `<div class="pdf-project-desc">${escapeHtml(p.desc)}</div>` : ''}
                  ${p.tags && p.tags.length ? `
                    <div class="pdf-project-techs">
                      ${p.tags.map(t => `<span class="pdf-tech-chip">${escapeHtml(t)}</span>`).join('')}
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${additionalInfoStr ? `
          <div class="pdf-main-section">
            <div class="pdf-section-title">
              <span class="pdf-section-icon" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);">
                <i class="fa-solid fa-star"></i>
              </span>
              ${labels.additionalInfo}
            </div>
            <div class="pdf-additional-text">${escapeHtml(additionalInfoStr)}</div>
          </div>
        ` : ''}
      </div>

      <div class="pdf-footer">
        ${labels.watermark}
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Renders PDF resume to disk using Puppeteer
 * @param {Object} resumeData 
 * @param {string} outputPath 
 * @param {string} lang
 * @returns {Promise<string>} Output absolute filepath
 */
async function generateResumePdfFile(resumeData, outputPath, lang = 'uz') {
  const htmlContent = buildResumePdfHtml(resumeData, lang);
  
  const uploadDir = path.dirname(outputPath);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    });
    return outputPath;
  } finally {
    await browser.close();
  }
}

module.exports = {
  buildResumePdfHtml,
  generateResumePdfFile,
};
