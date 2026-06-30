/**
 * Scanner PWA logic (ADR-0004 / plan §3). Offline-first onboarding collector:
 *  - input: Bluetooth/USB HID scanner (keyboard-wedge, Enter) OR phone camera
 *    (BarcodeDetector API);
 *  - autofill name + uom from the bundled reference dictionary;
 *  - harga & stok OPTIONAL (item lahir "perlu harga" di desktop);
 *  - export an import-compatible 18-column ';' CSV (+ BOM) for `import:products`.
 * Session persists in localStorage so a reload/offline gap doesn't lose work.
 */
const $ = (id) => document.getElementById(id)
const LS = 'scan-items'

// ── reference dictionary (bundle → fallback sample) ─────────────────────────
const ref = new Map()
async function loadReference() {
  for (const url of ['reference.json', 'reference.sample.json']) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const arr = await res.json()
      for (const r of arr) ref.set(String(r.b), { name: r.n, uom: r.u || 'PCS' })
      $('refcount').textContent = `· kamus ${ref.size.toLocaleString('id-ID')}${url.includes('sample') ? ' (contoh)' : ''}`
      return
    } catch { /* try next */ }
  }
  $('refcount').textContent = '· kamus kosong'
}

// ── capture state ───────────────────────────────────────────────────────────
let items = []
try { items = JSON.parse(localStorage.getItem(LS) || '[]') } catch { items = [] }
const save = () => localStorage.setItem(LS, JSON.stringify(items))

function addBarcode(raw) {
  const barcode = String(raw || '').trim()
  if (!barcode) return
  const existing = items.find((i) => i.barcode === barcode)
  if (existing) { flash(barcode); return } // dedup: don't double-add, just highlight
  const r = ref.get(barcode)
  items.unshift({ barcode, name: r?.name || '', uom: r?.uom || 'PCS', price: '', stock: '', known: !!r })
  save(); render(); flash(barcode)
}

function update(barcode, field, value) {
  const it = items.find((i) => i.barcode === barcode)
  if (it) { it[field] = value; save(); if (field === 'price') render() }
}
function remove(barcode) { items = items.filter((i) => i.barcode !== barcode); save(); render() }

// ── render ──────────────────────────────────────────────────────────────────
function render() {
  $('count').textContent = `${items.length} item`
  $('empty').style.display = items.length ? 'none' : 'block'
  $('exportBtn').disabled = items.length === 0
  const list = $('list')
  list.innerHTML = ''
  for (const it of items) {
    const el = document.createElement('div')
    el.className = 'item'
    el.id = 'it-' + cssId(it.barcode)
    el.innerHTML = `
      <div class="row">
        <span class="bc">${esc(it.barcode)}</span>
        ${it.name ? '' : '<span class="badge warn">tdk di kamus</span>'}
        ${it.price === '' ? '<span class="badge warn">perlu harga</span>' : ''}
        <span style="flex:1"></span>
        <button class="del" data-del="${esc(it.barcode)}">🗑</button>
      </div>
      <div class="grid">
        <input class="name" type="text" placeholder="nama produk" data-f="name" value="${esc(it.name)}" />
        <input type="text" placeholder="satuan" data-f="uom" value="${esc(it.uom)}" />
        <input type="number" min="0" inputmode="numeric" placeholder="harga (opsional)" data-f="price" value="${esc(it.price)}" />
        <input type="number" min="0" inputmode="numeric" placeholder="stok (opsional)" data-f="stock" value="${esc(it.stock)}" />
      </div>`
    el.querySelectorAll('[data-f]').forEach((inp) => inp.addEventListener('change', (e) => update(it.barcode, e.target.dataset.f, e.target.value)))
    el.querySelector('[data-del]').addEventListener('click', () => remove(it.barcode))
    list.appendChild(el)
  }
}
function flash(barcode) {
  const el = $('it-' + cssId(barcode))
  if (!el) return
  el.scrollIntoView({ block: 'nearest' })
  el.style.outline = '2px solid var(--ac)'
  setTimeout(() => { el.style.outline = '' }, 700)
}
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
const cssId = (s) => s.replace(/[^\w-]/g, '_')

// ── CSV export — 18-col ';' + BOM, import:products compatible (plan §3 table) ─
function cell(v) {
  const s = String(v ?? '')
  return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}
function exportCsv() {
  const header = ['KODE ITEM', 'BARCODE', 'NAMA ITEM', 'JENIS', 'SATUAN', 'MEREK', 'SATUAN DASAR', 'KONVERSI SATUAN DASAR', 'HARGA POKOK', 'HARGA JUAL', 'STOK', 'STOK MINIMUM', 'TIPE ITEM', 'MENGGUNAKAN SERIAL', 'RAK', 'KODE GUDANG-KANTOR', 'KODE SUPPLIER', 'KETERANGAN']
  const lines = [header.join(';')]
  for (const it of items) {
    lines.push([
      it.barcode, it.barcode, it.name || it.barcode, 'NA', it.uom || 'PCS', 'NA', it.uom || 'PCS', '1',
      '', it.price === '' ? '0' : it.price, it.stock === '' ? '0' : it.stock, '0', '1', 'N', '', '', '', '',
    ].map(cell).join(';'))
  }
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `produk-toko-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

// ── camera (BarcodeDetector) ─────────────────────────────────────────────────
let stream = null
let detector = null
let scanTimer = null
let lastSeen = { code: '', t: 0 }
async function toggleCamera() {
  const video = $('video')
  if (stream) { stopCamera(); return }
  if (!('BarcodeDetector' in window)) { $('hint').textContent = 'Kamera tidak didukung browser ini — pakai scanner Bluetooth.'; return }
  try {
    detector = detector || new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf'] })
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    video.srcObject = stream
    await video.play()
    video.classList.add('on')
    $('camBtn').textContent = '⏹ Stop'
    scanTimer = setInterval(detect, 350)
  } catch (e) { $('hint').textContent = 'Gagal membuka kamera: ' + e.message }
}
async function detect() {
  const video = $('video')
  if (!detector || video.readyState < 2) return
  try {
    const codes = await detector.detect(video)
    if (codes && codes[0]) {
      const v = codes[0].rawValue
      const now = Date.now()
      if (v && (v !== lastSeen.code || now - lastSeen.t > 1500)) { lastSeen = { code: v, t: now }; addBarcode(v); navigator.vibrate?.(40) }
    }
  } catch { /* transient */ }
}
function stopCamera() {
  if (scanTimer) clearInterval(scanTimer), (scanTimer = null)
  if (stream) stream.getTracks().forEach((t) => t.stop()), (stream = null)
  $('video').classList.remove('on')
  $('camBtn').textContent = '📷 Kamera'
}

// ── wiring ────────────────────────────────────────────────────────────────────
$('addBtn').addEventListener('click', () => { addBarcode($('barcode').value); $('barcode').value = ''; $('barcode').focus() })
$('barcode').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addBarcode($('barcode').value); $('barcode').value = ''; } })
$('camBtn').addEventListener('click', toggleCamera)
$('exportBtn').addEventListener('click', exportCsv)
$('clearBtn').addEventListener('click', () => { if (confirm('Kosongkan semua item terkumpul?')) { items = []; save(); render() } })

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {})
loadReference()
render()
