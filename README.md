# 🚀 AI Chat Pro

Современное приложение для общения с AI на базе Llama 3.3 70B через Groq API.

## 📁 Структура проекта

```
AI-Chat-Pro/
├── src/                      # Клиентская часть
│   ├── js/
│   │   ├── classes/         # ООП классы
│   │   │   ├── App.js       # Главный класс приложения
│   │   │   ├── ApiClient.js # Работа с API
│   │   │   ├── ChatManager.js # Управление чатами
│   │   │   └── UIManager.js # Управление интерфейсом
│   │   ├── utils/           # Утилиты
│   │   └── main.js          # Точка входа
│   ├── css/                 # Стили
│   └── pages/               # HTML страницы
│
├── server/                   # Серверная часть (Python)
│   ├── models/              # Модели данных
│   │   ├── User.py
│   │   └── Session.py
│   ├── routes/              # Маршруты API
│   │   ├── auth_routes.py
│   │   └── chat_routes.py
│   ├── utils/               # Утилиты сервера
│   └── app.py               # Главный файл сервера
│
├── public/                   # Публичные файлы
│   └── assets/              # Изображения, иконки
│
├── index.html               # Главная страница
├── auth.html                # Страница авторизации
├── profile.html             # Страница профиля
├── style.css                # Основные стили
├── auth.css                 # Стили авторизации
├── profile.css              # Стили профиля
│
├── electron-main.js         # Electron главный процесс
├── preload.js               # Electron preload
├── package.json             # Node.js зависимости
├── requirements.txt         # Python зависимости
│
└── README.md                # Документация
```

## 🛠️ Технологии

### Frontend
- **JavaScript ES6+** с ООП подходом
- **HTML5 / CSS3**
- **Electron** для desktop версии
- Модульная архитектура

### Backend
- **Python 3.8+**
- **Flask** - веб-фреймворк
- **Flask-CORS** - поддержка CORS
- **Requests** - HTTP клиент
- ООП архитектура с Blueprint

### AI
- **Groq API** - доступ к Llama 3.3 70B
- Потоковая генерация ответов
- Контекстная память

## 🚀 Быстрый старт

### 1. Установка зависимостей

#### Python (сервер)
```bash
pip install -r requirements.txt
```

#### Node.js (desktop версия)
```bash
npm install
```

### 2. Запуск сервера

**Из корневой директории проекта:**

```bash
python start_server.py
```

**Или на Windows:**
```bash
start_server.bat
```

**Или напрямую:**
```bash
cd C:\Users\devqu\Desktop\Zgod
python start_server.py
```

Сервер запустится на `http://localhost:5000`

### 3. Запуск приложения

#### Веб-версия
Откройте `index.html` в браузере

#### Desktop версия
```bash
npm start
```

## 📖 Использование

### Регистрация
1. Откройте `auth.html`
2. Заполните форму регистрации
3. Войдите в систему

### Настройка API ключа
1. Получите бесплатный API ключ на [console.groq.com](https://console.groq.com)
2. Откройте профиль (иконка пользователя)
3. Вставьте ключ в поле "Groq API Key"
4. Сохраните

### Общение с AI
1. Напишите сообщение в поле ввода
2. Нажмите Enter или кнопку отправки
3. AI ответит через несколько секунд

## 🎨 Возможности

- ✅ Регистрация и авторизация
- ✅ Множественные чаты
- ✅ История сообщений
- ✅ Темная/светлая тема
- ✅ Эмодзи пикер
- ✅ Прикрепление файлов
- ✅ Скачивание чатов
- ✅ Desktop версия (Electron)
- ✅ Создание файлов через AI
- ✅ Статистика использования

## 🏗️ Архитектура

### Клиент (ООП)

```javascript
App
├── ApiClient      // HTTP запросы к серверу
├── ChatManager    // Управление чатами и сообщениями
└── UIManager      // Управление интерфейсом
```

### Сервер (ООП + Blueprint)

```python
ChatProServer
├── auth_routes    // Аутентификация
├── chat_routes    // AI запросы
└── models
    ├── User       // Модель пользователя
    └── Session    // Модель сессии
```

## 🔧 Конфигурация

### Сервер
Измените в `server/app.py`:
```python
server = ChatProServer(host='0.0.0.0', port=5000)
```

### Клиент
Измените в `src/js/classes/ApiClient.js`:
```javascript
constructor(baseUrl = 'http://localhost:5000')
```

## 📝 API Endpoints

### GET /health
Проверка работоспособности сервера

### POST /api/auth/register
Регистрация пользователя

### POST /api/auth/login
Вход в систему

### POST /api/chat/completions
Отправка сообщения AI

### POST /api/user/update-keys
Обновление API ключей

## 🐛 Решение проблем

### Ошибка подключения к серверу
```bash
# Убедитесь что сервер запущен
python server/app.py
```

### ModuleNotFoundError
```bash
# Установите зависимости
pip install -r requirements.txt
```

### Порт занят
Измените порт в `server/app.py`

## 📄 Лицензия

MIT License

## 👨‍💻 Автор

AI Chat Pro Team

## 🤝 Вклад

Pull requests приветствуются!

1. Fork проект
2. Создайте feature branch
3. Commit изменения
4. Push в branch
5. Создайте Pull Request
