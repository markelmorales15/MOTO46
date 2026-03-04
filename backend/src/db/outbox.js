const { DatabaseSync } = require('node:sqlite');   // ← CAMBIO
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, '../../../moto46.sqlite'));  // ← CAMBIO

db.exec(`
  CREATE TABLE IF NOT EXISTS outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    to_phone TEXT NOT NULL,
    payload TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    status TEXT DEFAULT 'PENDING',
    attempts INTEGER DEFAULT 0,
    next_retry INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    error TEXT
  );
  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plate TEXT,
    phone TEXT NOT NULL,
    status TEXT DEFAULT 'PENDIENTE_DATOS',
    raw_data TEXT DEFAULT '{}',
    history TEXT DEFAULT '[]',
    created_at INTEGER DEFAULT (strftime('%s','now')),
    updated_at INTEGER DEFAULT (strftime('%s','now'))
  );
`);

const outbox = {
  push: (to_phone, payload, type = 'text') =>
    db.prepare('INSERT INTO outbox (to_phone,payload,type,next_retry) VALUES (?,?,?,?)')
      .run(to_phone, JSON.stringify(payload), type, Date.now()),
  getPending: () =>
    db.prepare("SELECT * FROM outbox WHERE status='PENDING' AND next_retry<=? ORDER BY id LIMIT 50").all(Date.now()),
  markSent:  (id) => db.prepare("UPDATE outbox SET status='SENT' WHERE id=?").run(id),
  markRetry: (id, attempts, nextRetry, error) =>
    db.prepare('UPDATE outbox SET attempts=?,next_retry=?,error=? WHERE id=?').run(attempts, nextRetry, error, id),
  markDead:  (id, error) => db.prepare("UPDATE outbox SET status='DEAD',error=? WHERE id=?").run(error, id),
  getAll: (status) => status
    ? db.prepare('SELECT * FROM outbox WHERE status=? ORDER BY id DESC LIMIT 200').all(status)
    : db.prepare('SELECT * FROM outbox ORDER BY id DESC LIMIT 200').all(),
  retry: (id) =>
    db.prepare("UPDATE outbox SET status='PENDING',attempts=0,next_retry=0,error=NULL WHERE id=?").run(id),
};

const requests = {
  upsertByPlate: (plate, phone, fields) => {
    const ex = db.prepare('SELECT * FROM requests WHERE plate=?').get(plate);
    if (ex) {
      const merged = { ...JSON.parse(ex.raw_data || '{}'), ...fields };
      db.prepare("UPDATE requests SET raw_data=?,status=?,phone=?,updated_at=strftime('%s','now') WHERE id=?")
        .run(JSON.stringify(merged), fields.status || ex.status, phone, ex.id);
      return ex.id;
    }
    return db.prepare('INSERT INTO requests (plate,phone,status,raw_data) VALUES (?,?,?,?)')
      .run(plate, phone, fields.status || 'PENDIENTE_DATOS', JSON.stringify(fields)).lastInsertRowid;
  },
  upsertByPhone: (phone, fields) => {
    const ex = db.prepare(
      "SELECT * FROM requests WHERE phone=? AND status NOT IN ('ACEPTADA','RECHAZADA') ORDER BY id DESC LIMIT 1"
    ).get(phone);
    if (ex) {
      const merged = { ...JSON.parse(ex.raw_data || '{}'), ...fields };
      db.prepare("UPDATE requests SET raw_data=?,status=?,updated_at=strftime('%s','now') WHERE id=?")
        .run(JSON.stringify(merged), fields.status || ex.status, ex.id);
      return ex.id;
    }
    return db.prepare('INSERT INTO requests (phone,status,raw_data) VALUES (?,?,?)')
      .run(phone, fields.status || 'PENDIENTE_DATOS', JSON.stringify(fields)).lastInsertRowid;
  },
  get: (id) => {
    const r = db.prepare('SELECT * FROM requests WHERE id=?').get(id);
    if (!r) return null;
    return { ...r, raw_data: JSON.parse(r.raw_data||'{}'), history: JSON.parse(r.history||'[]') };
  },
  getByPhone: (phone) => {
    const r = db.prepare(
      "SELECT * FROM requests WHERE phone=? AND status NOT IN ('ACEPTADA','RECHAZADA') ORDER BY id DESC LIMIT 1"
    ).get(phone);
    if (!r) return null;
    return { ...r, raw_data: JSON.parse(r.raw_data||'{}'), history: JSON.parse(r.history||'[]') };
  },
  list: (status) => {
    const rows = status
      ? db.prepare('SELECT * FROM requests WHERE status=? ORDER BY updated_at DESC').all(status)
      : db.prepare('SELECT * FROM requests ORDER BY updated_at DESC').all();
    return rows.map(r => ({ ...r, raw_data: JSON.parse(r.raw_data||'{}'), history: JSON.parse(r.history||'[]') }));
  },
  addHistory: (id, entry) => {
    const r = db.prepare('SELECT history FROM requests WHERE id=?').get(id);
    const hist = JSON.parse(r?.history || '[]');
    hist.push({ ...entry, ts: Date.now() });
    db.prepare("UPDATE requests SET history=?,updated_at=strftime('%s','now') WHERE id=?").run(JSON.stringify(hist), id);
  },
  setStatus: (id, status) =>
    db.prepare("UPDATE requests SET status=?,updated_at=strftime('%s','now') WHERE id=?").run(status, id),
};

module.exports = { db, outbox, requests };
