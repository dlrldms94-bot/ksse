const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'api', 'data');
const REG_FILE = path.join(DATA_DIR, 'registrations.json');
const NOTICES_FILE = path.join(DATA_DIR, 'notices.json');

const DEFAULT_NOTICES = [
  {
    id: 1,
    title: '2026 대한민국 사회서비스 박람회 사전등록 안내',
    date: '2026-07-01',
    blocks: [
      {
        type: 'text',
        body:
          '안녕하세요.\n2026 대한민국 사회서비스 박람회 사전등록이 시작되었습니다.\n\n■ 사전등록 기간: 2026. 7. 1. ~ 2026. 9. 10.\n■ 행사 일정: 2026. 9. 15.(화) ~ 9. 16.(수)\n■ 장소: aT센터 제2전시장(3층)\n\n홈페이지 사전등록 메뉴에서 신청해 주시기 바랍니다.\n개막 3일 전 QR코드가 등록하신 이메일로 발송됩니다.',
      },
    ],
  },
  {
    id: 2,
    title: '박람회 관람 일정 및 입장 안내',
    date: '2026-07-10',
    blocks: [
      {
        type: 'text',
        body:
          '관람객 여러분께 안내드립니다.\n\n■ 1일차 (9.15.화): 13:30 ~ 17:00\n■ 2일차 (9.16.수): 10:00 ~ 17:00\n\n사전등록 후 발송되는 QR코드를 현장에서 제시해 주시면 입장이 가능합니다.\n문의: office@onandme.com / 02-1234-5678',
      },
    ],
  },
  {
    id: 3,
    title: '부대행사(정책포럼·특별세션) 참석 안내',
    date: '2026-07-20',
    blocks: [
      {
        type: 'text',
        body:
          '프로그램 중 부대행사로 사회서비스 정책포럼과 특별세션이 진행됩니다.\n자세한 내용은 프로그램 > 부대행사 메뉴를 확인해 주세요.\n\n※ 좌석이 한정되어 있으니 관심 있는 분들은 미리 일정을 확인해 주시기 바랍니다.',
      },
    ],
  },
];

let pool = null;
let useJson = false;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJson(filePath, fallback) {
  ensureDataDir();
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function normalizePhone(phone) {
  return String(phone).replace(/\D/g, '');
}

function normalizeNotice(notice) {
  const blocks = Array.isArray(notice.blocks)
    ? notice.blocks
    : notice.content
      ? [{ type: 'text', body: String(notice.content) }]
      : [];
  return {
    id: Number(notice.id),
    title: String(notice.title || '').trim(),
    date: String(notice.date || '').slice(0, 10),
    blocks,
    updatedAt: notice.updatedAt || new Date().toISOString(),
  };
}

function mapRegistrationRow(row) {
  return {
    id: Number(row.id),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    name: row.name,
    org: row.org,
    orgType: row.org_type,
    title: row.title,
    phone: row.phone,
    email: row.email,
    forumApply: row.forum_apply,
    forumApplyLabel: row.forum_apply_label,
    password: row.password,
  };
}

function mapNoticeRow(row) {
  return normalizeNotice({
    id: row.id,
    title: row.title,
    date: row.date,
    blocks: row.blocks,
    updatedAt: row.updated_at,
  });
}

function sortNotices(list) {
  return list.slice().sort((a, b) => b.id - a.id);
}

async function seedNoticesIfEmpty() {
  if (useJson) {
    const notices = readJson(NOTICES_FILE, null);
    if (Array.isArray(notices) && notices.length) return;
    writeJson(NOTICES_FILE, DEFAULT_NOTICES);
    return;
  }

  const count = await pool.query('SELECT COUNT(*)::int AS count FROM notices');
  if (count.rows[0].count > 0) return;

  for (const notice of DEFAULT_NOTICES) {
    await pool.query(
      `INSERT INTO notices (id, title, date, blocks, updated_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [notice.id, notice.title, notice.date, JSON.stringify(notice.blocks)]
    );
  }
  await pool.query("SELECT setval('notices_id_seq', (SELECT MAX(id) FROM notices))");
}

async function initDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    useJson = true;
    ensureDataDir();
    await seedNoticesIfEmpty();
    console.log('[db] DATABASE_URL 없음 — JSON 파일 모드');
    return;
  }

  pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS registrations (
      id BIGINT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL,
      name TEXT NOT NULL,
      org TEXT NOT NULL,
      org_type TEXT NOT NULL,
      title TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      forum_apply TEXT NOT NULL,
      forum_apply_label TEXT NOT NULL,
      password TEXT NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notices (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      date DATE NOT NULL,
      blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await seedNoticesIfEmpty();
  console.log('[db] PostgreSQL 연결 완료');
}

function isUsingJson() {
  return useJson;
}

async function listRegistrations() {
  if (useJson) {
    const list = readJson(REG_FILE, []);
    return Array.isArray(list) ? list.slice().sort((a, b) => (b.id || 0) - (a.id || 0)) : [];
  }
  const result = await pool.query('SELECT * FROM registrations ORDER BY id DESC');
  return result.rows.map(mapRegistrationRow);
}

async function insertRegistration(entry) {
  if (useJson) {
    const list = readJson(REG_FILE, []);
    list.push(entry);
    writeJson(REG_FILE, list);
    return entry;
  }
  await pool.query(
    `INSERT INTO registrations (
      id, created_at, name, org, org_type, title, phone, email, forum_apply, forum_apply_label, password
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      entry.id,
      entry.createdAt,
      entry.name,
      entry.org,
      entry.orgType,
      entry.title,
      entry.phone,
      entry.email,
      entry.forumApply,
      entry.forumApplyLabel,
      entry.password,
    ]
  );
  return entry;
}

async function findRegistration({ name, phone, password }) {
  const normalizedPhone = normalizePhone(phone);
  if (useJson) {
    return readJson(REG_FILE, []).find(
      (row) =>
        row.name === name &&
        normalizePhone(row.phone) === normalizedPhone &&
        String(row.password) === String(password)
    ) || null;
  }
  const result = await pool.query(
    `SELECT * FROM registrations
     WHERE name = $1 AND regexp_replace(phone, '\\D', '', 'g') = $2 AND password = $3
     LIMIT 1`,
    [name, normalizedPhone, password]
  );
  return result.rows[0] ? mapRegistrationRow(result.rows[0]) : null;
}

async function listNoticesPublic() {
  const notices = await listNoticesAdmin();
  return notices.map((n) => ({ id: n.id, title: n.title, date: n.date }));
}

async function listNoticesAdmin() {
  if (useJson) {
    const list = readJson(NOTICES_FILE, DEFAULT_NOTICES);
    return sortNotices((Array.isArray(list) ? list : []).map(normalizeNotice));
  }
  const result = await pool.query('SELECT * FROM notices ORDER BY id DESC');
  return result.rows.map(mapNoticeRow);
}

async function getNotice(id) {
  if (useJson) {
    const notice = readJson(NOTICES_FILE, DEFAULT_NOTICES).find((n) => String(n.id) === String(id));
    return notice ? normalizeNotice(notice) : null;
  }
  const result = await pool.query('SELECT * FROM notices WHERE id = $1', [id]);
  return result.rows[0] ? mapNoticeRow(result.rows[0]) : null;
}

async function createNotice({ title, date, blocks }) {
  const payload = { title, date, blocks, updatedAt: new Date().toISOString() };
  if (useJson) {
    const list = readJson(NOTICES_FILE, []);
    const notice = normalizeNotice({
      id: list.reduce((max, n) => Math.max(max, Number(n.id) || 0), 0) + 1,
      ...payload,
    });
    list.push(notice);
    writeJson(NOTICES_FILE, list);
    return notice;
  }
  const result = await pool.query(
    `INSERT INTO notices (title, date, blocks, updated_at)
     VALUES ($1, $2, $3, NOW())
     RETURNING *`,
    [title, date, JSON.stringify(blocks)]
  );
  return mapNoticeRow(result.rows[0]);
}

async function updateNotice(id, { title, date, blocks }) {
  if (useJson) {
    const list = readJson(NOTICES_FILE, []);
    const idx = list.findIndex((n) => String(n.id) === String(id));
    if (idx < 0) return null;
    const notice = normalizeNotice({ id: list[idx].id, title, date, blocks, updatedAt: new Date().toISOString() });
    list[idx] = notice;
    writeJson(NOTICES_FILE, list);
    return notice;
  }
  const result = await pool.query(
    `UPDATE notices SET title = $1, date = $2, blocks = $3, updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [title, date, JSON.stringify(blocks), id]
  );
  return result.rows[0] ? mapNoticeRow(result.rows[0]) : null;
}

async function deleteNotice(id) {
  if (useJson) {
    const list = readJson(NOTICES_FILE, []);
    const next = list.filter((n) => String(n.id) !== String(id));
    if (next.length === list.length) return false;
    writeJson(NOTICES_FILE, next);
    return true;
  }
  const result = await pool.query('DELETE FROM notices WHERE id = $1', [id]);
  return result.rowCount > 0;
}

module.exports = {
  initDatabase,
  isUsingJson,
  listRegistrations,
  insertRegistration,
  findRegistration,
  listNoticesPublic,
  listNoticesAdmin,
  getNotice,
  createNotice,
  updateNotice,
  deleteNotice,
};
