# Intikasir — Scan Onboarding (PWA)

Aplikasi web **offline-first** untuk mendata produk di rak via **barcode** (kamera HP
atau scanner Bluetooth), lalu **export CSV** untuk diimport ke POS desktop Intikasir.

## 🔗 Buka / install

**https://vatoer.github.io/intikasir-scan-pwa/**

<img src="qr.png" alt="QR ke PWA" width="240" />

Scan QR di atas dengan kamera HP, atau buka URL-nya di Chrome.

## Pakai (sekali online, lalu offline)

1. Buka URL di **Chrome HP** → menu → **Add to Home screen** (install).
2. Service worker meng-cache app + kamus → **cabut internet, tetap jalan**.
3. **Scan barang di rak**: kamera (`BarcodeDetector`) atau scanner **Bluetooth** (HID).
   Nama & satuan terisi otomatis dari kamus; **harga & stok opsional**.
4. **Export CSV** → pindahkan ke desktop → import lewat menu Produk (`import:products`).

## Catatan

- Item tanpa harga jadi **"perlu harga"** di desktop — terdaftar tapi diblokir di kasir
  sampai diberi harga.
- Sesi tersimpan di `localStorage` (aman dari reload/offline).
- **Kamera** butuh HTTPS/secure-context (URL Pages sudah HTTPS). Scanner Bluetooth jalan tanpa itu.

## Update kamus referensi

Kamus ada di `reference.json` (barcode → nama → satuan). Untuk memperbarui: regenerate
dari sumber katalog lalu commit `reference.json` ke repo ini — GitHub Pages otomatis rebuild.
