#!/usr/bin/env python3
"""
Development server for AI Chat Company
Run locally: python run_dev.py
"""

import os
import sys

# Set development environment variables
os.environ.setdefault('SECRET_KEY', 'dev-secret-key-change-in-production')
os.environ.setdefault('DATABASE_URL', 'sqlite:///instance/aichat.db')
os.environ.setdefault('NOMCHAT_URL', 'https://nomchat-id.up.railway.app')
os.environ.setdefault('OPERATOR_EMAIL', 'admin@aichat.local')

# Optional: Set your API keys here for testing
# os.environ.setdefault('ANTHROPIC_KEY', 'your-claude-key')
# os.environ.setdefault('GEMINI_KEY', 'your-gemini-key')
# os.environ.setdefault('OPENROUTER_KEY', 'your-openrouter-key')
# os.environ.setdefault('GROQ_API', 'your-groq-key')
# os.environ.setdefault('OPENAI_KEY', 'your-openai-key')
# os.environ.setdefault('SCREENSHOT_API_KEY', 'your-screenshot-key')

print("=" * 60)
print("🚀 AI Chat Company - Development Server")
print("=" * 60)
print(f"📍 URL: http://localhost:5000")
print(f"📁 Database: {os.environ.get('DATABASE_URL')}")
print(f"🔑 API Keys configured:")
print(f"   - Claude (Anthropic): {'✅' if os.environ.get('ANTHROPIC_KEY') else '❌'}")
print(f"   - Gemini: {'✅' if os.environ.get('GEMINI_KEY') else '❌'}")
print(f"   - OpenRouter: {'✅' if os.environ.get('OPENROUTER_KEY') else '❌'}")
print(f"   - Groq: {'✅' if os.environ.get('GROQ_API') or os.environ.get('GROQ_KEY') else '❌'}")
print(f"   - OpenAI (Voice): {'✅' if os.environ.get('OPENAI_KEY') else '❌'}")
print(f"   - Screenshot API: {'✅' if os.environ.get('SCREENSHOT_API_KEY') else '❌'}")
print("=" * 60)
print("💡 Tip: Edit run_dev.py to add your API keys")
print("🛑 Press Ctrl+C to stop")
print("=" * 60)

# Import and run the Flask app
from server import app

if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True,
        use_reloader=True
    )
