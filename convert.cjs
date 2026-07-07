const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'kompaun.xlsx');
const outPath = path.join(__dirname, 'public', 'data.json');

try {
  console.log('Reading Excel file...');
  const workbook = xlsx.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  const data = xlsx.utils.sheet_to_json(worksheet, {
    raw: false,
    dateNF: 'yyyy-mm-dd'
  });

  fs.writeFileSync(outPath, JSON.stringify(data));
  console.log(`Successfully exported ${data.length} rows to public/data.json`);
} catch (err) {
  console.error('Error:', err.message);
}
