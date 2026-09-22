## Tujuan
Membuat file PDF "Panduan Penggunaan KMS KRISNApedia" dalam Bahasa Indonesia, lengkap (10–15 halaman), dengan gaya visual sesuai brand (orange #E97A2C, cream, Space Grotesk + Inter), dilengkapi cover bermerek, header/footer di tiap halaman, serta halaman kontak.

PDF di-generate via skrip Python (ReportLab) dan disimpan ke `/mnt/documents/panduan-krisnapedia.pdf` agar bisa diunduh user. Ini tugas non-build — tidak mengubah kode aplikasi.

## Struktur Halaman (perkiraan 12–14 halaman)

1. **Cover** — Logo/wordmark KRISNApedia, judul besar "Panduan Penggunaan", subjudul "Knowledge Management System Klinik KRISNA", versi & tanggal, blok orange dekoratif.
2. **Daftar Isi**
3. **Tentang KRISNApedia** — Deskripsi singkat KMS, manfaat, untuk siapa.
4. **Memulai (Quickstart 3 langkah)** — Cari topik, unduh dokumen, ajukan pertanyaan (diadaptasi dari `/panduan`).
5. **Navigasi & Antarmuka** — Penjelasan navbar, search command (⌘K), language toggle, theme toggle.
6. **Modul: Pustaka Regulasi** — Tujuan, cara akses, fitur filter, contoh use case.
7. **Modul: Insight Hub** — Konten artikel insight, pencarian, kategori.
8. **Modul: Manual Hub** — SOP & manual operasional, cara baca & unduh.
9. **Modul: Klinik KRISNA (FAQ)** — Cara cari FAQ, cara ajukan pertanyaan via form, ekspektasi balasan 1–3 hari kerja.
10. **Tips & Trik** — Shortcut pencarian (⌘K), filter, ganti bahasa ID/EN, dark mode.
11. **FAQ Singkat tentang Penggunaan** — 5–6 pertanyaan umum.
12. **Kontak & Dukungan** — Email tim, link halaman bantuan, jam operasional.
13. **Catatan Versi & Penutup**

## Gaya Visual

- **Warna**: Primary `#E97A2C`, soft `#F8EBD9`, surface warm `#F9F0E2`, ink `#2A2520`, muted `#6E665C`. Gradient cover orange → terracotta `#E97A2C → #C95A1F`.
- **Tipografi**: Space Grotesk (700/600) untuk heading & display, Inter (400/500) untuk body. Diunduh via Google Fonts saat generate. Fallback Helvetica jika gagal.
- **Layout**: Margin 18mm, kolom tunggal lebar nyaman dibaca, kotak callout `bg #F8EBD9` dengan border kiri orange untuk tip & catatan.
- **Komponen ulang**: Header ringan (wordmark kiri, nomor bab kanan), footer (URL `krisnapedia.lovable.app` kiri, "Halaman X dari Y" kanan), nomor langkah dalam lingkaran orange (mirror style `/panduan`).
- **Ikonografi**: Glyph sederhana berbasis bentuk (lingkaran bernomor, panah ›) — tanpa dependensi ikon eksternal agar PDF tetap ringan.

## Implementasi Teknis

- **Tool**: Python + ReportLab (`SimpleDocTemplate` + custom `PageTemplate` untuk header/footer + cover frame terpisah).
- **Output**: `/mnt/documents/panduan-krisnapedia.pdf`
- **Konten sumber**: Diadaptasi dari `src/routes/panduan.tsx` (quickstart, modul, tips, help) + `src/routes/faq.tsx` (form Klinik KRISNA + alur pengiriman) + breakdown brand yang sudah disepakati sebelumnya.
- **Font handling**: Coba unduh Space Grotesk + Inter dari Google Fonts ke `/tmp/fonts/`, register via `pdfmetrics.registerFont`. Fallback Helvetica-Bold/Helvetica jika offline.
- **QA wajib**: Render PDF → konversi tiap halaman ke JPG via `pdftoppm -r 150` → inspeksi visual setiap halaman (overflow teks, kontras, footer tidak tabrakan, cover rapi). Iterasi hingga bersih. QA images dibuang, hanya PDF final dipertahankan.
- **Deliverable ke user**: Tag `<lov-artifact path="panduan-krisnapedia.pdf" mime_type="application/pdf"></lov-artifact>`.

## Yang TIDAK Berubah

- Tidak ada perubahan pada kode aplikasi (`src/`, route, komponen).
- Tidak ada perubahan database / backend.
- Tidak ada penambahan dependency npm.

## Estimasi

- Generate + QA: 1 putaran tool execution (skrip Python tunggal + iterasi visual jika perlu).
- Hasil akhir: 1 file PDF siap unduh.
