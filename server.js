const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const db = require('./server/db');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ksse2026';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'api', 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const SESSION_MS = 8 * 60 * 60 * 1000;
const TOKEN_PREFIX = 'v1.';

const upload = multer({
  storage: multer.diskStorage({
    destination(_req, _file, cb) {
      ensureUploadsDir();
      cb(null, UPLOADS_DIR);
    },
    filename(_req, file, cb) {
      const ext = path.extname(file.originalname || '').toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

app.use(express.json({ limit: '2mb' }));

function ensureUploadsDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/** multer가 multipart filename을 latin1로 읽을 때 한글 파일명 복원 */
function resolveUploadFilename(originalname, displayName) {
  const clientName = String(displayName || '').trim();
  if (clientName) return clientName;
  if (!originalname) return '';
  return Buffer.from(originalname, 'latin1').toString('utf8');
}

function createAdminToken() {
  const expiresAt = Date.now() + SESSION_MS;
  const payload = Buffer.from(JSON.stringify({ exp: expiresAt }), 'utf8').toString('base64url');
  const signature = crypto.createHmac('sha256', ADMIN_PASSWORD).update(payload).digest('base64url');
  return `${TOKEN_PREFIX}${payload}.${signature}`;
}

function verifyAdminToken(token) {
  if (!token || typeof token !== 'string' || !token.startsWith(TOKEN_PREFIX)) return null;
  const body = token.slice(TOKEN_PREFIX.length);
  const dotIndex = body.lastIndexOf('.');
  if (dotIndex <= 0) return null;
  const payload = body.slice(0, dotIndex);
  const signature = body.slice(dotIndex + 1);
  const expected = crypto.createHmac('sha256', ADMIN_PASSWORD).update(payload).digest('base64url');
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ ok: false, error: 'unauthorized', message: '관리자 인증이 필요합니다.' });
  }
  next();
}

function handleAsync(handler) {
  return (req, res) => {
    Promise.resolve(handler(req, res)).catch((error) => {
      console.error(error);
      res.status(500).json({ ok: false, message: error.message || '서버 오류가 발생했습니다.' });
    });
  };
}

async function handleRegistrationsApi(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'GET') {
    const pw = req.query.password || '';
    if (pw !== ADMIN_PASSWORD) {
      return res.status(403).json({ ok: false, error: 'forbidden' });
    }
    const list = await db.listRegistrations();
    return res.json({ ok: true, registrations: list });
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const action = body.action || 'register';

    if (action === 'verify') {
      const name = String(body.name || '').trim();
      const phone = String(body.phone || '').trim();
      const password = String(body.password || '');
      if (!name || !phone || !password) {
        return res.status(400).json({ ok: false, error: 'missing_fields' });
      }
      const found = await db.findRegistration({ name, phone, password });
      if (found) return res.json({ ok: true, found: true, registration: found });
      return res.json({ ok: true, found: false });
    }

    if (action === 'register') {
      const required = [
        'name', 'org', 'orgType', 'title', 'phone', 'email', 'forumApply', 'forumApplyLabel', 'password',
      ];
      for (const key of required) {
        if (!body[key] || String(body[key]).trim() === '') {
          return res.status(400).json({ ok: false, error: `missing_${key}` });
        }
      }
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
      await db.insertRegistration(entry);
      return res.status(201).json({ ok: true, registration: entry });
    }

    return res.status(400).json({ ok: false, error: 'unknown_action' });
  }

  return res.status(405).json({ ok: false, error: 'method_not_allowed' });
}

app.get('/api/registrations.php', handleAsync(handleRegistrationsApi));
app.post('/api/registrations.php', handleAsync(handleRegistrationsApi));
app.get('/api/registrations', handleAsync(handleRegistrationsApi));
app.post('/api/registrations', handleAsync(handleRegistrationsApi));

app.get('/api/health', handleAsync(async (_req, res) => {
  res.json({ ok: true, db: db.isUsingJson() ? 'json' : 'postgresql' });
}));

app.post('/api/admin/login', (req, res) => {
  const password = String(req.body?.password || '');
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, message: '비밀번호가 올바르지 않습니다.' });
  }
  res.json({ ok: true, token: createAdminToken(), expiresAt: Date.now() + SESSION_MS });
});

app.get('/api/notices', handleAsync(async (_req, res) => {
  res.json({ ok: true, notices: await db.listNoticesPublic() });
}));

app.get('/api/notices/:id', handleAsync(async (req, res) => {
  const notice = await db.getNotice(req.params.id);
  if (!notice) return res.status(404).json({ ok: false, message: '게시글을 찾을 수 없습니다.' });
  res.json({ ok: true, notice });
}));

app.get('/api/admin/notices', requireAdmin, handleAsync(async (_req, res) => {
  res.json({ ok: true, notices: await db.listNoticesAdmin() });
}));

app.post('/api/admin/notices', requireAdmin, handleAsync(async (req, res) => {
  const title = String(req.body?.title || '').trim();
  const date = String(req.body?.date || '').trim();
  const blocks = Array.isArray(req.body?.blocks) ? req.body.blocks : [];
  if (!title || !date || !blocks.length) {
    return res.status(400).json({ ok: false, message: '제목, 날짜, 본문을 입력해 주세요.' });
  }
  const notice = await db.createNotice({ title, date, blocks });
  res.status(201).json({ ok: true, notice });
}));

app.put('/api/admin/notices/:id', requireAdmin, handleAsync(async (req, res) => {
  const title = String(req.body?.title || '').trim();
  const date = String(req.body?.date || '').trim();
  const blocks = Array.isArray(req.body?.blocks) ? req.body.blocks : [];
  if (!title || !date || !blocks.length) {
    return res.status(400).json({ ok: false, message: '제목, 날짜, 본문을 입력해 주세요.' });
  }
  const notice = await db.updateNotice(req.params.id, { title, date, blocks });
  if (!notice) return res.status(404).json({ ok: false, message: '게시글을 찾을 수 없습니다.' });
  res.json({ ok: true, notice });
}));

app.delete('/api/admin/notices/:id', requireAdmin, handleAsync(async (req, res) => {
  const deleted = await db.deleteNotice(req.params.id);
  if (!deleted) return res.status(404).json({ ok: false, message: '게시글을 찾을 수 없습니다.' });
  res.json({ ok: true });
}));

app.post('/api/admin/notices/upload', requireAdmin, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ ok: false, message: err.message || '업로드에 실패했습니다.' });
    if (!req.file) return res.status(400).json({ ok: false, message: '파일을 선택해 주세요.' });
    const kind = String(req.body?.kind || 'file');
    const isImage = /^image\//.test(req.file.mimetype || '');
    if (kind === 'image' && !isImage) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ ok: false, message: '이미지 파일만 업로드할 수 있습니다.' });
    }
    if (kind === 'image' && req.file.size > 3 * 1024 * 1024) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ ok: false, message: '이미지는 3MB 이하여야 합니다.' });
    }
    res.status(201).json({
      ok: true,
      url: `/uploads/${req.file.filename}`,
      name: resolveUploadFilename(req.file.originalname, req.body?.displayName),
      mime: req.file.mimetype || '',
    });
  });
});

app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(__dirname, { extensions: ['html'] }));
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

async function start() {
  ensureUploadsDir();
  await db.initDatabase();
  app.listen(PORT, () => {
    console.log(`KSSE site listening on port ${PORT}`);
    console.log(`DB: ${db.isUsingJson() ? 'JSON (local)' : 'PostgreSQL'}`);
  });
}

start().catch((error) => {
  console.error('서버 시작 실패:', error);
  process.exit(1);
});
