# AI Chat Company - Development Guide

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Run Development Server

```bash
python run_dev.py
```

Server will start at: **http://localhost:5000**

### 3. Configure API Keys (Optional)

Edit `run_dev.py` and uncomment/add your API keys:

```python
os.environ.setdefault('ANTHROPIC_KEY', 'sk-ant-...')
os.environ.setdefault('GROQ_API', 'gsk_...')
os.environ.setdefault('OPENAI_KEY', 'sk-...')
os.environ.setdefault('SCREENSHOT_API_KEY', '...')
```

## 📁 Project Structure

```
/ (root - development/testing)
├── server.py              # Flask backend
├── database.py            # Database models
├── run_dev.py            # Development server launcher
├── requirements.txt       # Python dependencies
├── index.html            # Landing page
├── chat.html             # Main chat interface
├── features.html         # AI features (new!)
├── login.html            # Authentication
├── profile.html          # User profile
├── operator.html         # Operator dashboard
└── instance/             # SQLite database (auto-created)

/aichatcompany (production - stable releases)
└── (same structure, deployed to Railway)
```

## 🎯 Features

### Core Features
- ✅ Chat with AI (Llama 3.3 70B, Mixtral, Gemma2)
- ✅ Nomchat ID authentication
- ✅ Credit system (free/pro/max/ultra plans)
- ✅ Operator mode (live chat takeover)
- ✅ Session persistence

### New Features (in `/features.html`)
- 🎨 **Image Generation** - Stable Diffusion via HuggingFace
- 🎤 **Voice Assistant** - Speech-to-text + TTS
- 🤖 **AI Agents** - Specialized assistants (coder, writer, analyst, teacher)
- 🌐 **Website Preview** - URL screenshots

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/nomchat` - Login with Nomchat ID
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Chat
- `POST /api/chat` - Send message to AI
- `GET /api/config/groq-key` - Get Groq API key (client-side)

### Features (NEW)
- `POST /api/image/generate` - Generate image (5 credits)
- `POST /api/voice/transcribe` - Speech to text
- `POST /api/voice/speak` - Text to speech
- `GET /api/agents` - List AI agents
- `POST /api/agent/chat` - Chat with specific agent
- `POST /api/preview/url` - Get website screenshot

### User Management
- `POST /api/user/update` - Update profile
- `DELETE /api/user/delete` - Delete account
- `GET /api/plans` - Get available plans
- `POST /api/plan/upgrade` - Upgrade plan

### Operator
- `GET /api/operator/sessions` - List all sessions
- `GET /api/operator/session/<id>` - Get session details
- `POST /api/operator/takeover` - Take over session
- `POST /api/operator/release` - Release session
- `POST /api/operator/send` - Send message as operator

## 🧪 Testing Workflow

1. **Test locally** in root directory (`python run_dev.py`)
2. **Verify features** work as expected
3. **Copy to aichatcompany/** when stable
4. **Push to GitHub** - Railway auto-deploys from `aichatcompany/`

## 🔑 API Keys Needed

### Required (for basic chat)
- `GROQ_API` - Free at https://console.groq.com

### Optional (for enhanced features)
- `ANTHROPIC_KEY` - Claude API (highest quality)
- `GEMINI_KEY` - Google Gemini
- `OPENROUTER_KEY` - OpenRouter (multiple models)
- `OPENAI_KEY` - For voice transcription (Whisper)
- `SCREENSHOT_API_KEY` - For website previews

### Payment (optional)
- `STRIPE_SECRET_KEY` - Stripe payments
- `STRIPE_WEBHOOK_SECRET` - Stripe webhooks
- `STRIPE_PRICE_PRO` - Pro plan price ID
- `STRIPE_PRICE_MAX` - Max plan price ID
- `STRIPE_PRICE_ULTRA` - Ultra plan price ID

## 📝 Development Tips

### Hot Reload
The dev server (`run_dev.py`) has auto-reload enabled. Just save files and refresh browser.

### Database Reset
Delete `instance/aichat.db` to reset database.

### Testing AI Models
Edit `server.py` line ~420 to change model priority:
```python
models = ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it']
```

### Adding New Features
1. Add backend endpoint in `server.py`
2. Add frontend UI in `features.html` or create new page
3. Test locally
4. Copy to `aichatcompany/` when ready

## 🐛 Common Issues

### Port already in use
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5000 | xargs kill -9
```

### Database locked
Stop all running instances and delete `instance/aichat.db`

### API key errors
Check `run_dev.py` has correct keys set

## 🚢 Deployment

Production deployment is in `/aichatcompany` folder:
1. Copy stable code: `cp *.py *.html *.css aichatcompany/`
2. Commit: `git add aichatcompany/ && git commit -m "Update production"`
3. Push: `git push origin main`
4. Railway auto-deploys from `aichatcompany/`

## 📚 Tech Stack

- **Backend**: Flask + SQLAlchemy
- **Database**: SQLite (dev) / PostgreSQL (production)
- **AI Models**: Groq (Llama 3.3), Claude, Gemini, HuggingFace
- **Auth**: Nomchat ID OAuth + Email/Password
- **Payments**: Stripe
- **Deployment**: Railway
