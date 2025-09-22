require('dotenv').config({ path: __dirname + '/task.env' });

const cors = require('cors');
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();

// Mailgun
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
    username: 'api',
    key: process.env.MAILGUN_API_KEY
});
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;

// 解析请求体
app.use(bodyParser.json());

app.use(cors({
    origin: ['http://localhost:3000'],
    methods: ['GET','POST']
}));

//POST /api/subscribe
app.post("/api/subscribe", async (req, res) => {
    const email = req.body.email;
    console.log("RECEIVED SUBSCRIBE REQUEST:", email);

    try {
        await mg.messages.create(MAILGUN_DOMAIN, {
            from: "DEV@Deakin Daily Insider <noreply@" + MAILGUN_DOMAIN + ">",
            to: [email],
            subject: "Welcome to DEV@Deakin Daily Insider!",
            text: `Hi there,

Thanks for subscribing to DEV@Deakin's Daily Insider!
You'll now receive updates directly to this email.

Stay tuned!

— The DEV@Deakin Team`
        });

        // 2. 返回成功响应
        res.json({
            success: true,
            message: `successful! the welcome email has been send to ${email}`
        });
    } catch (error) {
        console.error("❌ fail to send the mail:", error);
        res.status(500).json({
            error: "subscribe is successful,but failed to send the e-mail,please try later"
        });
    }
});

// 首页 HTML
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// 静态文件服务
app.use(express.static(__dirname));

// 404处理
app.use((req, res) => {
    res.status(404).json({
        error: `API endpoint not found: ${req.method} ${req.path}`
    });
});

// 启动服务器
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`server is running: http://localhost:${PORT}`);
});
