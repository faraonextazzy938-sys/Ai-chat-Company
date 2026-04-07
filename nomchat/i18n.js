// Nomchat ID — i18n (internationalization)
const TRANSLATIONS = {
    en: {
        // Nav
        'nav.home': 'Home',
        'nav.apps': 'Apps',
        'nav.connect': 'Connect',
        'nav.profile': 'Profile',
        'nav.signin': 'Sign in',
        'nav.signout': 'Sign out',

        // Index hero
        'hero.line1': 'One account.',
        'hero.line2': 'All your apps.',
        'hero.title': 'One account.<br>All your apps.',
        'hero.sub': 'Sign in once with your email. No passwords. Your identity — always with you across every app.',
        'hero.getstarted': 'Get started',
        'hero.seeapps': 'See apps',
        'stats.apps': 'Apps',
        'stats.free': 'Free',
        'stats.devices': 'Devices',

        // Features
        'feat.label': 'Why Nomchat ID',
        'feat.title': 'Built for everyone.',
        'feat.1.title': 'Zero-password security',
        'feat.1.desc': 'We send a one-time code to your email. No passwords to remember, no passwords to steal.',
        'feat.2.title': 'Your identity',
        'feat.2.desc': 'Choose from 20+ unique avatars. One profile that represents you across all apps.',
        'feat.3.title': 'All your apps',
        'feat.3.desc': 'Connect your apps to Nomchat ID. One account unlocks everything on the platform.',
        'feat.4.title': 'Any device',
        'feat.4.desc': 'Phone, tablet, desktop — your account follows you everywhere.',

        // Apps section
        'apps.label': 'Apps',
        'apps.title': 'Open now',
        'apps.allapps': 'All apps',

        // Connect section
        'connect.label': 'Connect',
        'connect.title': 'Connect your app',
        'connect.sub': 'Link your app to Nomchat ID in 3 simple steps.',
        'connect.step1.title': 'Create Nomchat ID',
        'connect.step1.desc': 'Sign up with your email — takes 30 seconds.',
        'connect.step2.title': 'Open AI Chat Pro',
        'connect.step2.desc': 'Click "Sign in with Nomchat ID" on the login screen.',
        'connect.step3.title': 'Sign in',
        'connect.step3.desc': 'Enter your email, verify the code — done!',
        'connect.cta': 'Get started',

        // Connect page
        'connectpage.title': 'Connect your app<br>to Nomchat ID',
        'connectpage.sub': 'Link any supported app to your Nomchat ID account. Use on any device, your identity always with you.',
        'connectpage.how': 'How it works',
        'connectpage.steps': '3 simple steps',
        'connectpage.step2.title': 'Open AI Chat Pro',
        'connectpage.step2.desc': 'On the login screen, click "Sign in with Nomchat ID".',
        'connectpage.step3.title': 'Verify & go',
        'connectpage.step3.desc': 'Enter your email, get the code, confirm — your app is now connected.',
        'connectpage.supported': 'Supported apps',
        'connectpage.connect': 'Connect these apps',
        'badge.supported': 'Supported',
        'btn.connect': 'Connect',
        'btn.open': 'Open',

        // Footer
        'footer.tagline': 'The identity platform.',
        'footer.privacy': 'Privacy Policy',
        'footer.terms': 'Terms of Service',
        'footer.support': 'Support',

        // Login
        'login.title': 'Log in to Nomchat ID',
        'login.sub': 'Enter your email and we\'ll send you a verification code.',
        'login.placeholder': 'Enter your email',
        'login.btn': 'LOG IN',
        'login.cancel': 'CANCEL',
        'login.register': 'Want to register a Nomchat ID?',
        'login.step1': 'Log in',
        'login.step2': 'Verify',
        'verify.title': 'Almost there!',
        'verify.sub': 'A verification code has been sent to your email',
        'verify.btn': 'CONTINUE',
        'verify.back': 'GO BACK',
        'verify.resend': 'Didn\'t receive the code?',
        'verify.demo': 'Your code:',
        'username.title': 'Choose your name',
        'username.sub': 'Pick a unique username for your Nomchat ID. You can change it later.',
        'username.placeholder': 'Enter username',
        'username.hint': '3–30 characters. Letters, numbers and underscores only.',
        'username.btn': 'CONTINUE',
        'username.back': 'GO BACK',
        'avatar.title': 'Choose your avatar',
        'avatar.sub': 'Pick an icon for your Nomchat ID profile',
        'avatar.btn': 'CONFIRM',
        'done.title': 'You are all set!',
        'done.sub': 'Your Nomchat ID is ready to use.',
        'done.btn': 'VIEW PROFILE',

        // Profile
        'profile.avatar': 'Change avatar',
        'profile.save': 'Save avatar',
        'profile.connected': 'Connected apps',
        'profile.account': 'Account info',
        'profile.email': 'Email',
        'profile.since': 'Member since',
        'profile.login': 'Last sign in',
        'profile.delete': 'Delete account',
        'profile.connected.status': '● Connected',

        // AI Chat Pro card
        'aichat.dev': 'by AI Chat Company',
        'aichat.desc': 'Smart AI assistant powered by Llama 3.3 70B. Chat, music, code — all in one app.',
    },
    ru: {
        // Nav
        'nav.home': 'Главная',
        'nav.apps': 'Приложения',
        'nav.connect': 'Подключить',
        'nav.profile': 'Профиль',
        'nav.signin': 'Войти',
        'nav.signout': 'Выйти',

        // Index hero
        'hero.line1': 'Один аккаунт.',
        'hero.line2': 'Все приложения.',
        'hero.title': 'Один аккаунт.<br>Все приложения.',
        'hero.sub': 'Войдите один раз через email. Без паролей. Ваша личность — всегда с вами.',
        'hero.getstarted': 'Начать',
        'hero.seeapps': 'Приложения',
        'stats.apps': 'Приложений',
        'stats.free': 'Бесплатно',
        'stats.devices': 'Устройств',

        // Features
        'feat.label': 'Почему Nomchat ID',
        'feat.title': 'Создано для всех.',
        'feat.1.title': 'Без паролей',
        'feat.1.desc': 'Мы отправляем одноразовый код на ваш email. Никаких паролей — нечего забывать и нечего украсть.',
        'feat.2.title': 'Ваша личность',
        'feat.2.desc': 'Выберите из 20+ уникальных аватаров. Один профиль для всех приложений.',
        'feat.3.title': 'Все приложения',
        'feat.3.desc': 'Подключите приложения к Nomchat ID. Один аккаунт открывает всё на платформе.',
        'feat.4.title': 'Любое устройство',
        'feat.4.desc': 'Телефон, планшет, компьютер — ваш аккаунт везде с вами.',

        // Apps section
        'apps.label': 'Приложения',
        'apps.title': 'Открыть сейчас',
        'apps.allapps': 'Все приложения',

        // Connect section
        'connect.label': 'Подключение',
        'connect.title': 'Подключите приложение',
        'connect.sub': 'Привяжите приложение к Nomchat ID за 3 простых шага.',
        'connect.step1.title': 'Создайте Nomchat ID',
        'connect.step1.desc': 'Зарегистрируйтесь через email — займёт 30 секунд.',
        'connect.step2.title': 'Откройте AI Chat Pro',
        'connect.step2.desc': 'Нажмите "Войти через Nomchat ID" на экране входа.',
        'connect.step3.title': 'Войдите',
        'connect.step3.desc': 'Введите email, подтвердите код — готово!',
        'connect.cta': 'Начать',

        // Connect page
        'connectpage.title': 'Подключите приложение<br>к Nomchat ID',
        'connectpage.sub': 'Привяжите любое поддерживаемое приложение к вашему Nomchat ID. Используйте на любом устройстве.',
        'connectpage.how': 'Как это работает',
        'connectpage.steps': '3 простых шага',
        'connectpage.step2.title': 'Откройте AI Chat Pro',
        'connectpage.step2.desc': 'На экране входа нажмите "Войти через Nomchat ID".',
        'connectpage.step3.title': 'Подтвердите',
        'connectpage.step3.desc': 'Введите email, получите код, подтвердите — приложение подключено.',
        'connectpage.supported': 'Поддерживаемые приложения',
        'connectpage.connect': 'Подключить приложения',
        'badge.supported': 'Поддерживается',
        'btn.connect': 'Подключить',
        'btn.open': 'Открыть',

        // Footer
        'footer.tagline': 'Платформа идентификации.',
        'footer.privacy': 'Политика конфиденциальности',
        'footer.terms': 'Условия использования',
        'footer.support': 'Поддержка',

        // Login
        'login.title': 'Войти в Nomchat ID',
        'login.sub': 'Введите email — мы отправим код подтверждения.',
        'login.placeholder': 'Введите ваш email',
        'login.btn': 'ВОЙТИ',
        'login.cancel': 'ОТМЕНА',
        'login.register': 'Хотите зарегистрировать Nomchat ID?',
        'login.step1': 'Вход',
        'login.step2': 'Подтверждение',
        'verify.title': 'Почти готово!',
        'verify.sub': 'Код подтверждения отправлен на',
        'verify.btn': 'ПРОДОЛЖИТЬ',
        'verify.back': 'НАЗАД',
        'verify.resend': 'Не получили код?',
        'verify.demo': 'Ваш код:',
        'username.title': 'Выберите имя',
        'username.sub': 'Придумайте уникальное имя для Nomchat ID. Можно изменить позже.',
        'username.placeholder': 'Введите имя пользователя',
        'username.hint': '3–30 символов. Буквы, цифры и _ .',
        'username.btn': 'ПРОДОЛЖИТЬ',
        'username.back': 'НАЗАД',
        'avatar.title': 'Выберите аватар',
        'avatar.sub': 'Выберите иконку для вашего профиля Nomchat ID',
        'avatar.btn': 'ПОДТВЕРДИТЬ',
        'done.title': 'Всё готово!',
        'done.sub': 'Ваш Nomchat ID готов к использованию.',
        'done.btn': 'МОЙ ПРОФИЛЬ',

        // Profile
        'profile.avatar': 'Сменить аватар',
        'profile.save': 'Сохранить аватар',
        'profile.connected': 'Подключённые приложения',
        'profile.account': 'Информация об аккаунте',
        'profile.email': 'Email',
        'profile.since': 'Дата регистрации',
        'profile.login': 'Последний вход',
        'profile.delete': 'Удалить аккаунт',
        'profile.connected.status': '● Подключено',

        // AI Chat Pro card (always Russian)
        'aichat.dev': 'от AI Chat Company',
        'aichat.desc': 'Умный AI-ассистент на базе Llama 3.3 70B. Чат, музыка, код — всё в одном приложении.',
    }
};

// ── Language engine ───────────────────────────────────────────

function getLang() {
    return localStorage.getItem('nc_lang') || 'en';
}

function setLang(lang) {
    localStorage.setItem('nc_lang', lang);
    applyTranslations(lang);
    updateLangBtn(lang);
}

function t(key) {
    const lang = getLang();
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS['en']?.[key] || key;
}

function applyTranslations(lang) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const val = TRANSLATIONS[lang]?.[key] || TRANSLATIONS['en']?.[key];
        if (val) el.innerHTML = val;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const val = TRANSLATIONS[lang]?.[key] || TRANSLATIONS['en']?.[key];
        if (val) el.placeholder = val;
    });
}

function updateLangBtn(lang) {
    const btn = document.getElementById('langToggleBtn');
    if (btn) btn.textContent = lang === 'en' ? '🇷🇺 RU' : '🇬🇧 EN';
}

function toggleLang() {
    const current = getLang();
    setLang(current === 'en' ? 'ru' : 'en');
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const lang = getLang();
    applyTranslations(lang);
    updateLangBtn(lang);
});
