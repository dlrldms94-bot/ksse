const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ksse2026';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'api', 'data');
const DATA_FILE = path.join(DATA_DIR, 'registrations.json');

app.use(express.json({ limit: '2mb' }));

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readRegistrations() {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(raw || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeRegistrations(list) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), 'utf8');
}

function normalizePhone(phone) {
  return String(phone).replace(/\D/g, '');
}

function handleRegistrationsApi(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'GET') {
    const pw = req.query.password || '';
    if (pw !== ADMIN_PASSWORD) {
      return res.status(403).json({ ok: false, error: 'forbidden' });
    }
    const list = readRegistrations().sort((a, b) => (b.id || 0) - (a.id || 0));
    return res.json({ ok: true, registrations: list });
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const action = body.action || 'register';

    if (action === 'verify') {
      const name = String(body.name || '').trim();
      const phone = normalizePhone(body.phone || '');
      const password = String(body.password || '');
      if (!name || !phone || !password) {
        return res.status(400).json({ ok: false, error: 'missing_fields' });
      }
      const found = readRegistrations().find(
        (row) =>
          row.name === name &&
          normalizePhone(row.phone) === phone &&
          String(row.password) === password
      );
      if (found) {
        return res.json({ ok: true, found: true, registration: found });
      }
      return res.json({ ok: true, found: false });
    }

    if (action === 'register') {
      const required = [
        'name',
        'org',
        'orgType',
        'title',
        'phone',
        'email',
        'forumApply',
        'forumApplyLabel',
        'password',
      ];
      for (const key of required) {
        if (!body[key] || String(body[key]).trim() === '') {
          return res.status(400).json({ ok: false, error: `missing_${key}` });
        }
      }
      const list = readRegistrations();
      const entry = {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        name: String(body.name).trim(),
        org: String(body.org).trim(),
        orgType: String(body.orgType).trim(),
        title: String(body.title).trim(),
        phone: String(body.phone).trim(),
        email: String(body.email).trim(),
        forumApply: String(body.forumApply),
        forumApplyLabel: String(body.forumApplyLabel),
        password: String(body.password),
      };
      list.push(entry);
      try {
        writeRegistrations(list);
      } catch {
        return res.status(500).json({ ok: false, error: 'write_failed' });
      }
      return res.status(201).json({ ok: true, registration: entry });
    }

    return res.status(400).json({ ok: false, error: 'unknown_action' });
  }

  return res.status(405).json({ ok: false, error: 'method_not_allowed' });
}

app.get('/api/registrations.php', handleRegistrationsApi);
app.post('/api/registrations.php', handleRegistrationsApi);
app.get('/api/registrations', handleRegistrationsApi);
app.post('/api/registrations', handleRegistrationsApi);

app.use(express.static(__dirname, { extensions: ['html'] }));

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  ensureDataDir();
  console.log(`KSSE site listening on port ${PORT}`);
});
