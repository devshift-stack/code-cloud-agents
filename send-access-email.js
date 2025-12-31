// Direktes E-Mail-Senden über den Server
import nodemailer from "nodemailer";

const testAccount = {
  user: "qri2cxpgnyc2etcw@ethereal.email",
  pass: "U3RKC7kwmsx4hQxxUZ",
};

const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  secure: false,
  auth: {
    user: testAccount.user,
    pass: testAccount.pass,
  },
});

const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; }
    .section { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #667eea; }
    .code-block { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 5px; overflow-x: auto; font-family: 'Courier New', monospace; font-size: 13px; }
    .badge { display: inline-block; padding: 5px 10px; background: #667eea; color: white; border-radius: 4px; font-size: 12px; font-weight: bold; }
    .credential { background: #e3f2fd; padding: 10px; border-radius: 5px; margin: 10px 0; }
    .credential strong { color: #1976d2; }
    h2 { color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
    h3 { color: #764ba2; }
    .endpoint { background: #f5f5f5; padding: 8px 12px; border-radius: 4px; font-family: monospace; display: inline-block; margin: 5px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 Cloud Agents - Production Access</h1>
      <p>Deine Zugangsdaten und Test-Anleitung</p>
    </div>
    
    <div class="content">
      <div class="section">
        <h2>📍 Server-Zugang</h2>
        <div class="credential">
          <strong>IP-Adresse:</strong> 178.156.178.70<br>
          <strong>Port:</strong> 80 (HTTP)<br>
          <strong>Dashboard:</strong> <a href="http://178.156.178.70">http://178.156.178.70</a><br>
          <strong>API Docs:</strong> <a href="http://178.156.178.70/api-docs">http://178.156.178.70/api-docs</a>
        </div>
      </div>

      <div class="section">
        <h2>👤 Dein Account</h2>
        <div class="credential">
          <strong>E-Mail:</strong> d.selmanovic@step2job.com<br>
          <strong>Passwort:</strong> CloudAgents2025<br>
          <strong>Rolle:</strong> User
        </div>
      </div>

      <div class="section">
        <h2>📧 E-Mail Testing (Ethereal)</h2>
        <div class="credential">
          <strong>Inbox:</strong> <a href="https://ethereal.email/messages">https://ethereal.email/messages</a><br>
          <strong>Login:</strong> qri2cxpgnyc2etcw@ethereal.email<br>
          <strong>Passwort:</strong> U3RKC7kwmsx4hQxxUZ
        </div>
        <p><em>Alle Test-E-Mails (Verification, Password Reset) landen hier.</em></p>
      </div>

      <div class="section">
        <h2>🧪 Schnell-Tests</h2>
        
        <h3>1. Health Check</h3>
        <div class="code-block">curl http://178.156.178.70/health</div>
        
        <h3>2. Login</h3>
        <div class="code-block">curl -X POST http://178.156.178.70/api/auth/login \\
  -H 'Content-Type: application/json' \\
  -d '{"email":"d.selmanovic@step2job.com","password":"CloudAgents2025"}'</div>
        
        <h3>3. Password Reset anfordern</h3>
        <div class="code-block">curl -X POST http://178.156.178.70/api/password-reset/request \\
  -H 'Content-Type: application/json' \\
  -d '{"email":"d.selmanovic@step2job.com"}'</div>
      </div>

      <div class="section">
        <h2>📋 Verfügbare Features</h2>
        <ul>
          <li><span class="badge">AUTH</span> User Registration & Login (JWT)</li>
          <li><span class="badge">EMAIL</span> Email Verification & Password Reset</li>
          <li><span class="badge">API</span> RESTful API mit Swagger Docs</li>
          <li><span class="badge">WS</span> WebSocket Real-time Communication</li>
          <li><span class="badge">GITHUB</span> GitHub Integration</li>
          <li><span class="badge">LINEAR</span> Linear Integration</li>
          <li><span class="badge">MEMORY</span> Chat Memory System</li>
          <li><span class="badge">WEBHOOKS</span> GitHub & Linear Webhooks</li>
          <li><span class="badge">SETTINGS</span> User & System Settings</li>
        </ul>
      </div>

      <div class="section">
        <h2>📚 Vollständige Dokumentation</h2>
        <p>Eine detaillierte Test-Anleitung mit allen Endpoints findest du im Anhang oder unter:</p>
        <div class="endpoint">http://178.156.178.70/api-docs</div>
      </div>

      <div class="section">
        <h2>🎯 Empfohlener Test-Workflow</h2>
        <ol>
          <li><strong>Health Check</strong> - System-Status prüfen</li>
          <li><strong>Login</strong> - Mit deinen Credentials einloggen</li>
          <li><strong>Profil abrufen</strong> - <code>/api/users/me</code></li>
          <li><strong>Email Verification</strong> - Test-E-Mail senden</li>
          <li><strong>Password Reset</strong> - Reset-Flow testen</li>
          <li><strong>Swagger UI</strong> - Alle Endpoints interaktiv testen</li>
        </ol>
      </div>

      <div class="section">
        <h2>⚡ Next Steps</h2>
        <ul>
          <li>Domain registrieren (z.B. cloudagents.dev)</li>
          <li>SSL/HTTPS einrichten (Let's Encrypt)</li>
          <li>Production SMTP konfigurieren</li>
          <li>Monitoring Setup</li>
        </ul>
      </div>
    </div>

    <div class="footer">
      <p>🤖 Generated with Cloud Agents v0.1.0</p>
      <p>Supervisor: ENGINEERING_LEAD_SUPERVISOR</p>
      <p>Generiert am: ${new Date().toLocaleString("de-DE")}</p>
    </div>
  </div>
</body>
</html>
`;

async function sendEmail() {
  try {
    const info = await transporter.sendMail({
      from: '"Cloud Agents" <noreply@cloudagents.dev>',
      to: "d.selmanovic@step2job.com",
      subject: "🚀 Cloud Agents - Production Access & Test Guide",
      html: emailHTML,
      text: "Cloud Agents Production Access - Siehe HTML Version für vollständige Details.",
    });

    console.log("✅ E-Mail gesendet!");
    console.log("📧 Message ID:", info.messageId);
    console.log("🔗 Preview URL:", nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error("❌ Fehler beim Senden:", error);
  }
}

sendEmail();
