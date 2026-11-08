// Google Apps Script behind the RSVP: the "Party RSVP" project in the host's
// Google account, deployed as a web app (Execute as: Me, Who has access:
// Anyone). The site posts each answer here and it lands in the "RSVPs" tab of
// the "Party RSVPs" sheet, one row per guest; changing an answer updates the row.

const SHEET_ID = '1YWjftC8DqSxtLRFLFZLvPeW2KyjAddngJ-5icDDNBQs';
const ANSWERS = { yes: "Yes, I'll be there", maybe: 'Not sure yet', no: "I can't make it" };

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse(e.postData.contents);
    const answer = ANSWERS[data.answer];
    if (!answer) return ContentService.createTextOutput('ignored');
    const name = String(data.name || '').trim().slice(0, 60) || '(link without a name)';
    const sheet = rsvpSheet();
    const rows = sheet.getDataRange().getValues();
    const now = new Date();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).toLowerCase() === name.toLowerCase()) {
        sheet.getRange(i + 1, 2, 1, 3).setValues([[answer, now, Number(rows[i][3] || 0) + 1]]);
        return ContentService.createTextOutput('updated');
      }
    }
    sheet.appendRow([name, answer, now, 0]);
    return ContentService.createTextOutput('added');
  } finally {
    lock.releaseLock();
  }
}

function rsvpSheet() {
  const book = SpreadsheetApp.openById(SHEET_ID);
  let sheet = book.getSheetByName('RSVPs');
  if (!sheet) {
    sheet = book.insertSheet('RSVPs');
    sheet.appendRow(['Guest', 'Answer', 'Last updated', 'Times changed']);
    sheet.setFrozenRows(1);
    sheet.getRange('A1:D1').setFontWeight('bold');
  }
  return sheet;
}

// Run once from the editor: creates the RSVPs tab and asks for permission.
function setup() {
  rsvpSheet();
}
