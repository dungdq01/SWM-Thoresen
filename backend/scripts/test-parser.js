// ═══════════════════════════════════════════════════════════════════
// Test 3-layer OCR parser against all 4 ticket formats
// Simulates the full synonym + fuzzy + regex pipeline
// ═══════════════════════════════════════════════════════════════════

// ─── Synonym Dictionary (same as in ocr-field-parser.service.ts) ──
const SYNONYMS = [
  { label: 'số phiếu', field: 'bl', confidence: 95 },
  { label: 'phiếu số', field: 'bl', confidence: 95 },
  { label: 'sheet no', field: 'bl', confidence: 90 },
  { label: 'stt', field: 'bl', confidence: 80 },
  { label: 'lgh số', field: 'bl', confidence: 85 },
  { label: 'biển số', field: 'vehicle', confidence: 95 },
  { label: 'biển số xe', field: 'vehicle', confidence: 95 },
  { label: 'số xe', field: 'vehicle', confidence: 95 },
  { label: 'số xe rơ moóc', field: 'vehicle', confidence: 90 },
  { label: 'truck no', field: 'vehicle', confidence: 90 },
  { label: 'tàu', field: 'vessel', confidence: 95 },
  { label: 'tên tàu', field: 'vessel', confidence: 95 },
  { label: 'tàu giao', field: 'vessel', confidence: 95 },
  { label: 'tàu/ chuyến', field: 'vessel', confidence: 90 },
  { label: 'vessel', field: 'vessel', confidence: 90 },
  { label: 'hàng hoá', field: 'product', confidence: 95 },
  { label: 'hàng hóa', field: 'product', confidence: 95 },
  { label: 'nhóm hàng', field: 'product', confidence: 90 },
  { label: 'cargo', field: 'product', confidence: 90 },
  { label: 'salan', field: 'product', confidence: 80 },
  { label: 'khách hàng', field: 'customer', confidence: 95 },
  { label: 'chủ hàng', field: 'customer', confidence: 95 },
  { label: 'customer', field: 'customer', confidence: 90 },
  { label: 'nơi nhận', field: 'customer', confidence: 80 },
  { label: 'nơi giao', field: 'delivery', confidence: 95 },
  { label: 'đích', field: 'delivery', confidence: 90 },
  { label: 'delivery place', field: 'delivery', confidence: 90 },
  { label: 'cân xe hàng', field: 'gross_weight', confidence: 95 },
  { label: 'trọng lượng xe có hàng', field: 'gross_weight', confidence: 95 },
  { label: 'trọng lượng xe & hàng', field: 'gross_weight', confidence: 95 },
  { label: 't.lượng khi ra', field: 'gross_weight', confidence: 85 },
  { label: 'weigh in', field: 'gross_weight', confidence: 85 },
  { label: 'cân xe rỗng', field: 'tare_weight', confidence: 95 },
  { label: 'cân xe không', field: 'tare_weight', confidence: 95 },
  { label: 'trọng lượng xe không', field: 'tare_weight', confidence: 95 },
  { label: 'trọng lượng xe', field: 'tare_weight', confidence: 90 },
  { label: 't.lượng khi vào', field: 'tare_weight', confidence: 85 },
  { label: 'weigh out', field: 'tare_weight', confidence: 85 },
  { label: 'trọng lượng hàng', field: 'net_weight', confidence: 95 },
  { label: 't.lượng hàng tịnh', field: 'net_weight', confidence: 95 },
  { label: 't.lượng hàng cả bì', field: 'net_weight', confidence: 85 },
  { label: 'cargo weight', field: 'net_weight', confidence: 90 },
];

function removeDiacritics(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

const synonymsNorm = SYNONYMS.map(s => ({ ...s, normalized: removeDiacritics(s.label) }));

function levenshtein(a, b) {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = [];
  for (let i = 0; i <= b.length; i++) m[i] = [i];
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++)
    for (let j = 1; j <= a.length; j++) {
      const c = b[i-1] === a[j-1] ? 0 : 1;
      m[i][j] = Math.min(m[i-1][j]+1, m[i][j-1]+1, m[i-1][j-1]+c);
    }
  return m[b.length][a.length];
}

function matchExact(rawLabel) {
  const lower = rawLabel.toLowerCase().trim();
  for (const syn of synonymsNorm) {
    if (lower === syn.label) return { field: syn.field, confidence: syn.confidence };
  }
  let best = null;
  for (const syn of synonymsNorm) {
    if (syn.label.length < 2) continue;
    if (lower.includes(syn.label)) {
      if (!best || syn.label.length > best.label.length) best = syn;
    }
  }
  if (best) return { field: best.field, confidence: best.confidence };
  return null;
}

function matchFuzzy(rawLabel) {
  const norm = removeDiacritics(rawLabel.toLowerCase().trim());
  if (norm.length < 2) return null;
  const maxDist = norm.length <= 10 ? 2 : 3;
  let bestSyn = null, bestDist = maxDist + 1;
  for (const syn of synonymsNorm) {
    if (syn.normalized.length < 2) continue;
    const dist = levenshtein(norm, syn.normalized);
    if (dist <= maxDist && dist < bestDist) { bestDist = dist; bestSyn = syn; }
    if (norm.length > syn.normalized.length + 3) {
      for (let i = 0; i <= norm.length - syn.normalized.length; i++) {
        const sub = norm.substring(i, i + syn.normalized.length);
        const sd = levenshtein(sub, syn.normalized);
        if (sd <= 1 && sd < bestDist) { bestDist = sd; bestSyn = syn; }
      }
    }
  }
  if (bestSyn && bestDist <= maxDist) {
    return { field: bestSyn.field, confidence: Math.max(bestSyn.confidence - bestDist * 10, 50) };
  }
  return null;
}

function parseVN(numStr) {
  let t = numStr.replace(/[()]/g, '').trim();
  if (/^\d{1,3}(\s\d{3})+$/.test(t)) return parseFloat(t.replace(/\s/g, ''));
  t = t.replace(/\s/g, '');
  if (t.includes('.') && t.includes(',')) return parseFloat(t.replace(/\./g, '').replace(',', '.'));
  if (t.includes('.')) { const p = t.split('.'); if (p[p.length-1].length === 3) return parseFloat(t.replace(/\./g, '')); return parseFloat(t); }
  if (t.includes(',')) { const p = t.split(','); if (p[p.length-1].length === 3) return parseFloat(t.replace(/,/g, '')); return parseFloat(t.replace(',', '.')); }
  return parseFloat(t);
}

function buildLabelValueMap(lines) {
  const map = new Map();
  const emptyLabels = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const sl = line.match(/^([^:]+):\s+(.+)$/);
    if (sl) { const l = sl[1].trim().toLowerCase(), v = sl[2].trim(); if (!v.endsWith(':') && v.length > 0) { map.set(l, v); continue; } }
    const el = line.match(/^([^:]+):\s*$/);
    if (el) { emptyLabels.push({ label: el[1].trim().toLowerCase(), lineIndex: i }); }
  }
  // Resolve empty labels
  if (emptyLabels.length > 0) {
    const emptyIdx = new Set(emptyLabels.map(e => e.lineIndex));
    const lt = lines.map((_, i) => { const l = lines[i].trim(); if (!l) return 'other'; if (emptyIdx.has(i)) return 'empty-label'; if (/^[^:]+:\s+.+$/.test(l)) return 'same-line'; return 'orphan'; });
    const groups = []; let cg = [emptyLabels[0]];
    for (let i = 1; i < emptyLabels.length; i++) {
      if (emptyLabels[i].lineIndex - emptyLabels[i-1].lineIndex === 1) cg.push(emptyLabels[i]);
      else { groups.push(cg); cg = [emptyLabels[i]]; }
    }
    groups.push(cg);
    const consumed = new Set();
    for (const g of groups) {
      const gls = new Set(g.map(e => e.lineIndex));
      const last = g[g.length-1].lineIndex;
      const orphans = [];
      for (let i = last+1; i < lines.length && orphans.length < g.length; i++) {
        if (consumed.has(i)) continue;
        const l = lines[i].trim(); if (!l) continue;
        if (lt[i] === 'empty-label' && !gls.has(i)) break;
        if (lt[i] === 'same-line') continue;
        orphans.push({ lineIdx: i, value: l });
      }
      for (let i = 0; i < Math.min(g.length, orphans.length); i++) {
        if (!map.has(g[i].label)) { map.set(g[i].label, orphans[i].value); consumed.add(orphans[i].lineIdx); }
      }
    }
  }
  return map;
}

function resolveAllFields(rawMap, fullText) {
  const matches = [];
  for (const [rawLabel, value] of rawMap) {
    if (!value || !value.length) continue;
    const em = matchExact(rawLabel);
    if (em) { matches.push({ field: em.field, value, confidence: em.confidence, source: 'synonym' }); continue; }
    const fm = matchFuzzy(rawLabel);
    if (fm) { matches.push({ field: fm.field, value, confidence: fm.confidence, source: 'fuzzy' }); continue; }
  }
  return matches;
}

function extractWeight(raw) {
  const m = raw.match(/([\d.,\s]+)\s*\(?(kg|KG|Kg|[tT][aấ]n|TON|MT)\)?/i);
  if (m && m[1]) { const v = parseVN(m[1]); if (!isNaN(v) && v > 0) return v; }
  const plain = parseVN(raw.replace(/[^0-9.,\s]/g, ''));
  if (!isNaN(plain) && plain > 100) return plain;
  return null;
}

function pick(matches, field) {
  return matches.filter(m => m.field === field).sort((a,b) => b.confidence - a.confidence)[0];
}

// ═══════════════════════════════════════════════════════════════════
//  4 TEST CASES — simulated Vision API output for each ticket type
// ═══════════════════════════════════════════════════════════════════

const testCases = [
  {
    name: 'Ảnh 4 — PTSC Phú Mỹ (Giao Nhận)',
    lines: [
      'PTSC', 'PHUY', 'Biển số:', 'Tàu:', 'Số phiếu: 222510080233',
      '72H05214', 'LAN NING 15', 'PHIẾU GIAO NHẬN/ CÂN HÀNG', 'TAU=>CONG',
      'Người in: Nguyễn Văn Lương', 'Só Mooc: 72R02762', 'Kho/bãi:', '202510080250',
      'In lúc:', '08/10/2025 15:47', 'Hướng: UNLOADING', 'Salan:', 'Hàng hoá:', 'UREA',
      'Vận đơn: LN15TJ250901/02 Loại hàng:', 'Chủ hàng:', 'PVFCCO (CTCP HCDK)',
      'Uỷ thác:', 'THORESEN VINAMA', 'Nguồn:', 'Đích:',
      'Cân xe hàng:', 'Cân xe rỗng:', '36.020 (kg) Thời gian:', '18.580 (kg) Thời gian:',
      '08/10/2025 15:46 TRAMCAN01-GAN', '08/10/2025 12:42 TRAMCAN01-XA',
      'Trọng lượng hàng:', '17.440 (kg)',
    ],
    expected: {
      bl: '222510080233', vehicle: '72H05214', vessel: 'LAN NING 15',
      product: 'UREA', customer: 'PVFCCO (CTCP HCDK)',
      gross: 36020, tare: 18580, net: 17440,
    },
  },
  {
    name: 'Ảnh 1 — PTSC Phú Mỹ (Cân Kiểm)',
    lines: [
      'PHÚ MỸ PORT', 'PHIẾU CÂN kiểm', 'PHIẾU XUẤT KHO - GIAO NHẬN HÀNG-SỐ: 3917520',
      'Phiếu số: 67', 'Mẫu: OP-TAL-002/02', 'Cân vào/ra: WB-4/WB-4',
      'Ca: NIGHT, ngày: 30/04/25', 'Số Xe Rơ moóc: 72H05242 72R02793',
      'LGH số: ANAQPL421801', 'DV phụ: Tàu_Xe Tải',
      'Tàu giao: BBC MERCURY', 'Khách hàng: BRENNTAG',
      'Nơi giao: Hold 4', 'Nhóm hàng: SODA ASH',
      'Nơi nhận: Customer', 'Đặc tả: N/A',
      'Số lượng bao: 0',
      'T.Lượng khi vào: 18.420 Kg', 'Cân vào lúc: 30/04/25 21:14',
      'T.Lượng khi ra: 42.080 Kg', 'Cân ra lúc: 30/04/25 21:25',
      'T.Lượng bì: 0 Kg', 'Cầu: Liebherr 03',
      'T.Lượng hàng cả bì: 23.660 Kg',
      'T.Lượng hàng tịnh: 23.660 Kg',
    ],
    expected: {
      bl: '67', vehicle: '72H05242', vessel: 'BBC MERCURY',
      product: 'SODA ASH', customer: 'BRENNTAG',
      gross: 42080, tare: 18420, net: 23660,
    },
  },
  {
    name: 'Ảnh 2 — Cảng Tổng Hợp Thị Vải (Bilingual)',
    lines: [
      'CP Cảng Tổng Hợp THỊ VẠI', 'Phú Mỹ 1- Tân Thành - BRVT',
      'PHIẾU CÂN HÀNG', 'WEIGHING SHEET', 'Ca/Shift : 1  Ngày/Date : 15/09/2025',
      'Phiếu số / Sheet No : 025999', 'Xuất / Nhập : XUẤT',
      'Tên tàu, nguồn gốc /Vessel,origin : YUAN HAI',
      'Khách hàng / Customer : PETRO VN/VINAMA',
      'Hàng hóa / Cargo : KALI BOT',
      'Biển số xe / Truck No : 72H 08304',
      'Nơi giao / nhận hàng/Delivery place : CANG TONG HOP THI VAI',
      'Ghi chú / Remark : 72RM 00580',
      'Trọng lượng xe có hàng / Weigh in : 42 980 kg',
      'Trọng lượng xe không / Weigh out : 18 040 kg',
      'Trọng lượng hàng / Cargo Weight : 24 940 kg',
    ],
    expected: {
      bl: '025999', vehicle: '72H08304', vessel: 'YUAN HAI',
      product: 'KALI BOT', customer: 'PETRO VN/VINAMA',
      gross: 42980, tare: 18040, net: 24940,
    },
  },
  {
    name: 'Ảnh 3 — SP-PSA International Port',
    lines: [
      'SPPSA', 'International Port', 'PHIẾU CÂN XE', 'STT: 0054816',
      '15101 / 2025', 'Số phiếu: 1,157,422',
      'Tàu/ chuyến: NING FENG 316', 'Số Bill: 8',
      'Khách hàng: PETROVIETNAM CAMAU FERTILIZER JSC', 'Hầm số: 4',
      'Hàng hóa: NPK',
      'Số xe: 50H-08419', 'Remooc: 50RM-09416', 'Tài xế: DO BA LUONG',
      'Trọng lượng xe & hàng: 46,880', 'Ngày giờ: 10/16/2025 3:39:02 AM',
      'Trọng lượng xe: 19,160', 'Ngày giờ: 10/16/2025 2:39:21 AM',
      'Kiểu cân: NHẬP HÀNG',
      'Trọng lượng hàng: 27,720', 'Số chứng từ:',
    ],
    expected: {
      bl: '1,157,422', vehicle: '50H-08419', vessel: 'NING FENG 316',
      product: 'NPK', customer: 'PETROVIETNAM CAMAU FERTILIZER JSC',
      gross: 46880, tare: 19160, net: 27720,
    },
  },
];

// ═══════════════════════════════════════════════════════════════════
//  RUN ALL TESTS
// ═══════════════════════════════════════════════════════════════════

let totalPass = 0, totalFail = 0;

for (const tc of testCases) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${tc.name}`);
  console.log(`${'═'.repeat(60)}`);

  const rawMap = buildLabelValueMap(tc.lines);
  const fullText = tc.lines.join('\n');
  const matches = resolveAllFields(rawMap, fullText);

  // Extract fields
  const blM = pick(matches, 'bl');
  const vehicleM = pick(matches, 'vehicle');
  const vesselM = pick(matches, 'vessel');
  const productM = pick(matches, 'product');
  const customerM = pick(matches, 'customer');

  // Extract weights
  const grossM = pick(matches, 'gross_weight');
  const tareM = pick(matches, 'tare_weight');
  const netM = pick(matches, 'net_weight');

  let grossV = grossM ? extractWeight(grossM.value) : null;
  let tareV = tareM ? extractWeight(tareM.value) : null;
  let netV = netM ? extractWeight(netM.value) : null;

  // Positional weight fallback: scan lines for weight labels + values (track used lines)
  if (!grossV || !tareV || !netV) {
    const usedLines = new Set();
    // First pass: find all weight label positions
    const wLabels = [];
    for (let i = 0; i < tc.lines.length; i++) {
      const lower = tc.lines[i].toLowerCase().trim();
      const lm = matchExact(lower) || matchFuzzy(lower);
      if (lm && ['gross_weight', 'tare_weight', 'net_weight'].includes(lm.field)) {
        wLabels.push({ idx: i, field: lm.field });
      }
    }
    // Second pass: assign values in label order
    for (const wl of wLabels) {
      for (let j = wl.idx; j < Math.min(wl.idx + 3, tc.lines.length); j++) {
        if (usedLines.has(j)) continue;
        const wm = tc.lines[j].match(/([\d.,\s]+)\s*\(?(kg|KG|Kg)/i);
        if (wm && wm[1]) {
          const v = parseVN(wm[1]);
          if (!isNaN(v) && v > 0) {
            if (wl.field === 'gross_weight' && !grossV) { grossV = v; usedLines.add(j); }
            else if (wl.field === 'tare_weight' && !tareV) { tareV = v; usedLines.add(j); }
            else if (wl.field === 'net_weight' && !netV) { netV = v; usedLines.add(j); }
            break;
          }
        }
      }
    }
  }

  // Smart swap: gross should be > tare
  if (grossV && tareV && grossV < tareV) { [grossV, tareV] = [tareV, grossV]; }

  // Extract first valid plate from composite values like "72H05242 72R02793"
  let vehicleVal = undefined;
  if (vehicleM) {
    const plateP = vehicleM.value.match(/\b(\d{2}[A-Z]\d?[-\s]?\d{3,5})\b/i);
    vehicleVal = plateP ? plateP[1].replace(/\s+/g, '').toUpperCase() : vehicleM.value.replace(/\s+/g, '').toUpperCase();
  }

  const actual = {
    bl: blM?.value,
    vehicle: vehicleVal,
    vessel: vesselM?.value,
    product: productM?.value,
    customer: customerM?.value,
    gross: grossV,
    tare: tareV,
    net: netV,
  };

  const labels = { bl: 'Số phiếu', vehicle: 'Biển số xe', vessel: 'Tên tàu', product: 'Hàng hóa', customer: 'Khách hàng', gross: 'TL xe hàng', tare: 'TL xe rỗng', net: 'TL hàng' };
  let pass = 0, fail = 0;
  for (const [key, exp] of Object.entries(tc.expected)) {
    const act = actual[key];
    const ok = String(act) === String(exp);
    const src = matches.find(m => m.field === key || m.field === key + '_weight')?.source || '-';
    console.log(`  ${ok ? '✅' : '❌'} ${labels[key]}: expected="${exp}" actual="${act}" [${src}]`);
    if (ok) { pass++; totalPass++; } else { fail++; totalFail++; }
  }
  console.log(`  → ${pass}/${pass + fail} passed`);
}

console.log(`\n${'═'.repeat(60)}`);
console.log(`  TOTAL: ${totalPass} passed, ${totalFail} failed out of ${totalPass + totalFail}`);
console.log(`${'═'.repeat(60)}`);
console.log(totalFail === 0 ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED');
