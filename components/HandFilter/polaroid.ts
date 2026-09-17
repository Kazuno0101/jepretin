// Komposit polaroid untuk ekspor unduhan: bingkai kertas putih + caption
// tanggal-jam. Geometri dibuat pure function supaya bisa di-unit-test tanpa
// DOM (pola yang sama dengan gestures.ts). Komposit dijalankan SAAT UNDUH,
// bukan saat capture — foto asli di state tetap murni.

/** Warna bingkai polaroid (kertas hangat, sama dengan --paper-2). */
export const POLAROID_FRAME_COLOR = '#fdfcf7';
/** Warna caption (tinta, sama dengan --ink). */
export const POLAROID_CAPTION_COLOR = '#1c1917';

/** Geometri bingkai polaroid untuk satu foto. */
export interface PolaroidGeometry {
	frameW: number;
	frameH: number;
	photoX: number;
	photoY: number;
	photoW: number;
	photoH: number;
	/** Posisi vertikal tengah area caption. */
	captionY: number;
	captionSize: number;
}

/** Geometri strip polaroid berisi beberapa jepretan (mode 3×). */
export interface StripGeometry {
	frameW: number;
	frameH: number;
	photoX: number;
	/** Posisi vertikal tiap foto (urut atas ke bawah). */
	photoYs: number[];
	photoW: number;
	photoH: number;
	captionY: number;
	captionSize: number;
}

/**
 * Hitung geometri bingkai polaroid dari ukuran foto:
 * margin kiri/kanan/atas = 6% lebar foto, area caption bawah = 20% tinggi foto.
 */
export function polaroidGeometry(imgW: number, imgH: number): PolaroidGeometry {
	const side = Math.round(imgW * 0.06);
	const top = Math.round(imgW * 0.06);
	const bottom = Math.round(imgH * 0.2);
	return {
		frameW: imgW + side * 2,
		frameH: imgH + top + bottom,
		photoX: side,
		photoY: top,
		photoW: imgW,
		photoH: imgH,
		captionY: top + imgH + bottom / 2,
		captionSize: Math.round(imgW * 0.055),
	};
}

/**
 * Geometri strip polaroid: beberapa foto ditumpuk vertikal dalam satu
 * bingkai (margin sama seperti polaroid tunggal + jarak antar foto 5% lebar).
 */
export function stripGeometry(
	imgW: number,
	imgH: number,
	count: number,
): StripGeometry {
	const side = Math.round(imgW * 0.06);
	const top = Math.round(imgW * 0.06);
	const gap = Math.round(imgW * 0.05);
	const bottom = Math.round(imgH * 0.2);
	const photoYs = Array.from(
		{ length: count },
		(_, i) => top + i * (imgH + gap),
	);
	return {
		frameW: imgW + side * 2,
		frameH: top + count * imgH + (count - 1) * gap + bottom,
		photoX: side,
		photoYs,
		photoW: imgW,
		photoH: imgH,
		captionY: top + count * imgH + (count - 1) * gap + bottom / 2,
		captionSize: Math.round(imgW * 0.055),
	};
}

/** Format caption tanggal-jam capture (locale Indonesia). */
export function formatCaptureTimestamp(timestamp: number): string {
	return new Date(timestamp).toLocaleString('id-ID', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error('Gagal memuat foto untuk komposit polaroid.'));
		img.src = src;
	});
}

/** Nama font tulisan tangan yang didaftarkan next/font (--font-hand). */
function handFontFamily(): string {
	if (typeof window === 'undefined') return 'cursive';
	const family = getComputedStyle(document.body).getPropertyValue('--font-hand').trim();
	return family || 'Caveat, cursive';
}

async function ensureHandFont(size: number): Promise<string> {
	const family = handFontFamily();
	try {
		await document.fonts.load(`500 ${size}px ${family}`);
	} catch {
		// Font opsional — kalau gagal dimuat, biarkan browser pakai fallback.
	}
	return family;
}

/**
 * Komposit foto ke dalam bingkai polaroid + caption tanggal-jam,
 * hasilnya PNG data URL (siap diunduh lewat anchor programatik).
 */
export async function composePolaroidDataUrl(
	photoDataUrl: string,
	timestamp: number,
): Promise<string> {
	const img = await loadImage(photoDataUrl);
	const g = polaroidGeometry(img.width, img.height);

	const canvas = document.createElement('canvas');
	canvas.width = g.frameW;
	canvas.height = g.frameH;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Canvas 2D tidak tersedia.');

	// Bingkai kertas.
	ctx.fillStyle = POLAROID_FRAME_COLOR;
	ctx.fillRect(0, 0, g.frameW, g.frameH);

	// Foto di dalam bingkai.
	ctx.drawImage(img, g.photoX, g.photoY, g.photoW, g.photoH);

	// Caption tanggal-jam di area bawah.
	const family = await ensureHandFont(g.captionSize);
	ctx.fillStyle = POLAROID_CAPTION_COLOR;
	ctx.font = `500 ${g.captionSize}px ${family}, cursive`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText(formatCaptureTimestamp(timestamp), g.frameW / 2, g.captionY);

	return canvas.toDataURL('image/png');
}

/**
 * Komposit beberapa jepretan menjadi SATU strip polaroid vertikal + caption
 * tanggal-jam (mode 3×) — hasilnya satu PNG panjang siap unduh.
 */
export async function composeStripDataUrl(
	frameDataUrls: string[],
	timestamp: number,
): Promise<string> {
	if (frameDataUrls.length === 0) {
		throw new Error('Strip butuh minimal satu jepretan.');
	}
	const imgs = await Promise.all(frameDataUrls.map(loadImage));
	const { width: imgW, height: imgH } = imgs[0];
	const g = stripGeometry(imgW, imgH, imgs.length);

	const canvas = document.createElement('canvas');
	canvas.width = g.frameW;
	canvas.height = g.frameH;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Canvas 2D tidak tersedia.');

	// Bingkai kertas.
	ctx.fillStyle = POLAROID_FRAME_COLOR;
	ctx.fillRect(0, 0, g.frameW, g.frameH);

	// Jepretan ditumpuk vertikal.
	imgs.forEach((img, i) => {
		ctx.drawImage(img, g.photoX, g.photoYs[i], g.photoW, g.photoH);
	});

	// Caption tunggal di dasar strip.
	const family = await ensureHandFont(g.captionSize);
	ctx.fillStyle = POLAROID_CAPTION_COLOR;
	ctx.font = `500 ${g.captionSize}px ${family}, cursive`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText(formatCaptureTimestamp(timestamp), g.frameW / 2, g.captionY);

	return canvas.toDataURL('image/png');
}
