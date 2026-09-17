# PRD — Hand Gesture Filter (Web)

## 1. Ringkasan

Aplikasi web berbasis browser yang mendeteksi tangan pengguna lewat webcam secara real-time dan menampilkan filter visual (overlay/partikel) yang bereaksi terhadap posisi jari dan gesture tangan. Semua pemrosesan berjalan di sisi client (browser), tanpa backend khusus untuk AI.

Status: hobi/personal project, iteratif — mulai dari prototipe sederhana, dikembangkan bertahap.

## 2. Latar Belakang & Tujuan

- Belajar computer vision secara praktis lewat project yang menyenangkan.
- Membuat filter interaktif ala Snapchat/Instagram versi sederhana, dipasang di website pribadi/portofolio.
- Tidak ada target komersial — fokus pada eksplorasi teknis dan hasil visual yang menarik.

## 3. Target Pengguna

- Pengunjung website pribadi/portofolio pemilik project.
- Perangkat: laptop/desktop dengan webcam dan browser modern (Chrome, Edge, Safari terbaru). Dukungan mobile browser bersifat "nice to have", bukan prioritas awal.

## 4. Scope

### 4.1 In-scope (MVP)

- Akses webcam via browser (izin eksplisit dari user).
- Deteksi landmark tangan real-time (hingga 1–2 tangan).
- Overlay visual dasar yang mengikuti posisi jari (mis. lingkaran/emoji di ujung telunjuk).
- Minimal 1 gesture terdeteksi (mis. *pinch* jempol-telunjuk) yang memicu efek berbeda (partikel, perubahan warna, dsb).
- UI sederhana: tombol start/stop kamera, indikator status ("model loading", "kamera aktif", "tangan tidak terdeteksi").
- Berjalan sebagai bagian dari halaman React/Next.js yang bisa di-deploy ke hosting statis (Vercel/Netlify).

### 4.2 Nice-to-have (iterasi berikutnya)

- Beberapa pilihan filter/tema yang bisa dipilih user (switch overlay asset). *(sudah tercapai: Cahaya/Rangka/Kilau/Bingkai + preset warna)*
- Multi-gesture (tangan terbuka, mengepal, thumbs up, dll). *(sebagian tercapai: pinch + kepalan)*
- Rekam/screenshot hasil filter (simpan sebagai gambar). *(sudah tercapai: auto-capture via kepalan + galeri unduh)*
- Dukungan mobile (kamera depan/belakang, layout responsif).
- Custom asset overlay (upload gambar sendiri sebagai filter).

### 4.3 Out-of-scope

- Training model deteksi tangan sendiri (pakai model pretrained MediaPipe).
- Backend/server untuk pemrosesan AI.
- Fitur akun/login/multi-user.
- Dukungan browser lama tanpa WebAssembly/WebGL/WebRTC.

## 5. User Flow (MVP)

1. User membuka halaman filter di website.
2. Halaman menampilkan tombol "Aktifkan Kamera" + status "Memuat model...".
3. Setelah model siap, tombol aktif.
4. User klik tombol → browser minta izin akses kamera.
5. Jika diizinkan: video mulai tampil, deteksi tangan berjalan, overlay muncul mengikuti posisi jari.
6. Jika ditolak: tampilkan pesan error yang jelas + cara mengaktifkan izin kamera secara manual di browser.
7. User melakukan gesture (pinch) → efek partikel muncul.
8. User bisa menutup/menghentikan kamera kapan saja (tombol stop, atau otomatis saat pindah halaman).

## 6. Requirement Fungsional

| ID | Requirement | Prioritas |
|----|------------|-----------|
| F1 | Sistem dapat meminta & menerima akses webcam pengguna | Must |
| F2 | Sistem menampilkan video webcam secara real-time (mirrored) | Must |
| F3 | Sistem mendeteksi landmark tangan pada setiap frame | Must |
| F4 | Sistem menggambar overlay yang mengikuti posisi jari tertentu | Must |
| F5 | Sistem mendeteksi minimal satu gesture (pinch) | Must |
| F6 | Sistem menampilkan status yang jelas (loading, ready, error, no hand detected) | Should |
| F7 | Sistem membersihkan resource kamera saat komponen unmount / halaman ditutup | Must |
| F8 | Sistem dapat berjalan sebagai komponen di dalam Next.js tanpa error SSR | Must |

## 7. Requirement Non-Fungsional

- **Privasi:** video tidak pernah dikirim ke server manapun; semua pemrosesan lokal di browser.
- **Performa:** target minimal ~20–30 fps pada laptop kelas menengah dengan GPU terintegrasi.
- **Kompatibilitas:** Chrome, Edge, Safari versi terbaru (2 major version terakhir). Firefox best-effort.
- **Aksesibilitas dasar:** status dan error message dalam teks (tidak hanya warna/ikon).
- **Tidak ada dependency server berbayar** untuk menjalankan fitur inti.

## 8. Metrik Keberhasilan (untuk hobi project, bersifat kualitatif)

- Filter terasa responsif (tidak ada lag terasa saat menggerakkan tangan).
- Gesture pinch terdeteksi konsisten dalam kondisi pencahayaan normal.
- Bisa di-deploy dan diakses publik di website pribadi tanpa error.

## 9. Risiko & Batasan yang Diketahui

- Akurasi deteksi menurun pada pencahayaan buruk atau latar belakang ramai.
- Performa bervariasi antar device (terutama laptop lama/low-end).
- Browser lama atau tanpa dukungan WebGL/WASM tidak didukung.
- Webcam wajib tersedia dan diizinkan — tidak ada fallback tanpa kamera.

## 10. Roadmap Bertahap

1. **Prototipe HTML statis** (sudah selesai) — validasi konsep MediaPipe + overlay.
2. **Port ke komponen React/Next.js** (sudah selesai) — integrasi ke website utama, termasuk fitur bingkai dua tangan + auto-capture dari prototipe.
3. **Tambah 1–2 filter/gesture tambahan.** *(sebagian selesai: tema Bingkai + gesture kepalan)*
4. **Polish UI/UX** (status, error handling, styling).
5. **(Opsional) dukungan mobile & fitur screenshot.** *(screenshot selesai via auto-capture)*
