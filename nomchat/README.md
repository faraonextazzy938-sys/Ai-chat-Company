# Nomchat ID

Система аутентификации в стиле Supercell ID.

## Запуск

```bash
pip install -r requirements.txt
python server.py
```

Откроется на `http://localhost:5001`

## Настройка email

Добавь переменные окружения в Railway:

```
EMAIL_USER     = твой@gmail.com
EMAIL_PASSWORD = пароль_приложения_gmail
EMAIL_FROM     = Nomchat ID <твой@gmail.com>
SECRET_KEY     = случайная_строка
ADMIN_EMAIL    = admin@nomchat.id
```

Для Gmail: [создай пароль приложения](https://myaccount.google.com/apppasswords)

## Деплой на Railway

1. Запушь на GitHub
2. Railway → New Project → Deploy from GitHub
3. Добавь переменные окружения
4. Generate Domain

## Админ-панель

`/admin.html` — управление пользователями

Первый админ создаётся автоматически при старте сервера.
