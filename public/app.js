/**
 * JobHunt Telegram Web App Main JS (Corporate Edition + Role Selection)
 */

const tg = window.Telegram?.WebApp || null;

// Application State
const state = {
  user: {
    userId: null,
    role: 'guest',
    isAdmin: false,
    hr: null,
    candidate: null,
    settings: {},
  },
  lang: localStorage.getItem('jobhunt_lang') || 'uz',
  selectedRoleMode: localStorage.getItem('jobhunt_active_role') || null, // 'hr' | 'candidate' | null
  activeTab: 'vacancies',
  activeAdminSubtab: 'stats',
  vacancies: [],
  resumes: [],
  selectedCategoryVacancies: 'all',
  selectedCategoryResumes: 'all',
  startParam: null,
};

// Multi-language Translations Dictionary (UZ & RU)
const TRANSLATIONS = {
  uz: {
    nav_vacancies: 'Vakansiyalar',
    nav_resumes: 'Rezyumelar',
    nav_cabinet: 'Kabinet',
    nav_admin: 'Admin',
    role_guest: 'Mehmon',
    role_hr: 'HR',
    role_candidate: 'Nomzod',
    vacancy_search_placeholder: 'Lavozim yoki kompaniya izlash...',
    active_vacancies_title: 'Faol Ish E\'lonlari',
    resume_search_placeholder: 'Rezyume yoki mutaxassislik izlash...',
    resumes_title: 'Nomzodlar Rezyumelari',
    cat_all: 'Barchasi',
    cat_sales: '💼 Sotuv',
    cat_callcenter: '📞 Call-center',
    cat_admin: '🏢 Admin',
    cat_smm: '📱 SMM',
    cat_dev: '💻 IT / Dev',
    cat_video: '🎬 Video',
    cat_agent: '🚚 Agenti',
    cat_courier: '🛵 Kuryer',
    cat_teacher: '👨‍🏫 O\'qituvchi',
    cat_other: '⚙️ Boshqa',
    hero_title: 'JobHunt Portaliga Xush Kelibsiz!',
    hero_subtitle: 'Iltimos, tizimga kirish rejimini tanlang:',
    hero_hr_btn: '👔 HR bo\'lib kirish',
    hero_hr_sub: 'Ish beruvchi xonasi',
    hero_candidate_btn: '👤 Nomzod bo\'lib kirish',
    hero_candidate_sub: 'Ish qidiruvchi xonasi',
    contacts: 'Kontaktlar',
    skills: 'Ko\'nikmalar',
    languages: 'Tillar',
    interests: 'Qiziqishlar',
    about_me: 'Men haqimda',
    work_experience: 'Ish tajribasi',
    education: 'Ta\'lim',
    key_projects: 'Asosiy loyihalar',
    additional_info: 'Qo\'shimcha ma\'lumotlar',
    age: 'Yosh',
    experience: 'Tajriba',
    employment: 'Ish formati',
    salary: 'Kutilayotgan maosh',
    download_pdf: '📄 PDF Yuklab Olish',
    view_resume: 'Ko\'rish',
    my_resumes_title: '📄 Mening Rezyumelarim',
    my_resumes_subtitle: 'Yaratgan rezyumelaringizni boshqaring yoki HR\'larga yuboring',
    btn_new_resume: '+ Yangi Rezyume Yaratish',
    label_salary: 'Maosh:',
    label_city: 'Shahar:',
    label_exp: 'Tajriba:',
    label_emptype: 'Bandlik:',
    label_created: 'Yaratilgan:',
    label_last_edit: 'Oxirgi tahrir:',
    btn_edit: 'Tahrirlash',
    btn_view: 'Ko\'rish',
    btn_send_hr: 'HR\'larga Yuborish',
    btn_statuses: 'Statuslar',
    no_resume_title: 'Sizda hali yaratilgan rezyume yo\'q',
    no_resume_desc: 'Vakansiyalarga ariza topshirish va Rezyumeingizni mos HR\'larga yuborish uchun 1 minutda birinchi rezyumeingizni yarating.',
    create_resume_modal_title: '📄 Yangi Rezyume Yaratish',
    step1_title: '1-Bosqich: Mutaxassislik Yo\'nalishini Tanlang:',
    badge_not_selected: 'Tanlanmagan',
    badge_selected: 'Tanlandi',
    lock_banner_text: '🔒 Avval yuqoridagi bo\'limlardan rezyume yo\'nalishini tanlang! Qolgan maydonlar shundan so\'ng ochiladi.',
    creation_type_label: 'Yaratish Usuli:',
    opt_wizard: 'Bosqichma-bosqich (Wizard)',
    opt_manual: 'Tezkor matn kiritish (Manual)',
    full_name_label: 'Ism Familiyangiz:',
    expected_position_label: 'Kutilayotgan Lavozim:',
    position_placeholder: 'Masalan: Sotuv menejeri',
    city_label: 'Shahar / Manzil:',
    exp_years_label: 'Tajriba Muddati:',
    exp_placeholder: '2 yil / Tajribasiz',
    expected_salary_label: 'Kutilayotgan Maosh:',
    salary_placeholder: '5 000 000 so\'m',
    emp_type_label: 'Bandlik Turi:',
    emp_type_placeholder: 'Ofis / Masofaviy / Gibrid',
    about_me_label: 'O\'zingiz Haqida Qisqacha:',
    about_me_placeholder: 'Maqsadingiz va kuchli taraflaringiz...',
    skills_label: 'Ko\'nikmalar (Skills):',
    skills_placeholder: 'Muzokara, CRM, MS Office...',
    skills_hint: '1-Tap ko\'nikmalarini bosib qo\'shing:',
    btn_ai_improve: '✨ AI bilan yaxshilash',
    pdf_accordion_title: '📄 Professional A4 PDF Resume Maydonlari (MAJBURIY)',
    pdf_accordion_desc: 'Ushbu ma\'lumotlar professional A4 PDF rezyumengizni shakllantirish uchun ishlatiladi:',
    photo_label: 'Profil Rasmi (Fotosurat Upload):',
    photo_upload_hint: 'Komp\'yuter yoki telefondan rasm faylini tanlang',
    photo_uploaded: 'Rasm muvaffaqiyatli yuklandi!',
    photo_uploaded_toast: 'Fotosurat muvaffaqiyatli yuklandi',
    uploading: 'Yuklanmoqda...',
    age_label: 'Yosh (Vozrast):',
    age_placeholder: 'Masalan: 24 yosh',
    work_history_label: 'Ish Tajribasi Timeline (Opyt raboty):',
    work_history_placeholder: 'Yillar | Lavozim | Kompaniya | Vazifalar\nMasalan:\n2023 - 2025 | Frontend Developer | IT Solutions Group | React da ishlash',
    edu_history_label: 'Ta\'lim Yo\'nalishi & Yurti (Obrazovanie):',
    edu_history_placeholder: 'Yillar | O\'quv yurti | Yo\'nalish/Bakalavr\nMasalan:\n2019 - 2023 | Toshkent axborot texnologiyalari universiteti | Bakalavr',
    languages_label: 'Tillar va Darajalar (Yazyki):',
    languages_placeholder: 'O\'zbek — Ona tili, Rus — C1, Ingliz — B2',
    projects_label: 'Asosiy Loyihalar (Klyuchevye proekty):',
    projects_placeholder: 'Loyiha | URL | Tavsif | Texnologiyalar\nMasalan:\nJobPortal (Veb-app) | github.com/jobportal | Ish ilovasi | React, Node.js',
    interests_label: 'Qiziqishlar (Interesy):',
    interests_placeholder: 'Texnologiyalar, Kitoblar, Sayohat, Sport, Fotografiya',
    additional_info_label: 'Qo\'shimcha Ma\'lumot (Dopolnitelnaya informaciya):',
    additional_info_placeholder: 'Masalan: Haydovchilik guvohnomasi B kategorya, Xizmat safarlariga tayyor',
    btn_save_resume: '💾 Rezyumeni Saqlash'
  },
  ru: {
    nav_vacancies: 'Вакансии',
    nav_resumes: 'Резюме',
    nav_cabinet: 'Кабинет',
    nav_admin: 'Админ',
    role_guest: 'Гость',
    role_hr: 'HR',
    role_candidate: 'Кандидат',
    vacancy_search_placeholder: 'Поиск должности или компании...',
    active_vacancies_title: 'Активные вакансии',
    resume_search_placeholder: 'Поиск резюме или специальности...',
    resumes_title: 'Резюме кандидатов',
    cat_all: 'Все',
    cat_sales: '💼 Продажи',
    cat_callcenter: '📞 Колл-центр',
    cat_admin: '🏢 Админ',
    cat_smm: '📱 SMM',
    cat_dev: '💻 IT / Дев',
    cat_video: '🎬 Видео',
    cat_agent: '🚚 Торг. агент',
    cat_courier: '🛵 Курьер',
    cat_teacher: '👨‍🏫 Преподаватель',
    cat_other: '⚙️ Другое',
    hero_title: 'Добро пожаловать в JobHunt Portal!',
    hero_subtitle: 'Пожалуйста, выберите режим входа:',
    hero_hr_btn: '👔 Войти как HR',
    hero_hr_sub: 'Кабинет работодателя',
    hero_candidate_btn: '👤 Войти как Кандидат',
    hero_candidate_sub: 'Кабинет соискателя',
    contacts: 'Контакты',
    skills: 'Навыки',
    languages: 'Языки',
    interests: 'Интересы',
    about_me: 'Обо мне',
    work_experience: 'Опыт работы',
    education: 'Образование',
    key_projects: 'Ключевые проекты',
    additional_info: 'Дополнительная информация',
    age: 'Возраст',
    experience: 'Опыт работы',
    employment: 'Формат работы',
    salary: 'Желаемая зарплата',
    download_pdf: '📄 Скачать PDF',
    view_resume: 'Просмотреть',
    my_resumes_title: '📄 Мои Резюме',
    my_resumes_subtitle: 'Управляйте созданными резюме или отправляйте их HR',
    btn_new_resume: '+ Создать новое резюме',
    label_salary: 'Зарплата:',
    label_city: 'Город:',
    label_exp: 'Опыт:',
    label_emptype: 'Занятость:',
    label_created: 'Создано:',
    label_last_edit: 'Посл. ред.:',
    btn_edit: 'Редактировать',
    btn_view: 'Просмотреть',
    btn_send_hr: 'Отправить HR',
    btn_statuses: 'Статусы',
    no_resume_title: 'У вас пока нет созданного резюме',
    no_resume_desc: 'Создайте свое первое резюме за 1 минуту, чтобы откликаться на вакансии и отправлять резюме подходящим HR.',
    create_resume_modal_title: '📄 Создание нового резюме',
    step1_title: 'Шаг 1: Выберите направление специальности:',
    badge_not_selected: 'Не выбрано',
    badge_selected: 'Выбрано',
    lock_banner_text: '🔒 Сначала выберите направление резюме выше! Остальные поля откроются после этого.',
    creation_type_label: 'Способ создания:',
    opt_wizard: 'Пошаговый мастер (Wizard)',
    opt_manual: 'Быстрый ввод текста (Manual)',
    full_name_label: 'Ваши Ф.И.О.:',
    expected_position_label: 'Желаемая должность:',
    position_placeholder: 'Например: Менеджер по продажам',
    city_label: 'Город / Адрес:',
    exp_years_label: 'Опыт работы:',
    exp_placeholder: '2 года / Без опыта',
    expected_salary_label: 'Желаемая зарплата:',
    salary_placeholder: '6 000 000 сум',
    emp_type_label: 'Тип занятости:',
    emp_type_placeholder: 'Офис / Удалённо / Гибрид',
    about_me_label: 'Коротко о себе:',
    about_me_placeholder: 'Ваши цели и сильные стороны...',
    skills_label: 'Навыки (Skills):',
    skills_placeholder: 'Переговоры, CRM, MS Office...',
    skills_hint: 'Нажмите в 1 тап, чтобы добавить навык:',
    btn_ai_improve: '✨ Улучшить с помощью AI',
    pdf_accordion_title: '📄 Поля для профессионального A4 PDF Резюме (ОБЯЗАТЕЛЬНО)',
    pdf_accordion_desc: 'Эти данные используются для формирования вашего профессионального A4 PDF резюме:',
    photo_label: 'Фото профиля (Загрузить фото):',
    photo_upload_hint: 'Выберите файл изображения с компьютера или телефона',
    photo_uploaded: 'Фото успешно загружено!',
    photo_uploaded_toast: 'Фотографическая загрузка успешно выполнена',
    uploading: 'Загрузка...',
    age_label: 'Возраст:',
    age_placeholder: 'Например: 24 года',
    work_history_label: 'Опыт работы Timeline:',
    work_history_placeholder: 'Годы | Должность | Компания | Обязанности\nНапример:\n2023 - 2025 | Frontend Developer | IT Solutions Group | Разработка на React',
    edu_history_label: 'Образование:',
    edu_history_placeholder: 'Годы | Учебное заведение | Специальность/Бакалавр\nНапример:\n2019 - 2023 | Ташкентский университет информационных технологий | Бакалавр',
    languages_label: 'Языки и уровни:',
    languages_placeholder: 'Узбекский — Родной, Русский — C1, Английский — B2',
    projects_label: 'Ключевые проекты:',
    projects_placeholder: 'Проект | URL | Описание | Технологии\nНапример:\nJobPortal | github.com/jobportal | Приложение для поиска работы | React, Node.js',
    interests_label: 'Интересы:',
    interests_placeholder: 'Технологии, Книги, Путешествия, Спорт, Фотография',
    additional_info_label: 'Дополнительная информация:',
    additional_info_placeholder: 'Например: Водительские права категории B, Готов к командировкам',
    btn_save_resume: '💾 Сохранить резюме'
  }
};

function t(key) {
  const lang = state.lang === 'ru' ? 'ru' : 'uz';
  return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.uz[key] || key;
}

window.switchLanguage = (lang) => {
  if (lang !== 'uz' && lang !== 'ru') lang = 'uz';
  state.lang = lang;
  localStorage.setItem('jobhunt_lang', lang);

  document.getElementById('lang-btn-uz')?.classList.toggle('active', lang === 'uz');
  document.getElementById('lang-btn-ru')?.classList.toggle('active', lang === 'ru');

  applyLanguageTranslations();
};

function applyLanguageTranslations() {
  const lang = state.lang === 'ru' ? 'ru' : 'uz';
  document.getElementById('lang-btn-uz')?.classList.toggle('active', lang === 'uz');
  document.getElementById('lang-btn-ru')?.classList.toggle('active', lang === 'ru');

  // Search placeholders
  const vacSearch = document.getElementById('vacancy-search-input');
  if (vacSearch) vacSearch.placeholder = t('vacancy_search_placeholder');
  const resSearch = document.getElementById('resume-search-input');
  if (resSearch) resSearch.placeholder = t('resume_search_placeholder');

  // Bottom navigation tabs
  const navItems = document.querySelectorAll('.bottom-nav .nav-item');
  navItems.forEach(item => {
    const tab = item.dataset.tab;
    const span = item.querySelector('span');
    if (span && tab) {
      if (tab === 'vacancies') span.textContent = t('nav_vacancies');
      else if (tab === 'resumes') span.textContent = t('nav_resumes');
      else if (tab === 'cabinet') span.textContent = t('nav_cabinet');
      else if (tab === 'admin') span.textContent = t('nav_admin');
    }
  });

  // Section titles
  const vacTitle = document.querySelector('#tab-vacancies .section-title h2');
  if (vacTitle) vacTitle.innerHTML = `<i class="fa-solid fa-bolt" style="color:#0066FF;"></i> ${t('active_vacancies_title')}`;
  const resTitle = document.querySelector('#tab-resumes .section-title h2');
  if (resTitle) resTitle.innerHTML = `<i class="fa-solid fa-user-check" style="color:#0066FF;"></i> ${t('resumes_title')}`;

  // Category pills
  const catMap = {
    'all': 'cat_all',
    'Sotuv menejeri': 'cat_sales',
    'Call-center operatori': 'cat_callcenter',
    'Administrator': 'cat_admin',
    'SMM mutaxassisi': 'cat_smm',
    'Dasturchi': 'cat_dev',
    'Video montajchi': 'cat_video',
    'Savdo agenti': 'cat_agent',
    'Kuryer': 'cat_courier',
    'O‘qituvchi': 'cat_teacher',
    'Boshqa soha': 'cat_other'
  };
  document.querySelectorAll('.category-scroll-pills .pill').forEach(pill => {
    const catKey = pill.dataset.category;
    if (catKey && catMap[catKey]) {
      pill.textContent = t(catMap[catKey]);
    }
  });

  // Role Hero Banner
  const heroH3 = document.querySelector('#role-landing-hero h3');
  if (heroH3) heroH3.textContent = t('hero_title');
  const heroP = document.querySelector('#role-landing-hero p');
  if (heroP) heroP.textContent = t('hero_subtitle');
  const hrBtn = document.querySelector('#role-landing-hero .hr-btn strong');
  if (hrBtn) hrBtn.textContent = t('hero_hr_btn');
  const hrSub = document.querySelector('#role-landing-hero .hr-btn small');
  if (hrSub) hrSub.textContent = t('hero_hr_sub');
  const candBtn = document.querySelector('#role-landing-hero .candidate-btn strong');
  if (candBtn) candBtn.textContent = t('hero_candidate_btn');
  const candSub = document.querySelector('#role-landing-hero .candidate-btn small');
  if (candSub) candSub.textContent = t('hero_candidate_sub');
}

// Toast helper
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'}"></i> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Modal helper
function openModal(title, htmlContent) {
  const overlay = document.getElementById('modal-overlay');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');

  modalTitle.textContent = title;
  modalBody.innerHTML = htmlContent;
  overlay.classList.remove('hidden');
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.add('hidden');
}

// Global utility helpers (available in all onclick handlers)
window.setInputValue = (id, val) => {
  const el = document.getElementById(id);
  if (el) el.value = val;
};

window.appendSkill = (skillText) => {
  const el = document.getElementById('res-skills');
  if (!el) return;
  const current = el.value.trim();
  el.value = current ? current + ' · ' + skillText : skillText;
};


// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  if (tg) {
    tg.ready();
    tg.expand();
    try { tg.enableClosingConfirmation(); } catch (_) {}
  }

  // Get Telegram user info
  let uid = tg?.initDataUnsafe?.user?.id;
  
  // Dev fallback for testing directly in browser if no tg user
  if (!uid) {
    const urlParams = new URLSearchParams(window.location.search);
    uid = urlParams.get('uid') || '123456789';
  }

  state.user.userId = parseInt(uid);

  // Check start_param (e.g. apply_123)
  const startParam = tg?.initDataUnsafe?.start_param || new URLSearchParams(window.location.search).get('start_param');
  if (startParam) {
    state.startParam = startParam;
  }

  // Bind close modal button
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
  });

  // Bind Navigation Tabs
  document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  // Search input listeners
  const vacSearch = document.getElementById('vacancy-search-input');
  if (vacSearch) {
    vacSearch.addEventListener('input', debounce(() => loadVacancies(), 300));
  }
  const resSearch = document.getElementById('resume-search-input');
  if (resSearch) {
    resSearch.addEventListener('input', debounce(() => loadResumes(), 300));
  }

  // Category Pill Listeners
  document.querySelectorAll('#vacancy-category-pills .pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('#vacancy-category-pills .pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.selectedCategoryVacancies = pill.dataset.category;
      loadVacancies();
    });
  });

  document.querySelectorAll('#resume-category-pills .pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('#resume-category-pills .pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.selectedCategoryResumes = pill.dataset.category;
      loadResumes();
    });
  });

  // Authenticate & load profile safely
  try { await authenticateUser(); } catch (e) { console.error('Auth step error:', e); }
  try { await loadVacancies(); } catch (e) { console.error('Vacancies load step error:', e); }
  try { await loadResumes(); } catch (e) { console.error('Resumes load step error:', e); }

  // If start_param is apply_123, open vacancy apply modal directly!
  if (state.startParam && state.startParam.startsWith('apply_')) {
    const vacancyId = parseInt(state.startParam.replace('apply_', ''));
    if (vacancyId) {
      openVacancyDetailModal(vacancyId);
    }
  }

  // If first visit or role not selected yet, prompt role selection modal
  if (!state.selectedRoleMode && !state.startParam) {
    setTimeout(() => {
      openRoleSelectionModal();
    }, 400);
  }
});

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    setTimeout(later, wait);
  };
}

// Authenticate User
async function authenticateUser() {
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: state.user.userId,
        initData: tg?.initData || '',
      }),
    });
    const data = await res.json();
    if (data.success) {
      state.user = {
        userId: data.userId,
        role: data.role,
        isAdmin: data.isAdmin,
        hr: data.hr,
        candidate: data.candidate,
        settings: data.settings,
      };

      // Foydalanuvchining haqiqiy ro'yxatdan o'tgan rolini aniqlash
      // Agar faqat bittasi bo'lsa, majburan o'sha rol o'rnatiladi (localStorage ga qaramay)
      if (data.hr && !data.candidate) {
        // Faqat HR sifatida ro'yxatdan o'tgan — doim HR ko'rsatilsin
        state.selectedRoleMode = 'hr';
        localStorage.setItem('jobhunt_active_role', 'hr');
      } else if (data.candidate && !data.hr) {
        // Faqat nomzod sifatida ro'yxatdan o'tgan — doim Nomzod ko'rsatilsin
        state.selectedRoleMode = 'candidate';
        localStorage.setItem('jobhunt_active_role', 'candidate');
      } else if (data.hr && data.candidate) {
        // Ikkalasida ham ro'yxatdan o'tgan — localStorage preference saqlansin
        if (!state.selectedRoleMode) {
          state.selectedRoleMode = 'hr'; // default
          localStorage.setItem('jobhunt_active_role', 'hr');
        }
      } else {
        // Hech birida ro'yxatdan o'tmagan
        state.selectedRoleMode = null;
        localStorage.removeItem('jobhunt_active_role');
      }

      updateUserUI();
    }
  } catch (err) {
    console.error('Auth error:', err);
  }
}

// Update User UI Elements
function updateUserUI() {
  const roleBadge = document.getElementById('user-role-badge');
  const tokenDisplay = document.getElementById('token-display');
  const tokensCount = document.getElementById('user-tokens-count');
  const adminTab = document.getElementById('nav-admin-tab');

  // Badge kliki: faqat ikki rolda ham ro'yxatdan o'tgan bo'lsa almashtirish mumkin
  const hasBothRoles = state.user.hr && state.user.candidate;
  if (hasBothRoles && !state.user.isAdmin) {
    roleBadge.setAttribute('onclick', 'openRoleSelectionModal()');
    roleBadge.setAttribute('title', 'Rolni o\'zgartirish');
    roleBadge.style.cursor = 'pointer';
  } else {
    roleBadge.removeAttribute('onclick');
    roleBadge.removeAttribute('title');
    roleBadge.style.cursor = 'default';
  }

  // Badge & Tokens
  if (state.user.isAdmin) {
    roleBadge.className = 'badge badge-admin';
    roleBadge.textContent = '🛠 Admin';
    if (adminTab) adminTab.style.display = 'flex';
  } else if (state.selectedRoleMode === 'hr' || state.user.role === 'hr') {
    roleBadge.className = 'badge badge-hr';
    roleBadge.textContent = '👔 HR MODE';
    if (state.user.hr) {
      tokenDisplay.style.display = 'flex';
      tokensCount.textContent = state.user.hr.tokens || 0;
    } else {
      tokenDisplay.style.display = 'none';
    }
  } else if (state.selectedRoleMode === 'candidate' || state.user.role === 'candidate') {
    roleBadge.className = 'badge badge-candidate';
    roleBadge.textContent = '👤 NOMZOD MODE';
    if (state.user.candidate) {
      tokenDisplay.style.display = 'flex';
      tokensCount.textContent = state.user.candidate.tokens || 0;
    } else {
      tokenDisplay.style.display = 'none';
    }
  } else {
    roleBadge.className = 'badge badge-guest';
    roleBadge.textContent = 'Rol Tanlash';
    roleBadge.setAttribute('onclick', 'openRoleSelectionModal()');
    roleBadge.style.cursor = 'pointer';
    tokenDisplay.style.display = 'none';
  }

  // Role hero banner — only visible inside Cabinet tab, only when no role chosen
  const heroBanner = document.getElementById('role-landing-hero');
  if (heroBanner) {
    const noRole = !state.selectedRoleMode;
    heroBanner.style.display = noRole ? 'block' : 'none';

    // Update active states on hero buttons
    const hrHeroBtn = heroBanner.querySelector('.role-btn.hr-btn');
    const candHeroBtn = heroBanner.querySelector('.role-btn.candidate-btn');
    if (hrHeroBtn && candHeroBtn) {
      hrHeroBtn.classList.toggle('active', state.selectedRoleMode === 'hr');
      candHeroBtn.classList.toggle('active', state.selectedRoleMode === 'candidate');
    }
  }

  // Render cabinet tab
  renderCabinetTab();
}

// Switch Navigation Tab
function switchTab(tabName) {
  state.activeTab = tabName;
  document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  document.querySelectorAll('.tab-page').forEach(page => {
    page.classList.toggle('active', page.id === `tab-${tabName}`);
  });

  if (tabName === 'vacancies') {
    // HR rejimida o'z e'lonlarini ko'rsatamiz
    if (state.selectedRoleMode === 'hr' && state.user.hr) {
      loadHrVacanciesTab();
    } else {
      loadVacancies();
    }
  }
  if (tabName === 'resumes') loadResumes();
  if (tabName === 'cabinet') renderCabinetTab();
  if (tabName === 'admin') renderAdminTab();
}

// ── 👔 HR / 👤 NOMZOD ROLE SELECTION MODAL ──────────────────────────────────────
function openRoleSelectionModal() {
  const html = `
    <div class="role-selection-card">
      <div class="welcome-header">
        <div class="welcome-logo-badge"><img src="logo-icon.svg" style="width:36px;"></div>
        <h3>JobHunt Portaliga Xush Kelibsiz!</h3>
        <p>Siz tizimga qaysi toifa sifatida kirmoqchisiz?</p>
      </div>

      <div class="role-options-grid">
        <div class="role-option-card hr-option" onclick="selectUserRoleMode('hr')">
          <div class="role-icon-box"><i class="fa-solid fa-building-user"></i></div>
          <div class="role-details">
            <h4>👔 HR (Ish Beruvchi) Bo'lib Kirish</h4>
            <p>Vakansiya e'lon qilish, nomzodlar arizalarini qabul qilish va mos rezyumelarni ko'rish</p>
          </div>
          <div class="role-arrow"><i class="fa-solid fa-chevron-right"></i></div>
        </div>

        <div class="role-option-card candidate-option" onclick="selectUserRoleMode('candidate')">
          <div class="role-icon-box"><i class="fa-solid fa-user-tie"></i></div>
          <div class="role-details">
            <h4>👤 Nomzod (Ish Qidiruvchi) Bo'lib Kirish</h4>
            <p>Vakansiyalarga 1-click ariza topshirish, rezyume joylash va ish beruvchilar bilan bog'lanish</p>
          </div>
          <div class="role-arrow"><i class="fa-solid fa-chevron-right"></i></div>
        </div>
      </div>
    </div>
  `;

  openModal("👋 Rolni Tanlang", html);
}

function selectUserRoleMode(mode) {
  state.selectedRoleMode = mode;
  localStorage.setItem('jobhunt_active_role', mode);
  closeModal();

  updateUserUI();

  if (mode === 'hr') {
    if (!state.user.hr) {
      showToast("HR sifatida avval ro'yxatdan o'ting!");
      openRegisterModal('hr');
    } else {
      showToast("HR rejimiga o'tildi 👔");
      switchTab('cabinet');
    }
  } else if (mode === 'candidate') {
    if (!state.user.candidate) {
      showToast("Nomzod sifatida avval ro'yxatdan o'ting!");
      openRegisterModal('candidate');
    } else {
      showToast("Nomzod rejimiga o'tildi 👤");
      switchTab('vacancies');
    }
  }
}

// ── TAB 1: Load & Render Vacancies ────────────────────────────────────────────
async function loadVacancies() {
  // If HR mode — show their own vacancies instead of public feed
  if (state.selectedRoleMode === 'hr' && state.user.hr) {
    return loadHrVacanciesTab();
  }

  // Load banners for candidates
  try { loadActiveBanners(); } catch (_) {}

  const container = document.getElementById('vacancies-list');
  const search = document.getElementById('vacancy-search-input')?.value || '';
  const category = state.selectedCategoryVacancies || 'all';

  try {
    const res = await fetch(`/api/vacancies?category=${encodeURIComponent(category)}&search=${encodeURIComponent(search)}`);
    const data = await res.json();
    if (data && data.success && Array.isArray(data.vacancies)) {
      state.vacancies = data.vacancies;
      const countBadge = document.getElementById('vacancies-count');
      if (countBadge) countBadge.textContent = data.vacancies.length;
      renderVacanciesFeed(data.vacancies);
    } else {
      renderVacanciesFeed([]);
    }
  } catch (err) {
    console.error('loadVacancies error:', err);
    if (container) {
      renderVacanciesFeed([]);
    }
  }
}

// ── BANNER CAROUSEL ─────────────────────────────────────────────────────────
async function loadActiveBanners(containerId = 'banner-carousel-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const res = await fetch('/api/banners/active');
    const data = await res.json();
    
    if (!data.success || !data.banners || !data.banners.length) {
      container.style.display = 'none';
      return;
    }

    const banners = data.banners;
    container.style.display = 'block';
    
    const trackId = `banner-track-${containerId}`;
    let html = `<div class="banner-track" id="${trackId}">`;
    banners.forEach((b, i) => {
      const clickAttr = b.vacancy_id ? `openVacancyDetailModal(${b.vacancy_id})` : '';
      const ctaLabel = escapeHtml(b.cta_text || 'Ariza qoldirish');
      const compLabel = escapeHtml(b.company_name || 'Kompaniya');
      html += `
        <div class="banner-slide" onclick="${clickAttr}">
          <img src="${b.image_url}" alt="${escapeHtml(b.title)}">
          <div class="banner-overlay">
            <div class="banner-content-text">
              <div style="font-size: 11px; font-weight: 700; color: #00d2ff; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">
                <i class="fa-solid fa-building"></i> ${compLabel}
              </div>
              <h3>${escapeHtml(b.title)}</h3>
              ${b.subtitle || b.description ? `<p>${escapeHtml(b.subtitle || b.description)}</p>` : ''}
            </div>
            ${b.vacancy_id ? `
              <div class="banner-cta" onclick="event.stopPropagation(); openVacancyDetailModal(${b.vacancy_id})">
                <i class="fa-solid fa-paper-plane"></i> ${ctaLabel}
              </div>` : ''}
          </div>
        </div>
      `;
    });
    html += '</div>';

    // Dots
    if (banners.length > 1) {
      html += '<div class="carousel-dots">';
      banners.forEach((_, i) => {
        html += `<div class="carousel-dot ${i === 0 ? 'active' : ''}" id="dot-${containerId}-${i}"></div>`;
      });
      html += '</div>';
    }

    container.innerHTML = html;

    // Carousel auto-slide logic
    if (banners.length > 1) {
      let currentIndex = 0;
      const track = document.getElementById(trackId);
      const dots = container.querySelectorAll('.carousel-dot');
      
      setInterval(() => {
        if (!document.getElementById(trackId)) return;
        currentIndex = (currentIndex + 1) % banners.length;
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
        dots.forEach(d => d.classList.remove('active'));
        const activeDot = document.getElementById(`dot-${containerId}-${currentIndex}`);
        if (activeDot) activeDot.classList.add('active');
      }, 5000);
    }
  } catch (err) {
    console.error('Banners load error', err);
    container.style.display = 'none';
  }
}

// ── HR: My Vacancies inside Vacancies Tab ────────────────────────────────────
async function loadHrVacanciesTab() {
  const container = document.getElementById('vacancies-list');
  const countBadge = document.getElementById('vacancies-count');

  // Hide search + pills, show HR header instead
  const searchBar = document.querySelector('#tab-vacancies .search-bar-container');
  const pills = document.getElementById('vacancy-category-pills');
  const sectionTitle = document.querySelector('#tab-vacancies .section-title h2');
  if (searchBar) searchBar.style.display = 'none';
  if (pills) pills.style.display = 'none';
  if (sectionTitle) sectionTitle.innerHTML = '<i class="fa-solid fa-briefcase-clock" style="color:#0066FF;"></i> Mening E\'lonlarim';

  try {
    const res = await fetch(`/api/hr/vacancies?userId=${state.user.userId}`);
    const data = await res.json();
    if (!data.success) return;

    const list = data.vacancies;
    if (countBadge) countBadge.textContent = list.length;

    // Top action bar
    const actionBar = `
      <div style="display:flex; gap:8px; margin-bottom:14px;">
        <button class="btn btn-primary" onclick="openCreateVacancyModal()" style="flex:1;">
          <i class="fa-solid fa-plus-circle"></i> ⚡ Yangi E'lon
        </button>
        <button class="btn btn-outline" onclick="openCreateBannerModal()" style="flex:1; border-color:var(--primary); color:var(--primary);">
          <i class="fa-solid fa-image"></i> 🎯 Reklama Banneri
        </button>
      </div>
    `;

    if (!list.length) {
      container.innerHTML = actionBar + `
        <div class="profile-card" style="padding: 30px 16px;">
          <i class="fa-solid fa-briefcase" style="font-size: 36px; color: var(--text-dim); margin-bottom: 12px;"></i>
          <p style="color: var(--text-muted); font-size: 14px;">Siz hali e'lon bermadingiz.<br>Yuqoridagi tugmani bosib birinchi e'loningizni yarating!</p>
        </div>
      `;
      return;
    }

    const statusLabel = (s) => {
      if (s === 'active') return '<span class="badge badge-candidate">✅ AKTIV</span>';
      if (s === 'pending') return '<span class="badge badge-guest">⏳ TEKSHIRUVDA</span>';
      return `<span class="badge badge-guest">${s.toUpperCase()}</span>`;
    };

    container.innerHTML = actionBar + list.map(v => `
      <div class="card my-vac-card" onclick="viewMyVacancyDetail(${v.id})" style="cursor:pointer; margin-bottom:10px;">
        <div class="card-header">
          <div class="card-title">${escapeHtml(v.title)}</div>
          ${statusLabel(v.status)}
        </div>
        <div class="card-company">
          <i class="fa-solid fa-building" style="color:#0066FF;"></i> ${escapeHtml(v.company_name || '')}
          &nbsp;|&nbsp; 💰 ${escapeHtml(v.salary || '')}
        </div>
        <div style="font-size: 12px; color: var(--text-muted); margin: 6px 0 10px;">
          📨 Kelgan arizalar: <strong>${v.apps_count || 0} ta</strong>
        </div>
        <div style="display: flex; gap: 6px; flex-wrap: wrap;" onclick="event.stopPropagation()">
          <button class="btn btn-outline btn-sm" onclick="viewMyVacancyDetail(${v.id})"><i class="fa-solid fa-eye"></i> Ko'rish</button>
          <button class="btn btn-warning btn-sm" onclick="openEditVacancyModal(${v.id})"><i class="fa-solid fa-pen-to-square"></i> Tahrirlash</button>
          <button class="btn btn-outline btn-sm" onclick="viewVacancyApplications(${v.id})"><i class="fa-solid fa-inbox"></i> Arizalar (${v.apps_count || 0})</button>
          <button class="btn btn-outline btn-sm" onclick="viewMatchingCandidates(${v.id})"><i class="fa-solid fa-users"></i> Mos Nomzodlar</button>
          ${v.status !== 'active' ? `<button class="btn btn-success btn-sm" onclick="reactivateVacancy(${v.id})"><i class="fa-solid fa-rotate-right"></i> Faollashtirish</button>` : ''}
          <button class="btn btn-danger btn-sm" onclick="deleteVacancy(${v.id})"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}


function renderVacanciesFeed(vacancies) {
  const container = document.getElementById('vacancies-list');
  if (!vacancies.length) {
    container.innerHTML = `
      <div class="profile-card" style="padding: 30px 16px;">
        <i class="fa-solid fa-briefcase" style="font-size: 36px; color: var(--text-dim); margin-bottom: 12px;"></i>
        <p style="color: var(--text-muted); font-size: 14px;">Hozircha faol ish e'lonlari yo'q</p>
      </div>
    `;
    return;
  }

  container.innerHTML = vacancies.map(v => `
    <div class="card" onclick="openVacancyDetailModal(${v.id})">
      <div class="card-header">
        <div class="card-title">${escapeHtml(v.title)}</div>
        <div class="card-salary">${escapeHtml(v.salary)}</div>
      </div>
      <div class="card-company">
        <i class="fa-solid fa-building" style="color:#0066FF;"></i> ${escapeHtml(v.company_name)}
      </div>
      <div class="card-tags">
        <span class="tag-item"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(v.location)}</span>
        <span class="tag-item"><i class="fa-solid fa-clock"></i> ${escapeHtml(v.work_time)}</span>
        ${v.category ? `<span class="tag-item"><i class="fa-solid fa-folder"></i> ${escapeHtml(v.category)}</span>` : ''}
      </div>
    </div>
  `).join('');
}

// Open Vacancy Detail & Apply Modal
async function openVacancyDetailModal(vacancyId) {
  try {
    const res = await fetch(`/api/vacancies/${vacancyId}`);
    const data = await res.json();
    if (!data.success) return showToast('Vakansiya topilmadi', 'error');

    const v = data.vacancy;
    const extraFields = data.extraFields || [];

    const fieldLabels = {
      full_name: 'Ism Familiya',
      birth_date: 'Tug\'ilgan kun (misol: 15.05.2000)',
      expected_salary: 'Kutilayotgan maosh',
      languages: 'Til bilish darajangiz',
      photo: 'Rasmingiz (fayl sifatida)',
      education: 'Ta\'limingiz (o\'quv yurti)',
      certificate: 'Sertifikatlaringiz',
      experience: 'Tajribangiz muddati',
      portfolio: 'Portfolio havolasi',
      telegram: 'Telegram username',
    };

    let bodyHtml = `
      <div style="margin-bottom: 16px;">
        <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 4px;">${escapeHtml(v.title)}</h2>
        <div style="font-size: 14px; color: #34d399; font-weight: 700; margin-bottom: 12px;">${escapeHtml(v.salary)}</div>
        
        <div class="card-tags" style="margin-bottom: 16px;">
          <span class="tag-item"><i class="fa-solid fa-building" style="color:#0066FF;"></i> ${escapeHtml(v.company_name)}</span>
          <span class="tag-item"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(v.location)}</span>
          <span class="tag-item"><i class="fa-solid fa-clock"></i> ${escapeHtml(v.work_time)}</span>
        </div>

        ${v.creation_type === 'manual' && v.raw_text ? `
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 12px; border-radius: 12px; font-size: 13px; white-space: pre-wrap; line-height: 1.5; color: #cbd5e1; margin-bottom: 16px;">
            ${escapeHtml(v.raw_text)}
          </div>
        ` : `
          ${v.tasks ? `<div style="margin-bottom: 10px;"><strong>🎯 Vazifalar:</strong><p style="font-size: 13px; color: #cbd5e1; white-space: pre-wrap;">${escapeHtml(v.tasks)}</p></div>` : ''}
          ${v.requirements ? `<div style="margin-bottom: 10px;"><strong>✍️ Talablar:</strong><p style="font-size: 13px; color: #cbd5e1; white-space: pre-wrap;">${escapeHtml(v.requirements)}</p></div>` : ''}
          ${v.conditions ? `<div style="margin-bottom: 16px;"><strong>✅ Sharoitlar:</strong><p style="font-size: 13px; color: #cbd5e1; white-space: pre-wrap;">${escapeHtml(v.conditions)}</p></div>` : ''}
        `}
      </div>

      <hr style="border: none; border-top: 1px solid var(--border-color); margin: 16px 0;">
      <h4 style="font-size: 15px; font-weight: 700; margin-bottom: 12px;">📝 Ariza Qoldirish</h4>
    `;

    if (!state.user.candidate && !state.user.isAdmin) {
      bodyHtml += `
        <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); padding: 12px; border-radius: 12px; font-size: 13px; color: #fbbf24; text-align: center; margin-bottom: 12px;">
          Ariza topshirish uchun avval <strong>Nomzod</strong> sifatida ro'yxatdan o'ting!
        </div>
        <button class="btn btn-primary" onclick="selectUserRoleMode('candidate')"><i class="fa-solid fa-user-plus"></i> Nomzod Sifatida Ro'yxatdan O'tish</button>
      `;
    } else {
      bodyHtml += `<form id="apply-vacancy-form" enctype="multipart/form-data">`;
      if (extraFields.length === 0) {
        bodyHtml += `<p style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">"Arizani Yuborish" tugmasini bosing va ma'lumotlaringiz HR ga yuboriladi.</p>`;
      } else {
        extraFields.forEach(field => {
          const label = fieldLabels[field] || field;
          if (field === 'photo') {
            bodyHtml += `
              <div class="form-group">
                <label>${label}:</label>
                <input type="file" name="photo" accept="image/*" class="form-control">
              </div>
            `;
          } else {
            bodyHtml += `
              <div class="form-group">
                <label>${label}:</label>
                <input type="text" name="${field}" class="form-control" required placeholder="${label}...">
              </div>
            `;
          }
        });
      }

      bodyHtml += `
        <button type="submit" class="btn btn-success" style="margin-top: 10px;"><i class="fa-solid fa-paper-plane"></i> Arizani Yuborish</button>
      </form>`;
    }

    openModal(`Vakansiya #${v.id}`, bodyHtml);

    const applyForm = document.getElementById('apply-vacancy-form');
    if (applyForm) {
      applyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(applyForm);
        formData.append('userId', state.user.userId);

        const answersObj = {};
        formData.forEach((val, key) => {
          if (key !== 'photo' && key !== 'userId') {
            answersObj[key] = val;
          }
        });
        formData.append('answers', JSON.stringify(answersObj));

        try {
          const resApply = await fetch(`/api/vacancies/${vacancyId}/apply`, {
            method: 'POST',
            body: formData,
          });
          const dataApply = await resApply.json();
          if (dataApply.success) {
            closeModal();
            showToast('Arizangiz HR ga muvaffaqiyatli yuborildi!');
          } else {
            showToast(dataApply.error || 'Xatolik yuz berdi', 'error');
          }
        } catch (err) {
          showToast('Yuborishda xatolik yuz berdi', 'error');
        }
      });
    }

  } catch (err) {
    showToast('Xatolik yuz berdi', 'error');
  }
}

// ── TAB 2: Load & Render Resumes ──────────────────────────────────────────────
async function loadResumes() {
  try { loadActiveBanners('resume-banner-carousel-container'); } catch (_) {}

  // Nomzod rejimida o'zining barcha yaratgan rezyumelarini ko'rsatamiz
  if ((state.selectedRoleMode === 'candidate' || state.user?.role === 'candidate') && state.user?.candidate) {
    await loadCandidateMyResumesTab();
    return;
  }

  // HR rejimida HR e'lonlariga va kategoriyalariga mos nomzodlar
  if ((state.selectedRoleMode === 'hr' || state.user?.role === 'hr') && state.user?.hr) {
    await loadHrMatchingResumesTab();
    return;
  }

  const container = document.getElementById('resumes-list');
  const search = document.getElementById('resume-search-input')?.value || '';
  const category = state.selectedCategoryResumes || 'all';

  try {
    const res = await fetch(`/api/resumes?category=${encodeURIComponent(category)}&search=${encodeURIComponent(search)}&userId=${state.user?.userId || ''}`);
    const data = await res.json();
    if (data && data.success && Array.isArray(data.resumes)) {
      state.resumes = data.resumes;
      const countBadge = document.getElementById('resumes-count');
      if (countBadge) countBadge.textContent = data.resumes.length;
      renderResumesFeed(data.resumes);
    } else {
      renderResumesFeed([]);
    }
  } catch (err) {
    console.error('loadResumes error:', err);
    if (container) {
      renderResumesFeed([]);
    }
  }
}

async function loadHrMatchingResumesTab() {
  const container = document.getElementById('resumes-list');
  if (!container) return;

  const search = document.getElementById('resume-search-input')?.value || '';
  const selectedVacId = state.selectedHrVacancyId || '';
  const selectedCategory = state.selectedCategoryResumes || 'all';

  container.innerHTML = `
    <div style="text-align: center; padding: 40px 0;">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 28px; color: var(--primary);"></i>
      <p style="color: var(--text-muted); font-size: 13px; margin-top: 10px;">Mos nomzodlar rezyumelarim yuklanmoqda...</p>
    </div>
  `;

  try {
    const url = `/api/hr/matching-resumes?userId=${state.user.userId}&vacancyId=${selectedVacId}&category=${encodeURIComponent(selectedCategory)}&search=${encodeURIComponent(search)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.success) {
      container.innerHTML = `
        <div class="profile-card" style="padding: 30px; text-align: center; color: var(--text-muted);">
          Rezyumelarni yuklashda xatolik yuz berdi.
        </div>
      `;
      return;
    }

    const resumes = data.resumes || [];
    const hrVacancies = data.hrVacancies || [];
    const credits = data.contactCredits !== undefined ? data.contactCredits : 20;

    const countBadge = document.getElementById('resumes-count');
    if (countBadge) countBadge.textContent = resumes.length;

    let vacOptionsHtml = `
      <option value="" ${!selectedVacId ? 'selected' : ''}>Barcha vakansiyalar / Kategoriya bo'yicha</option>
      ${hrVacancies.map(v => `<option value="${v.id}" ${parseInt(selectedVacId) === v.id ? 'selected' : ''}>📌 ${escapeHtml(v.title)} (${escapeHtml(v.company_name)})</option>`).join('')}
    `;

    container.innerHTML = `
      <div style="background: rgba(0, 102, 255, 0.06); border: 1px solid rgba(0, 102, 255, 0.2); border-radius: 14px; padding: 14px 16px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 12px;">
          <div>
            <h3 style="font-size: 16px; font-weight: 700; margin: 0; color: #fff;">👔 HR Resurs Markazi — Mos Nomzodlar</h3>
            <p style="font-size: 12px; color: var(--text-muted); margin: 2px 0 0 0;">Vakansiyalaringizga mos nomzodlarni qidiring hamda rezyumelarni bepul PDF formatida ko'ring</p>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="background: rgba(52, 211, 153, 0.15); border: 1px solid rgba(52, 211, 153, 0.3); border-radius: 20px; padding: 6px 14px; font-size: 13px; font-weight: 700; color: #34d399; display: flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-address-book"></i>
              <span>Qolgan kontaktlar: <strong>${credits} ta</strong></span>
            </div>
            ${credits <= 0 ? `
              <button class="btn btn-success btn-sm" onclick="openBuyContactPackModal()" style="font-weight: 700;">
                <i class="fa-solid fa-cart-plus"></i> Paket Sotib Olish
              </button>
            ` : ''}
          </div>
        </div>

        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 220px;">
            <label style="font-size: 11px; color: var(--text-muted); font-weight: 600;">Vakansiyangiz bo'yicha moslash:</label>
            <select class="form-control" style="font-size: 13px; padding: 8px 12px;" onchange="filterHrResumesByVacancy(this.value)">
              ${vacOptionsHtml}
            </select>
          </div>
        </div>
      </div>

      ${!resumes.length ? `
        <div style="background: rgba(255,255,255,0.02); border: 1px dashed var(--border-color); border-radius: 16px; padding: 40px 20px; text-align: center;">
          <i class="fa-solid fa-user-slash" style="font-size: 40px; color: var(--text-dim); margin-bottom: 12px;"></i>
          <h4 style="font-size: 15px; font-weight: 700; margin-bottom: 6px;">Ushbu soha/vakansiya bo'yicha nomzodlar topilmadi</h4>
          <p style="font-size: 13px; color: var(--text-muted);">Boshqa vakansiya yoki kategoriyani tanlab izlab ko'ring.</p>
        </div>
      ` : `
        <div class="cards-grid">
          ${resumes.map(r => `
            <div class="card" style="cursor: default; padding: 16px;">
              <div class="card-header" style="margin-bottom: 8px;">
                <div>
                  <div class="card-title" style="font-size: 16px; font-weight: 700; color: #fff;">${escapeHtml(r.position)}</div>
                  <div class="card-company" style="font-size: 13px; margin-top: 2px;">
                    <i class="fa-solid fa-user-tie" style="color:#0066FF;"></i> ${escapeHtml(r.full_name)}
                  </div>
                </div>
                <span class="badge badge-candidate">✅ AKTIV</span>
              </div>

              <div class="card-tags" style="margin-bottom: 12px;">
                <span class="tag-item"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(r.city || 'Toshkent')}</span>
                <span class="tag-item"><i class="fa-solid fa-briefcase"></i> Tajriba: ${escapeHtml(r.experience_years)}</span>
                <span class="tag-item"><i class="fa-solid fa-clock"></i> ${escapeHtml(r.employment_type || 'To\'liq')}</span>
                ${r.category ? `<span class="tag-item"><i class="fa-solid fa-folder"></i> ${escapeHtml(r.category)}</span>` : ''}
              </div>

              <div style="font-size: 13px; color: #34d399; font-weight: 700; margin-bottom: 10px;">
                Maosh kutilmasi: ${escapeHtml(r.expected_salary)}
              </div>

              ${r.skills ? `
                <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px; background: rgba(255,255,255,0.03); padding: 8px 10px; border-radius: 8px;">
                  <strong>💡 Key Skills:</strong> ${escapeHtml(r.skills)}
                </div>
              ` : ''}

              <!-- Kontakt ma'lumotlari bloqi -->
              <div id="contact-info-block-${r.id}" style="margin-bottom: 12px;">
                ${r.contactUnlocked ? `
                  <div style="background: rgba(52, 211, 153, 0.1); border: 1px solid rgba(52, 211, 153, 0.25); padding: 10px 12px; border-radius: 10px; font-size: 13px;">
                    <div style="color: #34d399; font-weight: 700; margin-bottom: 4px;"><i class="fa-solid fa-lock-open"></i> Kontakt Ma'lumotlari Ochiq:</div>
                    <div style="color: #fff;"><i class="fa-solid fa-phone"></i> <strong>Tel:</strong> ${escapeHtml(r.phone)}</div>
                    ${r.telegram ? `<div style="color: #00D2FF; margin-top: 2px;"><i class="fa-paper-plane fa-solid"></i> <strong>Telegram:</strong> ${escapeHtml(r.telegram)}</div>` : ''}
                  </div>
                ` : `
                  <div style="background: rgba(255,255,255,0.02); border: 1px dashed var(--border-color); padding: 8px 12px; border-radius: 10px; font-size: 12px; color: var(--text-muted); display: flex; justify-content: space-between; align-items: center;">
                    <span>🔒 Kontaktlar yashiringan</span>
                    <button class="btn btn-success btn-sm" onclick="unlockCandidateContact(${r.id})" style="font-weight: 700;">
                      <i class="fa-solid fa-key"></i> Kontaktni Ko'rish
                    </button>
                  </div>
                `}
              </div>

              <div style="display: flex; gap: 6px; flex-wrap: wrap; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 10px;">
                <button class="btn btn-primary btn-sm" onclick="openResumePdfPreviewModal(${r.id})" style="flex: 1; font-weight: 600;">
                  <i class="fa-solid fa-file-pdf"></i> 📄 Resume PDF (Bepul)
                </button>
                <button class="btn btn-outline btn-sm" onclick="openResumeDetailModal(${r.id})" style="flex: 1;">
                  <i class="fa-solid fa-eye"></i> Batafsil
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    `;
  } catch (err) {
    console.error('loadHrMatchingResumesTab error:', err);
  }
}

function filterHrResumesByVacancy(vacId) {
  state.selectedHrVacancyId = vacId;
  loadHrMatchingResumesTab();
}

async function unlockCandidateContact(resumeId) {
  try {
    const res = await fetch('/api/hr/unlock-contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: state.user.userId,
        resumeId,
        vacancyId: state.selectedHrVacancyId || null
      }),
    });

    const data = await res.json();
    if (data.requiresPayment) {
      openBuyContactPackModal(data.packPrice || 20000, data.packCount || 20);
      return;
    }

    if (!data.success) {
      showToast(data.error || 'Xatolik yuz berdi', 'error');
      return;
    }

    if (data.alreadyUnlocked) {
      showToast('Kontakt allaqachon ochilgan');
      updateContactBlockInUi(resumeId, data.phone, data.telegram);
      return;
    }

    showToast(`✅ ${data.message}`);
    updateContactBlockInUi(resumeId, data.phone, data.telegram);
    loadHrMatchingResumesTab();
  } catch (err) {
    console.error('unlockCandidateContact error:', err);
  }
}

function updateContactBlockInUi(resumeId, phone, telegram) {
  const block = document.getElementById(`contact-info-block-${resumeId}`);
  if (block) {
    block.innerHTML = `
      <div style="background: rgba(52, 211, 153, 0.1); border: 1px solid rgba(52, 211, 153, 0.25); padding: 10px 12px; border-radius: 10px; font-size: 13px;">
        <div style="color: #34d399; font-weight: 700; margin-bottom: 4px;"><i class="fa-solid fa-lock-open"></i> Kontakt Ma'lumotlari Ochiq:</div>
        <div style="color: #fff;"><i class="fa-solid fa-phone"></i> <strong>Tel:</strong> ${escapeHtml(phone)}</div>
        ${telegram ? `<div style="color: #00D2FF; margin-top: 2px;"><i class="fa-paper-plane fa-solid"></i> <strong>Telegram:</strong> ${escapeHtml(telegram)}</div>` : ''}
      </div>
    `;
  }
}

async function openBuyContactPackModal(price = 20000, count = 20) {
  try {
    const pInfoRes = await fetch('/api/payments/info');
    const pInfo = await pInfoRes.json();

    const html = `
      <div style="padding: 4px 0;">
        <div style="text-align: center; margin-bottom: 12px;">
          <div style="font-size: 44px; margin-bottom: 8px;">📞</div>
          <h3 style="font-size: 17px; font-weight: 700;">Kontaktlar Limiti Tugadi</h3>
          <p style="font-size: 13px; color: var(--text-muted);">
            Siz 20 ta bepul kontaktni ko'rish limitidan foydalandingiz. Qo'shimcha <strong>${count} ta nomzod kontaktini</strong> ochish uchun paket sotib oling.
          </p>
        </div>

        <div style="background: linear-gradient(135deg, rgba(52, 211, 153, 0.12), rgba(0, 210, 255, 0.12)); border: 1px solid rgba(52, 211, 153, 0.3); border-radius: 14px; padding: 14px; margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-weight: 700; color: #fff; font-size: 15px;">📦 ${count} ta Nomzod Kontakti Paketi</span>
            <span style="font-size: 18px; font-weight: 800; color: #34d399;">${price.toLocaleString('uz-UZ')} so'm</span>
          </div>
          <div style="font-size: 12px; color: var(--text-muted);">Karta raqami: <strong>${escapeHtml(pInfo.card_number || '0000 0000 0000 0000')}</strong> (${escapeHtml(pInfo.card_owner || 'Karta Egasi')})</div>
        </div>

        <form id="contact-pack-payment-form" style="display: flex; flex-direction: column; gap: 10px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label style="font-size: 12px;">📸 To'lov Cheki (Skrinshot / Rasm):</label>
            <input type="file" name="check_photo" accept="image/*" class="form-control" required style="font-size: 12px;">
          </div>
          <button type="submit" class="btn btn-success btn-block" style="padding: 10px; font-weight: 700;">
            <i class="fa-solid fa-paper-plane"></i> Chekni Yuborish (${price.toLocaleString('uz-UZ')} so'm)
          </button>
        </form>
      </div>
    `;

    openModal("📞 Kontakt Paketini Sotib Olish", html);

    document.getElementById('contact-pack-payment-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const formData = new FormData(form);
      formData.append('userId', state.user.userId);
      formData.append('userType', 'hr');
      formData.append('serviceType', 'contact_pack');
      formData.append('amount', price);

      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Yuborilmoqda...';

      try {
        const uploadRes = await fetch('/api/payments/upload', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          closeModal();
          openModal(
            '✅ Chek Qabul Qilindi',
            `
            <div style="text-align: center; padding: 20px 10px;">
              <div style="font-size: 44px; color: #34d399; margin-bottom: 10px;"><i class="fa-solid fa-circle-check"></i></div>
              <h3 style="font-size: 17px; font-weight: 700; margin-bottom: 8px;">To'lov Cheki Qabul Qilindi!</h3>
              <p style="font-size: 13px; color: var(--text-muted); line-height: 1.5; margin-bottom: 20px;">
                To'lovingiz admin tomonidan 10-20 daqiqada tasdiqlangach, hisobingizga <strong>+${count} ta kontaktlar</strong> qo'shiladi va Telegram bot orqali xabar jo'natiladi.
              </p>
              <button class="btn btn-primary" onclick="closeModal(); switchTab('resumes');">Tushunarli</button>
            </div>
            `
          );
        } else {
          showToast(uploadData.error || 'Xatolik yuz berdi', 'error');
          btn.disabled = false;
          btn.innerHTML = 'Chekni Yuborish';
        }
      } catch (err) {
        showToast('Xatolik yuz berdi', 'error');
        btn.disabled = false;
        btn.innerHTML = 'Chekni Yuborish';
      }
    });
  } catch (err) {
    console.error('openBuyContactPackModal error:', err);
  }
}

function openResumePdfPreviewModal(resumeId) {
  const pdfUrl = `/api/candidate/resumes/${resumeId}/pdf?userId=${state.user?.userId || ''}`;
  const html = `
    <div style="padding: 2px 0;">
      <div style="background: rgba(0, 102, 255, 0.08); border: 1px solid rgba(0, 102, 255, 0.2); border-radius: 10px; padding: 10px 12px; font-size: 12px; color: var(--text-muted); margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <span>📄 <strong>PDF Ko'rish:</strong> Bepul va cheksiz. Nomzodning professional tajribasi va ko'nikmalari ko'rsatilgan.</span>
        <button class="btn btn-success btn-sm" onclick="unlockCandidateContact(${resumeId})" style="font-weight: 700;">
          <i class="fa-solid fa-key"></i> Kontaktni Ko'rish
        </button>
      </div>

      <div style="width: 100%; height: 72vh; min-height: 480px; border-radius: 12px; overflow: hidden; border: 1px solid var(--border-color); background: #1e293b;">
        <iframe src="${pdfUrl}" style="width: 100%; height: 100%; border: none;"></iframe>
      </div>
    </div>
  `;

  openModal('📄 Resume PDF Viewer', html);
}

async function loadCandidateMyResumesTab() {
  const container = document.getElementById('resumes-list');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 40px 0;">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 28px; color: var(--primary);"></i>
      <p style="color: var(--text-muted); font-size: 13px; margin-top: 10px;">Mening rezyumelarim yuklanmoqda...</p>
    </div>
  `;

  try {
    const res = await fetch(`/api/candidate/resumes?userId=${state.user.userId}`);
    const data = await res.json();
    if (!data.success) {
      container.innerHTML = `
        <div class="profile-card" style="padding: 30px; text-align: center; color: var(--text-muted);">
          Rezyumelarni yuklashda xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.
        </div>
      `;
      return;
    }

    const list = data.resumes || [];
    const countBadge = document.getElementById('resumes-count');
    if (countBadge) countBadge.textContent = list.length;

    window._myResumesMap = {};
    list.forEach(r => {
      window._myResumesMap[r.id] = {
        fullName: r.full_name,
        position: r.position,
        city: r.city,
        experienceYears: r.experience_years,
        expectedSalary: r.expected_salary,
        employmentType: r.employment_type,
        aboutMe: r.about_me,
        skills: r.skills,
        experienceDetails: r.experience_details,
        education: r.education,
        languages: r.languages,
        cand_phone: r.cand_phone,
        pdfData: r.pdf_data ? (typeof r.pdf_data === 'string' ? JSON.parse(r.pdf_data) : r.pdf_data) : {}
      };
    });

    if (!list.length) {
      container.innerHTML = `
        <div style="background: rgba(255,255,255,0.02); border: 1px dashed var(--border-color); border-radius: 16px; padding: 40px 20px; text-align: center;">
          <i class="fa-solid fa-file-circle-plus" style="font-size: 48px; color: #0066FF; margin-bottom: 16px;"></i>
          <h4 style="font-size: 16px; font-weight: 700; margin-bottom: 8px;">${t('no_resume_title')}</h4>
          <p style="font-size: 13px; color: var(--text-muted); max-width: 360px; margin: 0 auto 20px;">
            ${t('no_resume_desc')}
          </p>
          <button class="btn btn-primary" onclick="openCreateResumeModal()">
            <i class="fa-solid fa-plus"></i> ${t('btn_new_resume')}
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
        <div>
          <h3 style="font-size: 16px; font-weight: 700; margin: 0;">${t('my_resumes_title')} (${list.length})</h3>
          <p style="font-size: 12px; color: var(--text-muted); margin: 2px 0 0 0;">${t('my_resumes_subtitle')}</p>
        </div>
        <button class="btn btn-success btn-sm" onclick="openCreateResumeModal()" style="font-weight: 700;">
          <i class="fa-solid fa-plus"></i> ${t('btn_new_resume')}
        </button>
      </div>

      <div class="cards-grid">
        ${list.map(r => {
          const createdStr = r.created_at ? new Date(r.created_at).toLocaleDateString(state.lang === 'ru' ? 'ru-RU' : 'uz-UZ') : '—';
          const updatedStr = r.updated_at ? new Date(r.updated_at).toLocaleDateString(state.lang === 'ru' ? 'ru-RU' : 'uz-UZ') : '';
          const statusBadge = r.status === 'active' || r.status === 'approved' 
            ? `<span class="badge badge-candidate">✅ ${state.lang === 'ru' ? 'АКТИВЕН' : 'AKTIV'}</span>` 
            : (r.status === 'pending' ? `<span class="badge badge-guest">⏳ ${state.lang === 'ru' ? 'НА ПРОВЕРКЕ' : 'TEKSHIRILMOQDA'}</span>` : `<span class="badge badge-guest">${r.status.toUpperCase()}</span>`);

          return `
            <div class="card" style="cursor: default; padding: 16px; position: relative;">
              <div class="card-header" style="margin-bottom: 8px;">
                <div>
                  <div class="card-title" style="font-size: 16px; font-weight: 700; color: #fff;">${escapeHtml(r.position)}</div>
                  <div style="font-size: 12px; color: #00D2FF; font-weight: 600; margin-top: 2px;">📂 ${escapeHtml(r.category || 'Boshqa')}</div>
                </div>
                ${statusBadge}
              </div>

              <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 12px; display: flex; flex-direction: column; gap: 4px;">
                <div>💵 <strong>${t('label_salary')}</strong> ${escapeHtml(r.expected_salary)} | 📍 <strong>${t('label_city')}</strong> ${escapeHtml(r.city || 'Toshkent')}</div>
                <div>💼 <strong>${t('label_exp')}</strong> ${escapeHtml(r.experience_years)} | ⏱️ <strong>${t('label_emptype')}</strong> ${escapeHtml(r.employment_type || 'To\'liq')}</div>
                <div style="font-size: 11px; color: var(--text-dim); margin-top: 4px;">
                  📅 ${t('label_created')} ${createdStr} ${updatedStr ? `| ✏️ ${t('label_last_edit')} ${updatedStr}` : ''}
                </div>
              </div>

              <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 10px;">
                <button class="btn btn-outline btn-sm" onclick="editCandidateResume(${r.id})" title="${t('btn_edit')}">
                  <i class="fa-solid fa-pen-to-square"></i> ${t('btn_edit')}
                </button>
                <button class="btn btn-primary btn-sm" onclick="openResumeDetailModal(${r.id})" title="${t('btn_view')}">
                  <i class="fa-solid fa-eye"></i> ${t('btn_view')}
                </button>
                <button class="btn btn-success btn-sm" onclick="checkMatchingVacanciesOffer(${r.id})" title="${t('btn_send_hr')}">
                  <i class="fa-solid fa-paper-plane"></i> ${t('btn_send_hr')}
                </button>
                <button class="btn btn-outline btn-sm" onclick="openResumeSendsStatusModal(${r.id})" title="${t('btn_statuses')}">
                  <i class="fa-solid fa-chart-line"></i> ${t('btn_statuses')}
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteResume(${r.id})" title="O'chirish">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } catch (err) {
    console.error('loadCandidateMyResumesTab error:', err);
  }
}

async function editCandidateResume(resumeId) {
  try {
    const res = await fetch(`/api/resumes/${resumeId}`);
    const data = await res.json();
    if (!data.success || !data.resume) return showToast('Rezyume topilmadi', 'error');

    const r = data.resume;
    state.editingResumeId = r.id;

    openCreateResumeModal();

    setTimeout(() => {
      const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
      setVal('res-category-input', r.category);
      setVal('res-position', r.position);
      setVal('res-city', r.city);
      setVal('res-exp', r.experience_years);
      setVal('res-salary', r.expected_salary);
      setVal('res-emptype', r.employment_type);
      setVal('res-aboutme', r.about_me);
      setVal('res-skills', r.skills);
      setVal('res-rawtext', r.raw_text);

      const pdfData = r.pdf_data ? (typeof r.pdf_data === 'string' ? JSON.parse(r.pdf_data) : r.pdf_data) : {};
      setVal('res-pdf-photo', pdfData.photo || '');
      const previewBox = document.getElementById('photo-preview-box');
      if (previewBox && pdfData.photo) {
        previewBox.innerHTML = `<img src="${pdfData.photo}" style="width:100%;height:100%;object-fit:cover;">`;
      }
      setVal('res-pdf-phone', pdfData.phone || '');
      setVal('res-pdf-telegram', pdfData.telegram || '');
      setVal('res-pdf-age', pdfData.age || '');
      setVal('res-pdf-languages', pdfData.languages || '');
      setVal('res-pdf-workhistory', pdfData.workHistory || '');
      setVal('res-pdf-eduhistory', pdfData.eduHistory || '');
      setVal('res-pdf-projects', pdfData.projects || '');
      setVal('res-pdf-interests', pdfData.interests || '');
      setVal('res-pdf-additional', pdfData.additionalInfo || '');

      const lockBanner = document.getElementById('res-lock-banner');
      if (lockBanner) lockBanner.style.display = 'none';
      const fieldsWrapper = document.getElementById('res-fields-wrapper');
      if (fieldsWrapper) {
        fieldsWrapper.classList.remove('locked');
        fieldsWrapper.querySelectorAll('input, select, textarea, button').forEach(el => el.disabled = false);
      }

      const badge = document.getElementById('res-selected-cat-badge');
      if (badge) {
        badge.textContent = r.category || 'Tanlangan';
        badge.className = 'badge badge-candidate';
      }
    }, 150);
  } catch (err) {
    console.error('editCandidateResume error:', err);
  }
}

async function checkMatchingVacanciesOffer(resumeId) {
  try {
    const res = await fetch(`/api/candidate/resumes/${resumeId}/matching-vacancies?userId=${state.user.userId}`);
    const data = await res.json();
    if (!data.success) return;

    const count = data.matchingCount || 0;
    const price = data.price || 20000;
    const resume = data.resume;

    if (count === 0) {
      openModal(
        '🎉 Rezyume Saqlandi',
        `
        <div style="text-align: center; padding: 20px 10px;">
          <div style="font-size: 44px; margin-bottom: 12px;">🎉</div>
          <h3 style="font-size: 17px; font-weight: 700; margin-bottom: 8px;">Rezyumeingiz muvaffaqiyatli saqlandi!</h3>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">
            Hozirda sizning rezyumeingizga mos faol vakansiyalar topilmadi. Yangi vakansiyalar qo'shilganda HR'lar rezyumeingizni ko'rishlari mumkin.
          </p>
          <button class="btn btn-primary" onclick="closeModal(); switchTab('resumes');">Tushunarli</button>
        </div>
        `
      );
      return;
    }

    const offerHtml = `
      <div style="text-align: center; padding: 10px 0;">
        <div style="font-size: 40px; margin-bottom: 10px;">🎉</div>
        <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 6px;">Rezyumeingiz Muvaffaqiyatli Yaratildi!</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
          Tizim rezyumeingizni tahlil qildi va mos ish o'rinlarini aniqladi.
        </p>

        <div style="background: linear-gradient(135deg, rgba(0, 102, 255, 0.12), rgba(0, 210, 255, 0.12)); border: 1px solid rgba(0, 102, 255, 0.3); border-radius: 14px; padding: 16px; margin-bottom: 18px; text-align: left;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <i class="fa-solid fa-bullseye" style="font-size: 24px; color: #00D2FF;"></i>
            <div>
              <div style="font-weight: 700; font-size: 15px; color: #fff;">
                Sizning Rezyumeingizga mos <span style="color: #00D2FF; font-size: 17px;">${count} ta faol vakansiya</span> topildi!
              </div>
              <div style="font-size: 12px; color: var(--text-muted);">
                Hozirda <strong>${escapeHtml(resume.position)}</strong> lavozimi bo'yicha ${count} ta HR nomzod qidirmoqda.
              </div>
            </div>
          </div>
          <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 10px 0;">
          <div style="font-size: 13px; color: #cbd5e1; line-height: 1.5;">
            Ushbu vakansiyalar bo'yicha Rezyumeingizni to'g'ridan-to'g'ri HR'larga yuborishimiz mumkin.
          </div>
          <div style="font-size: 15px; font-weight: 700; color: #34d399; margin-top: 8px;">
            Xizmat narxi: ${price.toLocaleString('uz-UZ')} so'm
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button class="btn btn-primary btn-block" style="padding: 12px; font-size: 14px; font-weight: 700;" onclick="confirmHrSendOffer(${resumeId})">
            🎯 Rezyume'ni HR'larga Yuborish — ${price.toLocaleString('uz-UZ')} so'm
          </button>
          <button class="btn btn-outline btn-block" onclick="closeModal(); switchTab('resumes');">
            Keyinroq
          </button>
        </div>
      </div>
    `;

    openModal("🎯 HR'larga Rezyume Yuborish Taklifi", offerHtml);
  } catch (err) {
    console.error('checkMatchingVacanciesOffer error:', err);
  }
}

async function confirmHrSendOffer(resumeId) {
  try {
    const res = await fetch(`/api/candidate/resumes/${resumeId}/matching-vacancies?userId=${state.user.userId}`);
    const data = await res.json();
    if (!data.success || !data.vacancies.length) {
      showToast('Mos vakansiyalar topilmadi', 'error');
      return;
    }

    const price = data.price || 20000;
    const vacancies = data.vacancies;

    const html = `
      <div style="padding: 6px 0;">
        <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 6px;">🎯 Nomzod Tasdiqlash</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">
          Sizning Rezyumeingiz quyidagi faol vakansiyalarni bergan HR'larga yuboriladi:
        </p>

        <div style="max-height: 220px; overflow-y: auto; background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 12px; padding: 12px; margin-bottom: 14px;">
          ${vacancies.map((v, i) => `
            <div style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="color: #fff;">${i + 1}. ${escapeHtml(v.title)}</strong>
                <div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(v.hr_company_name || 'Kompaniya')} • 📍 ${escapeHtml(v.location || 'Toshkent')}</div>
              </div>
              <div style="font-size: 12px; color: #34d399; font-weight: 600;">${escapeHtml(v.salary)}</div>
            </div>
          `).join('')}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0, 102, 255, 0.08); padding: 12px 14px; border-radius: 10px; margin-bottom: 16px;">
          <div>
            <div style="font-size: 12px; color: var(--text-muted);">Jami: <strong>${vacancies.length} ta HR</strong></div>
            <div style="font-size: 14px; font-weight: 700; color: #00D2FF;">Xizmat narxi:</div>
          </div>
          <div style="font-size: 18px; font-weight: 800; color: #34d399;">
            ${price.toLocaleString('uz-UZ')} so'm
          </div>
        </div>

        <div style="display: flex; gap: 8px;">
          <button class="btn btn-outline" style="flex: 1;" onclick="closeModal()">Bekor qilish</button>
          <button class="btn btn-success" style="flex: 2; font-weight: 700;" onclick="proceedToPaymentForHrSend(${resumeId})">
            💳 Davom etish va To'lov qilish
          </button>
        </div>
      </div>
    `;

    openModal("📋 Vakansiyalar va To'lov Tasdig'i", html);
  } catch (err) {
    console.error('confirmHrSendOffer error:', err);
  }
}

async function proceedToPaymentForHrSend(resumeId) {
  try {
    const res = await fetch(`/api/candidate/resumes/${resumeId}/create-send-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: state.user.userId }),
    });
    const data = await res.json();
    if (!data.success) {
      showToast(data.error || 'Xatolik yuz berdi', 'error');
      return;
    }

    const sendId = data.sendId;
    const amount = data.amount;
    const count = data.vacanciesCount;

    const pInfoRes = await fetch('/api/payments/info');
    const pInfo = await pInfoRes.json();

    const paymentHtml = `
      <div style="padding: 4px 0;">
        <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 4px;">💳 To'lov Qilish — HR'larga Rezyume Yuborish</h3>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 14px;">
          Rezyumeingiz <strong>${count} ta HR</strong>ga yuborilishi uchun quyidagi kartaga to'lovni amalga oshiring va chek rasmini yuklang:
        </p>

        <div style="background: rgba(255,255,255,0.04); border: 1px solid var(--border-color); border-radius: 12px; padding: 14px; margin-bottom: 14px;">
          <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Karta raqami:</div>
          <div style="font-size: 18px; font-weight: 800; letter-spacing: 1px; color: #00D2FF; margin-bottom: 8px;">
            ${escapeHtml(pInfo.card_number || '0000 0000 0000 0000')}
          </div>
          <div style="font-size: 12px; color: var(--text-muted);">Egalari: <strong>${escapeHtml(pInfo.card_owner || 'Karta Egasi')}</strong></div>
          <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 8px 0;">
          <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 700;">
            <span>To'lanishi kerak:</span>
            <span style="color: #34d399;">${amount.toLocaleString('uz-UZ')} so'm</span>
          </div>
        </div>

        <form id="hr-send-payment-form" style="display: flex; flex-direction: column; gap: 10px;">
          <input type="hidden" name="sendId" value="${sendId}">
          <input type="hidden" name="amount" value="${amount}">
          <div class="form-group" style="margin-bottom: 0;">
            <label style="font-size: 12px;">📸 To'lov Cheki (Skrinshot / Rasm):</label>
            <input type="file" name="check_photo" accept="image/*" class="form-control" required style="font-size: 12px;">
          </div>
          <button type="submit" class="btn btn-success btn-block" style="padding: 10px; font-weight: 700; margin-top: 6px;">
            <i class="fa-solid fa-paper-plane"></i> Chekni Yuborish
          </button>
        </form>
      </div>
    `;

    openModal('💳 To\'lov Ma\'lumotlari', paymentHtml);

    document.getElementById('hr-send-payment-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const formData = new FormData(form);
      formData.append('userId', state.user.userId);
      formData.append('userType', 'candidate');
      formData.append('serviceType', 'resume_send');
      formData.append('targetId', sendId);

      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Yuborilmoqda...';

      try {
        const uploadRes = await fetch('/api/payments/upload', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          closeModal();
          openModal(
            '✅ Chek Qabul Qilindi',
            `
            <div style="text-align: center; padding: 20px 10px;">
              <div style="font-size: 44px; color: #34d399; margin-bottom: 10px;"><i class="fa-solid fa-circle-check"></i></div>
              <h3 style="font-size: 17px; font-weight: 700; margin-bottom: 8px;">To'lov Cheki Qabul Qilindi!</h3>
              <p style="font-size: 13px; color: var(--text-muted); line-height: 1.5; margin-bottom: 20px;">
                To'lovingiz 10-20 daqiqa ichida admin tomonidan tasdiqlanadi va Rezyumeingiz <strong>${count} ta HR</strong>ga yuboriladi. Telegram bot orqali bildirishnoma olasiz.
              </p>
              <button class="btn btn-primary" onclick="closeModal(); switchTab('resumes');">Tushunarli</button>
            </div>
            `
          );
        } else {
          showToast(uploadData.error || 'Xatolik yuz berdi', 'error');
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Chekni Yuborish';
        }
      } catch (err) {
        showToast('Xatolik yuz berdi', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Chekni Yuborish';
      }
    });
  } catch (err) {
    console.error('proceedToPaymentForHrSend error:', err);
  }
}

async function openResumeSendsStatusModal(resumeId) {
  try {
    const res = await fetch(`/api/candidate/resumes/${resumeId}/sends-status?userId=${state.user.userId}`);
    const data = await res.json();
    if (!data.success) return showToast('Ma\'lumot yuklanmadi', 'error');

    const items = data.items || [];
    const html = `
      <div style="padding: 4px 0;">
        <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 6px;">📊 Rezyume Yuborilgan HR'lar Statusi</h3>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 14px;">
          Ushbu rezyumeingiz yuborilgan vakansiyalar va ularning holati:
        </p>

        ${!items.length ? `
          <div style="text-align: center; color: var(--text-muted); padding: 20px; font-size: 13px; background: rgba(255,255,255,0.02); border-radius: 10px;">
            Hali bu rezyume HR'larga yuborilmagan.
          </div>
        ` : `
          <div style="max-height: 280px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">
            ${items.map(item => `
              <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 10px; padding: 10px 12px; font-size: 13px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-weight: 700; color: #fff;">${escapeHtml(item.vacancy_title)}</div>
                  <div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(item.company_name || 'Kompaniya')} • ${escapeHtml(item.location || '')}</div>
                  <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">📅 Yuborilgan: ${new Date(item.sent_at || item.created_at).toLocaleDateString('uz-UZ')}</div>
                </div>
                <div>
                  <span class="badge ${item.status === 'sent' ? 'badge-candidate' : 'badge-guest'}">
                    ${item.status === 'sent' ? 'Yuborildi ✅' : 'Yuborilmoqda ⏳'}
                  </span>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;

    openModal('📊 Rezyume Yuborilgan HR\'lar', html);
  } catch (err) {
    console.error('openResumeSendsStatusModal error:', err);
  }
}

function renderResumesFeed(resumes) {
  const container = document.getElementById('resumes-list');
  if (!resumes.length) {
    container.innerHTML = `
      <div class="profile-card" style="padding: 30px 16px;">
        <i class="fa-solid fa-file-user" style="font-size: 36px; color: var(--text-dim); margin-bottom: 12px;"></i>
        <p style="color: var(--text-muted); font-size: 14px;">Hozircha rezyumelar mavjud emas</p>
      </div>
    `;
    return;
  }

  container.innerHTML = resumes.map(r => `
    <div class="card" onclick="openResumeDetailModal(${r.id})">
      <div class="card-header">
        <div class="card-title">${escapeHtml(r.position)}</div>
        <div class="card-salary">${escapeHtml(r.expected_salary)}</div>
      </div>
      <div class="card-company">
        <i class="fa-solid fa-user-tie" style="color:#0066FF;"></i> ${escapeHtml(r.full_name)}
      </div>
      <div class="card-tags">
        <span class="tag-item"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(r.city || 'Toshkent')}</span>
        <span class="tag-item"><i class="fa-solid fa-briefcase"></i> Tajriba: ${escapeHtml(r.experience_years)}</span>
        ${r.category ? `<span class="tag-item"><i class="fa-solid fa-folder"></i> ${escapeHtml(r.category)}</span>` : ''}
      </div>
    </div>
  `).join('');
}

async function openResumeDetailModal(resumeId) {
  try {
    const res = await fetch(`/api/resumes/${resumeId}`);
    const data = await res.json();
    if (!data.success) return showToast('Rezyume topilmadi', 'error');

    const r = data.resume;

    let bodyHtml = `
      <div style="margin-bottom: 16px;">
        <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 4px;">${escapeHtml(r.position)}</h2>
        <div style="font-size: 14px; color: #34d399; font-weight: 700; margin-bottom: 12px;">Maosh: ${escapeHtml(r.expected_salary)}</div>
        
        <div class="card-tags" style="margin-bottom: 16px;">
          <span class="tag-item"><i class="fa-solid fa-user"></i> ${escapeHtml(r.full_name)}</span>
          <span class="tag-item"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(r.city || 'Toshkent')}</span>
          <span class="tag-item"><i class="fa-solid fa-briefcase"></i> ${escapeHtml(r.experience_years)}</span>
        </div>

        ${r.creation_type === 'manual' && r.raw_text ? `
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 12px; border-radius: 12px; font-size: 13px; white-space: pre-wrap; line-height: 1.5; color: #cbd5e1;">
            ${escapeHtml(r.raw_text)}
          </div>
        ` : `
          ${r.about_me ? `<div style="margin-bottom: 10px;"><strong>📝 Haqida:</strong><p style="font-size: 13px; color: #cbd5e1;">${escapeHtml(r.about_me)}</p></div>` : ''}
          ${r.skills ? `<div style="margin-bottom: 10px;"><strong>🧠 Ko'nikmalar:</strong><p style="font-size: 13px; color: #cbd5e1;">${escapeHtml(r.skills)}</p></div>` : ''}
          ${r.experience_details ? `<div style="margin-bottom: 10px;"><strong>💼 Tajriba tafsiloti:</strong><p style="font-size: 13px; color: #cbd5e1;">${escapeHtml(r.experience_details)}</p></div>` : ''}
          ${r.education ? `<div style="margin-bottom: 10px;"><strong>🎓 Ta'lim:</strong><p style="font-size: 13px; color: #cbd5e1;">${escapeHtml(r.education)}</p></div>` : ''}
          ${r.languages ? `<div style="margin-bottom: 10px;"><strong>🌐 Tillar:</strong><p style="font-size: 13px; color: #cbd5e1;">${escapeHtml(r.languages)}</p></div>` : ''}
        `}

        <div style="margin-top: 20px; display: flex; gap: 8px; flex-wrap: wrap;">
          <a href="tel:${(r.cand_phone || '').replace(/[^+\d]/g, '')}" class="btn btn-primary"><i class="fa-solid fa-phone"></i> Qo'ng'iroq Qilish (${escapeHtml(r.cand_phone)})</a>
          <button class="btn btn-outline" onclick="downloadResumePdfById(${r.id})"><i class="fa-solid fa-file-pdf"></i> 📄 PDF Yuklab Olish</button>
        </div>
      </div>
    `;

    openModal(`Rezyume #${r.id}`, bodyHtml);
  } catch (err) {
    showToast('Xatolik yuz berdi', 'error');
  }
}

// ── TAB 3: Render Cabinet ─────────────────────────────────────────────────────
function renderCabinetTab() {
  const container = document.getElementById('cabinet-view-container');
  if (!container) return;

  // If no role selected or selected HR but not registered
  if (state.selectedRoleMode === 'hr') {
    if (!state.user.hr) {
      container.innerHTML = `
        <div class="profile-card">
          <div class="avatar-icon"><i class="fa-solid fa-building-user"></i></div>
          <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 6px;">👔 HR Kompaniya Ro'yxatdan O'tish</h2>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">Vakansiya e'lon qilish va nomzodlar arizalarini olish uchun kompaniyangizni ro'yxatdan o'tkazing:</p>
          <button class="btn btn-primary" onclick="openRegisterModal('hr')"><i class="fa-solid fa-check"></i> HR Sifatida Ro'yxatdan O'tish</button>
          <button class="btn btn-outline" onclick="openRoleSelectionModal()" style="margin-top: 10px;"><i class="fa-solid fa-arrows-rotate"></i> Rolni O'zgartirish</button>
        </div>
      `;
      return;
    }

    const hr = state.user.hr;
    container.innerHTML = `
      <div class="profile-card">
        <div class="avatar-icon"><i class="fa-solid fa-building"></i></div>
        <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 2px;">${escapeHtml(hr.company_name || 'HR Kompaniya')}</h2>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;"><i class="fa-solid fa-phone"></i> ${escapeHtml(hr.phone || '')}</p>
        
        <div class="stats-grid">
          <div class="stat-box">
            <div class="num">${hr.tokens || 0}</div>
            <div class="label">Qolgan Tokenlar</div>
          </div>
          <div class="stat-box">
            <div class="num" style="color: ${hr.is_active ? '#34d399' : '#ef4444'};">${hr.is_active ? 'Aktiv' : 'Nofaol'}</div>
            <div class="label">Obuna Holati</div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 14px;">
          <button class="btn btn-primary" onclick="openCreateVacancyModal()"><i class="fa-solid fa-plus-circle"></i> ⚡ Yangi Vakansiya Yaratish (1-Minut)</button>
          <button class="btn btn-outline" onclick="openBuyTokensModal('hr')"><i class="fa-solid fa-ticket"></i> Token Paketini Sotib Olish</button>
          <button class="btn btn-outline" onclick="openRoleSelectionModal()"><i class="fa-solid fa-arrows-rotate"></i> 👤 Nomzod Rejimiga O'tish</button>
        </div>
      </div>
    `;
    return;
  }

  if (state.selectedRoleMode === 'candidate' || state.user.role === 'candidate') {
    if (!state.user.candidate) {
      container.innerHTML = `
        <div class="profile-card">
          <div class="avatar-icon"><i class="fa-solid fa-user-tie"></i></div>
          <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 6px;">👤 Nomzod Ro'yxatdan O'tish</h2>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">Vakansiyalarga 1-click ariza berish va rezyume joylashtirish uchun ma'lumotlaringizni kiring:</p>
          <button class="btn btn-success" onclick="openRegisterModal('candidate')"><i class="fa-solid fa-check"></i> Nomzod Sifatida Ro'yxatdan O'tish</button>
          <button class="btn btn-outline" onclick="openRoleSelectionModal()" style="margin-top: 10px;"><i class="fa-solid fa-arrows-rotate"></i> Rolni O'zgartirish</button>
        </div>
      `;
      return;
    }

    const cand = state.user.candidate;
    container.innerHTML = `
      <div class="profile-card">
        <div class="avatar-icon"><i class="fa-solid fa-user-tie"></i></div>
        <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 2px;">${escapeHtml(cand.full_name || 'Nomzod')}</h2>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;"><i class="fa-solid fa-phone"></i> ${escapeHtml(cand.phone || '')}</p>
        
        <div class="stats-grid">
          <div class="stat-box">
            <div class="num">${cand.tokens || 0}</div>
            <div class="label">Qolgan Tokenlar</div>
          </div>
          <div class="stat-box">
            <div class="num" style="color: ${cand.is_active ? '#34d399' : '#ef4444'};">${cand.is_active ? 'Aktiv' : 'Nofaol'}</div>
            <div class="label">Obuna Holati</div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 14px;">
          <button class="btn btn-success" onclick="switchTab('resumes')"><i class="fa-solid fa-file-user"></i> 📄 Mening Rezyumelarim</button>
          <button class="btn btn-primary" onclick="openCreateResumeModal()"><i class="fa-solid fa-file-circle-plus"></i> ⚡ Yangi Rezyume Yaratish (1-Minut)</button>
          <button class="btn btn-outline" onclick="loadMySubmittedApplications()"><i class="fa-solid fa-paper-plane"></i> 📋 Topshirilgan Arizalarim</button>
          <button class="btn btn-outline" onclick="openBuyTokensModal('candidate')"><i class="fa-solid fa-ticket"></i> Token Paketini Sotib Olish</button>
          <button class="btn btn-outline" onclick="openRoleSelectionModal()"><i class="fa-solid fa-arrows-rotate"></i> 👔 HR Rejimiga O'tish</button>
        </div>
      </div>

      <div id="candidate-cabinet-subcontainer"></div>
    `;
    loadMySubmittedApplications();
    return;
  }

  // Default guest view: Show Role Selection cards
  container.innerHTML = `
    <div class="role-selection-card">
      <div class="welcome-header">
        <div class="welcome-logo-badge"><img src="logo-icon.svg" style="width:36px;"></div>
        <h3>JobHunt Portaliga Xush Kelibsiz!</h3>
        <p>Davom etish uchun o'zingizga mos rolni tanlang:</p>
      </div>

      <div class="role-options-grid">
        <div class="role-option-card hr-option" onclick="selectUserRoleMode('hr')">
          <div class="role-icon-box"><i class="fa-solid fa-building-user"></i></div>
          <div class="role-details">
            <h4>👔 HR (Ish Beruvchi) Bo'lib Kirish</h4>
            <p>Vakansiya e'lon qilish, nomzodlar arizalarini qabul qilish va mos rezyumelarni ko'rish</p>
          </div>
          <div class="role-arrow"><i class="fa-solid fa-chevron-right"></i></div>
        </div>

        <div class="role-option-card candidate-option" onclick="selectUserRoleMode('candidate')">
          <div class="role-icon-box"><i class="fa-solid fa-user-tie"></i></div>
          <div class="role-details">
            <h4>👤 Nomzod (Ish Qidiruvchi) Bo'lib Kirish</h4>
            <p>Vakansiyalarga 1-click ariza topshirish, rezyume joylash va ish beruvchilar bilan bog'lanish</p>
          </div>
          <div class="role-arrow"><i class="fa-solid fa-chevron-right"></i></div>
        </div>
      </div>
    </div>
  `;
}

// Registration Modal
function openRegisterModal(role) {
  const isHr = role === 'hr';
  const html = `
    <form id="register-form">
      <div class="form-group">
        <label>${isHr ? 'Kompaniya Nomi' : 'Ism Familiyangiz'}:</label>
        <input type="text" name="name" class="form-control" required placeholder="${isHr ? 'Artel Inc.' : 'Alisher Vohidov'}">
      </div>
      <div class="form-group">
        <label>Telefon Raqamingiz:</label>
        <input type="tel" name="phone" class="form-control" required placeholder="+998 90 123 45 67">
      </div>
      <button type="submit" class="btn btn-primary" style="margin-top: 10px;"><i class="fa-solid fa-check"></i> Saqlash</button>
    </form>
  `;

  openModal(isHr ? "HR Sifatida Ro'yxatdan O'tish" : "Nomzod Sifatida Ro'yxatdan O'tish", html);

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value.trim();
    const phone = form.phone.value.trim();

    const endpoint = isHr ? '/api/register/hr' : '/api/register/candidate';
    const bodyObj = { userId: state.user.userId, phone };
    if (isHr) bodyObj.companyName = name;
    else bodyObj.fullName = name;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyObj),
      });
      const data = await res.json();
      if (data.success) {
        closeModal();
        showToast('Muvaffaqiyatli ro\'yxatdan o\'tdingiz!');
        await authenticateUser();
        if (isHr) switchTab('cabinet');
        else switchTab('vacancies');
      } else {
        showToast(data.error || 'Xatolik', 'error');
      }
    } catch (err) {
      showToast('Xatolik yuz berdi', 'error');
    }
  });
}

// ── ⚡ HR: 1-MINUTE QUICK FILL & TEMPLATES ─────────────────────────────────────
const HR_VACANCY_PRESETS = {
  sotuv: {
    title: 'Sotuv menejeri (B2B / B2C)',
    category: 'Sotuv menejeri',
    salary: '4 000 000 — 8 000 000 so\'m + KPI bonus',
    location: 'Toshkent shahri, Chilonzor tumani',
    workTime: '9:00 — 18:00 (Dushanba–Juma)',
    tasks: '• Mijozlar bazasi bilan ishlash va yangi mijozlarni jalb qilish\n• Muzokaralar olib borish va shartnomalar tuzish\n• Sotuv voronkasini yuritish va rejani bajarish',
    requirements: '• Kamida 1 yil sotuv sohasida tajriba\n• Xushmuomalalik, muloqotga kirishuvchanlik\n• Rus va o\'zbek tillarida erkin so\'zlasha olish',
    conditions: '• Shinam ofis, bepul tushlik va korporativ aloqa\n• KPI bo\'yicha yuqori bonuslar va martaba o\'sishi',
  },
  callcenter: {
    title: 'Call-markaz operatori',
    category: 'Call-center operatori',
    salary: '3 500 000 — 6 000 000 so\'m',
    location: 'Toshkent shahri, Yunusobod tumani',
    workTime: '9:00 — 18:00 / Smenali grafik',
    tasks: '• Kiruvchi qo\'ng\'iroqlarga javob berish va mijozlarga konsultatsiya berish\n• Savollar va murojaatlarni bazaga kiritish',
    requirements: '• O\'zbek va rus tillarini a\'lo darajada bilish\n• Kompyuter savodxonligi va chidamli ish rejimi',
    conditions: '• Qulay ish jadvali va axil jamoa\n• Rasmiy ishga joylashish va o\'z vaqtida maosh',
  },
  admin: {
    title: 'Resepshn Administrator / Ofis menejer',
    category: 'Administrator',
    salary: '4 000 000 — 6 000 000 so\'m',
    location: 'Toshkent shahri, Mirzo Ulug\'bek tumani',
    workTime: '9:00 — 18:00 (5/2)',
    tasks: '• Ofisga kelgan mehmonlarni kutib olish va yo\'naltirish\n• Hujjatlar va kiruvchi qo\'ng\'iroqlarni tartibga solish',
    requirements: '• MS Office (Word, Excel) dasturlarini bilish\n• Xushmuomalalik va mas\'uliyatlilik',
    conditions: '• Zamonaviy ofis va bepul kofe/choy\n• Rasmiy mehnat daftarchasi',
  },
  smm: {
    title: 'SMM Mutaxassisi / Content Maker',
    category: 'SMM mutaxassisi',
    salary: '5 000 000 — 10 000 000 so\'m',
    location: 'Toshkent shahri (Gibrid / Ofis)',
    workTime: '10:00 — 19:00',
    tasks: '• Instagram va Telegram uchun kontent-plan tuzish\n• Reels va postlar tayyorlash, target reklama sozlash',
    requirements: '• Kamida 1 yil SMM tajribasi (portfolio mavjudligi)\n• Canva / Photoshop / CapCut dasturlarini bilish',
    conditions: '• Ijodiy erkinlik va gibrid ish rejimi\n• Loyihalar o\'sishiga qarab bonuslar',
  },
  dev: {
    title: 'Frontend / Fullstack Dasturchi',
    category: 'Dasturchi',
    salary: '8 000 000 — 18 000 000 so\'m',
    location: 'Toshkent shahri (IT Park) / Remote',
    workTime: '9:00 — 18:00 (Moslashuvchan)',
    tasks: '• Veb va mobil ilovalar interfeysini ishlab chiqish\n• API integratsiyalari va kodni optimallashtirish',
    requirements: '• JavaScript, React / Vue / Node.js bo\'yicha 2+ yil tajriba\n• Git va REST API lar bilan ishlash ko\'nikmasi',
    conditions: '• Zamonaviy IT ofis yoki masofaviy ish\n• Xalqaro loyihalarda ishlash imkoniyati',
  },
  kuryer: {
    title: 'Ekspress Kuryer (Avto / Moto / Piyoda)',
    category: 'Kuryer',
    salary: '5 000 000 — 10 000 000 so\'m',
    location: 'Toshkent shahri',
    workTime: 'Erkin grafik / Haftalik',
    tasks: '• Buyurtmalarni belgilangan manzilga tez va bexato yetkazish',
    requirements: '• Toshkent shahrini yaxshi bilish va mas\'uliyatlilik',
    conditions: '• Kunlik yoki haftalik to\'lovlar\n• Yoqilg\'i xarajatlari qoplanadi',
  },
};

const TITLE_SUGGESTIONS = {
  sotuv: [
    "Sotuv menejeri (B2B / B2C)",
    "B2B Sotuv menejeri",
    "Katta Sotuv Menejeri",
    "Sotuv Bo'limi Boshlig'i",
    "Telemarketolog",
    "Mijozlar bilan ishlash menejeri",
  ],
  callcenter: [
    "Call-markaz operatori",
    "Kiruvchi liniya operatori",
    "Chiquvchi liniya operatori",
    "Konsultant-operator",
    "Senior Call-Center Operator",
  ],
  admin: [
    "Resepshn Administrator",
    "Ofis Menejeri",
    "Kompaniya Administratori",
    "Kassir-Administrator",
    "Bosh Administrator",
  ],
  smm: [
    "SMM Mutaxassisi / Content Maker",
    "Targetolog",
    "Kopirayter",
    "Mobilograf",
    "SMM Menejer",
  ],
  dev: [
    "Frontend Dasturchi (React)",
    "Backend Dasturchi (Node.js)",
    "Fullstack Dasturchi",
    "Mobile Dasturchi (Flutter)",
    "QA Testchi",
  ],
  video: [
    "Video Montajchi",
    "Grafik Dizayner",
    "Motion Designer",
    "3D Vizualizator",
    "Videograf",
  ],
  agent: [
    "Savdo Agenti (Toshkent)",
    "Hududiy Savdo Agenti",
    "Supervayzer",
    "Merchendayzer",
  ],
  kuryer: [
    "Avto-Kuryer",
    "Moto-Kuryer",
    "Piyoda Kuryer",
    "Ekspress Kuryer",
  ],
  teacher: [
    "Ingliz tili o'qituvchisi",
    "Matematika o'qituvchisi",
    "IT Murabbiy / Mentor",
    "Boshlang'ich sinf o'qituvchisi",
    "Mental arifmetika o'qituvchisi",
  ],
  other: [
    "Loyiha Menejeri (Project Manager)",
    "HR Menejer / Rekruter",
    "Buxgalter / 1C",
    "Omborchi",
    "Qorovul / Xavfsizlik xodimi",
  ],
};

window.selectTitleChip = (chipEl, inputId, titleText) => {
  const input = document.getElementById(inputId);
  if (input) {
    input.value = titleText;
  }
  const parent = chipEl.parentElement;
  if (parent) {
    parent.querySelectorAll('.chip-item').forEach(c => c.classList.remove('selected'));
  }
  chipEl.classList.add('selected');
};

function openCreateVacancyModal() {
  const html = `
    <div class="category-picker-section">
      <div class="category-picker-title">
        <span><i class="fa-solid fa-list-check" style="color:#00D2FF;"></i> 1-Bosqich: Vakansiya Yo'nalishini Tanlang:</span>
        <span class="badge badge-guest" id="vac-selected-cat-badge">Tanlanmagan</span>
      </div>
      <div class="category-picker-grid">
        <div class="category-chip-btn" data-cat="Sotuv menejeri" onclick="selectVacCategory(this, 'sotuv')">
          <i class="fa-solid fa-briefcase"></i> <span>💼 Sotuv menejeri</span>
        </div>
        <div class="category-chip-btn" data-cat="Call-center operatori" onclick="selectVacCategory(this, 'callcenter')">
          <i class="fa-solid fa-phone"></i> <span>📞 Call-center</span>
        </div>
        <div class="category-chip-btn" data-cat="Administrator" onclick="selectVacCategory(this, 'admin')">
          <i class="fa-solid fa-building"></i> <span>🏢 Administrator</span>
        </div>
        <div class="category-chip-btn" data-cat="SMM mutaxassisi" onclick="selectVacCategory(this, 'smm')">
          <i class="fa-solid fa-mobile-screen"></i> <span>📱 SMM mutaxassisi</span>
        </div>
        <div class="category-chip-btn" data-cat="Dasturchi" onclick="selectVacCategory(this, 'dev')">
          <i class="fa-solid fa-code"></i> <span>💻 Dasturchi / IT</span>
        </div>
        <div class="category-chip-btn" data-cat="Video montajchi" onclick="selectVacCategory(this, 'video')">
          <i class="fa-solid fa-video"></i> <span>🎬 Video montajchi</span>
        </div>
        <div class="category-chip-btn" data-cat="Savdo agenti" onclick="selectVacCategory(this, 'agent')">
          <i class="fa-solid fa-truck-ramp-box"></i> <span>🚚 Savdo agenti</span>
        </div>
        <div class="category-chip-btn" data-cat="Kuryer" onclick="selectVacCategory(this, 'kuryer')">
          <i class="fa-solid fa-motorcycle"></i> <span>🛵 Kuryer</span>
        </div>
        <div class="category-chip-btn" data-cat="O‘qituvchi" onclick="selectVacCategory(this, 'teacher')">
          <i class="fa-solid fa-chalkboard-user"></i> <span>👨‍🏫 O'qituvchi</span>
        </div>
        <div class="category-chip-btn" data-cat="Boshqa soha" onclick="selectVacCategory(this, 'other')">
          <i class="fa-solid fa-sliders"></i> <span>⚙️ Boshqa soha</span>
        </div>
      </div>
    </div>

    <div id="vac-lock-banner" class="form-lock-banner">
      <i class="fa-solid fa-lock"></i> 🔒 Avval yuqoridagi bo'limlardan vakansiya yo'nalishini tanlang! Qolgan maydonlar shundan so'ng ochiladi.
    </div>

    <form id="create-vacancy-form">
      <input type="hidden" name="category" id="vac-category-input" value="" required>

      <div id="vac-fields-wrapper" class="form-fields-wrapper locked">
        <div class="form-group">
          <label>Yaratish Usuli:</label>
          <select id="vac-creation-type" class="form-control" disabled onchange="toggleVacCreationType(this.value)">
            <option value="wizard">Bosqichma-bosqich (Wizard)</option>
            <option value="manual">Tezkor matn kiritish (Manual)</option>
          </select>
        </div>

        <div class="form-group">
          <label>Lavozim Nomi (Sarlavha):</label>
          <input type="text" name="title" id="vac-title" class="form-control" disabled required placeholder="Masalan: Sotuv menejeri">
          <div id="vac-title-chips-wrapper" style="margin-top: 6px;"></div>
        </div>

        <div id="vac-wizard-fields">
          <div class="form-group">
            <label>Kompaniya Nomi:</label>
            <input type="text" name="companyName" id="vac-company" class="form-control" disabled value="${escapeHtml(state.user.hr?.company_name || '')}">
          </div>
          <div class="form-group">
            <label>Manzil:</label>
            <input type="text" name="location" id="vac-location" class="form-control" disabled placeholder="Toshkent, Chilonzor tumani">
            <div class="quick-chips-container">
              <span class="chip-item" onclick="setInputValue('vac-location', 'Toshkent, Chilonzor')">Chilonzor</span>
              <span class="chip-item" onclick="setInputValue('vac-location', 'Toshkent, Yunusobod')">Yunusobod</span>
              <span class="chip-item" onclick="setInputValue('vac-location', 'Toshkent, Mirzo Ulug\'bek')">Mirzo Ulug'bek</span>
              <span class="chip-item" onclick="setInputValue('vac-location', 'Masofaviy (Remote)')">Remote</span>
            </div>
          </div>
          <div class="form-group">
            <label>Maosh:</label>
            <input type="text" name="salary" id="vac-salary" class="form-control" disabled placeholder="3 000 000 — 5 000 000 so'm">
            <div class="quick-chips-container">
              <span class="chip-item" onclick="setInputValue('vac-salary', '3 000 000 — 5 000 000 so\'m')">3 - 5 mln</span>
              <span class="chip-item" onclick="setInputValue('vac-salary', '5 000 000 — 8 000 000 so\'m')">5 - 8 mln</span>
              <span class="chip-item" onclick="setInputValue('vac-salary', '8 000 000 — 12 000 000 so\'m')">8 - 12 mln</span>
              <span class="chip-item" onclick="setInputValue('vac-salary', '1000$ + KPI bonus')">1000$ + KPI</span>
            </div>
          </div>
          <div class="form-group">
            <label>Ish Vaqti:</label>
            <input type="text" name="workTime" id="vac-worktime" class="form-control" disabled placeholder="9:00 - 18:00, Dush-Jum">
            <div class="quick-chips-container">
              <span class="chip-item" onclick="setInputValue('vac-worktime', '9:00 — 18:00 (5/2)')">9:00 - 18:00 (5/2)</span>
              <span class="chip-item" onclick="setInputValue('vac-worktime', '10:00 — 19:00 (6/1)')">10:00 - 19:00 (6/1)</span>
              <span class="chip-item" onclick="setInputValue('vac-worktime', 'Shifted / Navbatchilik')">Navbatchilik</span>
              <span class="chip-item" onclick="setInputValue('vac-worktime', 'Erkin grafik (Gibrid)')">Erkin grafik</span>
            </div>
          </div>
          <div class="form-group">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <label style="margin-bottom:0;">Asosiy Vazifalar:</label>
              <button type="button" class="btn-ai-improve" onclick="enhanceTextWithAI('vac-tasks', this, 'vacancy')">
                <i class="fa-solid fa-wand-magic-sparkles"></i> ✨ AI bilan yaxshilash
              </button>
            </div>
            <textarea name="tasks" id="vac-tasks" class="form-control" disabled placeholder="• Vazifa 1..."></textarea>
          </div>
          <div class="form-group">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <label style="margin-bottom:0;">Talablar:</label>
              <button type="button" class="btn-ai-improve" onclick="enhanceTextWithAI('vac-reqs', this, 'vacancy')">
                <i class="fa-solid fa-wand-magic-sparkles"></i> ✨ AI bilan yaxshilash
              </button>
            </div>
            <textarea name="requirements" id="vac-reqs" class="form-control" disabled placeholder="• Talab 1..."></textarea>
          </div>
          <div class="form-group">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <label style="margin-bottom:0;">Sharoitlar:</label>
              <button type="button" class="btn-ai-improve" onclick="enhanceTextWithAI('vac-conds', this, 'vacancy')">
                <i class="fa-solid fa-wand-magic-sparkles"></i> ✨ AI bilan yaxshilash
              </button>
            </div>
            <textarea name="conditions" id="vac-conds" class="form-control" disabled placeholder="• Sharoit 1..."></textarea>
          </div>
        </div>

        <div id="vac-manual-fields" style="display: none;">
          <div class="form-group">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <label style="margin-bottom:0;">Tayyor E'lon Matni:</label>
              <button type="button" class="btn-ai-improve" onclick="enhanceTextWithAI('vac-rawtext', this, 'vacancy')">
                <i class="fa-solid fa-wand-magic-sparkles"></i> ✨ AI bilan yaxshilash
              </button>
            </div>
            <textarea name="rawText" id="vac-rawtext" class="form-control" disabled style="min-height: 120px;" placeholder="Barcha ma'lumotlar..."></textarea>
          </div>
        </div>

        <div class="form-group">
          <label>Nomzoddan so'raladigan qo'shimcha maydonlar:</label>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; font-size: 12px; margin-top: 4px;">
            <label><input type="checkbox" name="extraFields" value="full_name" checked disabled> 👤 Ism Familiya</label>
            <label><input type="checkbox" name="extraFields" value="birth_date" checked disabled> 🎂 Tug'ilgan kun</label>
            <label><input type="checkbox" name="extraFields" value="expected_salary" disabled> 💵 Kutilgan maosh</label>
            <label><input type="checkbox" name="extraFields" value="languages" disabled> 🌐 Tillar</label>
            <label><input type="checkbox" name="extraFields" value="photo" disabled> 🖼 Rasm</label>
            <label><input type="checkbox" name="extraFields" value="experience" disabled> 💼 Tajriba</label>
          </div>
        </div>

        <button type="submit" id="vac-submit-btn" class="btn btn-primary" disabled style="margin-top: 10px;"><i class="fa-solid fa-paper-plane"></i> E'lonni Yuborish</button>
      </div>
    </form>
  `;

  openModal("➕ Yangi Vakansiya Yaratish", html);

  window.selectVacCategory = (btnEl, presetKey) => {
    document.querySelectorAll('#create-vacancy-form .category-chip-btn, .category-picker-grid .category-chip-btn').forEach(btn => btn.classList.remove('active'));
    btnEl.classList.add('active');

    const catVal = btnEl.getAttribute('data-cat');
    document.getElementById('vac-category-input').value = catVal;

    const badge = document.getElementById('vac-selected-cat-badge');
    if (badge) {
      badge.className = 'badge badge-hr';
      badge.textContent = '✓ ' + catVal;
    }

    // Unlock banner & fields wrapper
    const banner = document.getElementById('vac-lock-banner');
    if (banner) {
      banner.className = 'form-lock-banner unlocked';
      banner.innerHTML = '<i class="fa-solid fa-lock-open"></i> ✅ Yo\'nalish tanlandi: <strong>' + escapeHtml(catVal) + '</strong>. Qolgan ma\'lumotlarni to\'ldirishingiz mumkin!';
    }

    const wrapper = document.getElementById('vac-fields-wrapper');
    if (wrapper) {
      wrapper.classList.remove('locked');
      wrapper.querySelectorAll('input, select, textarea, button').forEach(el => {
        el.removeAttribute('disabled');
      });
    }

    const submitBtn = document.getElementById('vac-submit-btn');
    if (submitBtn) {
      submitBtn.removeAttribute('disabled');
    }

    // Render dynamic title chips for selected category
    const titleWrapper = document.getElementById('vac-title-chips-wrapper');
    if (titleWrapper) {
      const list = TITLE_SUGGESTIONS[presetKey] || [];
      if (list.length) {
        titleWrapper.innerHTML = `
          <div style="font-size:11px; color:#60a5fa; margin-bottom:4px; font-weight:600;">
            💡 Mos lavozimlar (1-Tap tanlash yoki qo'lda yozing):
          </div>
          <div class="quick-chips-container">
            ${list.map((t, idx) => `
              <span class="chip-item ${idx === 0 ? 'selected' : ''}" onclick="selectTitleChip(this, 'vac-title', '${escapeHtml(t)}')">${escapeHtml(t)}</span>
            `).join('')}
          </div>
        `;
      } else {
        titleWrapper.innerHTML = '';
      }
    }

    // If preset exists, auto fill template values!
    if (presetKey && HR_VACANCY_PRESETS[presetKey]) {
      const p = HR_VACANCY_PRESETS[presetKey];
      setInputValue('vac-title', p.title);
      setInputValue('vac-salary', p.salary);
      setInputValue('vac-location', p.location);
      setInputValue('vac-worktime', p.workTime);
      setInputValue('vac-tasks', p.tasks);
      setInputValue('vac-reqs', p.requirements);
      setInputValue('vac-conds', p.conditions);
      showToast('Yo\'nalish va mos tayyor namuna kiritildi! ✨');
    } else {
      showToast('Yo\'nalish tanlandi: ' + catVal);
    }

    // Focus title input
    setTimeout(() => {
      const titleInput = document.getElementById('vac-title');
      if (titleInput) titleInput.focus();
    }, 100);
  };

  window.setInputValue = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };

  window.toggleVacCreationType = (type) => {
    document.getElementById('vac-wizard-fields').style.display = type === 'wizard' ? 'block' : 'none';
    document.getElementById('vac-manual-fields').style.display = type === 'manual' ? 'block' : 'none';
  };

  document.getElementById('create-vacancy-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const extraCheckboxes = form.querySelectorAll('input[name="extraFields"]:checked');
    const extraFieldsArr = Array.from(extraCheckboxes).map(cb => cb.value);

    // Safe field access via getElementById (avoids form.title/form.elements bugs)
    const getVal = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };

    const payload = {
      userId: state.user.userId,
      creationType: getVal('vac-creation-type') || 'wizard',
      title: getVal('vac-title'),
      category: getVal('vac-category-input'),
      companyName: getVal('vac-company') || (state.user.hr?.company_name || ''),
      location: getVal('vac-location'),
      salary: getVal('vac-salary'),
      workTime: getVal('vac-worktime'),
      tasks: getVal('vac-tasks'),
      requirements: getVal('vac-reqs'),
      conditions: getVal('vac-conds'),
      rawText: getVal('vac-rawtext'),
      extraFields: extraFieldsArr,
    };

    if (!payload.title) {
      showToast('Lavozim nomini kiriting!', 'error');
      return;
    }
    if (!payload.category) {
      showToast('Avval yo\'nalishni tanlang!', 'error');
      return;
    }

    // Show preview before submitting
    showVacancyPreview(payload);
  });
}

// Load HR's own vacancies
async function loadMyVacancies() {
  const container = document.getElementById('my-vacancies-container');
  if (!container) return;

  try {
    const res = await fetch(`/api/hr/vacancies?userId=${state.user.userId}`);
    const data = await res.json();
    if (!data.success) return;

    const list = data.vacancies;
    if (!list.length) {
      container.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 20px; font-size: 13px;">
          Sizda hali e'lonlar mavjud emas. "Yangi Vakansiya Yaratish" tugmasini bosing!
        </div>
      `;
      return;
    }

    const statusLabel = (s) => {
      if (s === 'active') return '<span class="badge badge-candidate">✅ AKTIV</span>';
      if (s === 'pending') return '<span class="badge badge-guest">⏳ TEKSHIRUVDA</span>';
      return `<span class="badge badge-guest">${s.toUpperCase()}</span>`;
    };

    container.innerHTML = `
      <h3 style="font-size: 15px; font-weight: 700; margin: 16px 0 10px;">📋 Mening E'lonlarim (${list.length} ta)</h3>
      <div class="cards-grid">
        ${list.map(v => `
          <div class="card my-vac-card" onclick="viewMyVacancyDetail(${v.id})" style="cursor:pointer;">
            <div class="card-header">
              <div class="card-title">${escapeHtml(v.title)}</div>
              ${statusLabel(v.status)}
            </div>
            <div class="card-company">
              <i class="fa-solid fa-building" style="color:#0066FF;"></i> ${escapeHtml(v.company_name || '')}
            </div>
            <div style="font-size: 12px; color: var(--text-muted); margin: 6px 0 10px;">
              📨 Kelgan arizalar: <strong>${v.apps_count || 0} ta</strong>
              &nbsp;|&nbsp; 💰 ${escapeHtml(v.salary || '')}
            </div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;" onclick="event.stopPropagation()">
              <button class="btn btn-outline btn-sm" onclick="viewMyVacancyDetail(${v.id})"><i class="fa-solid fa-eye"></i> Ko'rish</button>
              <button class="btn btn-warning btn-sm" onclick="openEditVacancyModal(${v.id})"><i class="fa-solid fa-pen-to-square"></i> Tahrirlash</button>
              <button class="btn btn-outline btn-sm" onclick="viewVacancyApplications(${v.id})"><i class="fa-solid fa-inbox"></i> Arizalar (${v.apps_count || 0})</button>
              <button class="btn btn-outline btn-sm" onclick="viewMatchingCandidates(${v.id})"><i class="fa-solid fa-users"></i> Mos Nomzodlar</button>
              ${v.status !== 'active' ? `<button class="btn btn-success btn-sm" onclick="reactivateVacancy(${v.id})"><i class="fa-solid fa-rotate-right"></i> Faollashtirish</button>` : ''}
              <button class="btn btn-danger btn-sm" onclick="deleteVacancy(${v.id})"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    console.error(err);
  }
}

// View single vacancy detail (for HR own vacancy)
async function viewMyVacancyDetail(vacancyId) {
  try {
    const res = await fetch(`/api/vacancies/${vacancyId}`);
    const data = await res.json();
    if (!data.success) return showToast('E\'lon topilmadi', 'error');

    const v = data.vacancy;
    const isManual = v.creation_type === 'manual';

    const html = `
      <div class="preview-card">
        <div class="preview-header">
          <div class="preview-badge"><i class="fa-solid fa-eye"></i> E'lon Ko'rinishi (Kanal Shabloni)</div>
        </div>

        <div class="preview-body">
          <div class="preview-title">${escapeHtml(v.title)}</div>
          <div class="preview-company"><i class="fa-solid fa-building"></i> ${escapeHtml(v.company_name)}</div>
          <div class="preview-salary">💰 ${escapeHtml(v.salary)}</div>

          <div class="preview-tags">
            <span class="tag-item"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(v.location)}</span>
            <span class="tag-item"><i class="fa-solid fa-clock"></i> ${escapeHtml(v.work_time)}</span>
            ${v.category ? `<span class="tag-item"><i class="fa-solid fa-folder"></i> ${escapeHtml(v.category)}</span>` : ''}
          </div>

          ${isManual && v.raw_text ? `
            <div class="preview-section">
              <pre class="preview-text">${escapeHtml(v.raw_text)}</pre>
            </div>
          ` : `
            ${v.tasks ? `
              <div class="preview-section">
                <div class="preview-section-title">🎯 Asosiy Vazifalar:</div>
                <pre class="preview-text">${escapeHtml(v.tasks)}</pre>
              </div>` : ''}
            ${v.requirements ? `
              <div class="preview-section">
                <div class="preview-section-title">✍️ Talablar:</div>
                <pre class="preview-text">${escapeHtml(v.requirements)}</pre>
              </div>` : ''}
            ${v.conditions ? `
              <div class="preview-section">
                <div class="preview-section-title">✅ Sharoitlar:</div>
                <pre class="preview-text">${escapeHtml(v.conditions)}</pre>
              </div>` : ''}
          `}
        </div>

        <div class="preview-actions" style="margin-top: 12px; display: flex; gap: 6px; flex-wrap: wrap;">
          <button class="btn btn-warning" onclick="openEditVacancyModal(${v.id}); closeModal();" style="flex:1;">
            <i class="fa-solid fa-pen-to-square"></i> Tahrirlash
          </button>
          <button class="btn btn-outline" onclick="viewVacancyApplications(${v.id}); closeModal();" style="flex:1;">
            <i class="fa-solid fa-inbox"></i> Arizalar (${data.vacancy.apps_count || 0})
          </button>
          <button class="btn btn-outline" onclick="viewMatchingCandidates(${v.id}); closeModal();" style="flex:1;">
            <i class="fa-solid fa-users"></i> Mos Nomzodlar
          </button>
        </div>
        ${v.status !== 'active' ? `
          <div style="margin-top: 8px;">
            <button class="btn btn-success" onclick="reactivateVacancy(${v.id}); closeModal();">
              <i class="fa-solid fa-rotate-right"></i> Faollashtirish
            </button>
          </div>` : ''}
      </div>
    `;

    openModal(`📌 E'lon #${v.id} — ${escapeHtml(v.title)}`, html);
  } catch (err) {
    showToast('Xatolik yuz berdi', 'error');
  }
}

async function openEditVacancyModal(vacancyId) {
  try {
    const res = await fetch(`/api/vacancies/${vacancyId}`);
    const data = await res.json();
    if (!data.success || !data.vacancy) return showToast('E\'lon topilmadi', 'error');

    const v = data.vacancy;
    const isManual = v.creation_type === 'manual';

    const html = `
      <form id="edit-vacancy-form" onsubmit="saveVacancyEdit(event, ${v.id})">
        <div class="category-picker-section">
          <div class="category-picker-title">
            <span><i class="fa-solid fa-list-check" style="color:#00D2FF;"></i> Vakansiya Sohasini Tanlang:</span>
            <span class="badge badge-hr" id="edit-vac-cat-badge">✓ ${escapeHtml(v.category || 'Boshqa soha')}</span>
          </div>
          <div class="category-picker-grid">
            ${[
              ['Sotuv menejeri', '💼 Sotuv menejeri', 'fa-briefcase'],
              ['Call-center operatori', '📞 Call-center', 'fa-phone'],
              ['Administrator', '🏢 Administrator', 'fa-building'],
              ['SMM mutaxassisi', '📱 SMM mutaxassisi', 'fa-mobile-screen'],
              ['Dasturchi', '💻 Dasturchi / IT', 'fa-code'],
              ['Video montajchi', '🎬 Video montajchi', 'fa-video'],
              ['Savdo agenti', '🚚 Savdo agenti', 'fa-truck-ramp-box'],
              ['Kuryer', '🛵 Kuryer', 'fa-motorcycle'],
              ['O‘qituvchi', '👨‍🏫 O\'qituvchi', 'fa-chalkboard-user'],
              ['Boshqa soha', '⚙️ Boshqa soha', 'fa-sliders'],
            ].map(([cat, label, icon]) => `
              <div class="category-chip-btn ${v.category === cat ? 'active' : ''}" data-cat="${cat}" onclick="selectEditVacCategory(this, '${cat}')">
                <i class="fa-solid ${icon}"></i> <span>${label}</span>
              </div>
            `).join('')}
          </div>
          <input type="hidden" name="category" id="edit-vac-category" value="${escapeHtml(v.category || 'Boshqa soha')}">
        </div>

        <div class="form-fields-wrapper" style="margin-top: 14px;">
          <div class="form-group">
            <label>Lavozim Nomi (Sarlavha):</label>
            <input type="text" name="title" id="edit-vac-title" class="form-control" required value="${escapeHtml(v.title || '')}" placeholder="Masalan: Sotuv menejeri">
          </div>

          <div class="form-group">
            <label>Kompaniya Nomi:</label>
            <input type="text" name="companyName" id="edit-vac-company" class="form-control" required value="${escapeHtml(v.company_name || '')}">
          </div>

          ${isManual && v.raw_text ? `
            <div class="form-group">
              <label>Tayyor E'lon Matni:</label>
              <textarea name="rawText" id="edit-vac-rawtext" class="form-control" style="min-height: 140px;" required>${escapeHtml(v.raw_text || '')}</textarea>
            </div>
          ` : `
            <div class="form-group">
              <label>Manzil (Ish joyi):</label>
              <input type="text" name="location" id="edit-vac-location" class="form-control" value="${escapeHtml(v.location || '')}" placeholder="Toshkent, Chilonzor tumani">
            </div>

            <div class="form-group">
              <label>Maosh:</label>
              <input type="text" name="salary" id="edit-vac-salary" class="form-control" value="${escapeHtml(v.salary || '')}" placeholder="5 000 000 — 8 000 000 so'm">
            </div>

            <div class="form-group">
              <label>Ish Vaqti:</label>
              <input type="text" name="workTime" id="edit-vac-worktime" class="form-control" value="${escapeHtml(v.work_time || '')}" placeholder="9:00 — 18:00 (5/2)">
            </div>

            <div class="form-group">
              <label>Asosiy Vazifalar:</label>
              <textarea name="tasks" id="edit-vac-tasks" class="form-control" style="min-height: 80px;" placeholder="• Vazifa 1...">${escapeHtml(v.tasks || '')}</textarea>
            </div>

            <div class="form-group">
              <label>Talablar:</label>
              <textarea name="requirements" id="edit-vac-reqs" class="form-control" style="min-height: 80px;" placeholder="• Talab 1...">${escapeHtml(v.requirements || '')}</textarea>
            </div>

            <div class="form-group">
              <label>Sharoitlar:</label>
              <textarea name="conditions" id="edit-vac-conds" class="form-control" style="min-height: 80px;" placeholder="• Sharoit 1...">${escapeHtml(v.conditions || '')}</textarea>
            </div>
          `}

          <div style="display: flex; gap: 10px; margin-top: 16px;">
            <button type="button" class="btn btn-outline" onclick="closeModal()" style="flex:1;">Bekor qilish</button>
            <button type="submit" id="edit-vac-submit-btn" class="btn btn-primary" style="flex:2;">
              <i class="fa-solid fa-floppy-disk"></i> Saqlash
            </button>
          </div>
        </div>
      </form>
    `;

    openModal(`✏️ E'lonni Tahrirlash #${v.id}`, html);

    window.selectEditVacCategory = (btnEl, catVal) => {
      document.querySelectorAll('#edit-vacancy-form .category-chip-btn').forEach(b => b.classList.remove('active'));
      btnEl.classList.add('active');
      document.getElementById('edit-vac-category').value = catVal;
      const badge = document.getElementById('edit-vac-cat-badge');
      if (badge) badge.textContent = '✓ ' + catVal;
    };
  } catch (err) {
    console.error(err);
    showToast('E\'lon ma\'lumotlarini yuklashda xatolik', 'error');
  }
}

async function saveVacancyEdit(event, vacancyId) {
  event.preventDefault();
  const form = event.target;
  const submitBtn = document.getElementById('edit-vac-submit-btn');

  const payload = {
    userId: state.user.userId,
    title: form.title?.value?.trim() || '',
    category: form.category?.value || '',
    company_name: form.companyName?.value?.trim() || '',
    location: form.location?.value?.trim() || '',
    salary: form.salary?.value?.trim() || '',
    work_time: form.workTime?.value?.trim() || '',
    tasks: form.tasks?.value?.trim() || '',
    requirements: form.requirements?.value?.trim() || '',
    conditions: form.conditions?.value?.trim() || '',
    raw_text: form.rawText?.value?.trim() || '',
  };

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saqlanmoqda...';
    }

    const res = await fetch(`/api/hr/vacancies/${vacancyId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Saqlashda xatolik yuz berdi');
    }

    showToast('✅ E\'lon muvaffaqiyatli tahrirlandi!', 'success');
    closeModal();
    if (typeof loadMyVacancies === 'function') loadMyVacancies();
    if (typeof loadHrCabinetView === 'function') loadHrCabinetView();
  } catch (err) {
    showToast(err.message || 'Xatolik yuz berdi', 'error');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Saqlash';
    }
  }
}


async function viewVacancyApplications(vacancyId) {
  try {
    const res = await fetch(`/api/hr/vacancies/${vacancyId}/applications?userId=${state.user.userId}`);
    const data = await res.json();
    if (!data.success) return showToast('Topilmadi', 'error');

    const apps = data.applications || [];
    if (!apps.length) return openModal("Kelgan Arizalar", "<p style='text-align:center; padding:20px; color:var(--text-muted);'>Hali hech kim ariza qoldirmagan</p>");

    const html = `
      <div style="display:flex; flex-direction:column; gap:12px;">
        ${apps.map(a => {
          let answers = {};
          try { answers = JSON.parse(a.data || '{}'); } catch (_) {}
          return `
            <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-color); padding:12px; border-radius:12px;">
              <div style="font-weight:700; font-size:14px; margin-bottom:4px;">👤 ${escapeHtml(a.full_name)} | 📞 ${escapeHtml(a.phone)}</div>
              <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">📅 Topshirilgan: ${new Date(a.applied_at).toLocaleDateString('uz-UZ')}</div>
              <div style="font-size:13px; line-height:1.4;">
                ${Object.entries(answers).map(([k, v]) => `
                  <div><strong>${escapeHtml(k)}:</strong> ${k === 'photo' ? `<a href="${v}" target="_blank" style="color:#60a5fa;">🖼 Rasmni Ko'rish</a>` : escapeHtml(v)}</div>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    openModal(`Arizalar (${apps.length} ta)`, html);
  } catch (err) {
    showToast('Xatolik', 'error');
  }
}

async function viewMatchingCandidates(vacancyId) {
  try {
    const res = await fetch(`/api/hr/vacancies/${vacancyId}/matching-candidates?userId=${state.user.userId}`);
    const data = await res.json();
    if (!data.success) return showToast('Topilmadi', 'error');

    const candidates = data.matchingCandidates || [];
    if (!candidates.length) return openModal("Mos Nomzodlar", "<p style='text-align:center; padding:20px; color:var(--text-muted);'>Ushbu soha bo'yicha aktiv rezyumelar topilmadi</p>");

    const html = `
      <div style="display:flex; flex-direction:column; gap:12px;">
        ${candidates.map(c => `
          <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-color); padding:12px; border-radius:12px;">
            <div style="font-weight:700; font-size:14px;">👤 ${escapeHtml(c.full_name || c.cand_name)}</div>
            <div style="font-size:13px; color:#34d399; margin-bottom:4px;">🎯 Lavozim: ${escapeHtml(c.position)}</div>
            <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">📍 ${escapeHtml(c.city || 'Toshkent')} | Tajriba: ${escapeHtml(c.experience_years)}</div>
            <a href="tel:${(c.cand_phone || '').replace(/[^+\d]/g, '')}" class="btn btn-primary btn-sm"><i class="fa-solid fa-phone"></i> Bog'lanish (${escapeHtml(c.cand_phone)})</a>
          </div>
        `).join('')}
      </div>
    `;

    openModal(`Mos Nomzodlar (${candidates.length} ta)`, html);
  } catch (err) {
    showToast('Xatolik', 'error');
  }
}

async function reactivateVacancy(vacancyId) {
  try {
    const res = await fetch(`/api/hr/vacancies/${vacancyId}/reactivate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: state.user.userId }),
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message);
      await authenticateUser();
      loadHrVacanciesTab();
    } else {
      showToast(data.error || 'Token yetarli emas', 'error');
    }
  } catch (err) {
    showToast('Xatolik', 'error');
  }
}

async function deleteVacancy(vacancyId) {
  if (!confirm("Haqiqatdan ham e'lonni o'chirmoqchimisiz?")) return;
  try {
    const res = await fetch(`/api/hr/vacancies/${vacancyId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: state.user.userId }),
    });
    const data = await res.json();
    if (data.success) {
      showToast('E\'lon o\'chirildi');
      loadHrVacanciesTab();
    }
  } catch (err) {
    showToast('Xatolik', 'error');
  }
}

// ── ⚡ CANDIDATE: 1-MINUTE QUICK FILL & TEMPLATES ─────────────────────────────
const CANDIDATE_RESUME_PRESETS = {
  sotuv: {
    position: 'B2B Sotuv menejeri',
    category: 'Sotuv menejeri',
    expectedSalary: '6 000 000 — 10 000 000 so\'m',
    experienceYears: '2 yil tajriba',
    employmentType: 'Ofis (To\'liq kun)',
    aboutMe: 'Mijozlar bilan erkin muloqot va muzokaralar olib bora olaman. B2B va B2C sotuvlar voronkasini a\'lo darajada tushunaman.',
    skills: 'Muzokara olib borish · CRM (Bitrix24/AmoCRM) · B2B Sotuv · KPI Bajarish · Cold calls',
  },
  callcenter: {
    position: 'Call-markaz operatori',
    category: 'Call-center operatori',
    expectedSalary: '4 000 000 — 6 000 000 so\'m',
    experienceYears: '1 yil tajriba',
    employmentType: 'Ofis / Smenali',
    aboutMe: 'Xushmuomala va stressga chidamli. Kuniga 100+ kiruvchi va chiquvchi qo\'ng\'iroqlarga javob bera olaman.',
    skills: 'Xushmuomalalik · IP Telefoniya · MS Office · Rus va O\'zbek tillari erkin',
  },
  admin: {
    position: 'Resepshn Administrator',
    category: 'Administrator',
    expectedSalary: '4 500 000 — 6 500 000 so\'m',
    experienceYears: '1.5 yil tajriba',
    employmentType: 'Ofis (To\'liq kun)',
    aboutMe: 'Hujjatlarni va ofis ishlarini tartibli olib boraman. Mehmonlarni xushmuomalalik bilan kutib olaman.',
    skills: 'Hujjatshunoslik · MS Word/Excel · Mehmonlarni kutib olish · Tashkilotchilik',
  },
  smm: {
    position: 'SMM Menejer / Targetolog',
    category: 'SMM mutaxassisi',
    expectedSalary: '6 000 000 — 12 000 000 so\'m',
    experienceYears: '2 yil tajriba',
    employmentType: 'Gibrid / Masofaviy',
    aboutMe: 'Instagram va Telegram sahifalarini noldan yuritish va auditoriyani o\'stirish bo\'yicha tajribam bor.',
    skills: 'Target reklama · Copywriting · Canva / Photoshop · Reels Video Montaj · Kontent Plan',
  },
  dev: {
    position: 'Frontend Dasturchi (React / Next.js)',
    category: 'Dasturchi',
    expectedSalary: '10 000 000 — 18 000 000 so\'m',
    experienceYears: '2 yil tajriba',
    employmentType: 'Ofis / Masofaviy',
    aboutMe: 'React va JavaScript ecosystem loyihalarini sifatli va responsive ko\'rinishda yarataman.',
    skills: 'JavaScript · React · Next.js · Redux Toolkit · Git · REST API · HTML5/CSS3',
  },
  kuryer: {
    position: 'Avto-kuryer / Ekspress Yetkazib Beruvchi',
    category: 'Kuryer',
    expectedSalary: '6 000 000 — 9 000 000 so\'m',
    experienceYears: '3 yil haydovchilik tajribasi',
    employmentType: 'Erkin grafik',
    aboutMe: 'Toshkent shahrini a\'lo darajada bilaman. Buyurtmalarni vaqtida va bexato yetkazaman.',
    skills: 'Toshkent shahrini bilish · B toifa guvohnoma · Navigatsiya · Mas\'uliyatlilik',
  },
};

function openCreateResumeModal() {
  const html = `
    <div class="category-picker-section">
      <div class="category-picker-title">
        <span><i class="fa-solid fa-list-check" style="color:#00D2FF;"></i> ${t('step1_title')}</span>
        <span class="badge badge-guest" id="res-selected-cat-badge">${t('badge_not_selected')}</span>
      </div>
      <div class="category-picker-grid">
        <div class="category-chip-btn" data-cat="Sotuv menejeri" onclick="selectResCategory(this, 'sotuv')">
          <i class="fa-solid fa-briefcase"></i> <span>${t('cat_sales')}</span>
        </div>
        <div class="category-chip-btn" data-cat="Call-center operatori" onclick="selectResCategory(this, 'callcenter')">
          <i class="fa-solid fa-phone"></i> <span>${t('cat_callcenter')}</span>
        </div>
        <div class="category-chip-btn" data-cat="Administrator" onclick="selectResCategory(this, 'admin')">
          <i class="fa-solid fa-building"></i> <span>${t('cat_admin')}</span>
        </div>
        <div class="category-chip-btn" data-cat="SMM mutaxassisi" onclick="selectResCategory(this, 'smm')">
          <i class="fa-solid fa-mobile-screen"></i> <span>${t('cat_smm')}</span>
        </div>
        <div class="category-chip-btn" data-cat="Dasturchi" onclick="selectResCategory(this, 'dev')">
          <i class="fa-solid fa-code"></i> <span>${t('cat_dev')}</span>
        </div>
        <div class="category-chip-btn" data-cat="Video montajchi" onclick="selectResCategory(this, 'video')">
          <i class="fa-solid fa-video"></i> <span>${t('cat_video')}</span>
        </div>
        <div class="category-chip-btn" data-cat="Savdo agenti" onclick="selectResCategory(this, 'agent')">
          <i class="fa-solid fa-truck-ramp-box"></i> <span>${t('cat_agent')}</span>
        </div>
        <div class="category-chip-btn" data-cat="Kuryer" onclick="selectResCategory(this, 'kuryer')">
          <i class="fa-solid fa-motorcycle"></i> <span>${t('cat_courier')}</span>
        </div>
        <div class="category-chip-btn" data-cat="O‘qituvchi" onclick="selectResCategory(this, 'teacher')">
          <i class="fa-solid fa-chalkboard-user"></i> <span>${t('cat_teacher')}</span>
        </div>
        <div class="category-chip-btn" data-cat="Boshqa soha" onclick="selectResCategory(this, 'other')">
          <i class="fa-solid fa-sliders"></i> <span>${t('cat_other')}</span>
        </div>
      </div>
    </div>

    <div id="res-lock-banner" class="form-lock-banner">
      <i class="fa-solid fa-lock"></i> ${t('lock_banner_text')}
    </div>

    <form id="create-resume-form">
      <input type="hidden" name="category" id="res-category-input" value="" required>

      <div id="res-fields-wrapper" class="form-fields-wrapper locked">
        <div class="form-group">
          <label>${t('creation_type_label')}</label>
          <select id="res-creation-type" class="form-control" disabled onchange="toggleResCreationType(this.value)">
            <option value="wizard">${t('opt_wizard')}</option>
            <option value="manual">${t('opt_manual')}</option>
          </select>
        </div>

        <div class="form-group">
          <label>${t('full_name_label')}</label>
          <input type="text" name="fullName" id="res-fullname" class="form-control" disabled value="${escapeHtml(state.user.candidate?.full_name || '')}" required>
        </div>

        <div class="form-group">
          <label>${t('expected_position_label')}</label>
          <input type="text" name="position" id="res-position" class="form-control" disabled required placeholder="${t('position_placeholder')}">
          <div id="res-title-chips-wrapper" style="margin-top: 6px;"></div>
        </div>

        <div id="res-wizard-fields">
          <div class="form-group">
            <label>${t('city_label')}</label>
            <input type="text" name="city" id="res-city" class="form-control" disabled placeholder="Toshkent shahri" value="Toshkent shahri">
          </div>
          <div class="form-group">
            <label>${t('exp_years_label')}</label>
            <input type="text" name="experienceYears" id="res-exp" class="form-control" disabled placeholder="${t('exp_placeholder')}">
            <div class="quick-chips-container">
              <span class="chip-item" onclick="setInputValue('res-exp', '${state.lang === 'ru' ? 'Без опыта (0-6 мес)' : 'Tajribasiz (0-6 oy)'}')">${state.lang === 'ru' ? 'Без опыта' : 'Tajribasiz'}</span>
              <span class="chip-item" onclick="setInputValue('res-exp', '${state.lang === 'ru' ? '1 год' : '1 yil'}')">${state.lang === 'ru' ? '1 год' : '1 yil'}</span>
              <span class="chip-item" onclick="setInputValue('res-exp', '${state.lang === 'ru' ? '2 года' : '2 yil'}')">${state.lang === 'ru' ? '2 года' : '2 yil'}</span>
              <span class="chip-item" onclick="setInputValue('res-exp', '${state.lang === 'ru' ? '3-5 лет' : '3-5 yil'}')">${state.lang === 'ru' ? '3-5 лет' : '3-5 yil'}</span>
              <span class="chip-item" onclick="setInputValue('res-exp', '${state.lang === 'ru' ? '5+ лет' : '5+ yil'}')">${state.lang === 'ru' ? '5+ лет' : '5+ yil'}</span>
            </div>
          </div>
          <div class="form-group">
            <label>${t('expected_salary_label')}</label>
            <input type="text" name="expectedSalary" id="res-salary" class="form-control" disabled placeholder="${t('salary_placeholder')}">
            <div class="quick-chips-container">
              <span class="chip-item" onclick="setInputValue('res-salary', '4 000 000 — 6 000 000 ${state.lang === 'ru' ? 'сум' : 'so\'m'}')">4 - 6 млн</span>
              <span class="chip-item" onclick="setInputValue('res-salary', '6 000 000 — 10 000 000 ${state.lang === 'ru' ? 'сум' : 'so\'m'}')">6 - 10 mln</span>
              <span class="chip-item" onclick="setInputValue('res-salary', '10 000 000 — 15 000 000 ${state.lang === 'ru' ? 'сум' : 'so\'m'}')">10 - 15 mln</span>
              <span class="chip-item" onclick="setInputValue('res-salary', '1500$')">1500$</span>
            </div>
          </div>
          <div class="form-group">
            <label>${t('emp_type_label')}</label>
            <input type="text" name="employmentType" id="res-emptype" class="form-control" disabled placeholder="${t('emp_type_placeholder')}">
            <div class="quick-chips-container">
              <span class="chip-item" onclick="setInputValue('res-emptype', '${state.lang === 'ru' ? 'Офис (Полный день)' : 'Ofis (To\'liq kun)'}')">${state.lang === 'ru' ? 'Офис' : 'Ofis'}</span>
              <span class="chip-item" onclick="setInputValue('res-emptype', '${state.lang === 'ru' ? 'Гибрид' : 'Gibrid'}')">${state.lang === 'ru' ? 'Гибрид' : 'Gibrid'}</span>
              <span class="chip-item" onclick="setInputValue('res-emptype', '${state.lang === 'ru' ? 'Удаленно (Remote)' : 'Masofaviy (Remote)'}')">Remote</span>
              <span class="chip-item" onclick="setInputValue('res-emptype', '${state.lang === 'ru' ? 'Частичная занятость' : 'Yarim stavka'}')">${state.lang === 'ru' ? 'Частичная' : 'Yarim stavka'}</span>
            </div>
          </div>
          <div class="form-group">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <label style="margin-bottom:0;">${t('about_me_label')}</label>
              <button type="button" class="btn-ai-improve" onclick="enhanceTextWithAI('res-aboutme', this)">
                <i class="fa-solid fa-wand-magic-sparkles"></i> ${t('btn_ai_improve')}
              </button>
            </div>
            <textarea name="aboutMe" id="res-aboutme" class="form-control" disabled placeholder="${t('about_me_placeholder')}"></textarea>
          </div>
          <div class="form-group">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <label style="margin-bottom:0;">${t('skills_label')}</label>
              <button type="button" class="btn-ai-improve" onclick="enhanceTextWithAI('res-skills', this)">
                <i class="fa-solid fa-wand-magic-sparkles"></i> ${t('btn_ai_improve')}
              </button>
            </div>
            <textarea name="skills" id="res-skills" class="form-control" disabled placeholder="${t('skills_placeholder')}"></textarea>
            <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">${t('skills_hint')}</div>
            <div class="quick-chips-container" style="margin-top:4px;">
              <span class="chip-item" onclick="appendSkill('${state.lang === 'ru' ? 'Переговоры' : 'Muzokara'}')">+ ${state.lang === 'ru' ? 'Переговоры' : 'Muzokara'}</span>
              <span class="chip-item" onclick="appendSkill('CRM Bitrix24')">+ CRM</span>
              <span class="chip-item" onclick="appendSkill('MS Office')">+ MS Office</span>
              <span class="chip-item" onclick="appendSkill('1C')">+ 1C</span>
              <span class="chip-item" onclick="appendSkill('Targeting')">+ Target</span>
              <span class="chip-item" onclick="appendSkill('Canva')">+ Canva</span>
              <span class="chip-item" onclick="appendSkill('${state.lang === 'ru' ? 'Английский (B2)' : 'Ingliz tili (B2)'}')">+ English B2</span>
              <span class="chip-item" onclick="appendSkill('${state.lang === 'ru' ? 'Права категории B' : 'Haydovchilik B'}')">+ ${state.lang === 'ru' ? 'Права B' : 'B toifa'}</span>
              <span class="chip-item" onclick="appendSkill('JavaScript')">+ JS</span>
              <span class="chip-item" onclick="appendSkill('React')">+ React</span>
            </div>
          </div>
        </div>

        <!-- PDF EXTRAS ACCORDION (MAJBURIY) -->
        <div class="pdf-extra-fields-accordion" style="margin-top: 16px; border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; background: rgba(0, 210, 255, 0.03);">
          <div onclick="togglePdfExtraFields()" style="padding: 12px 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-weight: 600; font-size: 13px; color: #00D2FF; background: rgba(0, 210, 255, 0.08);">
            <span><i class="fa-solid fa-file-pdf"></i> ${t('pdf_accordion_title')}</span>
            <i class="fa-solid fa-chevron-up" id="pdf-extra-icon"></i>
          </div>
          <div id="pdf-extra-content" style="display: block; padding: 16px; border-top: 1px solid var(--border-color);">
            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">
              ${t('pdf_accordion_desc')}
            </div>
            
            <!-- Photo Upload Field (No URL text input, direct file upload) -->
            <div class="form-group">
              <label style="display:flex; justify-content:space-between; align-items:center;">
                <span><i class="fa-solid fa-camera"></i> ${t('photo_label')}</span>
              </label>
              <input type="hidden" name="pdfPhoto" id="res-pdf-photo" value="${escapeHtml(state.user.candidate?.photo_url || '')}">
              <div style="display: flex; gap: 12px; align-items: center; background: rgba(255,255,255,0.03); border: 1px dashed var(--border-color); border-radius: 12px; padding: 10px 14px;">
                <div id="photo-preview-box" style="width: 56px; height: 56px; border-radius: 10px; overflow: hidden; background: rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  ${(state.user.candidate?.photo_url) ? `<img src="${escapeHtml(state.user.candidate.photo_url)}" style="width:100%;height:100%;object-fit:cover;">` : `<i class="fa-solid fa-user" style="font-size:24px;color:var(--text-dim);"></i>`}
                </div>
                <div style="flex: 1;">
                  <input type="file" id="res-photo-file-input" accept="image/*" class="form-control" disabled style="font-size: 12px; padding: 6px;" onchange="uploadResumePhotoFile(this)">
                  <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;" id="photo-upload-status">${t('photo_upload_hint')}</div>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>Telegram Username:</label>
              <input type="text" name="pdfTelegram" id="res-pdf-telegram" class="form-control" disabled placeholder="@username" value="${escapeHtml(state.user.telegram_username ? (state.user.telegram_username.startsWith('@') ? state.user.telegram_username : '@' + state.user.telegram_username) : '')}">
            </div>
            <div class="form-group">
              <label>${state.lang === 'ru' ? 'Номер телефона:' : 'Telefon Raqam:'}</label>
              <input type="text" name="pdfPhone" id="res-pdf-phone" class="form-control" disabled placeholder="+998 90 123 45 67" value="${escapeHtml(state.user.phone || '')}">
            </div>
            <div class="form-group">
              <label>${t('age_label')}</label>
              <input type="text" name="pdfAge" id="res-pdf-age" class="form-control" disabled placeholder="${t('age_placeholder')}">
            </div>
            <div class="form-group">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <label style="margin-bottom:0;">${t('work_history_label')}</label>
                <button type="button" class="btn-ai-improve" onclick="enhanceTextWithAI('res-pdf-workhistory', this)">
                  <i class="fa-solid fa-wand-magic-sparkles"></i> ${t('btn_ai_improve')}
                </button>
              </div>
              <textarea name="pdfWorkHistory" id="res-pdf-workhistory" class="form-control" disabled style="min-height: 80px;" placeholder="${t('work_history_placeholder')}"></textarea>
            </div>
            <div class="form-group">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <label style="margin-bottom:0;">${t('edu_history_label')}</label>
                <button type="button" class="btn-ai-improve" onclick="enhanceTextWithAI('res-pdf-eduhistory', this)">
                  <i class="fa-solid fa-wand-magic-sparkles"></i> ${t('btn_ai_improve')}
                </button>
              </div>
              <textarea name="pdfEduHistory" id="res-pdf-eduhistory" class="form-control" disabled style="min-height: 60px;" placeholder="${t('edu_history_placeholder')}"></textarea>
            </div>
            <div class="form-group">
              <label>${t('languages_label')}</label>
              <input type="text" name="pdfLanguages" id="res-pdf-languages" class="form-control" disabled placeholder="${t('languages_placeholder')}">
            </div>
            <div class="form-group">
              <label>${t('projects_label')}</label>
              <textarea name="pdfProjects" id="res-pdf-projects" class="form-control" disabled style="min-height: 60px;" placeholder="${t('projects_placeholder')}"></textarea>
            </div>
            <div class="form-group">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <label style="margin-bottom:0;">${t('interests_label')}</label>
                <button type="button" class="btn-ai-improve" onclick="enhanceTextWithAI('res-pdf-interests', this)">
                  <i class="fa-solid fa-wand-magic-sparkles"></i> ${t('btn_ai_improve')}
                </button>
              </div>
              <input type="text" name="pdfInterests" id="res-pdf-interests" class="form-control" disabled placeholder="${t('interests_placeholder')}">
            </div>
            <div class="form-group">
              <label>${t('additional_info_label')}</label>
              <input type="text" name="pdfAdditional" id="res-pdf-additional" class="form-control" disabled placeholder="${t('additional_info_placeholder')}">
            </div>
          </div>
        </div>

        <div id="res-manual-fields" style="display: none;">
          <div class="form-group">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <label style="margin-bottom:0;">Tayyor Rezyume Matni:</label>
              <button type="button" class="btn-ai-improve" onclick="enhanceTextWithAI('res-rawtext', this)">
                <i class="fa-solid fa-wand-magic-sparkles"></i> ${t('btn_ai_improve')}
              </button>
            </div>
            <textarea name="rawText" id="res-rawtext" class="form-control" disabled style="min-height: 120px;" placeholder="Barcha ma'lumotlar..."></textarea>
          </div>
        </div>

        <button type="submit" id="res-submit-btn" class="btn btn-success" disabled style="margin-top: 10px;"><i class="fa-solid fa-paper-plane"></i> ${t('btn_save_resume')}</button>
      </div>
    </form>
  `;

  openModal(t('create_resume_modal_title'), html);

  window.togglePdfExtraFields = () => {
    const content = document.getElementById('pdf-extra-content');
    const icon = document.getElementById('pdf-extra-icon');
    if (!content) return;
    if (content.style.display === 'none') {
      content.style.display = 'block';
      if (icon) icon.className = 'fa-solid fa-chevron-up';
    } else {
      content.style.display = 'none';
      if (icon) icon.className = 'fa-solid fa-chevron-down';
    }
  };

  window.uploadResumePhotoFile = async (input) => {
    const file = input.files?.[0];
    if (!file) return;

    const statusEl = document.getElementById('photo-upload-status');
    if (statusEl) statusEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${t('uploading')}`;

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const res = await fetch('/api/upload-photo', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success && data.photoUrl) {
        document.getElementById('res-pdf-photo').value = data.photoUrl;
        const previewBox = document.getElementById('photo-preview-box');
        if (previewBox) {
          previewBox.innerHTML = `<img src="${data.photoUrl}" style="width:100%;height:100%;object-fit:cover;">`;
        }
        if (statusEl) statusEl.innerHTML = `<span style="color:#10b981;font-weight:600;"><i class="fa-solid fa-check"></i> ${t('photo_uploaded')}</span>`;
        showToast(t('photo_uploaded_toast'), 'success');
      } else {
        if (statusEl) statusEl.innerHTML = `<span style="color:#ef4444;">${data.error || 'Upload error'}</span>`;
        showToast(data.error || 'Upload error', 'error');
      }
    } catch (err) {
      console.error('Photo upload error:', err);
      if (statusEl) statusEl.innerHTML = `<span style="color:#ef4444;">Upload error</span>`;
    }
  };

  window.selectResCategory = (btnEl, presetKey) => {
    document.querySelectorAll('#create-resume-form .category-chip-btn, .category-picker-grid .category-chip-btn').forEach(btn => btn.classList.remove('active'));
    btnEl.classList.add('active');

    const catVal = btnEl.getAttribute('data-cat');
    document.getElementById('res-category-input').value = catVal;

    const badge = document.getElementById('res-selected-cat-badge');
    if (badge) {
      badge.className = 'badge badge-candidate';
      badge.textContent = '✓ ' + catVal;
    }

    // Unlock banner & fields wrapper
    const banner = document.getElementById('res-lock-banner');
    if (banner) {
      banner.className = 'form-lock-banner unlocked';
      banner.innerHTML = '<i class="fa-solid fa-lock-open"></i> ✅ Yo\'nalish tanlandi: <strong>' + escapeHtml(catVal) + '</strong>. Rezyume ma\'lumotlarini to\'ldirishingiz mumkin!';
    }

    const wrapper = document.getElementById('res-fields-wrapper');
    if (wrapper) {
      wrapper.classList.remove('locked');
      wrapper.querySelectorAll('input, select, textarea, button').forEach(el => {
        el.removeAttribute('disabled');
      });
    }

    const submitBtn = document.getElementById('res-submit-btn');
    if (submitBtn) {
      submitBtn.removeAttribute('disabled');
    }

    // Render dynamic title chips for selected category
    const titleWrapper = document.getElementById('res-title-chips-wrapper');
    if (titleWrapper) {
      const list = TITLE_SUGGESTIONS[presetKey] || [];
      if (list.length) {
        titleWrapper.innerHTML = `
          <div style="font-size:11px; color:#34d399; margin-bottom:4px; font-weight:600;">
            💡 Mos mutaxassisliklar (1-Tap tanlash yoki qo'lda yozing):
          </div>
          <div class="quick-chips-container">
            ${list.map((t, idx) => `
              <span class="chip-item ${idx === 0 ? 'selected' : ''}" onclick="selectTitleChip(this, 'res-position', '${escapeHtml(t)}')">${escapeHtml(t)}</span>
            `).join('')}
          </div>
        `;
      } else {
        titleWrapper.innerHTML = '';
      }
    }

    // If preset exists, auto fill template values!
    if (presetKey && CANDIDATE_RESUME_PRESETS[presetKey]) {
      const p = CANDIDATE_RESUME_PRESETS[presetKey];
      setInputValue('res-position', p.position);
      setInputValue('res-salary', p.expectedSalary);
      setInputValue('res-exp', p.experienceYears);
      setInputValue('res-emptype', p.employmentType);
      setInputValue('res-aboutme', p.aboutMe);
      setInputValue('res-skills', p.skills);
      showToast('Yo\'nalish va mos rezyume namunasi kiritildi! ✨');
    } else {
      showToast('Yo\'nalish tanlandi: ' + catVal);
    }

    // Focus position input
    setTimeout(() => {
      const posInput = document.getElementById('res-position');
      if (posInput) posInput.focus();
    }, 100);
  };

  document.getElementById('create-resume-form').addEventListener('submit', (e) => {
    e.preventDefault();

    // Safe field access via getElementById
    const getVal = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };

    const form = e.target;
    const payload = {
      userId: state.user.userId,
      creationType: getVal('res-creation-type') || 'wizard',
      fullName: getVal('res-fullname'),
      category: getVal('res-category-input'),
      position: getVal('res-position'),
      city: getVal('res-city'),
      experienceYears: getVal('res-exp'),
      expectedSalary: getVal('res-salary'),
      employmentType: getVal('res-emptype'),
      aboutMe: getVal('res-aboutme'),
      skills: getVal('res-skills'),
      rawText: getVal('res-rawtext'),
      pdfData: {
        photo: getVal('res-pdf-photo') || (state.user.candidate?.photo_url || ''),
        phone: getVal('res-pdf-phone') || (state.user.phone || ''),
        telegram: getVal('res-pdf-telegram') || (state.user.telegram_username ? (state.user.telegram_username.startsWith('@') ? state.user.telegram_username : '@' + state.user.telegram_username) : ''),
        age: getVal('res-pdf-age') || '',
        languages: getVal('res-pdf-languages') || '',
        workHistory: getVal('res-pdf-workhistory') || '',
        eduHistory: getVal('res-pdf-eduhistory') || '',
        projects: getVal('res-pdf-projects') || '',
        interests: getVal('res-pdf-interests') || '',
        additionalInfo: getVal('res-pdf-additional') || ''
      }
    };

    if (!payload.position) {
      showToast('Kutilayotgan lavozimni kiriting!', 'error');
      return;
    }
    if (!payload.category) {
      showToast('Avval yo\'nalishni tanlang!', 'error');
      return;
    }

    // Show preview before submitting
    showResumePreview(payload);
  });
}

async function loadMyResumes() {
  const container = document.getElementById('candidate-cabinet-subcontainer');
  if (!container) return;

  try {
    const res = await fetch(`/api/candidate/resumes?userId=${state.user.userId}`);
    const data = await res.json();
    if (!data.success) return;

    const list = data.resumes;
    window._myResumesMap = {};
    list.forEach(r => {
      window._myResumesMap[r.id] = {
        fullName: r.full_name,
        position: r.position,
        city: r.city,
        experienceYears: r.experience_years,
        expectedSalary: r.expected_salary,
        employmentType: r.employment_type,
        aboutMe: r.about_me,
        skills: r.skills,
        experienceDetails: r.experience_details,
        education: r.education,
        languages: r.languages,
        cand_phone: r.cand_phone,
        pdfData: r.pdf_data ? (typeof r.pdf_data === 'string' ? JSON.parse(r.pdf_data) : r.pdf_data) : {}
      };
    });

    container.innerHTML = `
      <h3 style="font-size: 15px; font-weight: 700; margin: 16px 0 10px;">📄 Mening Rezyumelarim (${list.length} ta)</h3>
      ${!list.length ? `
        <div style="text-align: center; color: var(--text-muted); padding: 20px; font-size: 13px;">
          Siz hali rezyume yaratmagansiz. "Yangi Rezyume Yaratish" tugmasini bosing!
        </div>
      ` : `
        <div class="cards-grid">
          ${list.map(r => `
            <div class="card" style="cursor: default;">
              <div class="card-header">
                <div class="card-title">${escapeHtml(r.position)}</div>
                <span class="badge ${r.status === 'active' ? 'badge-candidate' : 'badge-guest'}">${r.status.toUpperCase()}</span>
              </div>
              <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px;">
                💵 Maosh: ${escapeHtml(r.expected_salary)} | 📍 ${escapeHtml(r.city || 'Toshkent')}
              </div>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <button class="btn btn-primary btn-sm" onclick="downloadResumePdfById(${r.id})"><i class="fa-solid fa-file-pdf"></i> PDF Yuklab Olish</button>
                ${r.status !== 'active' ? `<button class="btn btn-success btn-sm" onclick="reactivateResume(${r.id})"><i class="fa-solid fa-rotate-right"></i> Faollashtirish</button>` : ''}
                <button class="btn btn-danger btn-sm" onclick="deleteResume(${r.id})"><i class="fa-solid fa-trash"></i> O'chirish</button>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    `;
  } catch (err) {
    console.error(err);
  }
}

async function loadMySubmittedApplications() {
  const container = document.getElementById('candidate-cabinet-subcontainer');
  if (!container) return;

  try {
    const res = await fetch(`/api/candidate/applications?userId=${state.user.userId}`);
    const data = await res.json();
    if (!data.success) return;

    const list = data.applications || [];
    container.innerHTML = `
      <h3 style="font-size: 15px; font-weight: 700; margin: 16px 0 10px;">📋 Topshirilgan Arizalaringiz (${list.length} ta)</h3>
      ${!list.length ? `
        <div style="text-align: center; color: var(--text-muted); padding: 20px; font-size: 13px;">
          Siz hali hech qaysi vakansiyaga ariza topshirmagansiz.
        </div>
      ` : `
        <div class="cards-grid">
          ${list.map(a => `
            <div class="card" style="cursor: default;">
              <div class="card-header">
                <div class="card-title">${escapeHtml(a.title || 'Vakansiya')}</div>
                <div class="card-salary">${escapeHtml(a.salary || '')}</div>
              </div>
              <div class="card-company"><i class="fa-solid fa-building" style="color:#0066FF;"></i> ${escapeHtml(a.company_name || '')}</div>
              <div style="font-size: 12px; color: var(--text-muted);">📅 Topshirilgan: ${new Date(a.applied_at).toLocaleDateString('uz-UZ')}</div>
            </div>
          `).join('')}
        </div>
      `}
    `;
  } catch (err) {
    console.error(err);
  }
}

async function reactivateResume(resumeId) {
  try {
    const res = await fetch(`/api/candidate/resumes/${resumeId}/reactivate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: state.user.userId }),
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message);
      await authenticateUser();
      loadMyResumes();
    } else {
      showToast(data.error || 'Token yetarli emas', 'error');
    }
  } catch (err) {
    showToast('Xatolik', 'error');
  }
}

async function deleteResume(resumeId) {
  if (!confirm("Haqiqatdan ham rezyumeni o'chirmoqchimisiz?")) return;
  try {
    const res = await fetch(`/api/candidate/resumes/${resumeId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: state.user.userId }),
    });
    const data = await res.json();
    if (data.success) {
      showToast('Rezyume o\'chirildi');
      loadMyResumes();
    }
  } catch (err) {
    showToast('Xatolik', 'error');
  }
}

// ── Buy Tokens & Check Upload ────────────────────────────────────────────────
async function openBuyTokensModal(type) {
  try {
    const res = await fetch('/api/payments/info');
    const data = await res.json();
    if (!data.success) return;

    const isHr = type === 'hr';
    const price = isHr ? data.hr_price : data.candidate_price;
    const tokens = isHr ? data.hr_tokens : data.candidate_tokens;
    const days = isHr ? data.hr_days : data.candidate_days;

    const html = `
      <div style="margin-bottom: 16px;">
        <div style="background: rgba(0, 102, 255, 0.12); border: 1px solid rgba(0, 102, 255, 0.3); padding: 14px; border-radius: 12px; margin-bottom: 16px;">
          <h4 style="font-size: 15px; font-weight: 700; color: #60a5fa; margin-bottom: 6px;">📦 ${isHr ? 'HR Tarif Paketi' : 'Nomzod Tarif Paketi'}</h4>
          <div style="font-size: 13px; color: #cbd5e1;">• Narxi: <strong style="color:#34d399;">${parseInt(price).toLocaleString('uz-UZ')} so'm</strong></div>
          <div style="font-size: 13px; color: #cbd5e1;">• Muxlati: <strong>${days} kun</strong></div>
          <div style="font-size: 13px; color: #cbd5e1;">• Tokenlar: <strong>${tokens} ta</strong></div>
        </div>

        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 14px; border-radius: 12px; margin-bottom: 16px;">
          <div style="font-size: 13px; color: var(--text-muted);">🏦 Karta raqami:</div>
          <div style="font-size: 18px; font-weight: 800; font-family: monospace; color: #fff; margin: 4px 0;">${escapeHtml(data.card_number)}</div>
          <div style="font-size: 13px; color: #cbd5e1;">👤 Ega: <strong>${escapeHtml(data.card_owner)}</strong></div>
        </div>

        <form id="upload-check-form" enctype="multipart/form-data">
          <div class="form-group">
            <label>To'lov Cheki (Screenshot yoki Rasm):</label>
            <input type="file" name="check_photo" accept="image/*" class="form-control" required>
          </div>
          <button type="submit" class="btn btn-success" style="margin-top: 10px;"><i class="fa-solid fa-upload"></i> Chekni Yuborish</button>
        </form>
      </div>
    `;

    openModal("💳 Token Xarid Va To'lov", html);

    document.getElementById('upload-check-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      formData.append('userId', state.user.userId);
      formData.append('userType', type);

      try {
        const resUpload = await fetch('/api/payments/upload', {
          method: 'POST',
          body: formData,
        });
        const dataUpload = await resUpload.json();
        if (dataUpload.success) {
          closeModal();
          showToast(dataUpload.message);
        } else {
          showToast(dataUpload.error || 'Xatolik', 'error');
        }
      } catch (err) {
        showToast('Fayl yuklashda xatolik', 'error');
      }
    });

  } catch (err) {
    showToast('Xatolik', 'error');
  }
}

// ── TAB 4: Admin Panel ────────────────────────────────────────────────────────
function renderAdminTab() {
  if (!state.user.isAdmin) return;

  const container = document.getElementById('admin-subtab-content');
  const subtabs = document.querySelectorAll('.admin-subtabs .subtab');

  subtabs.forEach(st => {
    st.addEventListener('click', () => {
      subtabs.forEach(s => s.classList.remove('active'));
      st.classList.add('active');
      state.activeAdminSubtab = st.dataset.subtab;
      loadAdminSubtabContent(st.dataset.subtab);
    });
  });

  loadAdminSubtabContent(state.activeAdminSubtab);
}

async function loadAdminSubtabContent(subtab) {
  const container = document.getElementById('admin-subtab-content');
  if (!container) return;

  if (subtab === 'stats') {
    try {
      const res = await fetch(`/api/admin/stats?userId=${state.user.userId}`);
      const data = await res.json();
      if (!data.success) return;
      const s = data.stats;

      container.innerHTML = `
        <div class="stats-grid" style="grid-template-columns: repeat(2, 1fr);">
          <div class="stat-box"><div class="num">${s.hr_total}</div><div class="label">Jami HR (Aktiv: ${s.hr_active})</div></div>
          <div class="stat-box"><div class="num">${s.cand_total}</div><div class="label">Jami Nomzod (Aktiv: ${s.cand_active})</div></div>
          <div class="stat-box"><div class="num" style="color:#34d399;">${s.vac_active}</div><div class="label">Aktiv Vakansiyalar</div></div>
          <div class="stat-box"><div class="num" style="color:#fbbf24;">${s.vac_pending}</div><div class="label">Kutilayotgan Vakansiyalar</div></div>
          <div class="stat-box"><div class="num" style="color:#fbbf24;">${s.resumes_pending}</div><div class="label">Kutilayotgan Rezyumelar</div></div>
          <div class="stat-box"><div class="num">${s.apps_total}</div><div class="label">Jami Arizalar</div></div>
          <div class="stat-box"><div class="num" style="color:#34d399;">${s.pay_approved}</div><div class="label">Tasdiqlangan To'lovlar</div></div>
          <div class="stat-box"><div class="num" style="color:#ef4444;">${s.pay_pending}</div><div class="label">Kutilayotgan To'lovlar</div></div>
        </div>
      `;
    } catch (err) {
      console.error(err);
    }
  }

  if (subtab === 'payments') {
    try {
      const res = await fetch(`/api/admin/payments?userId=${state.user.userId}`);
      const data = await res.json();
      if (!data.success) return;
      const list = data.payments || [];

      if (!list.length) {
        container.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-muted);">✅ Kutilayotgan to\'lovlar yo\'q</div>';
        return;
      }

      container.innerHTML = `
        <div class="cards-grid">
          ${list.map(p => `
            <div class="card" style="cursor:default;">
              <div class="card-header">
                <div class="card-title">To'lov #${p.id} (${p.user_type.toUpperCase()})</div>
                <div class="card-salary">${parseInt(p.amount).toLocaleString('uz-UZ')} so'm</div>
              </div>
              <div style="font-size:13px; color:#cbd5e1; margin-bottom:6px;">👤 ${escapeHtml(p.name)} | 📞 ${escapeHtml(p.phone)}</div>
              ${p.check_file_id ? `
                <div style="margin: 8px 0;">
                  <a href="${p.check_file_id}" target="_blank" class="btn btn-outline btn-sm"><i class="fa-solid fa-image"></i> Chek Rasmini Ochish</a>
                </div>
              ` : ''}
              <div style="display:flex; gap:8px; margin-top:10px;">
                <button class="btn btn-success btn-sm" onclick="approveAdminPayment(${p.id})"><i class="fa-solid fa-check"></i> Tasdiqlash</button>
                <button class="btn btn-danger btn-sm" onclick="rejectAdminPayment(${p.id})"><i class="fa-solid fa-xmark"></i> Rad Etish</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } catch (err) {
      console.error(err);
    }
  }

  if (subtab === 'banners') {
    try {
      const res = await fetch(`/api/admin/banners?userId=${state.user.userId}`);
      const data = await res.json();
      if (!data.success) return;
      const list = data.banners || [];
      const pending = list.filter(b => b.status === 'pending');

      if (!pending.length) {
        container.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-muted);">✅ Kutilayotgan reklama bannerlari yo\'q</div>';
        return;
      }

      container.innerHTML = `
        <div class="cards-grid">
          ${pending.map(b => `
            <div class="card" style="cursor:default;">
              <div class="card-header">
                <div class="card-title">Banner #${b.id} - ${escapeHtml(b.company_name)}</div>
                <div class="card-salary">${parseInt(b.price).toLocaleString('uz-UZ')} so'm (${b.duration_days} kun)</div>
              </div>
              <div style="font-size:13px; color:#cbd5e1; margin-bottom:6px;"><b>Sarlavha:</b> ${escapeHtml(b.title)}</div>
              ${b.image_url ? `
                <div style="margin: 8px 0; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color);">
                  <img src="${b.image_url}" alt="Banner" style="width: 100%; display: block; aspect-ratio: 16/7; object-fit: cover;">
                </div>
              ` : ''}
              <div style="display:flex; gap:8px; margin-top:10px;">
                <button class="btn btn-success btn-sm" onclick="approveAdminBanner(${b.id})"><i class="fa-solid fa-check"></i> Tasdiqlash</button>
                <button class="btn btn-danger btn-sm" onclick="rejectAdminBanner(${b.id})"><i class="fa-solid fa-xmark"></i> Rad Etish</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } catch (err) {
      console.error(err);
    }
  }


  if (subtab === 'pending-vacancies') {
    try {
      const res = await fetch(`/api/admin/vacancies/pending?userId=${state.user.userId}`);
      const data = await res.json();
      if (!data.success) return;
      const list = data.vacancies || [];

      if (!list.length) {
        container.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-muted);">✅ Kutilayotgan vakansiyalar yo\'q</div>';
        return;
      }

      container.innerHTML = `
        <div class="cards-grid">
          ${list.map(v => `
            <div class="card" style="cursor:default;">
              <div class="card-header">
                <div class="card-title">${escapeHtml(v.title)}</div>
                <div class="card-salary">${escapeHtml(v.salary)}</div>
              </div>
              <div class="card-company">🏢 ${escapeHtml(v.company_name || v.hr_company)} | 📞 ${escapeHtml(v.hr_phone)}</div>
              <div style="display:flex; gap:8px; margin-top:10px;">
                <button class="btn btn-success btn-sm" onclick="approveAdminVacancy(${v.id}, 0)"><i class="fa-solid fa-paper-plane"></i> Zudlik Bilan Nashr</button>
                <button class="btn btn-outline btn-sm" onclick="approveAdminVacancy(${v.id}, 20)"><i class="fa-solid fa-clock"></i> 20 Minutda</button>
                <button class="btn btn-danger btn-sm" onclick="rejectAdminVacancy(${v.id})"><i class="fa-solid fa-xmark"></i> Rad Etish</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } catch (err) {
      console.error(err);
    }
  }

  if (subtab === 'pending-resumes') {
    try {
      const res = await fetch(`/api/admin/resumes/pending?userId=${state.user.userId}`);
      const data = await res.json();
      if (!data.success) return;
      const list = data.resumes || [];

      if (!list.length) {
        container.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-muted);">✅ Kutilayotgan rezyumelar yo\'q</div>';
        return;
      }

      container.innerHTML = `
        <div class="cards-grid">
          ${list.map(r => `
            <div class="card" style="cursor:default;">
              <div class="card-header">
                <div class="card-title">${escapeHtml(r.position)}</div>
                <div class="card-salary">${escapeHtml(r.expected_salary)}</div>
              </div>
              <div class="card-company">👤 ${escapeHtml(r.full_name)} | 📞 ${escapeHtml(r.cand_phone)}</div>
              <div style="display:flex; gap:8px; margin-top:10px;">
                <button class="btn btn-success btn-sm" onclick="approveAdminResume(${r.id}, 0)"><i class="fa-solid fa-paper-plane"></i> Zudlik Bilan Nashr</button>
                <button class="btn btn-outline btn-sm" onclick="approveAdminResume(${r.id}, 20)"><i class="fa-solid fa-clock"></i> 20 Minutda</button>
                <button class="btn btn-danger btn-sm" onclick="rejectAdminResume(${r.id})"><i class="fa-solid fa-xmark"></i> Rad Etish</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } catch (err) {
      console.error(err);
    }
  }

  if (subtab === 'settings') {
    try {
      const res = await fetch(`/api/admin/settings?userId=${state.user.userId}`);
      const data = await res.json();
      if (!data.success) return;
      const s = data.settings;

      container.innerHTML = `
        <form id="admin-settings-form" class="profile-card" style="text-align:left;">
          <h4 style="font-size:15px; font-weight:700; margin-bottom:12px; color:#60a5fa;">💼 HR Sozlamalari</h4>
          <div class="form-group"><label>HR Narxi (so'm):</label><input type="text" name="hr_price" class="form-control" value="${escapeHtml(s.hr_price)}"></div>
          <div class="form-group"><label>HR Tokenlari (ta):</label><input type="text" name="hr_tokens" class="form-control" value="${escapeHtml(s.hr_tokens)}"></div>
          <div class="form-group"><label>HR Kunlari:</label><input type="text" name="hr_days" class="form-control" value="${escapeHtml(s.hr_days)}"></div>

          <h4 style="font-size:15px; font-weight:700; margin:16px 0 12px; color:#34d399;">👤 Nomzod Sozlamalari</h4>
          <div class="form-group"><label>Nomzod Narxi (so'm):</label><input type="text" name="candidate_price" class="form-control" value="${escapeHtml(s.candidate_price)}"></div>
          <div class="form-group"><label>Nomzod Tokenlari (ta):</label><input type="text" name="candidate_tokens" class="form-control" value="${escapeHtml(s.candidate_tokens)}"></div>
          <div class="form-group"><label>Nomzod Kunlari:</label><input type="text" name="candidate_days" class="form-control" value="${escapeHtml(s.candidate_days)}"></div>

          <h4 style="font-size:15px; font-weight:700; margin:16px 0 12px; color:#fbbf24;">💳 Karta Sozlamalari</h4>
          <div class="form-group"><label>Karta Raqami:</label><input type="text" name="card_number" class="form-control" value="${escapeHtml(s.card_number)}"></div>
          <div class="form-group"><label>Karta Egasi:</label><input type="text" name="card_owner" class="form-control" value="${escapeHtml(s.card_owner)}"></div>

          <h4 style="font-size:15px; font-weight:700; margin:16px 0 12px; color:#f472b6;">🎯 Reklama Banner Narxlari</h4>
          <div class="form-group"><label>3 Kunlik Banner Narxi (so'm):</label><input type="text" name="banner_price_3day" class="form-control" value="${escapeHtml(s.banner_price_3day || '99000')}"></div>
          <div class="form-group"><label>7 Kunlik Banner Narxi (so'm):</label><input type="text" name="banner_price_7day" class="form-control" value="${escapeHtml(s.banner_price_7day || '199000')}"></div>
          <div class="form-group"><label>14 Kunlik Banner Narxi (so'm):</label><input type="text" name="banner_price_14day" class="form-control" value="${escapeHtml(s.banner_price_14day || '349000')}"></div>

          <h4 style="font-size:15px; font-weight:700; margin:16px 0 12px; color:#38bdf8;">✨ AI Gemini Sozlamalari</h4>
          <div class="form-group"><label>Gemini API Key:</label><input type="password" name="gemini_api_key" class="form-control" value="${escapeHtml(s.gemini_api_key || '')}" placeholder="AIzaSy..."></div>
          <div class="form-group"><label>Gemini Model:</label><input type="text" name="gemini_model" class="form-control" value="${escapeHtml(s.gemini_model || 'gemini-2.5-flash')}"></div>

          <button type="submit" class="btn btn-primary" style="margin-top:14px;"><i class="fa-solid fa-floppy-disk"></i> Sozlamalarni Saqlash</button>
        </form>
      `;

      document.getElementById('admin-settings-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const settingsObj = {};
        formData.forEach((v, k) => settingsObj[k] = v.trim());

        try {
          const resSave = await fetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: state.user.userId, settings: settingsObj }),
          });
          const dataSave = await resSave.json();
          if (dataSave.success) showToast('Sozlamalar saqlandi!');
        } catch (err) {
          showToast('Xatolik', 'error');
        }
      });
    } catch (err) {
      console.error(err);
    }
  }
}

async function approveAdminPayment(paymentId) {
  try {
    const res = await fetch(`/api/admin/payments/${paymentId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: state.user.userId }),
    });
    const data = await res.json();
    if (data.success) {
      showToast('To\'lov tasdiqlandi!');
      loadAdminSubtabContent('payments');
    }
  } catch (err) { showToast('Xatolik', 'error'); }
}

async function rejectAdminPayment(paymentId) {
  const reason = prompt("Rad etish sababini kiriting:");
  try {
    const res = await fetch(`/api/admin/payments/${paymentId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: state.user.userId, reason }),
    });
    const data = await res.json();
    if (data.success) {
      showToast('To\'lov rad etildi!');
      loadAdminSubtabContent('payments');
    }
  } catch (err) { showToast('Xatolik', 'error'); }
}

async function approveAdminBanner(bannerId) {
  if (!confirm("Ushbu reklama bannerini tasdiqlab platformaga chiqarasizmi?")) return;
  try {
    const res = await fetch(`/api/admin/banners/${bannerId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: state.user.userId }),
    });
    const data = await res.json();
    if (data.success) {
      showToast('Banner faollashtirildi! 🎉');
      loadAdminSubtabContent('banners');
    } else {
      showToast(data.error || 'Xatolik', 'error');
    }
  } catch (err) { showToast('Xatolik', 'error'); }
}

async function rejectAdminBanner(bannerId) {
  const reason = prompt("Rad etish sababini kiriting (ixtiyoriy):");
  try {
    const res = await fetch(`/api/admin/banners/${bannerId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: state.user.userId, reason }),
    });
    const data = await res.json();
    if (data.success) {
      showToast('Banner rad etildi!');
      loadAdminSubtabContent('banners');
    }
  } catch (err) { showToast('Xatolik', 'error'); }
}


async function approveAdminVacancy(vacancyId, delayMinutes) {
  try {
    const res = await fetch(`/api/admin/vacancies/${vacancyId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: state.user.userId, delayMinutes }),
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message);
      loadAdminSubtabContent('pending-vacancies');
    }
  } catch (err) { showToast('Xatolik', 'error'); }
}

async function rejectAdminVacancy(vacancyId) {
  const reason = prompt("Rad etish sababini kiriting:");
  try {
    const res = await fetch(`/api/admin/vacancies/${vacancyId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: state.user.userId, reason }),
    });
    const data = await res.json();
    if (data.success) {
      showToast('Vakansiya rad etildi');
      loadAdminSubtabContent('pending-vacancies');
    }
  } catch (err) { showToast('Xatolik', 'error'); }
}

async function approveAdminResume(resumeId, delayMinutes) {
  try {
    const res = await fetch(`/api/admin/resumes/${resumeId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: state.user.userId, delayMinutes }),
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message);
      loadAdminSubtabContent('pending-resumes');
    }
  } catch (err) { showToast('Xatolik', 'error'); }
}

async function rejectAdminResume(resumeId) {
  const reason = prompt("Rad etish sababini kiriting:");
  try {
    const res = await fetch(`/api/admin/resumes/${resumeId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: state.user.userId, reason }),
    });
    const data = await res.json();
    if (data.success) {
      showToast('Rezyume rad etildi');
      loadAdminSubtabContent('pending-resumes');
    }
  } catch (err) { showToast('Xatolik', 'error'); }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── ✅ VACANCY PREVIEW & CONFIRM ─────────────────────────────────────────────
function showVacancyPreview(payload) {
  const isManual = payload.creationType === 'manual';

  const previewHtml = `
    <div class="preview-card" id="vacancy-preview-card">
      <div class="preview-header">
        <div class="preview-badge"><i class="fa-solid fa-eye"></i> Ko'rinish: Kanalda Shunday Chiqadi</div>
      </div>

      <div class="preview-body">
        <div class="preview-title" data-field="title" data-label="Lavozim Nomi">${escapeHtml(payload.title)}</div>
        <div class="preview-company" data-field="companyName" data-label="Kompaniya Nomi">
          <i class="fa-solid fa-building"></i> ${escapeHtml(payload.companyName)}
        </div>
        <div class="preview-salary" data-field="salary" data-label="Maosh">💰 ${escapeHtml(payload.salary)}</div>

        <div class="preview-tags">
          <span class="tag-item" data-field="location" data-label="Manzil"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(payload.location)}</span>
          <span class="tag-item" data-field="workTime" data-label="Ish Vaqti"><i class="fa-solid fa-clock"></i> ${escapeHtml(payload.workTime)}</span>
          <span class="tag-item"><i class="fa-solid fa-folder"></i> ${escapeHtml(payload.category)}</span>
        </div>

        ${isManual && payload.rawText ? `
          <div class="preview-section" data-field="rawText" data-label="E'lon Matni">
            <pre class="preview-text">${escapeHtml(payload.rawText)}</pre>
          </div>
        ` : `
          ${payload.tasks ? `
            <div class="preview-section" data-field="tasks" data-label="Asosiy Vazifalar">
              <div class="preview-section-title">🎯 Asosiy Vazifalar:</div>
              <pre class="preview-text">${escapeHtml(payload.tasks)}</pre>
            </div>` : ''}
          ${payload.requirements ? `
            <div class="preview-section" data-field="requirements" data-label="Talablar">
              <div class="preview-section-title">✍️ Talablar:</div>
              <pre class="preview-text">${escapeHtml(payload.requirements)}</pre>
            </div>` : ''}
          ${payload.conditions ? `
            <div class="preview-section" data-field="conditions" data-label="Sharoitlar">
              <div class="preview-section-title">✅ Sharoitlar:</div>
              <pre class="preview-text">${escapeHtml(payload.conditions)}</pre>
            </div>` : ''}
        `}
      </div>

      <div class="preview-hint"><i class="fa-solid fa-circle-info"></i> Tahrirlash uchun maydon ustiga bosing</div>

      <div class="preview-actions">
        <button class="btn btn-outline" id="vac-preview-edit-btn" style="flex:1;">
          <i class="fa-solid fa-pen-to-square"></i> Tahrirlash
        </button>
        <button class="btn btn-primary" id="vac-preview-confirm-btn" style="flex:2;">
          <i class="fa-solid fa-paper-plane"></i> Tasdiqlash va Yuborish
        </button>
      </div>
    </div>

    <div id="vac-inline-edit-container" style="display:none;"></div>
  `;

  openModal('👁 E\'lon Ko\'rinishi — Tasdiqlang', previewHtml);

  // Enable tap-to-edit on each editable field
  document.querySelectorAll('#vacancy-preview-card [data-field]').forEach(el => {
    el.classList.add('preview-editable');
    el.addEventListener('click', () => {
      openVacancyFieldEditor(el.dataset.field, el.dataset.label, payload);
    });
  });

  // Edit button — go back to form (re-open form with current data)
  document.getElementById('vac-preview-edit-btn').addEventListener('click', () => {
    closeModal();
    openCreateVacancyModalWithData(payload);
  });

  // Confirm button — submit to server
  document.getElementById('vac-preview-confirm-btn').addEventListener('click', async () => {
    const btn = document.getElementById('vac-preview-confirm-btn');
    if (!btn) return;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Yuborilmoqda...';

    try {
      const res = await fetch('/api/hr/vacancies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        closeModal();
        showToast('✅ ' + data.message);
        await authenticateUser();
        loadHrVacanciesTab();
        if (data.requiresPayment) {
          setTimeout(() => {
            openBuyTokensModal('hr');
          }, 500);
        }
      } else {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Tasdiqlash va Yuborish';
        showToast(data.error || 'Xatolik yuz berdi', 'error');
      }
    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Tasdiqlash va Yuborish';
      showToast(err.message || 'Xatolik yuz berdi', 'error');
    }
  });
}

function openVacancyFieldEditor(fieldKey, fieldLabel, payload) {
  const isTextarea = ['tasks', 'requirements', 'conditions', 'rawText'].includes(fieldKey);
  const currentVal = payload[fieldKey] || '';

  const editorHtml = `
    <div class="inline-edit-panel">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <div class="inline-edit-label" style="margin-bottom:0;"><i class="fa-solid fa-pen"></i> ${escapeHtml(fieldLabel)} ni tahrirlang:</div>
        ${isTextarea ? `<button type="button" class="btn-ai-improve" onclick="enhanceTextWithAI('field-edit-input', this, 'vacancy')"><i class="fa-solid fa-wand-magic-sparkles"></i> ✨ AI bilan yaxshilash</button>` : ''}
      </div>
      ${isTextarea
        ? `<textarea id="field-edit-input" class="form-control" style="min-height:100px;">${escapeHtml(currentVal)}</textarea>`
        : `<input type="text" id="field-edit-input" class="form-control" value="${escapeHtml(currentVal)}">`
      }
      <div style="display:flex; gap:8px; margin-top:12px;">
        <button class="btn btn-outline" id="field-edit-cancel" style="flex:1;"><i class="fa-solid fa-xmark"></i> Bekor</button>
        <button class="btn btn-primary" id="field-edit-save" style="flex:2;"><i class="fa-solid fa-check"></i> Saqlash</button>
      </div>
    </div>
  `;

  const container = document.getElementById('vac-inline-edit-container');
  const previewCard = document.getElementById('vacancy-preview-card');
  if (!container || !previewCard) return;

  previewCard.style.display = 'none';
  container.style.display = 'block';
  container.innerHTML = editorHtml;

  const input = document.getElementById('field-edit-input');
  if (input) { input.focus(); input.select(); }

  document.getElementById('field-edit-cancel').addEventListener('click', () => {
    container.style.display = 'none';
    previewCard.style.display = 'block';
  });

  document.getElementById('field-edit-save').addEventListener('click', () => {
    const newVal = document.getElementById('field-edit-input').value.trim();
    payload[fieldKey] = newVal;
    container.style.display = 'none';
    // Rebuild the preview to reflect changes
    closeModal();
    showVacancyPreview(payload);
  });
}

function openCreateVacancyModalWithData(prefill) {
  // Re-open the vacancy creation modal but pre-fill with saved payload data
  openCreateVacancyModal();
  // We must wait for the modal DOM to be ready
  setTimeout(() => {
    if (prefill.category) {
      const catBtn = document.querySelector(`.category-chip-btn[data-cat="${prefill.category}"]`);
      if (catBtn) catBtn.click();
    }
    // After category click unlocks the form, fill values
    setTimeout(() => {
      if (prefill.title) setInputValue('vac-title', prefill.title);
      if (prefill.salary) setInputValue('vac-salary', prefill.salary);
      if (prefill.location) setInputValue('vac-location', prefill.location);
      if (prefill.workTime) setInputValue('vac-worktime', prefill.workTime);
      if (prefill.tasks) setInputValue('vac-tasks', prefill.tasks);
      if (prefill.requirements) setInputValue('vac-reqs', prefill.requirements);
      if (prefill.conditions) setInputValue('vac-conds', prefill.conditions);
      if (prefill.rawText) setInputValue('vac-rawtext', prefill.rawText);
    }, 150);
  }, 100);
}

// ── 📄 PROFESSIONAL PDF RESUME GENERATOR ────────────────────────────────────
function generateResumePdfHtml(payload) {
  const pData = payload.pdfData || {};
  const photo = pData.photo || (payload.photo_url || '');
  const phone = pData.phone || (payload.cand_phone || payload.phone || '');
  const rawTelegram = pData.telegram || (payload.telegram_username || '');
  const telegram = rawTelegram ? (rawTelegram.startsWith('@') ? rawTelegram : '@' + rawTelegram) : '';

  // DIRECTIVE C ENFORCEMENT: ONLY phone and telegram in contacts!
  // NO EMAIL, NO LOCATION, NO LINKEDIN!

  // Parse Skills & Progress percentages
  const rawSkillsStr = payload.skills || '';
  const skillsList = [];
  if (rawSkillsStr) {
    const defaultPercents = [90, 85, 85, 75, 70, 70, 80, 75, 65, 60];
    const items = rawSkillsStr.split(/[\n,·•]/).map(s => s.trim()).filter(Boolean);
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

  // Parse Languages & Levels
  const rawLangs = pData.languages || payload.languages || '';
  const languagesList = [];
  if (rawLangs) {
    const langItems = rawLangs.split(/[\n,·•]/).map(s => s.trim()).filter(Boolean);
    langItems.forEach(item => {
      const parts = item.split(/[-—:]/);
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const level = parts[1].trim();
        let percent = 70;
        if (/ona|rodnoy|native|100%/i.test(level)) percent = 100;
        else if (/c2|95%/i.test(level)) percent = 95;
        else if (/c1|85%/i.test(level)) percent = 85;
        else if (/b2|75%/i.test(level)) percent = 75;
        else if (/b1|65%/i.test(level)) percent = 65;
        else if (/a2|55%/i.test(level)) percent = 55;
        else if (/a1|45%/i.test(level)) percent = 45;
        languagesList.push({ name, level, percent });
      } else if (item) {
        languagesList.push({ name: item, level: 'B2', percent: 75 });
      }
    });
  }

  // Parse Interests
  const rawInterests = pData.interests || '';
  const interestsList = rawInterests ? rawInterests.split(/[\n,·•]/).map(s => s.trim()).filter(Boolean) : [];

  // Parse Work History
  const rawWork = pData.workHistory || payload.experience_details || '';
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
          role: parts[1] || payload.position || '',
          company: parts[2] || '',
          description: parts.slice(3).join(' | ')
        };
      } else if (currentEntry) {
        currentEntry.description = (currentEntry.description ? currentEntry.description + '\n' : '') + line;
      } else {
        workEntries.push({
          dates: payload.experienceYears || payload.experience_years || '',
          role: payload.position || '',
          company: payload.city || '',
          description: line
        });
      }
    });
    if (currentEntry) workEntries.push(currentEntry);
  }

  // Parse Education History
  const rawEdu = pData.eduHistory || payload.education || '';
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

  // Parse Projects
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

  return `
    <div class="pdf-cv-container">
      <!-- LEFT SIDEBAR -->
      <div class="pdf-sidebar">
        <div class="pdf-photo-wrapper pdf-avatar-box">
          ${photo ? `
            <img src="${escapeHtml(photo)}" alt="Profile Photo" class="pdf-photo-img" crossorigin="anonymous">
          ` : `
            <div class="pdf-photo-placeholder"><i class="fa-solid fa-user"></i></div>
          `}
        </div>

        ${(phone || telegram) ? `
          <div class="pdf-sidebar-section">
            <div class="pdf-sidebar-title"><i class="fa-solid fa-address-book"></i> ${t('contacts')}</div>
            <div class="pdf-contact-list">
              ${phone ? `<div class="pdf-contact-item"><i class="fa-solid fa-phone"></i> ${escapeHtml(phone)}</div>` : ''}
              ${telegram ? `<div class="pdf-contact-item"><i class="fa-brands fa-telegram"></i> ${escapeHtml(telegram)}</div>` : ''}
            </div>
          </div>
        ` : ''}

        ${skillsList.length ? `
          <div class="pdf-sidebar-section">
            <div class="pdf-sidebar-title"><i class="fa-solid fa-brain"></i> ${t('skills')}</div>
            ${skillsList.map(s => `
              <div class="pdf-skill-item">
                <div class="pdf-skill-info">
                  <span class="pdf-skill-name">${escapeHtml(s.name)}</span>
                  <span class="pdf-skill-percent">${s.percent}%</span>
                </div>
                <div class="pdf-skill-bar">
                  <div class="pdf-skill-fill" style="width: ${s.percent}%;"></div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${languagesList.length ? `
          <div class="pdf-sidebar-section">
            <div class="pdf-sidebar-title"><i class="fa-solid fa-globe"></i> ${t('languages')}</div>
            ${languagesList.map(l => `
              <div class="pdf-skill-item">
                <div class="pdf-skill-info">
                  <span class="pdf-skill-name">${escapeHtml(l.name)}</span>
                  <span class="pdf-skill-percent">${escapeHtml(l.level)}</span>
                </div>
                <div class="pdf-skill-bar">
                  <div class="pdf-skill-fill" style="width: ${l.percent}%;"></div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${interestsList.length ? `
          <div class="pdf-sidebar-section">
            <div class="pdf-sidebar-title"><i class="fa-solid fa-heart"></i> ${t('interests')}</div>
            <div class="pdf-interests-chips">
              ${interestsList.map(item => `<span class="pdf-interest-chip">${escapeHtml(item)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      <!-- MAIN CONTENT (RIGHT COLUMN) -->
      <div class="pdf-main-content">
        <div class="pdf-header-block">
          <h1 class="pdf-candidate-name">${escapeHtml(payload.fullName || payload.full_name || 'Nomzod')}</h1>
          <div class="pdf-candidate-title">${escapeHtml(payload.position || '')}</div>
          <div class="pdf-quick-stats">
            ${pData.age ? `
              <div class="pdf-stat-box">
                <i class="fa-solid fa-cake-candles"></i>
                <div>
                  <span class="pdf-stat-label">${t('age')}</span>
                  <span class="pdf-stat-val">${escapeHtml(pData.age)}</span>
                </div>
              </div>
            ` : ''}
            ${(payload.experienceYears || payload.experience_years) ? `
              <div class="pdf-stat-box">
                <i class="fa-solid fa-briefcase"></i>
                <div>
                  <span class="pdf-stat-label">${t('experience')}</span>
                  <span class="pdf-stat-val">${escapeHtml(payload.experienceYears || payload.experience_years)}</span>
                </div>
              </div>
            ` : ''}
            ${(payload.employmentType || payload.employment_type) ? `
              <div class="pdf-stat-box">
                <i class="fa-solid fa-user-graduate"></i>
                <div>
                  <span class="pdf-stat-label">${t('employment')}</span>
                  <span class="pdf-stat-val">${escapeHtml(payload.employmentType || payload.employment_type)}</span>
                </div>
              </div>
            ` : ''}
            ${(payload.expectedSalary || payload.expected_salary) ? `
              <div class="pdf-stat-box">
                <i class="fa-solid fa-wallet"></i>
                <div>
                  <span class="pdf-stat-label">${t('salary')}</span>
                  <span class="pdf-stat-val">${escapeHtml(payload.expectedSalary || payload.expected_salary)}</span>
                </div>
              </div>
            ` : ''}
          </div>
        </div>

        ${(payload.aboutMe || payload.about_me) ? `
          <div class="pdf-main-section">
            <div class="pdf-main-title"><i class="fa-solid fa-user"></i> ${t('about_me')}</div>
            <div class="pdf-main-text">${escapeHtml(payload.aboutMe || payload.about_me)}</div>
          </div>
        ` : ''}

        ${workEntries.length ? `
          <div class="pdf-main-section">
            <div class="pdf-main-title"><i class="fa-solid fa-briefcase"></i> ${t('work_experience')}</div>
            <div class="pdf-timeline">
              ${workEntries.map(w => `
                <div class="pdf-timeline-item">
                  <div class="pdf-timeline-date">${escapeHtml(w.dates || '')}</div>
                  <div class="pdf-timeline-content">
                    <div class="pdf-timeline-title">${escapeHtml(w.role || '')}</div>
                    <div class="pdf-timeline-sub">${escapeHtml(w.company || '')}</div>
                    ${w.description ? `<div class="pdf-timeline-desc">${escapeHtml(w.description)}</div>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ((payload.experienceYears || payload.experience_years) && (payload.experienceYears || payload.experience_years) !== 'Tajribasiz' ? `
          <div class="pdf-main-section">
            <div class="pdf-main-title"><i class="fa-solid fa-briefcase"></i> ${t('work_experience')}</div>
            <div class="pdf-timeline">
              <div class="pdf-timeline-item">
                <div class="pdf-timeline-date">${t('experience')}: ${escapeHtml(payload.experienceYears || payload.experience_years)}</div>
                <div class="pdf-timeline-content">
                  <div class="pdf-timeline-title">${escapeHtml(payload.position || '')}</div>
                  <div class="pdf-timeline-sub">${escapeHtml(payload.city || 'Toshkent')}</div>
                </div>
              </div>
            </div>
          </div>
        ` : '')}

        ${eduEntries.length ? `
          <div class="pdf-main-section">
            <div class="pdf-main-title"><i class="fa-solid fa-graduation-cap"></i> ${t('education')}</div>
            <div class="pdf-timeline">
              ${eduEntries.map(e => `
                <div class="pdf-timeline-item">
                  <div class="pdf-timeline-date">${escapeHtml(e.dates || '')}</div>
                  <div class="pdf-timeline-content">
                    <div class="pdf-timeline-title">${escapeHtml(e.institution || '')}</div>
                    <div class="pdf-timeline-sub">${escapeHtml(e.degree || '')}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${projectEntries.length ? `
          <div class="pdf-main-section">
            <div class="pdf-main-title"><i class="fa-solid fa-laptop-code"></i> ${t('key_projects')}</div>
            ${projectEntries.map(p => `
              <div class="pdf-project-card">
                <div class="pdf-project-header">
                  <div class="pdf-project-title">${escapeHtml(p.name)}</div>
                  ${p.url ? `<div class="pdf-project-link"><i class="fa-solid fa-link"></i> ${escapeHtml(p.url)}</div>` : ''}
                </div>
                ${p.desc ? `<div class="pdf-project-desc">${escapeHtml(p.desc)}</div>` : ''}
                ${p.tags && p.tags.length ? `
                  <div class="pdf-project-tags">
                    ${p.tags.map(t => `<span class="pdf-project-tag">${escapeHtml(t)}</span>`).join('')}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${pData.additionalInfo ? `
          <div class="pdf-main-section">
            <div class="pdf-main-title"><i class="fa-solid fa-star"></i> ${t('additional_info')}</div>
            <div class="pdf-main-text">${escapeHtml(pData.additionalInfo)}</div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

window.downloadResumePdfFromPayload = (payload) => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '794px';
  container.innerHTML = generateResumePdfHtml(payload);
  document.body.appendChild(container);

  const nameStr = (payload.fullName || payload.full_name || 'Resume').replace(/\s+/g, '_');
  const filename = `${nameStr}_CV.pdf`;
  const opt = {
    margin: 0,
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  showToast('📄 PDF rezyume tayyorlanmoqda...');

  if (window.html2pdf) {
    window.html2pdf().set(opt).from(container.firstElementChild).save().then(() => {
      if (document.body.contains(container)) document.body.removeChild(container);
      showToast('✅ PDF muvaffaqiyatli yuklab olindi!');
    }).catch(err => {
      console.error(err);
      if (document.body.contains(container)) document.body.removeChild(container);
      showToast('PDF yuklab olishda xatolik yuz berdi', 'error');
    });
  } else {
    showToast('html2pdf yuklanmagan, brauzer orqali chop etishga o\'tilmoqda');
    window.print();
    if (document.body.contains(container)) document.body.removeChild(container);
  }
};

window.previewResumePdfModal = (payload) => {
  window._activePdfPayload = payload;
  const html = `
    <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; background: rgba(0, 102, 255, 0.08); padding: 10px 14px; border-radius: 10px;">
      <span style="font-size: 13px; font-weight: 600; color: #00D2FF;"><i class="fa-solid fa-file-pdf"></i> PDF Rezyume Namoyishi</span>
      <button class="btn btn-success btn-sm" onclick="downloadResumePdfFromPayload(window._activePdfPayload)">
        <i class="fa-solid fa-download"></i> PDF Yuklab Olish
      </button>
    </div>
    <div style="max-height: 70vh; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 12px; background: #525659; padding: 16px; display: flex; justify-content: center;">
      <div style="width: 794px; transform-origin: top center; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        ${generateResumePdfHtml(payload)}
      </div>
    </div>
  `;
  openModal('📄 Professional PDF Rezyume', html);
};

window.downloadResumePdfById = (id) => {
  const lang = state.lang === 'ru' ? 'ru' : 'uz';
  const url = `/api/candidate/resumes/${id}/pdf?userId=${state.user?.userId || ''}&lang=${lang}`;
  window.open(url, '_blank');
};

// ── ✅ RESUME PREVIEW & CONFIRM ───────────────────────────────────────────────
function showResumePreview(payload) {
  const isManual = payload.creationType === 'manual';

  const previewHtml = `
    <div class="preview-card" id="resume-preview-card">
      <div class="preview-header">
        <div class="preview-badge"><i class="fa-solid fa-eye"></i> Ko'rinish: Kanalda Shunday Chiqadi</div>
      </div>

      <div class="preview-body">
        <div class="preview-title" data-field="position" data-label="Lavozim">${escapeHtml(payload.position)}</div>
        <div class="preview-company" data-field="fullName" data-label="Ism Familiya">
          <i class="fa-solid fa-user-tie"></i> ${escapeHtml(payload.fullName)}
        </div>
        <div class="preview-salary" data-field="expectedSalary" data-label="Kutilayotgan Maosh">💰 ${escapeHtml(payload.expectedSalary)}</div>

        <div class="preview-tags">
          <span class="tag-item" data-field="city" data-label="Shahar"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(payload.city)}</span>
          <span class="tag-item" data-field="experienceYears" data-label="Tajriba"><i class="fa-solid fa-briefcase"></i> ${escapeHtml(payload.experienceYears)}</span>
          <span class="tag-item" data-field="employmentType" data-label="Bandlik Turi"><i class="fa-solid fa-clock"></i> ${escapeHtml(payload.employmentType)}</span>
          <span class="tag-item"><i class="fa-solid fa-folder"></i> ${escapeHtml(payload.category)}</span>
        </div>

        ${isManual && payload.rawText ? `
          <div class="preview-section" data-field="rawText" data-label="Rezyume Matni">
            <pre class="preview-text">${escapeHtml(payload.rawText)}</pre>
          </div>
        ` : `
          ${payload.aboutMe ? `
            <div class="preview-section" data-field="aboutMe" data-label="O'zingiz Haqida">
              <div class="preview-section-title">📝 O'zim haqida:</div>
              <pre class="preview-text">${escapeHtml(payload.aboutMe)}</pre>
            </div>` : ''}
          ${payload.skills ? `
            <div class="preview-section" data-field="skills" data-label="Ko'nikmalar">
              <div class="preview-section-title">🧠 Ko'nikmalar:</div>
              <pre class="preview-text">${escapeHtml(payload.skills)}</pre>
            </div>` : ''}
        `}
      </div>

      <div class="preview-hint"><i class="fa-solid fa-circle-info"></i> Tahrirlash uchun maydon ustiga bosing</div>

      <div class="preview-actions" style="display:flex; gap:6px; flex-wrap:wrap;">
        <button class="btn btn-outline" id="res-preview-edit-btn" style="flex:1;">
          <i class="fa-solid fa-pen-to-square"></i> Tahrirlash
        </button>
        <button class="btn btn-primary" id="res-preview-pdf-btn" style="flex:1.2;">
          <i class="fa-solid fa-file-pdf"></i> 📄 PDF Ko'rish
        </button>
        <button class="btn btn-success" id="res-preview-confirm-btn" style="flex:1.8;">
          <i class="fa-solid fa-paper-plane"></i> Tasdiqlash va Saqlash
        </button>
      </div>
    </div>

    <div id="res-inline-edit-container" style="display:none;"></div>
  `;

  openModal('👁 Rezyume Ko\'rinishi — Tasdiqlang', previewHtml);

  // Enable PDF preview button
  document.getElementById('res-preview-pdf-btn').addEventListener('click', () => {
    previewResumePdfModal(payload);
  });

  // Enable tap-to-edit on each editable field
  document.querySelectorAll('#resume-preview-card [data-field]').forEach(el => {
    el.classList.add('preview-editable');
    el.addEventListener('click', () => {
      openResumeFieldEditor(el.dataset.field, el.dataset.label, payload);
    });
  });

  // Edit button — go back to form with pre-filled data
  document.getElementById('res-preview-edit-btn').addEventListener('click', () => {
    closeModal();
    openCreateResumeModalWithData(payload);
  });

  // Confirm button — submit to server
  document.getElementById('res-preview-confirm-btn').addEventListener('click', async () => {
    const btn = document.getElementById('res-preview-confirm-btn');
    if (!btn) return;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saqlanmoqda...';

    try {
      const isEditing = Boolean(state.editingResumeId);
      const url = isEditing ? `/api/candidate/resumes/${state.editingResumeId}` : '/api/candidate/resumes';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        closeModal();
        showToast('✅ ' + data.message);
        const savedResumeId = data.resumeId || state.editingResumeId;
        state.editingResumeId = null;
        await authenticateUser();

        // Resume yaratilgach darhol mos vakansiyalar statistikasi va HR yuborish taklifi ko'rsatiladi
        if (savedResumeId) {
          setTimeout(() => {
            checkMatchingVacanciesOffer(savedResumeId);
          }, 300);
        } else {
          switchTab('resumes');
        }
      } else {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Tasdiqlash va Saqlash';
        showToast(data.error || 'Xatolik yuz berdi', 'error');
      }
    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Tasdiqlash va Saqlash';
      showToast(err.message || 'Xatolik yuz berdi', 'error');
    }
  });
}

function openResumeFieldEditor(fieldKey, fieldLabel, payload) {
  const isTextarea = ['aboutMe', 'skills', 'rawText'].includes(fieldKey);
  const currentVal = payload[fieldKey] || '';

  const editorHtml = `
    <div class="inline-edit-panel">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <div class="inline-edit-label" style="margin-bottom:0;"><i class="fa-solid fa-pen"></i> ${escapeHtml(fieldLabel)} ni tahrirlang:</div>
        ${isTextarea ? `<button type="button" class="btn-ai-improve" onclick="enhanceTextWithAI('field-edit-input', this)"><i class="fa-solid fa-wand-magic-sparkles"></i> ✨ AI bilan yaxshilash</button>` : ''}
      </div>
      ${isTextarea
        ? `<textarea id="field-edit-input" class="form-control" style="min-height:100px;">${escapeHtml(currentVal)}</textarea>`
        : `<input type="text" id="field-edit-input" class="form-control" value="${escapeHtml(currentVal)}">`
      }
      <div style="display:flex; gap:8px; margin-top:12px;">
        <button class="btn btn-outline" id="field-edit-cancel" style="flex:1;"><i class="fa-solid fa-xmark"></i> Bekor</button>
        <button class="btn btn-success" id="field-edit-save" style="flex:2;"><i class="fa-solid fa-check"></i> Saqlash</button>
      </div>
    </div>
  `;

  const container = document.getElementById('res-inline-edit-container');
  const previewCard = document.getElementById('resume-preview-card');
  if (!container || !previewCard) return;

  previewCard.style.display = 'none';
  container.style.display = 'block';
  container.innerHTML = editorHtml;

  const input = document.getElementById('field-edit-input');
  if (input) { input.focus(); input.select(); }

  document.getElementById('field-edit-cancel').addEventListener('click', () => {
    container.style.display = 'none';
    previewCard.style.display = 'block';
  });

  document.getElementById('field-edit-save').addEventListener('click', () => {
    const newVal = document.getElementById('field-edit-input').value.trim();
    payload[fieldKey] = newVal;
    container.style.display = 'none';
    // Rebuild the preview to reflect changes
    closeModal();
    showResumePreview(payload);
  });
}

function openCreateResumeModalWithData(prefill) {
  openCreateResumeModal();
  setTimeout(() => {
    if (prefill.category) {
      const catBtn = document.querySelector(`.category-chip-btn[data-cat="${prefill.category}"]`);
      if (catBtn) catBtn.click();
    }
    setTimeout(() => {
      if (prefill.fullName) setInputValue('res-fullname', prefill.fullName);
      if (prefill.position) setInputValue('res-position', prefill.position);
      if (prefill.city) setInputValue('res-city', prefill.city);
      if (prefill.experienceYears) setInputValue('res-exp', prefill.experienceYears);
      if (prefill.expectedSalary) setInputValue('res-salary', prefill.expectedSalary);
      if (prefill.employmentType) setInputValue('res-emptype', prefill.employmentType);
      if (prefill.aboutMe) setInputValue('res-aboutme', prefill.aboutMe);
      if (prefill.skills) setInputValue('res-skills', prefill.skills);
      if (prefill.rawText) setInputValue('res-rawtext', prefill.rawText);
    }, 150);
  }, 100);
}

// ── BANNER CREATION ─────────────────────────────────────────────────────────
async function openCreateBannerModal() {
  if (!state.user.hr) return showToast('Siz HR sifatida ro\'yxatdan o\'tmagansiz!', 'error');
  
  // Faol vakansiyalarni yuklash
  let vacanciesHtml = '<option value="">(Vakansiyaga ulanmasin)</option>';
  try {
    const res = await fetch(`/api/hr/vacancies?userId=${state.user.userId}`);
    const data = await res.json();
    if (data.success && data.vacancies) {
      data.vacancies.forEach(v => {
        if (v.status === 'active' || v.status === 'pending') {
          vacanciesHtml += `<option value="${v.id}">📌 #${v.id} — ${escapeHtml(v.title)} (${v.status === 'active' ? 'Aktiv' : 'Tekshiruvda'})</option>`;
        }
      });
    }
  } catch(e) {}

  const p3 = parseInt(state.settings?.banner_price_3day || '99000');
  const p7 = parseInt(state.settings?.banner_price_7day || '199000');
  const p14 = parseInt(state.settings?.banner_price_14day || '349000');

  const html = `
    <div style="padding: 10px;">
      <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 15px; line-height: 1.5;">
        🚀 <strong>Kompaniyangiz vakansiyasini premium rasmli banner ko'rinishida e'lon qiling!</strong><br>
        Banner platformadagi barcha foydalanuvchilarga eng yuqori qismda rotatsiya bo'lib ko'rinadi va "Ariza qoldirish" tugmasi orqali nomzodlarni to'g'ri vakansiyangizga yo'naltiradi.
      </p>

      <form id="create-banner-form" onsubmit="submitCreateBanner(event)">
        
        <div class="form-group">
          <label>1. Kompaniya Nomi <span class="required">*</span></label>
          <input type="text" id="banner-company-name" name="companyName" class="form-control" value="${escapeHtml(state.user.hr?.company_name || '')}" placeholder="Kompaniyangiz nomi" required>
        </div>

        <div class="form-group">
          <label>2. Qaysi Vakansiyaga Yo'naltirilsin? <span class="required">*</span></label>
          <select id="banner-vacancy-id" name="vacancyId" class="form-control" required>
            ${vacanciesHtml}
          </select>
          <small style="color: var(--text-muted); font-size: 11px;">Banner va "Ariza qoldirish" tugmasi bosilganda shu vakansiya ochiladi</small>
        </div>

        <div class="form-group">
          <label>3. Banner Rasmini Yuklang <span class="required">*</span></label>
          <input type="file" id="banner-image" name="image" accept="image/*" class="form-control" required>
          <small style="color: var(--text-muted); font-size: 11px; display: block; margin-top: 4px;">
            📐 <strong>Tavsiya etiladigan standart hajm:</strong> 1200x525 px (16:7 nisbat). Har qanday mobil va kompyuter ekraniga moslashadi.
          </small>
        </div>

        <div class="form-group">
          <label>4. Banner Sarlavhasi (Katta matn) <span class="required">*</span></label>
          <input type="text" id="banner-title" name="title" class="form-control" placeholder="Masalan: Tajribali Sotuv Menejeri Qidirmoqdamiz!" required>
        </div>

        <div class="form-group">
          <label>5. Qisqacha Ma'lumot / Imtiyozlar</label>
          <input type="text" id="banner-subtitle" name="subtitle" class="form-control" placeholder="Masalan: Maosh 8 000 000 so'm + KPI bonuslar">
        </div>

        <div class="form-group">
          <label>6. Tugma Matni (CTA Button)</label>
          <input type="text" id="banner-cta" name="ctaText" class="form-control" value="Ariza qoldirish" placeholder="Ariza qoldirish / Batafsil">
        </div>

        <div class="form-group">
          <label>7. Reklama Tarifini Tanlang <span class="required">*</span></label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 5px;">
            <label class="banner-plan-card active">
              <input type="radio" name="plan" value="3_days" data-price="${p3}" data-days="3" checked style="display:none;" onchange="updateBannerTotal()">
              <h4>3 Kun</h4>
              <div class="price">${p3.toLocaleString('uz-UZ')} so'm</div>
            </label>
            <label class="banner-plan-card">
              <input type="radio" name="plan" value="7_days" data-price="${p7}" data-days="7" style="display:none;" onchange="updateBannerTotal()">
              <h4>7 Kun</h4>
              <div class="price">${p7.toLocaleString('uz-UZ')} so'm</div>
            </label>
            <label class="banner-plan-card" style="grid-column: span 2;">
              <input type="radio" name="plan" value="14_days" data-price="${p14}" data-days="14" style="display:none;" onchange="updateBannerTotal()">
              <h4>14 Kun</h4>
              <div class="price">${p14.toLocaleString('uz-UZ')} so'm</div>
            </label>
          </div>
        </div>

        <div style="background: var(--card-bg); border-radius: 8px; padding: 12px; margin: 15px 0; border: 1px solid var(--border-color); text-align: center;">
          <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 5px;">To'lanadigan summa:</div>
          <div id="banner-total-price" style="font-size: 24px; font-weight: 800; color: var(--primary);">${p3.toLocaleString('uz-UZ')} so'm</div>
        </div>

        <div style="background: rgba(0, 102, 255, 0.08); border: 1px solid rgba(0, 102, 255, 0.25); border-radius: 12px; padding: 14px; margin-bottom: 14px;">
          <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">💳 To'lov uchun karta raqami:</div>
          <div style="font-size: 17px; font-weight: 800; letter-spacing: 1px; color: #00D2FF; margin-bottom: 4px;">
            ${escapeHtml(state.settings?.card_number || '0000 0000 0000 0000')}
          </div>
          <div style="font-size: 12px; color: var(--text-muted);">Egasi: <strong>${escapeHtml(state.settings?.card_owner || 'Karta Egasi')}</strong></div>
        </div>

        <div class="form-group">
          <label>8. To'lov Cheki (Skrinshot / Rasm) <span class="required">*</span></label>
          <input type="file" id="banner-check-photo" name="check_photo" accept="image/*" class="form-control" required>
          <small style="color: var(--text-muted); font-size: 11px; display: block; margin-top: 4px;">
            📸 To'lov amalga oshirgach, bank ilovasi yoki SMS chekining rasmini yuklang
          </small>
        </div>

        <button type="submit" class="btn btn-primary" style="width: 100%;"><i class="fa-solid fa-paper-plane"></i> To'lovni Tasdiqlash va Yuborish</button>
      </form>
    </div>
  `;
  openModal('🎯 Reklama Banneri Yaratish', html);

  setTimeout(() => {
    document.querySelectorAll('.banner-plan-card').forEach(card => {
      card.addEventListener('click', function() {
        document.querySelectorAll('.banner-plan-card').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        const radio = this.querySelector('input');
        if (radio) radio.checked = true;
        updateBannerTotal();
      });
    });
  }, 100);
}

window.updateBannerTotal = function() {
  const selected = document.querySelector('input[name="plan"]:checked');
  if (selected) {
    const price = parseInt(selected.dataset.price).toLocaleString('uz-UZ');
    const el = document.getElementById('banner-total-price');
    if (el) el.textContent = price + " so'm";
  }
};

async function submitCreateBanner(e) {
  e.preventDefault();
  
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Yuborilmoqda...';

  const formData = new FormData();
  formData.append('userId', state.user.userId);
  formData.append('companyName', document.getElementById('banner-company-name')?.value?.trim() || state.user.hr?.company_name || 'HR Kompaniya');
  formData.append('title', document.getElementById('banner-title').value.trim());
  formData.append('subtitle', document.getElementById('banner-subtitle').value.trim());
  formData.append('ctaText', document.getElementById('banner-cta')?.value?.trim() || 'Ariza qoldirish');
  formData.append('vacancyId', document.getElementById('banner-vacancy-id').value);
  
  // Banner rasmi
  const fileInput = document.getElementById('banner-image');
  if (fileInput.files.length > 0) {
    formData.append('image', fileInput.files[0]);
  } else {
    showToast('Banner rasmini yuklash majburiy', 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> To\'lovni Tasdiqlash va Yuborish';
    return;
  }

  // To'lov cheki
  const checkInput = document.getElementById('banner-check-photo');
  if (!checkInput || checkInput.files.length === 0) {
    showToast('To\'lov cheki rasmini yuklash majburiy', 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> To\'lovni Tasdiqlash va Yuborish';
    return;
  }
  formData.append('check_photo', checkInput.files[0]);

  const selectedPlan = document.querySelector('input[name="plan"]:checked');
  if (!selectedPlan) {
    showToast('Tarifni tanlang', 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> To\'lovni Tasdiqlash va Yuborish';
    return;
  }
  
  formData.append('plan', selectedPlan.value);
  formData.append('durationDays', selectedPlan.dataset.days);
  formData.append('price', selectedPlan.dataset.price);

  try {
    const res = await fetch('/api/hr/banners', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      closeModal();
      openModal(
        '✅ So\'rov Qabul Qilindi',
        `
        <div style="text-align: center; padding: 20px 10px;">
          <div style="font-size: 44px; color: #34d399; margin-bottom: 10px;"><i class="fa-solid fa-circle-check"></i></div>
          <h3 style="font-size: 17px; font-weight: 700; margin-bottom: 8px;">Banner va To'lov Cheki Qabul Qilindi!</h3>
          <p style="font-size: 13px; color: var(--text-muted); line-height: 1.5; margin-bottom: 20px;">
            To'lovingiz admin tomonidan 10–20 daqiqada tasdiqlanadi va reklamangiz platformada faollashadi. Telegram bot orqali bildirishnoma olasiz.
          </p>
          <button class="btn btn-primary" onclick="closeModal()">Tushunarli</button>
        </div>
        `
      );
      if (typeof loadHrVacanciesTab === 'function') loadHrVacanciesTab();
    } else {
      showToast(data.error || 'Xatolik', 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> To\'lovni Tasdiqlash va Yuborish';
    }
  } catch (err) {
    showToast('Xatolik yuz berdi', 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> To\'lovni Tasdiqlash va Yuborish';
  }
}

/* ── ✨ AI RESUME TEXT ENHANCEMENT HANDLERS ──────────────────────────── */
let activeAiComparisonData = null;

async function enhanceTextWithAI(textareaId, btnEl, type = 'resume') {
  const inputEl = document.getElementById(textareaId);
  if (!inputEl) {
    showToast("Matn maydoni topilmadi", "error");
    return;
  }

  const rawText = inputEl.value ? inputEl.value.trim() : '';

  if (!rawText || rawText.length < 10) {
    showToast("AI bilan yaxshilash uchun kamida 10 ta belgi yozing!", "error");
    return;
  }

  if (rawText.length > 3000) {
    showToast("Matn juda uzun. Maksimal 3000 ta belgi yuborish mumkin.", "error");
    return;
  }

  const targetBtn = btnEl || (typeof event !== 'undefined' && event?.currentTarget);
  let originalBtnHtml = '';
  if (targetBtn) {
    originalBtnHtml = targetBtn.innerHTML;
    targetBtn.disabled = true;
    targetBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> AI matnni tekshirmoqda...';
  }

  const endpoint = type === 'vacancy' ? '/api/ai/improve-vacancy' : '/api/ai/improve-resume';

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: rawText,
        userId: state.user?.userId || null
      })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || "AI bilan yaxshilashda xatolik yuz berdi");
    }

    const improvedText = data.text;
    showAiComparisonModal(textareaId, rawText, improvedText);

  } catch (err) {
    console.error('AI Enhance Error:', err);
    const msg = err.message || "AI xizmati hozirda javob bermadi";
    if (msg.includes('GEMINI_API_KEY')) {
      showToast("⚠️ AI uchun GEMINI_API_KEY sozlanmagan! .env fayliga yoki Admin paneldan Gemini API key kiriting.", "error");
    } else {
      showToast(msg, "error");
    }
  } finally {
    if (targetBtn) {
      targetBtn.disabled = false;
      targetBtn.innerHTML = originalBtnHtml;
    }
  }
}

function showAiComparisonModal(textareaId, originalText, improvedText) {
  activeAiComparisonData = {
    textareaId,
    originalText,
    improvedText
  };

  const modalHtml = `
    <div class="ai-comparison-container">
      <div class="ai-compare-header">
        <i class="fa-solid fa-wand-magic-sparkles" style="color:#00D2FF; font-size: 24px; flex-shrink: 0;"></i>
        <div>
          <h4>✨ AI Yordamida Matn Yaxshilandi</h4>
          <p>Grammatika, imlo va stilistika professional ko'rinishga keltirildi:</p>
        </div>
      </div>

      <div class="ai-compare-section">
        <div class="ai-compare-label original-label">
          <i class="fa-solid fa-file-lines"></i> ORIGINAL (Siz yozgan matn):
        </div>
        <div class="ai-compare-box original-box">${escapeHtml(originalText)}</div>
      </div>

      <div class="ai-compare-section" style="margin-top: 10px;">
        <div class="ai-compare-label improved-label">
          <i class="fa-solid fa-wand-magic-sparkles"></i> AI TOMONIDAN YAXSHILANGAN:
        </div>
        <div class="ai-compare-box improved-box">${escapeHtml(improvedText)}</div>
      </div>

      <div class="ai-compare-actions">
        <button type="button" class="btn btn-outline" onclick="closeAiComparisonModal()">
          <i class="fa-solid fa-xmark"></i> Bekor qilish
        </button>
        <button type="button" class="btn btn-primary" onclick="acceptAiText()">
          <i class="fa-solid fa-check"></i> Qabul qilish
        </button>
      </div>
    </div>
  `;

  openModal("✨ AI Yordamida Yaxshilandi", modalHtml);
}

function acceptAiText() {
  if (!activeAiComparisonData) return;
  const { textareaId, improvedText } = activeAiComparisonData;

  const targetEl = document.getElementById(textareaId);
  if (targetEl) {
    targetEl.value = improvedText;
    targetEl.dispatchEvent(new Event('input', { bubbles: true }));
    targetEl.dispatchEvent(new Event('change', { bubbles: true }));
  }

  closeModal();
  activeAiComparisonData = null;
  showToast("Matn AI yordamida muvaffaqiyatli yaxshilandi! ✨", "success");
}

function closeAiComparisonModal() {
  closeModal();
  activeAiComparisonData = null;
}

