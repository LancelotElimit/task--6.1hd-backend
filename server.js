// server.js
require('dotenv').config({ path: __dirname + '/task.env' }); // 仅本地开发会用到；生产用平台注入的 env

const cors = require('cors');
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();

// ---------------- Mailgun ----------------
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const mailgun = new Mailgun(formData);

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;

if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
  console.warn("[WARN] MAILGUN_API_KEY 或 MAILGUN_DOMAIN 未设置。仅本地调试可使用 task.env；生产必须在平台环境变量中设置。");
}

const mg = mailgun.client({
  username: 'api',
  key: MAILGUN_API_KEY
});

// ---------------- Parsers ----------------
app.use(bodyParser.json());

// ---------------- CORS 白名单 ----------------
// 通过环境变量 ALLOW_ORIGINS 配置多个允许来源，逗号分隔
// 例如：ALLOW_ORIGINS=https://你的站点.netlify.app,https://你的自定义域名
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173'
];

const envOrigins = (process.env.ALLOW_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const ALLOW_ORIGINS = [...defaultOrigins, ...envOrigins];

app.use(cors({
  origin: (origin, cb) => {
    // 无 origin（如 curl/Postman）时放行；其余需命中白名单
    if (!origin) return cb(null, true);
    return cb(null, ALLOW_ORIGINS.includes(origin));
  },
  methods: ['GET', 'POST'],
}));

// ---------------- Health Check ----------------
app.get('/healthz', (_req, res) => {
  res.json({ ok: true, service: 'subscribe-api' });
});

// ---------------- Routes ----------------
app.post("/api/subscribe", async (req, res) => {
  const email = (req.body?.email || '').trim();
  console.log("RECEIVED SUBSCRIBE REQUEST:", email);

  if (!email) {
    return res.status(400).json({ error: "email is required" });
  }
  if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
    return res.status(500).json({ error: "Mail service is not configured" });
  }

  try {
    await mg.messages.create(MAILGUN_DOMAIN, {
      from: `DEV@Deakin Daily Insider <noreply@${MAILGUN_DOMAIN}>`,
      to: [email],
      subject: "Welcome to DEV@Deakin Daily Insider!",
      text: `Hi there,

Thanks for subscribing to DEV@Deakin's Daily Insider!
You'll now receive updates directly to this email.

Stay tuned!

— The DEV@Deakin Team`
    });

    res.json({
      success: true,
      message: `Successful! The welcome email has been sent to ${email}`
    });
  } catch (error) {
    console.error("❌ Failed to send the email:", error);
    res.status(502).json({
      error: "Subscribe succeeded, but sending email failed. Please try later."
    });
  }
});

// （可选）静态首页 & 404
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.use(express.static(__dirname));

app.use((req, res) => {
  res.status(404).json({
    error: `API endpoint not found: ${req.method} ${req.path}`
  });
});

// ---------------- Start ----------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`server is running on http://localhost:${PORT}`);
  console.log("CORS allowlist:", ALLOW_ORIGINS);
});
