/**
 * Road Ready leaderboard — Google Apps Script backend.
 *
 * Paste this whole file into Extensions › Apps Script on a Google Sheet,
 * then deploy it as a web app (see README.md).
 *
 * Each run is one row:
 *   Run ID | Name | Started | Finished | Points | Hazards handled | Hazards total | Status
 * A row is added as "Playing" when someone taps Start, and filled in
 * as "Finished" when they complete the drive. Rows left as "Playing"
 * are people who quit partway.
 */

const SHEET_NAME = 'Scores';
const HEADERS = ['Run ID', 'Name', 'Started', 'Finished', 'Points', 'Hazards handled', 'Hazards total', 'Status'];
const MAX_POINTS = 2000;   // highest possible score is 1950; anything above is rejected
const TOP_N = 10;          // how many names the leaderboard shows

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Keeps names plain text: no formulas, no extra spaces, 24 characters max. */
function cleanName_(name) {
  let s = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 24);
  s = s.replace(/^[=+\-@\t\r]+/, '');
  return s || 'Driver';
}

function cleanId_(id) {
  const s = String(id || '');
  return /^[a-z0-9\-]{6,40}$/i.test(s) ? s : '';
}

function findRow_(sh, id) {
  const last = sh.getLastRow();
  if (last < 2) return -1;
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = ids.length - 1; i >= 0; i--) {
    if (ids[i][0] === id) return i + 2;
  }
  return -1;
}

/** Best finished score per name (case-insensitive), highest first; ties go to whoever finished first. */
function top_(sh) {
  const last = sh.getLastRow();
  if (last < 2) return [];
  const rows = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
  const best = {};
  rows.forEach(r => {
    if (r[7] !== 'Finished' || r[4] === '') return;
    const key = String(r[1]).toLowerCase();
    const entry = { name: String(r[1]), score: Number(r[4]), handled: Number(r[5]), total: Number(r[6]), at: new Date(r[3]).getTime() };
    const cur = best[key];
    if (!cur || entry.score > cur.score || (entry.score === cur.score && entry.at < cur.at)) best[key] = entry;
  });
  return Object.values(best)
    .sort((a, b) => b.score - a.score || a.at - b.at)
    .slice(0, TOP_N)
    .map(e => ({ name: e.name, score: e.score, handled: e.handled, total: e.total }));
}

/** Players who started in the last 15 minutes and haven't finished yet. */
function playingNow_(sh) {
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const rows = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
  const cutoff = Date.now() - 15 * 60 * 1000;
  return rows.filter(r => r[7] === 'Playing' && new Date(r[2]).getTime() > cutoff).length;
}

/** The game calls this when a player starts and when they finish. */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const sh = getSheet_();
    const id = cleanId_(d.id);
    if (!id) return json_({ ok: false, error: 'bad id' });

    if (d.action === 'start') {
      sh.appendRow([id, cleanName_(d.name), new Date(), '', '', '', '', 'Playing']);
      return json_({ ok: true });
    }

    if (d.action === 'finish') {
      const score = Math.round(Number(d.score));
      const handled = Math.round(Number(d.handled));
      const total = Math.round(Number(d.total));
      if (!(score >= 0 && score <= MAX_POINTS && handled >= 0 && handled <= total && total <= 20)) {
        return json_({ ok: false, error: 'score out of range' });
      }
      let row = findRow_(sh, id);
      if (row === -1) { // the start message never arrived; add the row now
        sh.appendRow([id, cleanName_(d.name), '', '', '', '', '', 'Playing']);
        row = sh.getLastRow();
      }
      if (sh.getRange(row, 8).getValue() === 'Finished') {
        return json_({ ok: true, top: top_(sh) }); // already saved; don't overwrite
      }
      sh.getRange(row, 4, 1, 5).setValues([[new Date(), score, handled, total, 'Finished']]);
      return json_({ ok: true, top: top_(sh) });
    }

    return json_({ ok: false, error: 'unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

/** The projector leaderboard page reads this. */
function doGet() {
  const sh = getSheet_();
  return json_({ ok: true, top: top_(sh), playing: playingNow_(sh), updated: new Date().toISOString() });
}
