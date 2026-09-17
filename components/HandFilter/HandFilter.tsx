'use client';

// Komponen utama: video + canvas overlay + status UI (design.md §4).
// Deteksi (useHandLandmarker), kamera (useCamera), dan rendering (overlays)
// dipisah supaya pipeline tetap mudah diubah.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCamera } from './useCamera';
import { useHandLandmarker } from './useHandLandmarker';
import { useFaceLandmarker } from './useFaceLandmarker';
import {
	FIST_HOLD_MS,
	frameCorners,
	isFist,
	isPinching,
	pinchMidpoint,
	toPixels,
} from './gestures';
import { composePolaroidDataUrl, composeStripDataUrl } from './polaroid';
import { DEFAULT_PHOTO_FRAME_ID, drawPhotoFrame } from './photoFrames';
import PhotoLightbox from './PhotoLightbox';
import BoothControls from './BoothControls';
import GalleryShot from './GalleryShot';
import { getOverlay } from './overlays';
import { DEFAULT_FRAME_FILTER_ID } from './overlays/frame';
import {
	drawParticles,
	spawnBurst,
	updateParticles,
	type Particle,
} from './overlays/pinchParticles';
import type { CaptureMode, FaceFrame, HandFrame, Photo, Point } from './types';

/** Durasi countdown auto-capture setelah kepalan terdeteksi (ms). */
const COUNTDOWN_MS = 5000;
/** Jeda setelah foto diambil sebelum kepalan bisa memicu countdown lagi (ms). */
const COOLDOWN_MS = 2500;
/** Jeda antar jepretan strip 3× (ms) — ala photo booth, sempat ganti pose. */
const BURST_INTERVAL_MS = 5000;
/** Jumlah jepretan per strip pada mode 3×. */
const BURST_COUNT = 3;

/** Teks di tengah canvas yang terbaca normal meski canvas di-mirror via CSS. */
function drawCountdownNumber(
	ctx: CanvasRenderingContext2D,
	canvasWidth: number,
	value: number,
	x: number,
	y: number,
): void {
	ctx.save();
	ctx.translate(canvasWidth, 0);
	ctx.scale(-1, 1);
	ctx.font = '700 72px system-ui, sans-serif';
	ctx.fillStyle = '#22c55e';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
	ctx.shadowBlur = 12;
	ctx.fillText(String(value), canvasWidth - x, y);
	ctx.restore();
}

/** State tampilan gabungan (design.md §4) dari status model + kamera + tracking. */
type Phase =
	| 'model-loading'
	| 'model-error'
	| 'idle'
	| 'requesting'
	| 'denied'
	| 'not-found'
	| 'camera-error'
	| 'active-no-hand'
	| 'active-tracking';

type Tone = 'idle' | 'good' | 'warn' | 'bad';

const STATUS: Record<Phase, { label: string; tone: Tone }> = {
	'model-loading': { label: 'Memuat model deteksi tangan…', tone: 'warn' },
	'model-error': { label: 'Gagal memuat model MediaPipe.', tone: 'bad' },
	idle: {
		label: 'Model siap — klik "Aktifkan kamera" untuk mulai.',
		tone: 'good',
	},
	requesting: { label: 'Meminta izin kamera…', tone: 'warn' },
	denied: { label: 'Akses kamera ditolak.', tone: 'bad' },
	'not-found': { label: 'Kamera tidak ditemukan.', tone: 'bad' },
	'camera-error': { label: 'Kamera gagal diaktifkan.', tone: 'bad' },
	'active-no-hand': {
		label: 'Kamera aktif — angkat tangan ke dalam frame.',
		tone: 'warn',
	},
	'active-tracking': {
		label: 'Melacak tangan — cubit jempol & telunjuk untuk percikan partikel.',
		tone: 'good',
	},
};

/** Teks di tengah stage saat video belum berjalan. */
const EMPTY_HINT: Partial<Record<Phase, string>> = {
	'model-loading': 'memuat model ···',
	'model-error': 'model gagal dimuat',
	idle: 'kamera nonaktif',
	requesting: 'menunggu izin kamera ···',
	denied: 'akses ditolak',
	'not-found': 'kamera tidak ditemukan',
	'camera-error': 'kamera error',
};

export default function HandFilter() {
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	const {
		landmarkerRef,
		status: modelStatus,
		error: modelError,
	} = useHandLandmarker();
	// Model wajah untuk dekorasi kepala (telinga/topi/hati/bintang); gagal
	// memuat → tema tetap jalan tanpa dekorasi kepala (graceful).
	const { landmarkerRef: faceLandmarkerRef } = useFaceLandmarker();
	const camera = useCamera(videoRef);

	// Tema default "Bingkai" — fitur partial filter dua tangan hasil port dari
	// prototipe index.html, jadi langsung aktif saat kamera menyala.
	const [overlayId, setOverlayId] = useState('frame');
	const [handDetected, setHandDetected] = useState(false);
	// Preset gaya tema aktif (generik; untuk tema Bingkai = filter warna).
	// Di-reset ke default tema setiap kali ganti tema.
	const [themePresetId, setThemePresetId] = useState(DEFAULT_FRAME_FILTER_ID);
	const [photoFrameId, setPhotoFrameId] = useState(DEFAULT_PHOTO_FRAME_ID);
	const [captureMode, setCaptureMode] = useState<CaptureMode>('single');
	const [photos, setPhotos] = useState<Photo[]>([]);
	const [flash, setFlash] = useState(false);
	const [statusNote, setStatusNote] = useState<string | null>(null);
	// ID foto yang sedang dibuka di lightbox pratinjau (null = tertutup).
	const [previewId, setPreviewId] = useState<number | null>(null);
	// true saat "Unduh semua" sedang berjalan (tombol disabled).
	const [downloadingAll, setDownloadingAll] = useState(false);

	// Data per-frame disimpan di ref supaya loop rAF tidak memicu re-render.
	const handsRef = useRef<HandFrame[]>([]);
	const faceRef = useRef<FaceFrame | null>(null);
	const particlesRef = useRef<Particle[]>([]);
	const lastVideoTimeRef = useRef(-1);
	const detectedRef = useRef(false);
	// Countdown auto-capture (fitur tema "Bingkai", port dari index.html).
	const countdownStartRef = useRef<number | null>(null);
	const cooldownUntilRef = useRef(0);
	// Anti-pemicu palsu: kepalan harus ditahan sebelum countdown mulai.
	const fistSinceRef = useRef<number | null>(null);
	// Burst mode 3× digerakkan dari loop render (bukan setTimeout) supaya
	// tiap jepretan diambil SETELAH frame selesai digambar (anti canvas kosong).
	const burstActiveRef = useRef(false);
	const burstNextAtRef = useRef(0);
	const burstTakenRef = useRef(0);
	const burstFramesRef = useRef<string[]>([]);

	const overlay = useMemo(() => getOverlay(overlayId), [overlayId]);

	/**
	 * Komposit frame video + canvas overlay menjadi satu data URL (sudah
	 * dibalik sekali, tidak mirror). Video digambar DULU sebagai lapisan
	 * foto asli, canvas overlay (efek) di atasnya — kebanyakan tema hanya
	 * menggambar dekorasi di canvas transparan (telinga/topi/hati/bintang/
	 * halo/tulang), jadi tanpa lapisan video hasil jepretannya cuma efek
	 * tanpa fotonya. Tema "Bingkai" tidak berubah: canvas-nya sudah berisi
	 * video penuh sehingga lapisan video di bawahnya tertutup.
	 */
	const grabFrameDataUrl = useCallback((): string | null => {
		const canvas = canvasRef.current;
		const video = videoRef.current;
		if (!canvas || !canvas.width) return null;

		const out = document.createElement('canvas');
		out.width = canvas.width;
		out.height = canvas.height;
		const octx = out.getContext('2d');
		if (!octx) return null;

		octx.translate(out.width, 0);
		octx.scale(-1, 1);
		if (video && video.videoWidth) {
			octx.drawImage(video, 0, 0, out.width, out.height);
		}
		octx.drawImage(canvas, 0, 0);
		return out.toDataURL('image/png');
	}, []);

	/** Kilatan layar ala jepretan kamera. */
	const flashScreen = useCallback(() => {
		setFlash(true);
		window.setTimeout(() => setFlash(false), 150);
	}, []);

	/** Simpan satu foto ke galeri. Semua lokal — tidak ada upload. */
	const capturePhoto = useCallback(() => {
		const dataUrl = grabFrameDataUrl();
		if (!dataUrl) return;
		setPhotos((prev) => [{ id: Date.now(), dataUrl }, ...prev]);
		flashScreen();
	}, [grabFrameDataUrl, flashScreen]);

	/** Mode 3×: mulai sesi strip — jepretannya diambil dari loop render
	 *  (lihat blok burst di step()) dengan jeda BURST_INTERVAL_MS antar sesi. */
	const startBurst = useCallback(() => {
		burstActiveRef.current = true;
		burstNextAtRef.current = 0; // jepretan pertama segera
		burstTakenRef.current = 0;
		burstFramesRef.current = [];
	}, [grabFrameDataUrl]);

	/** Unduh foto sebagai polaroid: komposit bingkai + caption tanggal-jam
	 *  baru dijalankan saat tombol unduh ditekan (foto asli tetap murni). */
	/** Siapkan & picu unduhan satu foto (polaroid tunggal atau strip panjang). */
	const downloadOne = useCallback(async (photo: Photo) => {
		const isStrip = (photo.frames?.length ?? 0) > 1;
		const url =
			isStrip ?
				await composeStripDataUrl(photo.frames ?? [photo.dataUrl], photo.id)
			:	await composePolaroidDataUrl(photo.dataUrl, photo.id);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${isStrip ? 'comvi-strip' : 'comvi-polaroid'}-${photo.id}.png`;
		a.click();
	}, []);

	/** Unduh satu foto dari lightbox. */
	const downloadPhoto = useCallback(
		(photo: Photo) => {
			void downloadOne(photo).catch((err) => {
				console.error('Gagal menyiapkan unduhan polaroid:', err);
			});
		},
		[downloadOne],
	);

	/** Unduh semua foto galeri berurutan — diberi jeda ±400ms per file agar
	 *  browser tidak memblokir unduhan ganda. */
	const downloadAll = useCallback(() => {
		if (downloadingAll) return;
		void (async () => {
			setDownloadingAll(true);
			try {
				for (const photo of photos) {
					await downloadOne(photo);
					await new Promise((resolve) => window.setTimeout(resolve, 400));
				}
			} catch (err) {
				console.error('Gagal mengunduh semua foto:', err);
			} finally {
				setDownloadingAll(false);
			}
		})();
	}, [downloadingAll, photos, downloadOne]);

	/** Hapus foto dari galeri; kalau foto itu sedang dibuka, tutup lightbox. */
	const removePhoto = useCallback((id: number) => {
		setPhotos((prev) => prev.filter((p) => p.id !== id));
		setPreviewId((current) => (current === id ? null : current));
	}, []);

	/** Tutup lightbox dan kembalikan fokus ke kartu galeri pemicunya. */
	const closePreview = useCallback(() => {
		setPreviewId((current) => {
			if (current !== null) {
				document
					.querySelector<HTMLButtonElement>(`[data-photo-id="${current}"]`)
					?.focus();
			}
			return null;
		});
	}, []);

	/** Foto yang sedang dibuka di pratinjau (null bila lightbox tertutup). */
	const previewPhoto = useMemo(
		() =>
			previewId === null ? null : (
				(photos.find((p) => p.id === previewId) ?? null)
			),
		[previewId, photos],
	);

	const phase: Phase = useMemo(() => {
		if (modelStatus === 'loading') return 'model-loading';
		if (modelStatus === 'error') return 'model-error';
		switch (camera.status) {
			case 'idle':
				return 'idle';
			case 'requesting':
				return 'requesting';
			case 'active':
				return handDetected ? 'active-tracking' : 'active-no-hand';
			case 'denied':
				return 'denied';
			case 'not-found':
				return 'not-found';
			default:
				return 'camera-error';
		}
	}, [modelStatus, camera.status, handDetected]);

	/** Satu langkah animasi: deteksi frame baru (jika ada) lalu render overlay. */
	const step = useCallback(() => {
		const video = videoRef.current;
		const canvas = canvasRef.current;
		if (!video || !canvas || video.readyState < 2 || !video.videoWidth) return;

		// Sinkronkan resolusi canvas dengan resolusi video stream.
		if (
			canvas.width !== video.videoWidth ||
			canvas.height !== video.videoHeight
		) {
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
		}

		// Deteksi hanya saat ada frame video baru (hemat CPU).
		const landmarker = landmarkerRef.current;
		if (landmarker && video.currentTime !== lastVideoTimeRef.current) {
			lastVideoTimeRef.current = video.currentTime;
			try {
				const result = landmarker.detectForVideo(video, performance.now());
				handsRef.current = (result.landmarks ?? []).map((landmarks, i) => {
					const label = result.handednesses?.[i]?.[0]?.categoryName;
					return {
						landmarks,
						handedness:
							label === 'Left' || label === 'Right' ? label : 'Unknown',
					} satisfies HandFrame;
				});
			} catch {
				// Deteksi bisa sesekali gagal pada frame tertentu; pertahankan hasil terakhir.
			}

			// Deteksi wajah pada frame yang sama — untuk dekorasi kepala
			// (telinga/topi/hati/bintang). Kegagalan → tanpa dekorasi kepala.
			const faceLandmarker = faceLandmarkerRef.current;
			if (faceLandmarker) {
				try {
					const faceResult = faceLandmarker.detectForVideo(
						video,
						performance.now(),
					);
					faceRef.current =
						(faceResult.faceLandmarks?.[0]?.length ?? 0) > 0 ?
							{ landmarks: faceResult.faceLandmarks[0] }
						:	null;
				} catch {
					faceRef.current = null;
				}
			}

			const hasHands = handsRef.current.length > 0;
			if (hasHands !== detectedRef.current) {
				detectedRef.current = hasHands;
				setHandDetected(hasHands); // re-render hanya saat berubah
			}
		}

		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// ---- Countdown auto-capture (aktif di SEMUA tema) ----
		// Kepalkan salah satu tangan -> timer 5 detik -> foto otomatis.
		let countdownSeconds: number | null = null;
		let captureNow = false;
		{
			const now = performance.now();
			const fistNow = handsRef.current.some((h) => isFist(h.landmarks));
			const inCooldown = now < cooldownUntilRef.current;

			// Kepalan harus ditahan sebentar (FIST_HOLD_MS) sebelum countdown
			// dimulai — meredam pemicu palsu dari noise deteksi sesaat.
			if (fistNow) {
				fistSinceRef.current ??= now;
			} else {
				fistSinceRef.current = null;
			}
			const fistHeld =
				fistSinceRef.current !== null &&
				now - fistSinceRef.current >= FIST_HOLD_MS;

			if (fistHeld && countdownStartRef.current === null && !inCooldown) {
				countdownStartRef.current = now;
			}

			if (countdownStartRef.current !== null) {
				const remaining = COUNTDOWN_MS - (now - countdownStartRef.current);
				if (remaining <= 0) {
					captureNow = true;
					// Cooldown diperpanjang selama burst supaya kepalan tidak
					// memicu countdown baru di tengah strip 3×.
					cooldownUntilRef.current =
						now +
						COOLDOWN_MS +
						(captureMode === 'triple' ? BURST_COUNT * BURST_INTERVAL_MS : 0);
					countdownStartRef.current = null;
				} else {
					countdownSeconds = Math.ceil(remaining / 1000);
				}
			}

			// Pesan status: teks countdown berlaku untuk semua tema; panduan
			// bingkai dua tangan hanya relevan untuk tema "Bingkai".
			setStatusNote((prev) => {
				let next: string | null;
				if (countdownSeconds !== null) {
					next = `Kepalan terdeteksi — foto dalam ${countdownSeconds}s…`;
				} else if (burstActiveRef.current) {
					return prev; // sedang di tengah burst — blok burst yang mengatur
				} else if (overlay.id !== 'frame') {
					next =
						handsRef.current.length > 0 ?
							'Kepalkan salah satu tangan untuk mulai foto.'
						:	null;
				} else if (handsRef.current.length === 2) {
					next = 'Bingkai aktif — kepalkan salah satu tangan untuk mulai foto.';
				} else if (handsRef.current.length === 1) {
					next = 'Satu tangan terdeteksi — rentangkan tangan kedua juga.';
				} else {
					next =
						'Bentuk persegi dengan kedua tangan (jempol + telunjuk) untuk filter.';
				}
				return prev === next ? prev : next;
			});
		}

		// Gesture pinch → titik partikel + feedback per tema.
		const pinchPoints: Point[] = [];
		for (const hand of handsRef.current) {
			if (!isPinching(hand.landmarks)) continue;
			const mid = pinchMidpoint(hand.landmarks);
			if (!mid) continue;
			const px = toPixels(mid, canvas.width, canvas.height);
			pinchPoints.push(px);
			spawnBurst(particlesRef.current, px.x, px.y, 3);
		}

		overlay.render({
			ctx,
			width: canvas.width,
			height: canvas.height,
			hands: handsRef.current,
			pinchPoints,
			time: performance.now(),
			video: videoRef.current,
			frameFilterId: themePresetId,
			presetId: themePresetId,
			face: faceRef.current,
		});

		// Bingkai cetak digambar SETELAH tema (tepi canvas) dan SEBELUM angka
		// countdown supaya angka tetap terbaca; ikut ter-capture di foto.
		drawPhotoFrame(ctx, canvas.width, canvas.height, photoFrameId);

		updateParticles(particlesRef.current);
		drawParticles(ctx, particlesRef.current);

		// Angka countdown besar (semua tema): countdown awal ATAU hitung mundur
		// antar jepretan strip — digambar terpusat di sini setelah render.
		const burstRemainingMs =
			burstActiveRef.current ? burstNextAtRef.current - performance.now() : -1;
		const showCountdown =
			countdownSeconds ??
			(burstRemainingMs > 0 ? Math.ceil(burstRemainingMs / 1000) : null);
		if (showCountdown !== null && showCountdown > 0) {
			// Tengah: centroid sudut bingkai bila dua tangan membentuknya,
			// selain itu tengah canvas.
			const corners = frameCorners(handsRef.current);
			let cx = canvas.width / 2;
			let cy = canvas.height / 2;
			if (corners) {
				const pts = corners.map((p) =>
					toPixels(p, canvas.width, canvas.height),
				);
				cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
				cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
			}
			drawCountdownNumber(ctx, canvas.width, showCountdown, cx, cy);
		}

		// Ambil foto SETELAH render selesai — canvas sudah berisi frame video +
		// filter final (paritas dgn prototipe: capture dipanggil setelah
		// semua penggambaran, bukan saat canvas baru saja di-clear).
		if (captureNow) {
			if (captureMode === 'triple') startBurst();
			else capturePhoto();
		}

		// ---- Burst strip 3×: jepretan berjeda 5 detik antar sesi ----
		// Digerakkan dari sini (setelah render) supaya frame yang diambil
		// selalu frame final; hitung mundur ke jepretan berikutnya tampil
		// di status supaya user tahu kapan ganti pose.
		if (burstActiveRef.current) {
			const nowB = performance.now();
			if (nowB >= burstNextAtRef.current) {
				const url = grabFrameDataUrl();
				if (url) {
					burstFramesRef.current.push(url);
					burstTakenRef.current += 1;
					flashScreen();
				}
				if (burstTakenRef.current >= BURST_COUNT || !url) {
					// Sesi selesai (atau canvas tak tersedia) → satukan jadi strip.
					burstActiveRef.current = false;
					const frames = burstFramesRef.current.slice();
					if (frames.length > 0) {
						const id = Date.now();
						setPhotos((prev) => [{ id, dataUrl: frames[0], frames }, ...prev]);
						setStatusNote(
							frames.length >= BURST_COUNT ?
								`Strip ${frames.length} foto siap — buka untuk mengunduh.`
							:	`Strip ${frames.length} foto tersimpan.`,
						);
					}
				} else {
					burstNextAtRef.current = nowB + BURST_INTERVAL_MS;
				}
			} else {
				const nextIn = Math.ceil((burstNextAtRef.current - nowB) / 1000);
				setStatusNote(
					`Jepretan ${burstTakenRef.current + 1}/${BURST_COUNT} dalam ${nextIn}s… — siap-siap ganti pose`,
				);
			}
		}
	}, [
		landmarkerRef,
		faceLandmarkerRef,
		overlay,
		themePresetId,
		photoFrameId,
		captureMode,
		capturePhoto,
		startBurst,
		grabFrameDataUrl,
		flashScreen,
	]);

	// Loop rAF hidup hanya selama kamera aktif; dibersihkan saat stop/unmount.
	useEffect(() => {
		if (camera.status !== 'active') return;
		let raf = 0;
		const loop = () => {
			raf = requestAnimationFrame(loop);
			step();
		};
		raf = requestAnimationFrame(loop);
		return () => {
			cancelAnimationFrame(raf);
			handsRef.current = [];
			faceRef.current = null;
			particlesRef.current = [];
			detectedRef.current = false;
			countdownStartRef.current = null;
			cooldownUntilRef.current = 0;
			fistSinceRef.current = null;
			burstActiveRef.current = false;
			burstTakenRef.current = 0;
			burstFramesRef.current = [];
			setStatusNote(null);
			const canvas = canvasRef.current;
			canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
		};
	}, [camera.status, step]);

	const isRunning = camera.status === 'active';
	const canStart =
		modelStatus === 'ready' &&
		camera.status !== 'active' &&
		camera.status !== 'requesting';

	const status = STATUS[phase];
	const emptyHint = EMPTY_HINT[phase];
	const showErrorHelp = [
		'denied',
		'not-found',
		'camera-error',
		'model-error',
	].includes(phase);

	return (
		<>
			{/* Latar belakang di-inert-kan selama lightbox terbuka: kontrol di
			    belakang dialog tak bisa difokuskan/diklik (perilaku modal). */}
			<div
				className='filter'
				inert={previewPhoto !== null}
			>
				{/*
					Studio 3 kolom di atas kertas (better-layout: content bleeds,
					controls float): kiri panel efek, tengah kamera, kanan hasil.
					Yang gelap hanya kamera — panel & hasil berdiri sendiri di
					atas kertas, bukan di dalam box kios.
				*/}
				<div className='studio'>
					<aside className='studio-side studio-side--controls'>
						<BoothControls
							isRunning={isRunning}
							canStart={canStart}
							pendingLabel={
								phase === 'model-loading' ? 'Memuat model…'
								: phase === 'requesting' ? 'Meminta izin…'
								: phase === 'model-error' ? 'Muat ulang halaman'
								: undefined
							}
							overlayId={overlayId}
							onOverlayChange={(id) => {
								setOverlayId(id);
								// Ganti tema → preset gaya kembali ke default tema itu.
								const next = getOverlay(id);
								setThemePresetId(
									next.defaultPresetId ?? next.presets?.[0]?.id ?? '',
								);
							}}
							themePresets={overlay.presets ?? null}
							themePresetId={themePresetId}
							onThemePresetChange={setThemePresetId}
							photoFrameId={photoFrameId}
							onPhotoFrameChange={setPhotoFrameId}
							captureMode={captureMode}
							onCaptureModeChange={setCaptureMode}
							onStart={() => void camera.start()}
							onStop={camera.stop}
						/>
					</aside>

					<div className='studio-center'>
						{/* Kios kamera: satu-satunya objek gelap di atas kertas.
						    Berisi marquee, readout status, stage, dan slot bawah. */}
						<div className='booth'>
							<div
								className='booth-marquee'
								aria-hidden='true'
							>
								<span className='booth-title'>Jepretin</span>
								<span className='booth-bulbs'>
									<i />
									<i />
									<i />
									<i />
									<i />
									<i />
									<i />
									<i />
								</span>
							</div>

							<div className='booth-screen'>
								<p
									className='readout'
									role='status'
									aria-live='polite'
								>
									<span
										className={`dot dot--${statusNote ? 'good' : status.tone}`}
									/>
									<span>{statusNote ?? status.label}</span>
									{isRunning && <span className='readout-tag'>on-device</span>}
								</p>

								<div className={`stage stage--${phase}`}>
									<video
										ref={videoRef}
										playsInline
										muted
										autoPlay
									/>
									<canvas ref={canvasRef} />
									{emptyHint && (
										<div
											className='stage-empty'
											aria-hidden='true'
										>
											<span className='stage-empty-mark'>✋</span>
											<span>{emptyHint}</span>
										</div>
									)}
									<span className='tick tick--tl' />
									<span className='tick tick--tr' />
									<span className='tick tick--bl' />
									<span className='tick tick--br' />
									<span
										className={`flash${flash ? ' flash--active' : ''}`}
										aria-hidden='true'
									/>
								</div>

								<div
									className='booth-slot'
									aria-hidden='true'
								/>
							</div>
						</div>
					</div>

					<aside className='studio-side studio-side--results'>
						<section className='gallery-wrap'>
							<div className='gallery-head'>
								<h2 className='section-title'>Hasil jepretan</h2>
								{photos.length > 0 && (
									<button
										type='button'
										className='btn btn--mini'
										onClick={downloadAll}
										disabled={downloadingAll}
									>
										{downloadingAll ? 'Menyiapkan…' : 'Unduh semua'}
									</button>
								)}
							</div>
							{photos.length > 0 ? (
								<div className='gallery'>
									{photos.map((photo) => (
										<GalleryShot
											key={photo.id}
											photo={photo}
											onOpen={setPreviewId}
										/>
									))}
								</div>
							) : (
								// Placeholder samar: grid tetap 3 kolom stabil &
								// tidak melompat saat foto pertama muncul
								// (better-layout: hint at hidden content).
								<p className='gallery-empty'>
									Foto yang kamu jepret muncul di sini.
								</p>
							)}
						</section>
					</aside>
				</div>

				{showErrorHelp && (
					<div
						className='help'
						role='alert'
					>
						<strong>
							{phase === 'model-error' ?
								'Model gagal dimuat.'
							: phase === 'camera-error' ?
								'Kamera gagal diaktifkan.'
							:	camera.error}
						</strong>
						{phase === 'denied' && (
							<ol>
								<li>Klik ikon kunci/kamera di address bar browser.</li>
								<li>Atur izin kamera menjadi &quot;Izinkan&quot;.</li>
								<li>
									Muat ulang halaman, lalu klik &quot;Aktifkan kamera&quot;
									lagi.
								</li>
							</ol>
						)}
						{phase === 'model-error' && (
							<p>
								Model diambil dari CDN saat pertama kali dimuat — pastikan
								koneksi internet aktif, lalu muat ulang halaman.
							</p>
						)}
						{phase === 'not-found' && (
							<p>
								Hubungkan atau nyalakan kamera perangkat, lalu muat ulang
								halaman dan aktifkan kamera lagi.
							</p>
						)}
						{phase === 'camera-error' && (
							<>
								<p>
									Muat ulang halaman, lalu aktifkan kamera lagi. Bila masih
									gagal, coba browser lain (mis. Chrome atau Edge).
								</p>
								{camera.error && <p>{camera.error}</p>}
							</>
						)}
					</div>
				)}
			</div>

			{previewPhoto && (
				<PhotoLightbox
					photo={previewPhoto}
					onDownload={downloadPhoto}
					onDelete={removePhoto}
					onClose={closePreview}
				/>
			)}
		</>
	);
}
