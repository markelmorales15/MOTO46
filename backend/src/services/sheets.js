const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

let _sheets;
async function getSheets() {
  if (_sheets) return _sheets;
  const auth = new google.auth.GoogleAuth({
    keyFile: path.resolve(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  _sheets = google.sheets({ version: 'v4', auth });
  return _sheets;
}

const SHEET   = () => process.env.SHEET_NAME || 'Citas';
const SSID    = () => process.env.SPREADSHEET_ID;
const HEADERS = ['plate','phone','name','date','time_slot','service','notes','status',
                 'boss_notified','created_at','updated_at','request_id','wamid'];

async function ensureHeaders() {
  const s = await getSheets();
  const res = await s.spreadsheets.values.get({ spreadsheetId: SSID(), range: `${SHEET()}!A1:Z1` });
  if (!res.data.values || res.data.values[0]?.join(',') !== HEADERS.join(',')) {
    await s.spreadsheets.values.update({
      spreadsheetId: SSID(), range: `${SHEET()}!A1`,
      valueInputOption: 'RAW', requestBody: { values: [HEADERS] }
    });
  }
}

async function findRowIndex(plate, phone) {
  const s = await getSheets();
  const res = await s.spreadsheets.values.get({ spreadsheetId: SSID(), range: `${SHEET()}!A:M` });
  const rows = res.data.values || [];
  let idx = rows.findIndex((r, i) => i > 0 && r[0] === plate);
  if (idx === -1) idx = rows.findIndex((r, i) => i > 0 && r[1] === phone);
  return idx;
}

async function upsert(data) {
  await ensureHeaders();
  const s = await getSheets();
  const row = HEADERS.map(h => {
    if (h === 'updated_at') return new Date().toISOString();
    if (h === 'created_at' && !data[h]) return new Date().toISOString();
    return data[h] ?? '';
  });
  const idx = await findRowIndex(data.plate, data.phone);
  if (idx > 0) {
    await s.spreadsheets.values.update({
      spreadsheetId: SSID(), range: `${SHEET()}!A${idx + 1}`,
      valueInputOption: 'RAW', requestBody: { values: [row] }
    });
    return { action: 'updated', rowIndex: idx + 1 };
  }
  await s.spreadsheets.values.append({
    spreadsheetId: SSID(), range: `${SHEET()}!A1`,
    valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] }
  });
  return { action: 'inserted' };
}

module.exports = { upsert, ensureHeaders };
