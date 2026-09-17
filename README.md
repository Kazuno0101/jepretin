# Comvi — Hand Gesture Filter (Web)

Filter tangan real-time ala Snapchat/Instagram versi sederhana: deteksi tangan via webcam
(MediaPipe Tasks Vision, `HandLandmarker`) + overlay canvas yang bereaksi terhadap gesture.
**Semua pemrosesan berjalan di browser — tidak ada video/frame yang dikirim ke server.**

Dokumen terkait: [`PRD.md`](./PRD.md) · [`design.md`](./design.md) · [`AGENTS.md`](./AGENTS.md)

## Menjalankan

```bash
npm install
npm run dev        # buka http://localhost:3000
```

Perlu koneksi internet saat pertama kali membuka halaman — model & WASM MediaPipe
diambil dari CDN, lalu di-cache oleh browser.

Perintah lain:

```bash
npm run build      # build produksi
npm run start      # jalankan hasil build
npm test           # unit test (logic gesture murni)
```

## Cara Pakai

1. Klik **Aktifkan Kamera** (izin hanya diminta setelah klik, bukan saat halaman dimuat).
2. Angkat tangan ke dalam frame — overlay mengikuti ujung jarimu.
3. Cubit jempol & telunjuk (*pinch*) untuk memicu percikan partikel.
4. Ganti tema overlay: **Cahaya**, **Rangka**, atau **Kilau**.

## Struktur

```
app/
  layout.tsx            # font, metadata, global css
  page.tsx              # halaman utama
components/HandFilter/
  HandFilter.tsx        # komponen utama (video + canvas + status UI)
  HandFilterDemo.tsx    # wrapper client + dynamic import { ssr: false }
  useCamera.ts          # hook: getUserMedia + cleanup stream
  useHandLandmarker.ts  # hook: load model MediaPipe + dispose
  gestures.ts           # pure function (isPinching, distance, dst) — unit-testable
  types.ts              # tipe landmark, gesture, overlay
  overlays/
    index.ts            # registry tema overlay
    glow.ts             # tema "Cahaya"
    skeleton.ts         # tema "Rangka"
    sparkle.ts          # tema "Kilau"
    pinchParticles.ts   # sistem partikel efek pinch
```

Menambah filter/gesture baru cukup dengan menambah modul overlay
(interface `render(ctx, width, height, hands, pinchPoints, time)`) atau fungsi gesture murni —
tanpa menyentuh kode inti hand-tracking.
