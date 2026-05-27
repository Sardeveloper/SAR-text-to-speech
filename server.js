const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const db = require("./database");
const { exec } = require("child_process");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: "voicepro_secret",
  resave: false,
  saveUninitialized: false
}));

app.use(express.static("public"));

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect("/login.html");
  next();
}

/* MAIN PAGE */
app.get("/", requireLogin, (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

/* REGISTER */
app.post("/register", (req, res) => {
  const { email, password } = req.body;

  bcrypt.hash(password, 10, (err, hash) => {
    db.run(
      "INSERT INTO users (email, password) VALUES (?, ?)",
      [email, hash],
      (err) => {
        if (err) return res.json({ error: "User exists" });
        res.json({ success: true });
      }
    );
  });
});

/* LOGIN */
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
    if (!user) return res.json({ error: "User not found" });

    bcrypt.compare(password, user.password, (err, ok) => {
      if (!ok) return res.json({ error: "Wrong password" });

      const today = new Date().toDateString();

      if (!user.last_reset || user.last_reset !== today) {
        db.run(
          "UPDATE users SET usage_count = 0, last_reset = ? WHERE id = ?",
          [today, user.id]
        );
        user.usage_count = 0;
      }

      req.session.user = user;
      res.json({ success: true });
    });
  });
});

/* LOGOUT */
app.post("/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

/* USER INFO */
app.get("/me", (req, res) => {
  if (!req.session.user) return res.json(null);
  res.json(req.session.user);
});

/* TTS + DOWNLOAD FIX */
app.post("/tts", requireLogin, (req, res) => {
  const user = req.session.user;

  if (user.is_pro === 0 && user.usage_count >= 10) {
    return res.status(403).send("Limit reached");
  }

  const text = req.body.text;
  const file = path.join(__dirname, "speech.mp3");

  const command = `python3 voice.py "${text}" "${file}"`;

  exec(command, (err) => {
    if (err) return res.status(500).send("TTS error");

    setTimeout(() => {
      db.run(
        "UPDATE users SET usage_count = usage_count + 1 WHERE id = ?",
        [user.id]
      );

      res.download(file);
    }, 500);
  });
});

app.listen(3000, () => {
  console.log("🚀 VoicePro running on http://localhost:3000");
});
