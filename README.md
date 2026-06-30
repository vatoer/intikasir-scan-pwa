# Intikasir — Scan Onboarding (PWA)

Aplikasi web **offline-first** untuk mendata produk di rak via **barcode** (kamera HP
atau scanner Bluetooth), lalu **export CSV** untuk diimport ke POS desktop Intikasir.

## 🔗 Buka / install

**https://vatoer.github.io/intikasir-scan-pwa/**

<img src="qr.png" alt="QR ke PWA" width="240" />

Scan QR di atas dengan kamera HP, atau buka URL-nya di Chrome.

## Pakai (sekali online, lalu offline)

- **Android (Chrome)**: buka URL → menu ⋮ → **Add to Home screen**.
- **iPhone (Safari)**: buka URL di **Safari** → tombol **Share** (kotak panah ↑) →
  **Add to Home Screen** → Add.

Lalu: buka dari ikon home screen → service worker sudah cache app + kamus →
**cabut internet, tetap jalan**. **Scan barang di rak** (kamera atau scanner
**Bluetooth**) → nama & satuan auto dari kamus → **Export CSV** → pindahkan ke
desktop → import (`import:products`).

## Catatan

- **Kamera lintas-browser**: pakai `BarcodeDetector` bila ada (Android Chrome),
  selain itu otomatis fallback ke **ZXing** (vendored, offline) — jadi kamera juga
  jalan di **iPhone/Safari**. Scanner **Bluetooth** (HID) jalan di mana saja.
- Kamera butuh HTTPS/secure-context — URL Pages ini sudah HTTPS.
- Item tanpa harga jadi **"perlu harga"** di desktop — terdaftar tapi diblokir di kasir
  sampai diberi harga.
- Sesi tersimpan di `localStorage` (aman dari reload/offline).

## Update kamus referensi

Kamus ada di `reference.json` (barcode → nama → satuan). Untuk memperbarui: regenerate
dari sumber katalog lalu commit `reference.json` ke repo ini — GitHub Pages otomatis rebuild.
