Use the skills in "https://github.com/jakubkrehel/skills" that are relevant to the current task. Run `npx skills add "https://github.com/jakubkrehel/skills"` and select the relevant skills, then follow their instructions.

# GOALS

buat agar ada layoutnya seperti photobooth.

# AGENTS.md

Panduan ini ditujukan untuk AI coding agent (mis. Claude Code) yang membantu membangun atau mengembangkan project **Hand Gesture Filter (Web)**. Baca file ini sebelum membuat perubahan pada codebase.

## Konteks Project

Project ini adalah web app React/Next.js yang menggunakan webcam pengguna untuk mendeteksi tangan secara real-time (via MediaPipe Tasks Vision) dan menampilkan filter visual di atasnya. Semua pemrosesan AI berjalan **di sisi client (browser)** — tidak ada backend AI. Lihat `PRD.md` untuk detail requirement dan `design.md` untuk arsitektur teknis.

Status: seluruh catatan tahap 2 di bawah tetap berlaku. **Putaran review UI `better-interface` (skill `jakubkrehel/skills`) sudah dijalankan penuh** (2026-09): 15 temuan (4 HIGH, 5 MEDIUM, 6 LOW) — semuanya sudah diperbaiki; rincian keputusan di `design.md` §6. Poin terpenting hasil review: (a) isi vermilion yang membawa teks kini `--accent-solid` (#b23411, 5.44:1) — tombol utama memakai kelas `btn--primary`, bukan override `.controls .btn`; (b) chips memakai `role="group"` + `aria-pressed` (bukan `role="radio"` tanpa navigasi panah); (c) lightbox kini modal sungguhan — latar di-`inert`-kan oleh `HandFilter`, focus-trap Tab di `PhotoLightbox`, ring fokus kertas di latar gelap; (d) "Hapus" di lightbox dua langkah (klik pertama → tombol merah "Hapus foto?", klik kedua → hapus); (e) panel kontrol/kartu galeri/bar lightbox diekstrak jadi komponen presentational (`BoothControls`, `GalleryShot`, `LightboxBar`) dengan state tetap di `HandFilter`. Harness skill `break` + `variant` dipakai sementara lalu dihapus; semua set varian dipilih kembali ke "standar". Putaran kedua (enhance panel kontrol): grup chips berlabel terlihat + `aria-labelledby`, mode jepretan segmented, tombol start berlabel dinamis (`pendingLabel`), chip 9/14 + `:active`. Putaran ketiga (layout 3 kolom + dekorasi kepala, 2026-09): (1) desktop pakai **grid 3 kolom** — kiri kontrol, tengah layar kios, kanan galeri; kolom samping sticky; `.page` max-width 1180px; ≤960px kembali 1 kolom; **kolom kanan disembunyikan sampai ada foto** (grid 2 kolom via `.booth-body--no-results`); (2) **FaceLandmarker** (package sama) untuk dekorasi kepala semua tema: geometri jangkar wajah di `faceGeometry.ts` (pure + test) — dekorasi hanya muncul saat wajah terdeteksi; (3) **sub-gaya generik**: `OverlayModule.presets` + `presetId` di context; chips "Gaya" muncul untuk semua tema yang punya presets; (4) **bingkai cetak** (`photoFrames.ts`): Polaroid/Film/Vignette — digambar setelah tema render, ikut ter-capture. Putaran keempat (efeck & hasil keluar dari box kios, 2026-09): layout dirombak — **panel efek (kiri) & galeri hasil (kanan) tidak lagi di dalam box gelap kios**, melainkan panel kertas mandiri di atas kertas; **kamera menjadi satu-satunya objek gelap** di kolom tengah (`.booth` hanya membungkus marquee + readout + stage + slot). Grid pengganti: `.studio` (3 kolom, `minmax(240px,1fr) minmax(0,2.2fr) minmax(240px,1.05fr)`, gap 16, ≤1024px → 1 kolom); `.booth-body`/`.booth-body--no-results` **dihapus**; kolom kanan kini **selalu dirender** dengan placeholder `.gallery-empty` saat belum ada foto (grid stabil, tidak melompat). Putaran kelima (proporsi & stabilisasi panel, 2026-09): (1) grid `.studio` jadi rasio proporsional **2/12 · 8/12 · 2/12** — `minmax(260px,2fr) minmax(0,8fr) minmax(260px,2fr)`, kamera selebar mungkin, kolom samping sticky `top:16px` di desktop; (2) panel kiri **distabilkan**: tombol kamera pindah ke **kepala panel** (`.btn--full`, baris sendiri penuh) dan tiap grup (Tema/Gaya/Bingkai cetak/Mode) jadi **baris penuh bertumpuk** — sebelumnya baris pertama `flex-wrap` (tombol + 8 chip tema sebaris) membuat tinggi panel berubah-ubah tiap ganti tema; class `.controls` & `.chips--preset` dihapus, `margin-inline-start:auto` di `.control-group`/`.chips` dibuang (peninggalan layout box lama yang membuat tepi kanan miring); jumlah chip Gaya tetap natural per tema. (3) `close()` MediaPipe dibungkus try/catch di kedua hook (`useHandLandmarker`, `useFaceLandmarker`) — `INFO: Created TensorFlow Lite XNNPACK delegate for CPU` adalah log biasa MediaPipe (delegate CPU), bukan error; stack trace-nya hanya menunjuk ke blok `catch` yang sudah menangani; filter `quietMediaPipe.ts` menyaring pesan itu dari console. Putaran keenam (full-bleed, 2026-09): `.page` tidak lagi dibatasi `max-width:1180px`/`margin:auto` — konten memenuhi lebar layar; padding inline `clamp(20px, 3vw, 48px)` menjaga jarak dari tepi viewport (rasio grid 2/12·8/12·2/12 tetap terjaga karena kolom memakai `fr`). Putaran ketujuh (perbaikan capture & pratinjau, 2026-09): (1) **bug capture tema non-Bingkai diperbaiki** — `grabFrameDataUrl` kini mengomposit **video dulu lalu canvas overlay** (satu transform mirror): sebagian besar tema hanya menggambar dekorasi ke canvas transparan sehingga hasil jepretan lama berisi efek tanpa foto aslinya (di preview galeri & unduhan); (2) strip 3× di lightbox default **zoom-out**: seluruh strip pas satu layar — `.lightbox-media--strip` + var `--frames` (tinggi per frame = `(100% − gap)/N`). Putaran kedelapan (toggle opsi, 2026-09): grup opsi (Tema/Gaya/Bingkai cetak/Mode jepretan) dibungkus `.booth-panel__groups` dan dilipat oleh satu tombol **"Opsi jepret"** (`.disclosure`, `aria-expanded` + `aria-controls` + chevron berputar) — default **terbuka di desktop** (matchMedia ≥1025px), **terlipat di mobile** supaya kamera langsung terlihat tanpa scroll; tombol kamera merah tetap selalu tampil di kepala panel. Putaran kesembilan (rekam video + tema Blur, 2026-09): (1) **pipeline**: frame video kini SELALU digambar sebagai lapisan dasar canvas di `HandFilter.step()` sebelum `overlay.render()` — canvas = citra final (foto+efek), prasyarat perekaman; tampilan tak berubah (canvas = resolusi video, object-fit sama); (2) **tema "Blur"** (`overlays/blur.ts`, chip Tema ke-9): gesture bingkai dua tangan (frameCorners + EMA 0.35) → SELURUH foto diblur via `ctx.filter` dengan overscan ±2×blurPx (anti garis tepi transparan), outline bingkai tetap digambar sebagai feedback; sub-gaya Ringan/Sedang/Kuat (0.6%/1.2%/2% lebar canvas); (3) **rekam video**: `useRecorder.ts` — `canvas.captureStream(30)` + `MediaRecorder` (fallback vp9→vp8→webm, 6 Mbps), auto-stop 60 detik + cancel saat kamera mati/unmount; tombol "Rekam video" di panel (ghost; saat aktif jadi "Berhenti ● m:ss" berdenyut) + badge REC di stage; hasil = **blob URL lokal** masuk galeri sebagai kartu `<video>`; (4) **tipe `Photo` jadi union**: `{kind:'photo', dataUrl, frames?}` | `{kind:'video', videoUrl, durationMs}` — `GalleryShot`/`PhotoLightbox`/`LightboxBar`/`downloadOne` bercabang per kind (video diunduh sebagai `.webm` langsung, tanpa komposit polaroid; blob URL di-revoke saat item dihapus). (5) **mode Foto/Video** (`MediaMode`, segmented berlabel "Mode" di atas tombol "Opsi jepret"): mode Foto = jepret via gesture/countdown (kepalan diabaikan di mode Video supaya tidak bercampur); mode Video = tombol "Rekam video" muncul & "Mode jepretan" (1×/3×) disembunyikan; pindah ke mode Foto saat merekam → rekaman disimpan dulu. (6) tema Blur **tanpa outline/garis** — blur saja tanpa hiasan (feedback visualnya adalah blurnya itu sendiri).

Status: tahap 2 roadmap PRD (port ke komponen React/Next.js) **sudah selesai**. Fitur prototipe `index.html` — bingkai dua tangan (jempol+telunjuk membentuk persegi), preset filter warna (vivid/sepia/invert/dingin/mono), gesture kepalan → countdown 5 detik → auto-capture + galeri unduh — **sudah ditanamkan** ke app Next sebagai tema overlay "Bingkai" (`overlays/frame.ts`) + logic countdown/capture di `HandFilter.tsx`. Tema ini adalah tema overlay **default**, dengan pesan status pemandu khusus (0/1/2 tangan). Catatan penting kemudian: (1) `isFist` mewajibkan telunjuk terlipat + kepalan ditahan 600ms — pose bingkai tidak lagi memicu foto sendiri; (2) ada mode jepret **1×** dan **3× (strip)** — **auto-capture aktif di SEMUA tema** (kepalan → countdown → foto di tema apa pun; angka countdown besar digambar terpusat di `HandFilter.tsx`, tengah bingkai bila dua tangan membentuknya); mode 3× mengambil 3 jepretan dengan **jeda 5 detik** antar sesi lalu menjadi SATU item galeri yang diunduh sebagai satu PNG strip polaroid (`polaroid.ts`); (3) burst digerakkan dari loop render (refs di `HandFilter.tsx`) supaya tiap jepretan diambil setelah frame final tergambar; (4) layout: **panel efek (kiri) & galeri hasil (kanan) di luar box kios** — panel kertas mandiri di atas kertas, kamera adalah satu-satunya objek gelap (lihat putaran keempat di atas); (pratinjau lightbox FULLSCREEN + Unduh satuan + **Unduh semua** berjeda 400ms per file); (5) tema overlay statis (tanpa animasi/`time`): **Kucing**, **Topi Pesta**, **Hati**, dan **Bintang** — dekorasi tetap yang enak untuk foto; (6) angka countdown besar tampil untuk countdown awal MAUPUN **antar jepretan strip**, di semua tema; (7) layout berbentuk **kios photobooth**: marquee "Jepretin" (lampu berkedip), readout + stage kamera gelap, dan slot bawah — hasil jepretan muncul dengan animasi "tercetak"; sejak putaran keempat, **kios hanya membungkus kamera** (marquee + readout + stage + slot) sedangkan panel kontrol & galeri hasil berdiri sendiri di atas kertas. Prototipe HTML statis tetap tersimpan di `index.html` sebagai referensi.

## Prinsip Umum

- **Client-side only untuk AI/CV.** Jangan tambahkan backend/server untuk pemrosesan hand tracking kecuali diminta eksplisit dan ada alasan kuat (lihat PRD §4.3 out-of-scope).
- **Privasi dulu.** Jangan pernah mengirim frame video atau data webcam ke server/API eksternal manapun. Semua pemrosesan tetap lokal di browser pengguna.
- **Prioritaskan model pretrained.** Jangan buat atau training model deteksi tangan sendiri — gunakan MediaPipe Tasks Vision (`HandLandmarker`) yang sudah tersedia.
- **Iteratif & sederhana.** Ini project hobi. Utamakan kode yang mudah dibaca dan gampang diubah dibanding abstraksi berlebihan.
- **Jaga AGENTS.md tetap sinkron (WAJIB).** Setiap perubahan pada codebase HARUS diikuti pembaruan file ini pada perubahan yang sama — detailnya di bagian "Sinkronisasi Dokumentasi" di bawah.

## Stack yang Digunakan

- **Framework:** Next.js 15 (App Router) + React 19
- **Bahasa:** TypeScript (strict)
- **Computer Vision:** `@mediapipe/tasks-vision` — **dua model**: `HandLandmarker` (tangan, `useHandLandmarker.ts`) dan `FaceLandmarker` (wajah untuk dekorasi kepala, `useFaceLandmarker.ts`); versi dipin `0.10.14`, WASM & model `.task` di-fetch dari CDN saat runtime (versi CDN harus sama dengan versi package). Gagal memuat model wajah → tema tetap jalan tanpa dekorasi kepala (graceful).
- **Styling:** plain CSS di `app/globals.css` (CSS variables, tanpa framework). Tema visual: "majalah foto di atas kertas" — kertas hangat + tinta + aksen vermilion, stage kamera gelap sebagai objek. Font: Fraunces (display serif, dengan italic) + Instrument Sans (body) via `next/font` di `app/layout.tsx`. Jangan menambah framework/dependency styling baru tanpa izin user.
- **Testing:** Vitest untuk pure logic (`npm test`)

## Aturan Teknis Penting (Next.js)

1. **Semua komponen yang mengakses `navigator.mediaDevices`, `window`, atau `document` HARUS:**
   - Diberi direktif `"use client"` di baris paling atas file, DAN
   - Menjalankan akses tersebut di dalam `useEffect`, bukan langsung di body komponen.
2. **Jangan gunakan komponen ini di halaman yang di-generate secara statis tanpa `dynamic import` `{ ssr: false }`** jika ada indikasi masalah SSR saat build.
3. **Wajib cleanup di `useEffect` return function:**
   - Hentikan semua `MediaStreamTrack` (`stream.getTracks().forEach(t => t.stop())`).
   - Batalkan `requestAnimationFrame` loop yang sedang berjalan (`cancelAnimationFrame`).
   - Tutup/dispose instance `HandLandmarker` jika API menyediakan method close/dispose.
4. **Jangan panggil `getUserMedia` secara otomatis saat halaman dimuat** tanpa interaksi user (mis. klik tombol) — beberapa browser memblokir autoplay kamera tanpa gesture user, dan ini juga praktik privasi yang lebih baik.

## Struktur Kode Saat Ini

Pemisahan berikut sudah terimplementasi — pertahankan saat menambah fitur:

```
app/
  layout.tsx               # font, metadata, globals.css
  page.tsx                 # halaman utama (server component)
  globals.css              # styling (CSS variables, tema gelap; flash, galeri, preset chips)
components/HandFilter/
  HandFilter.tsx           # komponen utama (video + canvas + loop rAF + face detect + draw frame)
  HandFilterDemo.tsx       # wrapper "use client" + dynamic import { ssr: false }
  useHandLandmarker.ts     # hook: load HandLandmarker (dynamic import) + close()
  useFaceLandmarker.ts     # hook: load FaceLandmarker (wajah, kepala) + close() — pola sama
  quietMediaPipe.ts        # filter console: redam log INFO "XNNPACK delegate" dari WASM MediaPipe (dikirim sebagai console.error oleh emscripten)
  useCamera.ts             # hook: getUserMedia, cleanup stream
  useRecorder.ts           # hook: rekam canvas via captureStream + MediaRecorder → blob URL (auto-stop 60s)
  gestures.ts              # pure function gesture (isPinching, isFist, frameCorners, dst)
  gestures.test.ts         # unit test (Vitest)
  faceGeometry.ts          # pure function jangkar wajah: faceAnchor() → top, roll, width, dll.
  faceGeometry.test.ts     # unit test faceAnchor
  polaroid.ts              # komposit ekspor polaroid: geometri pure + compose bingkai/caption (unduh)
  polaroid.test.ts         # unit test geometri polaroid (Vitest)
  photoFrames.ts           # bingkai cetak ortogonal: Polaroid/Film/Vignette; pure helpers + draw
  photoFrames.test.ts      # unit test geometri bingkai cetak
  PhotoLightbox.tsx        # lightbox pratinjau modal (focus trap + Esc; latar di-inert oleh HandFilter)
  BoothControls.tsx        # panel kontrol kios (tombol + grup Tema/Gaya/Bingkai cetak/Mode) — presentational
  GalleryShot.tsx          # kartu galeri polaroid (thumbnail + caption) — presentational
  LightboxBar.tsx          # bar aksi lightbox (Unduh / Hapus 2-langkah konfirmasi) — presentational
  types.ts                 # tipe landmark, gesture, overlay (+ FaceFrame, OverlayPreset), foto
  overlays/
    index.ts               # registry tema overlay (tambah filter baru di sini)
    glow.ts                # tema "Cahaya": halo kepala/jari/keduanya; presets 3 gaya
    skeleton.ts            # tema "Rangka": tulang tangan + mesh wajah; presets 2 gaya
    sparkle.ts             # tema "Kilau": tiara/keliling/jari; presets 3 gaya
    frame.ts               # tema "Bingkai": bingkai dua tangan + filter warna (presets = FRAME_FILTERS)
    blur.ts                # tema "Blur": gesture bingkai → seluruh foto blur; presets Ringan/Sedang/Kuat
    cat.ts                 # tema "Kucing": telinga di kepala + hidung/kumis di wajah; presets runcing/bulat
    hat.ts                 # tema "Topi Pesta": topi kerucut di kepala; presets polkadot/strip/polos
    heart.ts               # tema "Hati": hat mahkota/sisi/tunggal di kepala; presets 3 gaya
    star.ts                # tema "Bintang": bintang mahkota/tunggal/taburan di kepala; presets 3 gaya
    pinchParticles.ts      # sistem partikel efek pinch
.agents/skills/            # skill agent level project (via `npx skills add jakubkrehel/skills`):
                           # better-* (7 skill UI), break, explain-interface, interface-review, variant
```

Catatan arsitektur fitur "Bingkai" (lihat `design.md` §6):

- `gestures.ts` memegang pure function gesture/geo (termasuk `isFist` & `frameCorners`) — testable tanpa DOM.
- `overlays/frame.ts` menggambar ulang video ke canvas (`drawImage`) dengan `ctx.filter` untuk efek grayscale/filter warna, clip-path dari 4 titik jempol+telunjuk yang sudah diurutkan & di-smooth.
- Countdown kepalan→5 detik→capture + galeri foto ada di `HandFilter.tsx` (butuh state React & DOM), bukan di modul overlay.

Pisahkan **logic deteksi/gesture** dari **logic render/overlay** sebisa mungkin, supaya menambah filter/gesture baru tidak perlu mengubah kode inti hand-tracking.

## Menambah Filter atau Gesture Baru

- Gesture baru sebaiknya diimplementasikan sebagai fungsi murni yang menerima array landmark dan mengembalikan boolean/status (mis. `isPinching(landmarks): boolean`), supaya mudah ditest terpisah dari rendering.
- Filter/overlay baru sebaiknya jadi modul terpisah yang menerima koordinat landmark + canvas context, bukan digabung ke logic utama loop deteksi.

## Testing & Validasi

- Karena fitur inti bergantung pada webcam nyata, unit test otomatis untuk deteksi visual terbatas. Prioritaskan:
  - Test logic murni (fungsi gesture, kalkulasi jarak/posisi) dengan data landmark dummy — jalankan `npm test`.
  - Manual testing di browser untuk perilaku real-time (deteksi, overlay, performa).
- Validasi perubahan: `npm run build` (type-check + build) wajib lolos tanpa error.
- Sebelum submit perubahan besar, pastikan tidak ada error di console browser terkait SSR/hydration mismatch.

## Yang TIDAK Boleh Dilakukan Agent

- Jangan tambahkan pengiriman data webcam/gambar ke API/server eksternal manapun tanpa persetujuan eksplisit dari user.
- Jangan ganti library CV inti (mis. dari MediaPipe ke library lain) tanpa didiskusikan — ini keputusan arsitektur, bukan detail implementasi.
- Jangan hardcode kredensial/API key apapun di kode client-side (project ini seharusnya tidak butuh API key untuk fitur intinya).
- Jangan tambahkan dependency besar/berat tanpa alasan jelas — project ini harus tetap ringan untuk dimuat sebagai halaman web statis.

## Sinkronisasi Dokumentasi (WAJIB)

Setiap kali agent menyelesaikan perubahan pada codebase, agent WAJIB memperbarui `AGENTS.md` pada perubahan yang sama, agar session berikutnya tidak tertinggal konteks dan user tidak perlu menjelaskan ulang. Panduan pemetaannya:

| Jenis perubahan                             | Bagian yang harus diperbarui                             |
| ------------------------------------------- | -------------------------------------------------------- |
| Status progres roadmap / milestone          | "Konteks Project"                                        |
| Dependency, framework, tooling baru/dihapus | "Stack yang Digunakan"                                   |
| File/folder baru, dipindah, atau dihapus    | "Struktur Kode Saat Ini"                                 |
| Aturan teknis baru atau perintah validasi   | "Aturan Teknis" / "Testing & Validasi"                   |
| Keputusan desain/arsitektur baru            | `design.md` (§ keputusan) + ringkas di sini bila relevan |
| Perubahan scope/requirement produk          | `PRD.md`                                                 |

Jika sebuah perubahan tidak menyentuh hal di atas, cukup pastikan tidak ada bagian AGENTS.md yang jadi tidak akurat — jangan biarkan dokumen mendahului atau tertinggal dari kode.

## Referensi

- `PRD.md` — requirement produk dan scope fitur
- `design.md` — arsitektur teknis dan detail implementasi
