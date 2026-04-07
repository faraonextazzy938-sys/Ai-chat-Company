#!/usr/bin/env python3
"""
Deploy tested features from root to aichatcompany/ (production)
Usage: python deploy_to_prod.py
"""

import shutil
import os

FILES_TO_COPY = [
    'server.py',
    'database.py',
    'requirements.txt',
    'Procfile',
    'nixpacks.toml',
    'index.html',
    'chat.html',
    'features.html',
    'login.html',
    'profile.html',
    'operator.html',
    'desktop-auth.html',
    '404.html',
    'style.css',
    'effects.js',
]

def deploy():
    print("🚀 Deploying to production (aichatcompany/)...")
    print("=" * 60)
    
    if not os.path.exists('aichatcompany'):
        print("❌ Error: aichatcompany/ directory not found")
        return
    
    copied = 0
    skipped = 0
    
    for file in FILES_TO_COPY:
        if os.path.exists(file):
            dest = os.path.join('aichatcompany', file)
            shutil.copy2(file, dest)
            print(f"✅ Copied: {file}")
            copied += 1
        else:
            print(f"⚠️  Skipped: {file} (not found)")
            skipped += 1
    
    print("=" * 60)
    print(f"✅ Deployed {copied} files")
    if skipped > 0:
        print(f"⚠️  Skipped {skipped} files")
    print("\n📝 Next steps:")
    print("   1. Test at http://localhost:5000")
    print("   2. git add aichatcompany/")
    print("   3. git commit -m 'Deploy updates to production'")
    print("   4. git push origin main")
    print("\n🚀 Railway will auto-deploy from aichatcompany/")

if __name__ == '__main__':
    deploy()
