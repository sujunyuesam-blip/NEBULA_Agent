// pages/legal.js - 法律文档：服务条款 / 隐私政策 / 跨境数据传输（12 语言精简版）
// 完整版中英文本见项目根目录 TERMS_OF_SERVICE.md / PRIVACY_POLICY.md / CROSS_BORDER_DATA_TRANSFER.md

const L = {
  "zh": {
    "t": "服务条款",
    "p": "隐私政策",
    "x": "跨境数据传输确认",
    "terms": [
      "接受条款：使用即同意本条款。",
      "服务：AI 个性化学习工具，功能可能变更。",
      "账户：提供真实信息，妥善保管凭据。",
      "可接受使用：禁止违法、侵权、仇恨内容与滥用。",
      "AI 内容：仅供学习参考，不构成专业建议，重要决策请核实权威来源。",
      "社区审核：AI 初审 + 人工复核，我们保留删除违规内容权利。",
      "知识产权：界面与代码归 NEBULA。",
      "服务变更与终止：可随时修改或中断服务。",
      "免责：按现状提供，对间接损失不担责。",
      "法律：中华人民共和国法律管辖。"
    ],
    "privacy": [
      "收集：邮箱、昵称、学校、密码哈希（无明文）、头像、资料、学习数据、社区内容、技术日志。",
      "使用：提供服务、个性化、社区、安全与合规。",
      "存储：Cloudflare 全球网络（Workers + D1），可能存于中国境外。",
      "第三方：AI 生成（DeepSeek）、邮件（Resend）、人机验证（Turnstile）。",
      "Cookies：仅 localStorage，无广告 Cookie。",
      "共享：不出售个人信息；社区公开内容对访客可见。",
      "安全：PBKDF2 加盐哈希、JWT 会话、限流、双重审核。",
      "权利：可修改/删除资料，邮件申请删除账户。",
      "儿童：面向 14 周岁以上。",
      "变更：重大变更将公告或邮件通知。"
    ],
    "transfer": [
      "NEBULA 使用 Cloudflare 全球云服务（Workers、D1、Turnstile）。",
      "个人信息可能传输至中国境外数据中心（如美国、欧洲）。",
      "目的：提供、维护与改进服务。",
      "数据类型：注册信息、学习数据、社区内容、技术日志。",
      "保障：TLS 加密、访问控制、最小化收集、标准合同条款。",
      "注册勾选即表示同意；不同意则无法使用账户服务。"
    ]
  },
  "en": {
    "t": "Terms of Service",
    "p": "Privacy Policy",
    "x": "Cross-Border Data Transfer",
    "terms": [
      "Acceptance: using the Service means you agree to these Terms.",
      "Service: an AI personalized learning tool; features may change.",
      "Accounts: provide accurate info and keep credentials safe.",
      "Acceptable use: no illegal, infringing, hateful content or abuse.",
      "AI content: for learning reference only, not professional advice; verify important decisions.",
      "Community moderation: AI review + human review; we may remove violating content.",
      "IP: the UI, design and code belong to NEBULA.",
      "Changes: we may modify or discontinue the Service at any time.",
      "Disclaimer: provided \"as is\"; not liable for indirect damages.",
      "Law: governed by the laws of the PRC."
    ],
    "privacy": [
      "Collect: email, nickname, school, password hash (no plaintext), avatar, profile, learning data, community content, technical logs.",
      "Use: service delivery, personalization, community, security and compliance.",
      "Storage: Cloudflare global network (Workers + D1); data may be stored outside mainland China.",
      "Third parties: AI (DeepSeek), email (Resend), bot protection (Turnstile).",
      "Cookies: localStorage only; no ad cookies.",
      "Sharing: we do not sell personal information; public community content is visible.",
      "Security: PBKDF2 hashing, JWT sessions, rate limiting, dual moderation.",
      "Your rights: edit/delete data anytime; request account deletion by email.",
      "Children: for users aged 14+.",
      "Changes: material changes will be announced."
    ],
    "transfer": [
      "NEBULA uses Cloudflare global cloud services (Workers, D1, Turnstile).",
      "Personal information may be transferred to data centers outside mainland China (e.g., US, EU).",
      "Purpose: provide, maintain and improve the Service.",
      "Data types: registration info, learning data, community content, technical logs.",
      "Safeguards: TLS encryption, access control, data minimization, SCCs.",
      "Checking the box at registration means consent; without it, account services are unavailable."
    ]
  },  "ru": {
    "t": "Условия использования",
    "p": "Политика конфиденциальности",
    "x": "Трансграничная передача данных",
    "terms": [
      "Принятие: использование сервиса означает согласие.",
      "Сервис: ИИ-инструмент персонализированного обучения.",
      "Аккаунты: точные данные, защита учётных данных.",
      "Использование: запрещён незаконный и оскорбительный контент.",
      "ИИ-контент: только для обучения, не профессиональный совет.",
      "Модерация: ИИ + ручная проверка.",
      "ИС: интерфейс и код принадлежат NEBULA.",
      "Изменения: сервис может меняться.",
      "Отказ: предоставляется «как есть».",
      "Право: законодательство КНР."
    ],
    "privacy": [
      "Сбор: email, имя, школа, хеш пароля, аватар, профиль, данные обучения, контент, логи.",
      "Использование: сервис, персонализация, сообщество, безопасность.",
      "Хранение: сеть Cloudflare; данные могут храниться за пределами Китая.",
      "Третьи лица: ИИ (DeepSeek), почта (Resend), Turnstile.",
      "Cookies: только localStorage.",
      "Обмен: персональные данные не продаются.",
      "Безопасность: PBKDF2, JWT, лимиты, двойная модерация.",
      "Права: изменение/удаление данных в любое время.",
      "Дети: 14+.",
      "Изменения: объявляются."
    ],
    "transfer": [
      "NEBULA использует глобальные облачные сервисы Cloudflare.",
      "Данные могут передаваться за пределы Китая.",
      "Цель: предоставление и улучшение сервиса.",
      "Типы: регистрация, обучение, сообщество, логи.",
      "Гарантии: TLS, контроль доступа, минимизация.",
      "Галочка при регистрации = согласие."
    ]
  },  "ar": {
    "t": "شروط الخدمة",
    "p": "سياسة الخصوصية",
    "x": "نقل البيانات عبر الحدود",
    "terms": [
      "القبول: استخدام الخدمة يعني الموافقة.",
      "الخدمة: أداة تعلم ذكية مخصصة.",
      "الحسابات: بيانات دقيقة وحماية الاعتماديات.",
      "الاستخدام: لا محتوى غير قانوني أو مسيء.",
      "محتوى الذكاء الاصطناعي: مرجع تعليمي فقط.",
      "المراجعة: ذكاء اصطناعي + بشري.",
      "الملكية: الواجهة والكود تابعان لـ NEBULA.",
      "التغييرات: قد تتغير الخدمة.",
      "إخلاء: تقدم «كما هي».",
      "القانون: قوانين الصين."
    ],
    "privacy": [
      "الجمع: البريد والاسم والمدرسة وتجزئة كلمة المرور والصورة والملف وبيانات التعلم والمحتوى والسجلات.",
      "الاستخدام: الخدمة والتخصيص والمجتمع والأمان.",
      "التخزين: شبكة Cloudflare؛ قد تُخزن البيانات خارج الصين.",
      "أطراف ثالثة: DeepSeek وResend وTurnstile.",
      "الكوكيز: localStorage فقط.",
      "المشاركة: لا نبيع البيانات الشخصية.",
      "الأمان: PBKDF2 وJWT وتحديد المعدل.",
      "الحقوق: تعديل/حذف البيانات في أي وقت.",
      "الأطفال: 14+.",
      "التغييرات: سيتم الإعلان عنها."
    ],
    "transfer": [
      "تستخدم NEBULA خدمات Cloudflare السحابية العالمية.",
      "قد تُنقل البيانات إلى مراكز خارج الصين.",
      "الغرض: تقديم الخدمة وتحسينها.",
      "الأنواع: التسجيل والتعلم والمجتمع والسجلات.",
      "الضمانات: TLS والتحكم في الوصول.",
      "تحديد المربع عند التسجيل يعني الموافقة."
    ]
  },  "de": {
    "t": "Nutzungsbedingungen",
    "p": "Datenschutzerklärung",
    "x": "Grenzüberschreitende Datenübertragung",
    "terms": [
      "Annahme: Nutzung bedeutet Zustimmung.",
      "Dienst: personalisiertes KI-Lerntool.",
      "Konten: korrekte Daten, sichere Zugangsdaten.",
      "Nutzung: keine illegalen oder hasserfüllten Inhalte.",
      "KI-Inhalte: nur Lernreferenz, keine Fachberatung.",
      "Moderation: KI + menschliche Prüfung.",
      "Geistiges Eigentum: UI und Code gehören NEBULA.",
      "Änderungen: der Dienst kann geändert werden.",
      "Haftung: „wie besehen\" bereitgestellt.",
      "Recht: Recht der VR China."
    ],
    "privacy": [
      "Erhebung: E-Mail, Name, Schule, Passwort-Hash, Avatar, Profil, Lerndaten, Community, Logs.",
      "Nutzung: Dienst, Personalisierung, Community, Sicherheit.",
      "Speicherung: Cloudflare-Netzwerk; Daten evtl. außerhalb Chinas.",
      "Dritte: DeepSeek, Resend, Turnstile.",
      "Cookies: nur localStorage.",
      "Weitergabe: keine Verkäufe persönlicher Daten.",
      "Sicherheit: PBKDF2, JWT, Limits, doppelte Moderation.",
      "Rechte: Daten jederzeit ändern/löschen.",
      "Kinder: ab 14 Jahren.",
      "Änderungen: werden angekündigt."
    ],
    "transfer": [
      "NEBULA nutzt globale Cloudflare-Dienste.",
      "Daten können außerhalb Festlandchinas übertragen werden.",
      "Zweck: Bereitstellung und Verbesserung des Dienstes.",
      "Arten: Registrierung, Lerndaten, Community, Logs.",
      "Schutz: TLS, Zugriffskontrolle, Minimierung.",
      "Häkchen bei Registrierung = Einwilligung."
    ]
  },  "it": {
    "t": "Termini di servizio",
    "p": "Informativa sulla privacy",
    "x": "Trasferimento transfrontaliero",
    "terms": [
      "Accettazione: usare il servizio significa accettare.",
      "Servizio: strumento di apprendimento IA personalizzato.",
      "Account: dati corretti e credenziali sicure.",
      "Uso: nessun contenuto illegale o offensivo.",
      "Contenuti IA: solo riferimento di apprendimento.",
      "Moderazione: revisione IA + umana.",
      "PI: interfaccia e codice appartengono a NEBULA.",
      "Modifiche: il servizio può cambiare.",
      "Disclaimer: fornito «così com'è».",
      "Legge: leggi della RPC."
    ],
    "privacy": [
      "Raccolta: email, nome, scuola, hash password, avatar, profilo, dati di apprendimento, community, log.",
      "Uso: servizio, personalizzazione, community, sicurezza.",
      "Archiviazione: rete Cloudflare; dati fuori dalla Cina.",
      "Terze parti: DeepSeek, Resend, Turnstile.",
      "Cookie: solo localStorage.",
      "Condivisione: non vendiamo dati personali.",
      "Sicurezza: PBKDF2, JWT, limiti, doppia moderazione.",
      "Diritti: modificare/eliminare i dati.",
      "Minori: 14+.",
      "Modifiche: saranno annunciate."
    ],
    "transfer": [
      "NEBULA usa i servizi cloud globali di Cloudflare.",
      "I dati possono essere trasferiti fuori dalla Cina continentale.",
      "Scopo: fornire e migliorare il servizio.",
      "Tipi: registrazione, apprendimento, community, log.",
      "Garanzie: TLS, controllo accessi, minimizzazione.",
      "Spuntare la casella alla registrazione = consenso."
    ]
  },  "hi": {
    "t": "सेवा की शर्तें",
    "p": "गोपनीयता नीति",
    "x": "सीमा-पार डेटा स्थानांतरण",
    "terms": [
      "स्वीकृति: सेवा का उपयोग सहमति है।",
      "सेवा: AI व्यक्तिगत शिक्षण उपकरण।",
      "खाते: सटीक जानकारी और सुरक्षित क्रेडेंशियल।",
      "उपयोग: अवैध या आपत्तिजनक सामग्री नहीं।",
      "AI सामग्री: केवल शिक्षण संदर्भ।",
      "समीक्षा: AI + मानव।",
      "आईपी: UI और कोड NEBULA के हैं।",
      "बदलाव: सेवा बदल सकती है।",
      "अस्वीकरण: «जैसा है» प्रदान।",
      "कानून: चीन का कानून।"
    ],
    "privacy": [
      "संग्रह: ईमेल, नाम, स्कूल, पासवर्ड हैश, अवतार, प्रोफ़ाइल, शिक्षण डेटा, समुदाय, लॉग।",
      "उपयोग: सेवा, वैयक्तिकरण, समुदाय, सुरक्षा।",
      "भंडारण: Cloudflare नेटवर्क; डेटा चीन से बाहर हो सकता है।",
      "तीसरे पक्ष: DeepSeek, Resend, Turnstile।",
      "कुकीज़: केवल localStorage।",
      "साझाकरण: व्यक्तिगत डेटा नहीं बेचते।",
      "सुरक्षा: PBKDF2, JWT, सीमाएँ।",
      "अधिकार: कभी भी डेटा संपादित/हटाएँ।",
      "बच्चे: 14+।",
      "बदलाव: घोषित किए जाएँगे।"
    ],
    "transfer": [
      "NEBULA Cloudflare वैश्विक क्लाउड सेवाओं का उपयोग करता है।",
      "डेटा चीन से बाहर स्थानांतरित हो सकता है।",
      "उद्देश्य: सेवा प्रदान करना और सुधारना।",
      "प्रकार: पंजीकरण, शिक्षण, समुदाय, लॉग।",
      "सुरक्षा: TLS, पहुँच नियंत्रण।",
      "पंजीकरण पर चेकबॉक्स = सहमति।"
    ]
  }
};

export function legalHtml(kind) {
  const lang = L[document.documentElement.lang] ? document.documentElement.lang : "en";
  const s = L[lang] || L.en;
  const key = kind === "terms" ? "terms" : kind === "privacy" ? "privacy" : "transfer";
  const title = kind === "terms" ? s.t : kind === "privacy" ? s.p : s.x;
  const items = s[key];
  const lis = items.map((item) => {
    const idx = item.indexOf("：") > -1 ? item.indexOf("：") : item.indexOf(":");
    if (idx > -1) {
      return `<div class="legal-item"><b>${esc(item.slice(0, idx))}</b><span>${esc(item.slice(idx + 1))}</span></div>`;
    }
    return `<div class="legal-item"><span>${esc(item)}</span></div>`;
  }).join("");
  return `
  <div class="legal-page">
    <div class="glass" style="padding:30px 34px">
      <h1>${esc(title)}</h1>
      <p class="legal-updated">${esc("Last updated: August 2026 · 最后更新：2026 年 8 月")}</p>
      <div class="legal-content">${lis}</div>
    </div>
  </div>`;
}

function esc(x) {
  return String(x ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
