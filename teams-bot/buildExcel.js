const ExcelJS = require('exceljs');

const CLR = {
  navyBg: 'FF1F3864',
  navyFg: 'FFFFFFFF',
  blueBg: 'FF2F5496',
  blueFg: 'FFFFFFFF',
  sectBg: 'FFD6DCE4',
  sectFg: 'FF1F3864',
  comFill: 'FFE2EFDA',
  comFont: 'FF375623',
  actFill: 'FFFCE4D6',
  actFont: 'FF843C0C',
  tbdFill: 'FFFFF2CC',
  tbdFont: 'FF7F6000',
  naFill: 'FFF2F2F2',
  naFont: 'FF595959',
  exFill: 'FFFFD7D7',
  exFont: 'FF9C0006',
  rowAlt: 'FFF4F6FB',
  rowWht: 'FFFFFFFF',
  border: 'FFB8C4D4'
};

function thin(argb) {
  return { style: 'thin', color: { argb: argb || CLR.border } };
}

function allBorder(cell) {
  cell.border = { top: thin(), bottom: thin(), left: thin(), right: thin() };
}

function normStatus(raw) {
  return String(raw || '')
    .trim()
    .replace(/^[✅⚠❌🔶🔹]\s*/u, '')
    .replace(/^(Compliant|Action Required|TBD|N\/A[^,]*)/, '$1');
}

function applyStatus(cell, rawStatus) {
  const status = normStatus(rawStatus);
  let fill;
  let font;
  let label;

  if (status === 'Compliant') {
    fill = CLR.comFill;
    font = CLR.comFont;
    label = '✅  Compliant';
  } else if (status === 'Action Required') {
    fill = CLR.actFill;
    font = CLR.actFont;
    label = '⚠  Action Required';
  } else if (status === 'TBD') {
    fill = CLR.tbdFill;
    font = CLR.tbdFont;
    label = 'TBD';
  } else if (status.startsWith('N/A')) {
    fill = CLR.naFill;
    font = CLR.naFont;
    label = 'N/A – County';
  } else {
    fill = CLR.exFill;
    font = CLR.exFont;
    label = '❌  Exception';
  }

  cell.value = label;
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
  cell.font = { bold: true, color: { argb: font }, size: 9, name: 'Calibri' };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  allBorder(cell);
}

function titleRow(ws, text, columnCount, height) {
  const rowNumber = ws.rowCount + 1;
  ws.mergeCells(rowNumber, 1, rowNumber, columnCount);
  const row = ws.getRow(rowNumber);
  row.height = height || 30;
  const cell = row.getCell(1);
  cell.value = text;
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.navyBg } };
  cell.font = { bold: true, color: { argb: CLR.navyFg }, size: 12, name: 'Calibri' };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = {
    top: thin(CLR.navyBg),
    bottom: thin(CLR.navyBg),
    left: thin(CLR.navyBg),
    right: thin(CLR.navyBg)
  };
}

function legendRow(ws, text, columnCount) {
  const rowNumber = ws.rowCount + 1;
  ws.mergeCells(rowNumber, 1, rowNumber, columnCount);
  const row = ws.getRow(rowNumber);
  row.height = 16;
  const cell = row.getCell(1);
  cell.value = text;
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.tbdFill } };
  cell.font = { italic: true, size: 9, color: { argb: CLR.tbdFont }, name: 'Calibri' };
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
  allBorder(cell);
}

function headerRow(ws, labels, widths) {
  ws.columns = widths.map((width) => ({ width }));
  const row = ws.addRow(labels);
  row.height = 20;
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.blueBg } };
    cell.font = { bold: true, color: { argb: CLR.blueFg }, size: 10, name: 'Calibri' };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: thin(CLR.blueBg),
      bottom: thin(CLR.border),
      left: thin(CLR.border),
      right: thin(CLR.border)
    };
  });
}

function sectionRow(ws, text, columnCount) {
  const rowNumber = ws.rowCount + 1;
  ws.mergeCells(rowNumber, 1, rowNumber, columnCount);
  const row = ws.getRow(rowNumber);
  row.height = 18;
  const cell = row.getCell(1);
  cell.value = `  ${text}`;
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.sectBg } };
  cell.font = { bold: true, color: { argb: CLR.sectFg }, size: 9.5, name: 'Calibri' };
  cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  cell.border = {
    top: thin('FF8496AF'),
    bottom: thin('FF8496AF'),
    left: thin('FF8496AF'),
    right: thin('FF8496AF')
  };
}

function dataCell(cell, value, isAlt, align) {
  cell.value = value || '';
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isAlt ? CLR.rowAlt : CLR.rowWht } };
  cell.font = { size: 10, name: 'Calibri' };
  cell.alignment = { wrapText: true, vertical: 'top', horizontal: align || 'left' };
  allBorder(cell);
}

function sheet1(workbook, data, title, number, shortName) {
  const ws = workbook.addWorksheet('Compliance Matrix General');
  const columnCount = 5;

  titleRow(ws, `REQUEST FOR PROPOSAL  ·  ${title}  ·  ${shortName}  |  Proposal No. ${number}`, columnCount, 34);
  headerRow(ws, ['Sr. No', 'Field', 'Details', 'RFP Page', 'Notes'], [8, 22, 72, 13, 34]);

  (data.general || []).forEach((item, index) => {
    const isAlt = index % 2 === 1;
    const row = ws.addRow([]);
    row.height = 42;
    dataCell(row.getCell(1), item.srNo || index + 1, isAlt, 'center');
    dataCell(row.getCell(2), item.field || '', isAlt);
    dataCell(row.getCell(3), item.details || '', isAlt);
    dataCell(row.getCell(4), item.rfpPage || '', isAlt, 'center');
    const notesCell = row.getCell(5);
    dataCell(notesCell, item.notes || '', isAlt);
    if (String(item.notes || '').startsWith('⚠')) {
      notesCell.font = { size: 10, name: 'Calibri', bold: true, color: { argb: CLR.actFont } };
      notesCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.actFill } };
    }
    row.getCell(2).font = { size: 10, name: 'Calibri', bold: true };
  });

  ws.views = [{ state: 'frozen', ySplit: 2 }];
}

function sheet2(workbook, data, number, shortName) {
  const ws = workbook.addWorksheet('Compliance Matrix Detailed');
  const columnCount = 6;

  titleRow(ws, `COMPLIANCE MATRIX  ·  ${shortName}  |  RFP No. ${number}`, columnCount, 34);
  legendRow(
    ws,
    'Legend:   ✅ Compliant   |   ⚠ Action Required   |   ❌ Exception   |   TBD = To Be Determined   |   N/A = County Responsibility',
    columnCount
  );
  headerRow(ws, ['#', 'Requirement', 'RFP Section', 'RFP Page', 'Status', 'Notes / Action Required'], [6, 65, 19, 12, 22, 36]);

  let sectionIndex = 0;
  (data.detailed || []).forEach((item) => {
    if (item.isHeader) {
      sectionRow(ws, item.section || '', columnCount);
      sectionIndex = 0;
      return;
    }

    sectionIndex += 1;
    const isAlt = sectionIndex % 2 === 0;
    const row = ws.addRow([]);
    row.height = 38;
    const numberCell = row.getCell(1);
    dataCell(numberCell, item.no || sectionIndex, isAlt, 'center');
    numberCell.font = { size: 10, name: 'Calibri', bold: true, color: { argb: CLR.sectFg } };
    dataCell(row.getCell(2), item.requirement || '', isAlt);
    dataCell(row.getCell(3), item.rfpSection || '', isAlt, 'center');
    dataCell(row.getCell(4), item.rfpPage || '', isAlt, 'center');
    applyStatus(row.getCell(5), item.status);
    dataCell(row.getCell(6), item.notes || '', isAlt);
    if (String(item.notes || '').length > 0 && normStatus(item.status) === 'Action Required') {
      row.getCell(6).font = { size: 10, name: 'Calibri', bold: true, color: { argb: CLR.actFont } };
    }
  });

  ws.views = [{ state: 'frozen', ySplit: 3 }];
}

function sheet3(workbook, data, number, shortName) {
  const ws = workbook.addWorksheet('Proposal Checklist');
  const columnCount = 5;

  titleRow(ws, `PROPOSAL SUBMISSION CHECKLIST  ·  ${shortName}  |  RFP No. ${number}`, columnCount, 34);
  headerRow(ws, ['#', 'Deliverable / Document', 'RFP Page', 'Status', 'Notes'], [6, 54, 13, 22, 34]);

  let sectionIndex = 0;
  (data.checklist || []).forEach((item) => {
    if (item.isHeader) {
      sectionRow(ws, item.section || '', columnCount);
      sectionIndex = 0;
      return;
    }

    sectionIndex += 1;
    const isAlt = sectionIndex % 2 === 0;
    const row = ws.addRow([]);
    row.height = 34;
    const numberCell = row.getCell(1);
    dataCell(numberCell, item.no || sectionIndex, isAlt, 'center');
    numberCell.font = { size: 10, name: 'Calibri', bold: true, color: { argb: CLR.sectFg } };
    dataCell(row.getCell(2), item.deliverable || '', isAlt);
    dataCell(row.getCell(3), item.rfpPage || '', isAlt, 'center');
    applyStatus(row.getCell(4), item.status);
    dataCell(row.getCell(5), item.notes || '', isAlt);
  });

  ws.views = [{ state: 'frozen', ySplit: 2 }];
}

function safeFragment(value, fallback) {
  const cleaned = String(value || fallback || '')
    .replace(/\.pdf$/i, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 38);
  return cleaned || fallback;
}

async function buildExcel(data, sourceName) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'RFP Matrix Generator v3';
  workbook.created = new Date();

  const number = data.rfpNumber || 'N_A';
  const shortName = data.clientShortName || data.clientName || '';
  const title = data.rfpTitle || 'Request for Proposal';

  sheet1(workbook, data, title, number, shortName);
  sheet2(workbook, data, number, shortName);
  sheet3(workbook, data, number, shortName);

  const safeSource = safeFragment(sourceName, 'RFP');
  const safeNumber = safeFragment(number, 'N_A');
  const filename = `Compliance_Matrix_RFP${safeNumber}_${safeSource}.xlsx`;
  const output = await workbook.xlsx.writeBuffer();
  return { buffer: Buffer.from(output), filename };
}

module.exports = buildExcel;
