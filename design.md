# Design.md — Hand Gesture Filter (Web)

Dokumen ini menjelaskan arsitektur teknis dan pertimbangan desain (UI + sistem) untuk project. Untuk requirement produk, lihat `PRD.md`. Untuk panduan kerja AI agent, lihat `AGENTS.md`.

## 1. Arsitektur Sistem

```
┌─────────────────────────────────────────────┐
│                  Browser (Client)             │
│                                                 │
│  ┌───────────┐   frame   ┌──────────────────┐ │
│  │  Webcam    │ ────────▶ │  HandLandmarker   │ │
│  │ (getUserMedia)         │ (MediaPipe, WASM) │ │
│  └───────────┘           └─────────┬─────────┘ │
│                                     │ landmarks │
│                                     ▼            │
│                          ┌──────────────────┐   │
│                          │ Gesture Logic     │   │
│                          │ (pinch, dll)      │   │
│                          └─────────┬─────────┘   │
│                                     │ state       │
│                                     ▼              │
│                          ┌──────────────────┐     │
│                          │ Canvas Overlay    │     │
│                          │ Renderer          │     │
│                          └──────────────────┘     │
└─────────────────────────────────────────────┘

Tidak ada komponen server dalam alur inti. Website (Next.js) hanya
berfungsi sebagai host statis untuk halaman + aset.
```

**Prinsip kunci:** seluruh pipeline — dari capture video, inferensi model, deteksi gesture, sampai render overlay — berjalan di **satu thread client**, tanpa round-trip ke server. Ini yang membuat latency rendah dan privasi terjaga.

## 2. Alur Data per Frame

1. `<video>` element menerima stream dari `getUserMedia`.
2. Loop `requestAnimationFrame` memanggil `handLandmarker.detectForVideo(video, timestamp)` setiap frame baru.
3. Hasil deteksi (`result.landmarks`) berisi array landmark (21 titik per tangan terdeteksi, koordinat ternormalisasi 0–1).
4. Landmark diteruskan ke fungsi gesture (mis. `isPinching()`) untuk menentukan state (pinching / not pinching).
5. State + koordinat landmark diteruskan ke renderer overlay, yang menggambar ke `<canvas>` yang di-superimpose di atas video.
6. Canvas di-clear dan digambar ulang setiap frame (`ctx.clearRect` di awal loop).

## 3. Komponen Teknis Utama

### 3.1 `useCamera` (hook)
- Tanggung jawab: request izin kamera, expose `videoRef`, expose status (`idle | requesting | active | error`), dan fungsi `stop()`.
- Cleanup: stop semua track saat unmount.

### 3.2 `useHandLandmarker` (hook)
- Tanggung jawab: load model MediaPipe sekali (idealnya di-cache, tidak reload tiap render), expose instance landmarker + status loading.
- Model & WASM di-fetch dari CDN saat inisialisasi pertama; pertimbangkan menampilkan progress/loading state karena ukuran file cukup besar (beberapa MB).

### 3.3 Gesture Logic (pure functions)
- Input: array landmark (21 titik, `{x, y, z}` ternormalisasi).
- Output: boolean/status sederhana.
- Contoh: `isPinching(landmarks, threshold = 0.05)` menghitung jarak Euclidean antara landmark index 4 (ujung jempol) dan 8 (ujung telunjuk).
- Dipisah dari rendering supaya bisa di-unit-test tanpa canvas/DOM.

### 3.4 Overlay Renderer
- Menerima: canvas context, landmark, state gesture.
- Menggambar bentuk dasar (lingkaran, garis) atau aset gambar (PNG dengan alpha channel) sesuai posisi landmark.
- Modular per filter — tiap "tema" filter adalah modul terpisah yang punya interface sama (`render(ctx, landmarks, state)`).
- Tema **"Bingkai"** (`overlays/frame.ts`) adalah kasus khusus: ia menggambar ulang video ke canvas (`drawImage` + `ctx.filter` untuk grayscale/filter warna), sehingga `OverlayRenderContext` menyertakan `video` (elemen sumber frame) dan `frameFilterId` (preset warna).

## 4. State & Status UI

| State | Kondisi | Tampilan UI |
|-------|---------|-------------|
| `model-loading` | Model MediaPipe belum selesai di-fetch | Indikator loading, tombol start disabled |
| `idle` | Model siap, kamera belum aktif | Tombol "Aktifkan Kamera" enabled |
| `camera-requesting` | Menunggu izin browser | Teks "Meminta izin kamera..." |
| `camera-denied` | User menolak izin | Pesan error + instruksi cara mengizinkan manual |
| `active-no-hand` | Kamera aktif, tidak ada tangan terdeteksi | Video tampil, tanpa overlay, status "Tangan tidak terdeteksi" |
| `active-tracking` | Tangan terdeteksi | Overlay + efek gesture aktif |

## 5. Pertimbangan Desain Visual (UI)

- **Video mirrored** (flip horizontal via CSS `transform: scaleX(-1)`) supaya terasa seperti cermin — gerakan tangan ke kanan pengguna muncul ke kanan di layar juga.
- **Canvas di-overlay tepat di atas video** dengan posisi/ukuran identik (`position: absolute`, dimensi mengikuti video) agar landmark selalu align dengan posisi tangan asli.
- **Warna & tema visual halaman**: "majalah foto di atas kertas" — latar kertas hangat (`#f4f0e6`) dengan grain halus, tinta pekat, satu aksen vermilion (dot REC) — stage kamera tampil sebagai objek gelap yang "diletakkan" di atas kertas, dipisahkan jelas dari area teks instruksional.
- **Status/error message dalam teks eksplisit**, bukan cuma warna, untuk keterbacaan dan aksesibilitas dasar.
- **Feedback visual saat gesture terdeteksi** (mis. highlight/ring tambahan) penting agar user tahu sistem merespons, bukan cuma efek partikel yang cepat hilang.

## 6. Keputusan Desain & Alasannya

| Keputusan | Alasan |
|-----------|--------|
| MediaPipe Tasks Vision (bukan TensorFlow.js) | API lebih baru, dioptimasi Google untuk task hand landmark, dokumentasi lebih jelas untuk use case ini |
| Semua proses di client, tanpa backend | Latency rendah untuk real-time, hosting gratis/statis, privasi video terjaga |
| Canvas overlay terpisah dari video element | Memudahkan clear & redraw per frame tanpa memanipulasi video asli |
| Gesture logic sebagai pure function | Testable, reusable, tidak terikat pada implementasi rendering |
| Model dimuat dari CDN, bukan bundled | Mengurangi ukuran bundle awal aplikasi; trade-off: butuh koneksi internet saat load pertama |
| Tema "Bingkai" menggambar ulang video via `drawImage` + `ctx.filter` (bukan memanipulasi elemen video) | Efek grayscale-luar/filter-dalam hanya mungkin di bitmap canvas; `ctx.filter` didukung browser modern tanpa library tambahan |
| 4 titik sudut bingkai diurutkan searah jarum jam lalu di-smooth (EMA 0.35) | Urutan konsisten mencegah poligon menyilang; smoothing menghilangkan jitter deteksi landmark |
| Countdown/capture/galeri di `HandFilter.tsx`, bukan di modul overlay | Butuh state React (foto, flash, label) dan efek DOM (canvas offscreen + `toDataURL`); overlay tetap hampir stateless (hanya smoothing internal) |
| Auto-capture aktif di SEMUA tema (kepalan → countdown → foto), angka countdown digambar terpusat di `HandFilter.tsx` setelah render (tengah bingkai bila dua tangan membentuknya) | Permintaan user: foto bisa dari mode tema apa pun; menggambar di satu tempat menghindari duplikasi per-tema |
| Widget dibungkus kios photobooth: marquee vermilion "comvi fotobox" + lampu berkedip, panel kontrol kertas, layar (readout + stage), slot bawah; kartu galeri muncul dengan animasi "tercetak" | Permintaan user (GOALS di AGENTS.md): layout seperti photobooth — kios memperkuat metafora jepret-mencetak; panel kertas menjaga kontras chip/tombol; animasi print memberi umpan balik hasil keluar dari slot |
| Foto disimpan sebagai data URL di state (tanpa upload) | Konsisten prinsip privasi — tidak ada data gambar yang meninggalkan perangkat |
| Tema default diganti ke "Bingkai" + pesan status pemandu khusus (0/1/2 tangan) saat tema itu aktif | Partial filter dua tangan adalah fitur andalan hasil port prototipe; default + panduan on-screen membuat fiturnya langsung terlihat tanpa harus mencari chip tema |
| Redesign halaman utama: tema terang "kertas foto + tinta + vermilion", heading serif Fraunces (italic sebagai penekanan), langkah pakai jadi daftar editorial bernomor (bukan 3 kartu seragam) | Kontras terang/gelap memisahkan "halaman instruksi" dari "alat kamera"; menghindari estetika template (gradient text, glow sudut, kartu kembar); langkah bernomor besar membuat alur pakai lebih jelas |
| Foto galeri ditata seperti cetakan polaroid (bingkai kertas, kemiringan ±1°) | Menegaskan metafora fotografi; umpan balik visual bahwa foto adalah "hasil cetak" milik user |
| Klik kartu galeri membuka lightbox pratinjau (Unduh polaroid / Hapus) sebelum mengunduh | User melihat dulu fotonya dalam ukuran besar; sekalian memberi jalan menghapus foto yang tidak diinginkan |
| Unduhan dikomposit jadi polaroid (bingkai kertas + caption tanggal-jam, font Caveat) saat tombol Unduh ditekan, bukan saat capture | Foto asli di state tetap murni; komposit hanya saat ekspor sehingga gaya bingkai bisa diubah tanpa men-capture ulang. Geometri bingkai ada di `polaroid.ts` sebagai pure function yang ter-unit-test |
| `grabFrameDataUrl` mengomposit **video dulu, lalu canvas overlay** (keduanya dalam satu transform mirror) | Bug: sebagian besar tema (Kucing/Topi/Hati/Bintang/Cahaya/Kilau/Rangka) hanya menggambar dekorasi ke canvas transparan — capture lama menyalin canvas saja sehingga hasil jepretan/preview/unduhan berisi efek tanpa foto asli. Video digambar sebagai lapisan dasar menjamin foto+efek selalu ter-capture; tema "Bingkai" tak berubah karena canvas-nya sudah menutup penuh lapisan video |
| Grup opsi (Tema/Gaya/Bingkai cetak/Mode) dilipat satu tombol "Opsi jepret" (`.disclosure`: `aria-expanded`+`aria-controls`+chevron); default terbuka ≥1025px (matchMedia), terlipat di mobile | Permintaan user: mobile tidak rame — kamera langsung terlihat tanpa scroll; tombol kamera merah tetap selalu tampil di kepala panel (aksi utama tak boleh terkubur, better-layout: "order by importance"). `[hidden]` eksplisit karena display:grid menimpanya; konten terlipat keluar dari pohon aksesibilitas |
| `isFist` mewajibkan telunjuk terlipat + kepalan ditahan 600ms sebelum countdown | Bug "memotret sendiri": pose bingkai (jempol+telunjuk terbuka, 3 jari lain terlipat) semula terhitung kepalan 3-dari-4; syarat telunjuk + hold-time meredam pemicu palsu |
| Mode jepret 1× / 3×(strip): mode 3× mengambil 3 jepretan berurutan (0.8s) lalu menyatukannya jadi SATU item galeri & SATU PNG strip polaroid panjang | Pilihan user: pengalaman photo-booth satu klik-unduh; frames disimpan di `Photo.frames`, komposit strip di `polaroid.ts` (`stripGeometry` pure + ter-test) |
| Layout halaman dibersihkan: masthead + satu headline kecil + widget filter; hero, langkah pakai, hint, dan footer dihapus | Pilihan user: cukup menu utama saja; panduan pemakaian tetap tersedia lewat pesan status pemandu real-time |
| Mode 3× berjeda 5 detik antar jepretan (hitung mundur di status) & burst digerakkan dari loop render, bukan setTimeout | Jeda ala photo booth memberi waktu ganti pose; render-driven memastikan tiap jepretan mengambil frame final (bukan canvas yang baru di-clear) |
| Pratinjau lightbox FULLSCREEN (foto object-fit contain memenuhi viewport, bar aksi overlay di dasar layar); strip 3× default **zoom-out**: seluruh strip pas satu layar — tinggi tiap frame = `(100% − gap antar frame) / jumlah frame` via var `--frames` dari `PhotoLightbox` | Pilihan user: bukan kotak kecil di tengah konten. Tanpa pembatas per-frame, tiap img strip boleh setinggi 100% layar sehingga strip 3× butuh scroll untuk melihat penuh — sekarang default-nya seluruh foto terlihat sekaligus (scroll tetap tersedia untuk viewport sangat pendek) |
| Semua kontrol & status di ATAS stage; di bawah stage hanya galeri hasil | Pilihan user: area bawah murni untuk melihat/mengunduh hasil |
| Tombol "Unduh semua" mengunduh berurutan dengan jeda 400ms per file | Unduhan ganda tanpa jeda kerap diblokir browser; jeda kecil cukup aman |
| Tema lucu "Kucing" & "Topi Pesta" (canvas murni di `overlays/cat.ts` / `hat.ts`, tanpa aset/dependency baru) | Permintaan user; tetap ringan & konsisten pola modul overlay `render(ctx, landmarks, state)` |
| Semua tema lucu dibuat STATIS (tidak memakai `time`): Kucing, Topi Pesta, Hati, Bintang | Permintaan user: dekorasi tetap terlihat rapi di foto hasil jepret — animasi hanya di tema lama (Cahaya, Kilau, partikel pinch) |
| Countdown besar digambar juga ANTAR jepretan strip (bersama countdown awal, terpusat di `HandFilter.tsx` untuk semua tema) | Saat jeda 5 detik, user melihat angka besar 5→1 di kanvas (bukan cuma teks status) — tahu persis kapan pose berikutnya dijepret |
| Saat bingkai tidak terdeteksi (0/1 tangan), video digambar normal tanpa grayscale | Paritas dengan prototipe `index.html` — grayscale hanya muncul sebagai "luar bingkai" saat bingkai aktif, supaya jelas efeknya berasal dari gesture |
| Panel kontrol: grup chips berlabel terlihat ("Tema", "Filter warna", "Mode jepretan") via `.control-group` + `.group-label` + `aria-labelledby`; mode jepretan jadi segmented control; tombol start berlabel dinamis (`pendingLabel`: "Memuat model…"/"Meminta izin…"/"Muat ulang halaman") | Enhance UI/UX hasil review skill better-layout/better-ui/better-writing: label grup membuat tiga baris chips teridentifikasi tanpa menebak; segmented mengkomunikasikan pilihan eksklusif; label dinamis menjelaskan kenapa tombol sedang nonaktif (state eksplisit, bukan disable bisu) |
| Efek & hasil keluar dari box kios (putaran keempat, 2026-09): `.booth` sekarang hanya membungkus kamera (marquee + readout + stage + slot); panel kontrol & galeri hasil jadi panel kertas mandiri di atas kertas (`.studio-side`, border + shadow tipis); grid `.studio` 3 kolom `minmax(240px,1fr) minmax(0,2.2fr) minmax(240px,1.05fr)`, gap 16px, ≤1024px → 1 kolom; `.booth-body`/`.booth-body--no-results` dihapus; kolom kanan selalu dirender dengan placeholder `.gallery-empty` saat belum ada foto | Permintaan user: sebelumnya satu box gelap besar membungkus semuanya, sehingga kamera "tenggelam" di dalam gelap dan panel kertas terkesan di dalam kotak. Memisahkan objek gelap kamera dari panel kertas membuat kamera menonjol sebagai instrumen di atas kertas (better-layout: "content bleeds, controls float"), sambil menjaga metafora kios photobooth pada kamera itu sendiri. Placeholder menjaga grid 3 kolom tetap stabil sebelum foto pertama (tidak melompat kolom) |
| Proporsi & stabilisasi panel (putaran kelima, 2026-09): grid `.studio` jadi rasio **2/12 · 8/12 · 2/12** (`minmax(260px,2fr) minmax(0,8fr) minmax(260px,2fr)`) — kamera selebar mungkin; tombol kamera pindah ke kepala panel (`.btn--full`, baris sendiri penuh) & tiap grup kontrol jadi baris penuh bertumpuk (`grid` vertikal di `.booth-panel`); `.controls`/`.chips--preset` dihapus; `margin-inline-start:auto` dibuang dari `.control-group`/`.chips` | Permintaan user: kamera selebar mungkin (8/12) dengan sticky top yang rapi. Sebelumnya baris pertama memakai `flex-wrap` (tombol + 8 chip tema sebaris) sehingga tinggi panel kiri berubah setiap kali ganti tema (poin "layout gaya tidak konsisten"). Tombol di kepala + grup bertumpuk membuat tinggi panel stabil untuk semua tema; `minmax(260px,…)` mencegah chip berjejal 2-baris di kolom 2/12 yang sempit (better-layout: shared leading edge — grup & chips mulai dari tepi yang sama) |
| `close()` MediaPipe dibungkus `try/catch` di kedua hook (`useHandLandmarker`, `useFaceLandmarker`) pada kedua titik: cleanup effect return + cabang `cancelled` pasca-`create`; ditambah filter `quietMediaPipe()` yang menyaring pesan `"XNNPACK delegate"` dari `console.log`/`console.error` | `close()` bisa melempar saat teardown MediaPipe terjadi sebelum inisialisasi stabil (mis. remount StrictMode di dev); lemparan keluar dari cleanup React terlihat sebagai console error. Runtime TFLite di WASM juga mengirim log INFO-nya ("INFO: Created TensorFlow Lite XNNPACK delegate for CPU.") lewat `console.error`, sehingga dev overlay Next menampilkannya sebagai "Console Error" dengan stack menunjuk ke pemanggil JS (close()/detectForVideo) — menyesatkan. Filter hanya menyaring string itu; log lain diteruskan apa adanya |
| Halaman full-bleed (putaran keenam, 2026-09): `.page` tanpa `max-width`/`margin:auto`; padding inline `clamp(20px, 3vw, 48px)` | Permintaan user: konten memenuhi lebar layar. Karena kolom grid memakai `fr`, rasio 2/12·8/12·2/12 terjaga di lebar apa pun — kamera tetap selebar mungkin. Clamp memberi ruang napas di tepi tanpa container tetap |
| Chip: padding 9/14 (±33px) + `:active` scale 0.96, hover digating `@media (hover: hover)` | Hit area mendekati target 40px tanpa mengubah density; feedback tekan konsisten better-ui; hover tidak "nyangkut" di sentuh |

## 7. Batasan Desain yang Diketahui

- Akurasi & performa bergantung pada device pengguna (CPU/GPU, kualitas webcam, pencahayaan).
- Tidak ada fallback non-webcam — jika user tidak punya/tidak mengizinkan kamera, fitur inti tidak bisa dipakai (hanya bisa tampilkan pesan informatif).
- Deteksi dua tangan (`numHands: 2`) sudah diaktifkan untuk fitur bingkai dua tangan; beban komputasinya lebih tinggi dibanding satu tangan, dan bingkai butuh kedua tangan terlihat jelas oleh kamera.

## 8. Kemungkinan Evolusi Arsitektur (Masa Depan)

- Jika nanti butuh fitur berat (mis. training model custom, style transfer AI generatif), baru pertimbangkan menambah backend terpisah — bukan menggantikan pipeline client-side yang sudah ada, tapi sebagai layanan tambahan opsional.
- Jika filter bertambah banyak, pertimbangkan sistem plugin/registry untuk overlay modules supaya menambah filter baru tidak perlu mengubah komponen inti.
