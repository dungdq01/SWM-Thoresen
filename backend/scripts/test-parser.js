// Simulate the new line-by-line parser logic against real Vision API output
const lines = [
  'PTSC',
  'PHUY',
  'd dr',
  'Biển số:',
  'Tàu:',
  'Số phiếu: 222510080233',
  '72H05214',
  'LAN NING 15',
  'Công ty cổ phần Cảng dịch vụ dầu khí tổng hợp Phú Mỹ',
  'PTSC PhuMy Joint Stock Company',
  'PHIẾU GIAO NHẬN/ CÂN HÀNG',
  'TAU=>CONG',
  'Người in: Nguyễn Văn Lương',
  'Só Mooc: 72R02762',
  'Kho/bãi:',
  '202510080250',
  'In lúc:',
  '08/10/2025 15:47',
  'Hướng: UNLOADING',
  'Salan:',
  'Hàng hoá:',
  'UREA',
  'Vận đơn: LN15TJ250901/02 Loại hàng:',
  'Chủ hàng:',
  'PVFCCO (CTCP HCDK)',
  'Uỷ thác:',
  'THORESEN VINAMA',
  'Nguồn:',
  'Đích:',
  'Cân xe hàng:',
  'Cân xe rỗng:',
  '36.020 (kg) Thời gian:',
  '18.580 (kg) Thời gian:',
  '08/10/2025 15:46 TRAMCAN01-GAN',
  '08/10/2025 12:42 TRAMCAN01-XA',
  'Trọng lượng hàng:',
  '17.440 (kg)',
];

// Step 1: Build label→value map
const map = new Map();
const emptyLabels = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  const sameLineMatch = line.match(/^([^:]+):\s+(.+)$/);
  if (sameLineMatch) {
    const label = sameLineMatch[1].trim().toLowerCase();
    const value = sameLineMatch[2].trim();
    if (!value.endsWith(':') && value.length > 0) {
      map.set(label, value);
      continue;
    }
  }
  const emptyLabelMatch = line.match(/^([^:]+):\s*$/);
  if (emptyLabelMatch) {
    emptyLabels.push({ label: emptyLabelMatch[1].trim().toLowerCase(), lineIndex: i });
  }
}

// Step 2: Classify lines
const emptyLabelIndices = new Set(emptyLabels.map(el => el.lineIndex));
const lineTypes = lines.map((_, i) => {
  const line = lines[i].trim();
  if (!line) return 'other';
  if (emptyLabelIndices.has(i)) return 'empty-label';
  if (/^[^:]+:\s+.+$/.test(line)) return 'same-line';
  return 'orphan';
});

// Step 3: Group strictly consecutive empty labels (gap=1)
const groups = [];
let currentGroup = [emptyLabels[0]];
for (let i = 1; i < emptyLabels.length; i++) {
  if (emptyLabels[i].lineIndex - emptyLabels[i - 1].lineIndex === 1) {
    currentGroup.push(emptyLabels[i]);
  } else {
    groups.push(currentGroup);
    currentGroup = [emptyLabels[i]];
  }
}
groups.push(currentGroup);

const consumed = new Set();
for (const group of groups) {
  const groupLineSet = new Set(group.map(el => el.lineIndex));
  const lastLabelIdx = group[group.length - 1].lineIndex;
  const orphans = [];
  for (let i = lastLabelIdx + 1; i < lines.length && orphans.length < group.length; i++) {
    if (consumed.has(i)) continue;
    const line = lines[i].trim();
    if (!line) continue;
    // STOP at empty-label from different group
    if (lineTypes[i] === 'empty-label' && !groupLineSet.has(i)) break;
    if (lineTypes[i] === 'same-line') continue;
    orphans.push({ lineIdx: i, value: line });
  }
  for (let i = 0; i < Math.min(group.length, orphans.length); i++) {
    if (!map.has(group[i].label)) {
      map.set(group[i].label, orphans[i].value);
      consumed.add(orphans[i].lineIdx);
    }
  }
}

console.log('Groups:', groups.map(g => g.map(l => `${l.label}(${l.lineIndex})`).join(', ')));

console.log('=== Label Map ===');
for (const [k, v] of map) console.log(`  "${k}" => "${v}"`);

// Step 3: Resolve fields
const resolve = (keys) => { for (const k of keys) { const v = map.get(k); if (v) return v; } return undefined; };

console.log('\n=== Resolved Fields ===');
console.log('Số phiếu:', resolve(['số phiếu']) || 'N/A');
console.log('Biển số xe:', resolve(['biển số', 'biển số xe']) || 'N/A');
console.log('Hàng hóa:', resolve(['hàng hoá', 'hàng hóa', 'salan']) || 'N/A');
console.log('Tên tàu:', resolve(['tàu', 'tên tàu']) || 'N/A');
console.log('Khách hàng:', resolve(['chủ hàng', 'khách hàng']) || 'N/A');
console.log('Nơi giao (Đích):', resolve(['đích', 'nơi giao']) || '(empty)');

// Step 4: Weight extraction
function parseVN(s) {
  if (s.includes('.')) { const p = s.split('.'); if (p[p.length-1].length === 3) return parseFloat(s.replace(/\./g, '')); }
  return parseFloat(s);
}

let grossIdx = -1, tareIdx = -1, netIdx = -1;
for (let i = 0; i < lines.length; i++) {
  const low = lines[i].toLowerCase();
  if (/cân\s*xe\s*hàng/.test(low)) grossIdx = i;
  else if (/cân\s*xe\s*rỗng/.test(low)) tareIdx = i;
  else if (/trọng\s*lượng\s*hàng/.test(low)) netIdx = i;
}

const wvals = [];
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/([\d.,]+)\s*\(?(kg|KG)\)?/i);
  if (m) { const v = parseVN(m[1]); if (v > 0) wvals.push({ idx: i, value: v, uom: 'KG' }); }
}

console.log('\nWeight labels:', { grossIdx, tareIdx, netIdx });
console.log('Weight values:', wvals);

const used = new Set();
function assignW(labelIdx) {
  if (labelIdx < 0) return null;
  for (const w of wvals) {
    if (w.idx > labelIdx && !used.has(w.idx)) { used.add(w.idx); return w; }
  }
  return null;
}

const gross = assignW(grossIdx);
const tare = assignW(tareIdx);
const net = assignW(netIdx);

console.log('\n=== Weight Results ===');
console.log('TL xe hàng (gross):', gross ? `${gross.value} ${gross.uom}` : 'N/A');
console.log('TL xe rỗng (tare):', tare ? `${tare.value} ${tare.uom}` : 'N/A');
console.log('TL hàng (net):', net ? `${net.value} ${net.uom}` : 'N/A');

console.log('\n=== EXPECTED vs ACTUAL ===');
const expected = {
  'Số phiếu': '222510080233',
  'Tên tàu': 'LAN NING 15',
  'Khách hàng': 'PVFCCO (CTCP HCDK)',
  'Hàng hóa': 'UREA',
  'Biển số xe': '72H05214',
  'TL xe hàng': 36020,
  'TL xe rỗng': 18580,
  'TL hàng': 17440,
};
const actual = {
  'Số phiếu': resolve(['số phiếu']),
  'Tên tàu': resolve(['tàu']),
  'Khách hàng': resolve(['chủ hàng']),
  'Hàng hóa': resolve(['hàng hoá', 'hàng hóa', 'salan']),
  'Biển số xe': resolve(['biển số']),
  'TL xe hàng': gross?.value,
  'TL xe rỗng': tare?.value,
  'TL hàng': net?.value,
};

let allPass = true;
for (const [key, exp] of Object.entries(expected)) {
  const act = actual[key];
  const pass = String(act) === String(exp);
  console.log(`${pass ? '✅' : '❌'} ${key}: expected="${exp}" actual="${act}"`);
  if (!pass) allPass = false;
}
console.log(allPass ? '\n✅ ALL TESTS PASSED!' : '\n❌ SOME TESTS FAILED');
