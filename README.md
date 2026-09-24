# 🤖 JobHunt Telegram Bot

Vakansiyalar joylashtirish uchun Telegram bot. 3 ta panel: **Admin**, **HR**, **Nomzod**.

---

## ⚡ Tez ishga tushirish

### 1. .env faylini yarating
```bash
cp .env.example .env
```

`.env` faylini oching va to'ldiring:
```
BOT_TOKEN=your_bot_token_from_botfather
ADMIN_IDS=123456789
CHANNEL_ID=@your_channel_username
```

> **BOT_TOKEN** — @BotFather dan olinadi  
> **ADMIN_IDS** — Sizning Telegram ID raqamingiz (@userinfobot orqali bilib olasiz)  
> **CHANNEL_ID** — E'lonlar chiqariladigan kanal (bot kanal admini bo'lishi kerak)

### 2. Botni ishga tushirish
```bash
npm start
```

Yoki avtomatik qayta yuklash bilan:
```bash
npm run dev
```

---

## 📁 Loyiha Tuzilmasi

```
bot/
├── index.js              # Asosiy kirish nuqtasi
├── config.js             # Sozlamalar
├── jobhunt.db            # SQLite bazasi (avtomatik yaratiladi)
├── database/
│   └── db.js             # DB va jadvallar
├── handlers/
│   ├── admin/            # Admin panel handlerlari
│   ├── hr/               # HR panel handlerlari
│   └── candidate/        # Nomzod handlerlari
├── keyboards/            # Klaviaturalar
├── states/               # FSM holatlari
└── utils/                # Yordamchi funksiyalar
```

---

## 🔧 Funksionallik

### 👔 HR Panel
- `/hr` — HR paneliga kirish
- Kompaniya nomi va telefon bilan ro'yxatdan o'tish
- **Yangi E'lon** — ko'p bosqichli e'lon yaratish:
  - Sarlavha → Kompaniya → Manzil → Maosh → Ish vaqti → Talablar → Qo'shimcha maydonlar
  - Tasdiqlash → To'lov (chek) → Admin tasdiqlaydi → Kanal (10-20 min)
- **Mening E'lonlarim** — e'lonlar ro'yxati, arizalar, o'chirish, qayta faollashtirish
- **Token Limiti** — qolgan tokenlar va obuna muddati

### 👤 Nomzod Panel
- Kanaldan "Ariza Qoldirish" → botga yo'naltiriladi
- Ro'yxatdan o'tish (ism + telefon)
- HR belgilagan maydonlarni to'ldirish
- Resume ko'rinishida tasdiqlash
- To'lov (birinchi ariza) → Admin tasdiqlaydi → HR ga boradi

### 🛠 Admin Panel
- `/admin` — admin panelga kirish
- **HR To'lovlar** — HR to'lovlarini tasdiqlash/rad etish
- **Nomzod To'lovlar** — nomzod to'lovlarini tasdiqlash/rad etish
- **Sozlamalar** — narxlar, tokenlar, muddat, karta raqami
- **Statistika** — umumiy ko'rsatkichlar

---

## 💳 Tarif Tizimi

| | HR | Nomzod |
|--|--|--|
| Narx | 50,000 so'm | 20,000 so'm |
| Tokenlar | 8 ta | 12 ta |
| Muddat | 14 kun | 14 kun |
| 1 token | = 1 e'lon | = 1 ariza |
| Limit | 24 soatda 1 e'lon | — |
| E'lon aktiv | 7 kun | — |

> Barcha narxlarni admin panelidagi **Sozlamalar** bo'limida o'zgartirish mumkin.

---

## ⚙️ Avtomatik Jarayonlar (Scheduler)

- **Har 10 daqiqa**: Muddati o'tgan e'lonlar `expired` qilinadi, kanalda tugma o'chiriladi
- **Har 1 soat**: Muddati tugagan obunalar tekshiriladi, tokenlar 0 ga aylanadi

---

## 📝 Eslatmalar

1. Bot kanal **admini** bo'lishi kerak (xabar yuborish uchun)
2. Bot `username`i `.env`da yoki `keyboards/candidate_kb.js`da `BOT_USERNAME` orqali belgilanadi
3. Bir vaqtning o'zida faqat 1 ta bot instance ishlashi kerak
# jobhun
