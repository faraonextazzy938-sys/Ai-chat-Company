import smtplib, os, ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

EMAIL_HOST     = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT     = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_USER     = os.environ.get('EMAIL_USER', '')
EMAIL_PASSWORD = os.environ.get('EMAIL_PASSWORD', '')
EMAIL_FROM     = os.environ.get('EMAIL_FROM', f'Nomchat ID <{EMAIL_USER}>')

def send_code(to_email: str, code: str) -> bool:
    """Send verification code. Returns True if sent via SMTP, False if demo mode."""
    if not EMAIL_USER or not EMAIL_PASSWORD:
        print(f'[NOMCHAT EMAIL] Demo mode — code for {to_email}: {code}')
        return False

    fmt  = f'{code[:3]} {code[3:]}'
    html = f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:40px 20px">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.10)">

  <!-- Header -->
  <tr>
    <td style="background:linear-gradient(135deg,#1a3a6b 0%,#1565c0 50%,#0d47a1 100%);padding:36px 40px;text-align:center">
      <table cellpadding="0" cellspacing="0" style="margin:0 auto">
        <tr>
          <td style="background:rgba(255,255,255,0.15);border-radius:14px;padding:12px 20px">
            <span style="font-size:1.6em;vertical-align:middle">💬</span>
            <span style="color:#fff;font-size:1.3em;font-weight:900;letter-spacing:1px;vertical-align:middle;margin-left:8px">NOMCHAT</span>
            <span style="background:#fff;color:#1565c0;font-size:0.7em;font-weight:900;padding:3px 8px;border-radius:5px;margin-left:6px;vertical-align:middle">ID</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:44px 40px 36px;text-align:center">
      <p style="color:#555;font-size:1em;margin:0 0 8px">Your verification code</p>
      <h1 style="color:#111;font-size:1.5em;font-weight:800;margin:0 0 28px">Log in to Nomchat ID</h1>

      <!-- Code box -->
      <div style="background:linear-gradient(135deg,#1565c0,#0d47a1);border-radius:16px;padding:28px 40px;display:inline-block;margin-bottom:28px">
        <span style="color:#fff;font-size:2.8em;font-weight:900;letter-spacing:16px;font-family:'Courier New',monospace">{fmt}</span>
      </div>

      <p style="color:#777;font-size:0.92em;line-height:1.7;margin:0 0 8px">
        This code expires in <strong style="color:#333">10 minutes</strong>.
      </p>
      <p style="color:#aaa;font-size:0.85em;margin:0">
        If you didn't request this, you can safely ignore this email.
      </p>
    </td>
  </tr>

  <!-- Divider -->
  <tr><td style="padding:0 40px"><div style="height:1px;background:#f0f0f0"></div></td></tr>

  <!-- Footer -->
  <tr>
    <td style="padding:24px 40px;text-align:center">
      <p style="color:#bbb;font-size:0.78em;margin:0">
        © 2026 Nomchat ID &nbsp;·&nbsp;
        <a href="#" style="color:#1565c0;text-decoration:none">Privacy Policy</a> &nbsp;·&nbsp;
        <a href="#" style="color:#1565c0;text-decoration:none">Terms of Service</a>
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body></html>"""

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f'Your Nomchat ID code: {fmt}'
        msg['From']    = EMAIL_FROM
        msg['To']      = to_email
        msg['X-Priority'] = '1'
        msg.attach(MIMEText(html, 'html', 'utf-8'))

        ctx = ssl.create_default_context()
        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as smtp:
            smtp.ehlo()
            smtp.starttls(context=ctx)
            smtp.ehlo()
            smtp.login(EMAIL_USER, EMAIL_PASSWORD)
            smtp.sendmail(EMAIL_USER, to_email, msg.as_string())

        print(f'[NOMCHAT EMAIL] Sent to {to_email}')
        return True
    except Exception as e:
        print(f'[NOMCHAT EMAIL] Error: {e}')
        return False


def send_welcome(to_email: str, username: str) -> bool:
    """Send welcome email to new user."""
    if not EMAIL_USER or not EMAIL_PASSWORD:
        print(f'[NOMCHAT EMAIL] Demo mode — welcome for {to_email}')
        return False

    html = f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#0f0f1a;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.08)">

  <!-- Header -->
  <tr>
    <td style="background:linear-gradient(135deg,#5b6ef5 0%,#7c3aed 50%,#06b6d4 100%);padding:40px;text-align:center">
      <div style="background:rgba(255,255,255,0.15);border-radius:14px;padding:14px 24px;display:inline-block">
        <span style="font-size:1.8em;vertical-align:middle">💬</span>
        <span style="color:#fff;font-size:1.4em;font-weight:900;letter-spacing:1px;vertical-align:middle;margin-left:10px">NOMCHAT</span>
        <span style="background:#fff;color:#5b6ef5;font-size:0.65em;font-weight:900;padding:3px 8px;border-radius:5px;margin-left:8px;vertical-align:middle">ID</span>
      </div>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:48px 40px 36px;text-align:center">
      <div style="font-size:3em;margin-bottom:20px">🎉</div>
      <h1 style="color:#f0f0ff;font-size:1.6em;font-weight:900;margin:0 0 12px">Welcome to Nomchat ID!</h1>
      <p style="color:rgba(240,240,255,0.6);font-size:1em;margin:0 0 32px;line-height:1.7">
        Hey <strong style="color:#f0f0ff">{username}</strong>, your account is ready.<br>
        One account. All your apps.
      </p>

      <!-- Features -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px">
        <tr>
          <td style="padding:12px;background:rgba(255,255,255,0.04);border-radius:12px;text-align:left;border:1px solid rgba(255,255,255,0.08)">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:1.4em;padding-right:14px;vertical-align:top">🔐</td>
                <td><strong style="color:#f0f0ff;font-size:0.9em">Zero-password security</strong><br><span style="color:rgba(240,240,255,0.5);font-size:0.82em">Sign in with email codes only</span></td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="height:8px"></td></tr>
        <tr>
          <td style="padding:12px;background:rgba(255,255,255,0.04);border-radius:12px;text-align:left;border:1px solid rgba(255,255,255,0.08)">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:1.4em;padding-right:14px;vertical-align:top">🤖</td>
                <td><strong style="color:#f0f0ff;font-size:0.9em">AI Chat Pro</strong><br><span style="color:rgba(240,240,255,0.5);font-size:0.82em">Your Nomchat ID works with AI Chat Pro</span></td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <a href="https://nomchat-id.up.railway.app/profile.html"
         style="display:inline-block;background:linear-gradient(135deg,#5b6ef5,#7c3aed);color:#fff;font-size:0.95em;font-weight:800;padding:14px 36px;border-radius:99px;text-decoration:none;box-shadow:0 6px 24px rgba(91,110,245,0.4)">
        View my profile →
      </a>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:24px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.06)">
      <p style="color:rgba(240,240,255,0.25);font-size:0.78em;margin:0">
        © 2026 Nomchat ID &nbsp;·&nbsp;
        <a href="https://nomchat-id.up.railway.app/docs/privacy.html" style="color:#5b6ef5;text-decoration:none">Privacy Policy</a> &nbsp;·&nbsp;
        <a href="https://nomchat-id.up.railway.app/docs/terms.html" style="color:#5b6ef5;text-decoration:none">Terms of Service</a>
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body></html>"""

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Welcome to Nomchat ID! 🎉'
        msg['From']    = EMAIL_FROM
        msg['To']      = to_email
        msg.attach(MIMEText(html, 'html', 'utf-8'))

        ctx = ssl.create_default_context()
        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as smtp:
            smtp.ehlo(); smtp.starttls(context=ctx); smtp.ehlo()
            smtp.login(EMAIL_USER, EMAIL_PASSWORD)
            smtp.sendmail(EMAIL_USER, to_email, msg.as_string())

        print(f'[NOMCHAT EMAIL] Welcome sent to {to_email}')
        return True
    except Exception as e:
        print(f'[NOMCHAT EMAIL] Welcome error: {e}')
        return False
