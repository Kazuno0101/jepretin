// Bingkai cetak — dekorasi bingkai foto ortogonal terhadap tema overlay:
// digambar di tepi canvas SETELAH tema render (dan sebelum angka countdown),
// jadi ikut ter-capture di foto. Geometri dibuat pure supaya bisa di-unit-test.

import type { OverlayPreset } from './types';

/** Pilihan bingkai cetak (urutan = urutan chips di panel kontrol). */
export const PHOTO_FRAMES: PhotoFramePreset[] = [
	{ id: 'none', label: 'Tanpa' },
	{ id: 'polaroid', label: 'Polaroid' },
	{ id: 'film', label: 'Film' },
	{ id: 'vignette', label: 'Vignette' },
];

export const DEFAULT_PHOTO_FRAME_ID = PHOTO_FRAMES[0].id;

export interface PhotoFramePreset {
	id: string;
	label: string;
}

const PAPER = '#fdfcf7';
const INK_LINE = 'rgba(28, 25, 23, 0.35)';
const FILM_BG = '#0c0b0e';

/** Geometri bingkai polaroid: margin sisi/atas & strip bawah lebar (piksel). */
export function polaroidInsets(
	width: number,
	height: number,
): { side: number; top: number; bottom: number } {
	const base = Math.min(width, height) * 0.05;
	return { side: base, top: base, bottom: base * 2.8 };
}

/** Posisi-x pusat lubang perforasi film (piksel), rapi di dalam tepi. */
export function perforationCenters(width: number, stripHeight: number): number[] {
	const holeH = stripHeight * 0.34;
	const holeW = holeH * 0.62;
	const spacing = holeW * 2.4;
	const count = Math.max(3, Math.floor((width - spacing) / spacing));
	const total = spacing * count;
	const first = (width - total) / 2 + spacing / 2;
	return Array.from({ length: count }, (_, i) => first + i * spacing);
}

/** Gambar bingkai cetak aktif pada canvas (id 'none' = tanpa bingkai). */
export function drawPhotoFrame(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	id: string,
): void {
	if (id === 'polaroid') {
		const { side, top, bottom } = polaroidInsets(width, height);
		ctx.fillStyle = PAPER;
		ctx.fillRect(0, 0, width, top);
		ctx.fillRect(0, height - bottom, width, bottom);
		ctx.fillRect(0, 0, side, height);
		ctx.fillRect(width - side, 0, side, height);
		// Garis tinta tipis di dalam foto (struktur, ala cetakan).
		ctx.strokeStyle = INK_LINE;
		ctx.lineWidth = 1.5;
		ctx.strokeRect(side, top, width - side * 2, height - top - bottom);
		return;
	}

	if (id === 'film') {
		const strip = height * 0.09;
		ctx.fillStyle = FILM_BG;
		ctx.fillRect(0, 0, width, strip);
		ctx.fillRect(0, height - strip, width, strip);
		const holeH = strip * 0.34;
		const holeW = holeH * 0.62;
		ctx.fillStyle = 'rgba(244, 240, 230, 0.92)';
		for (const [y] of [
			[(strip - holeH) / 2],
			[height - strip + (strip - holeH) / 2],
		] as const) {
			for (const x of perforationCenters(width, strip)) {
				ctx.beginPath();
				ctx.roundRect(x - holeW / 2, y, holeW, holeH, holeW * 0.3);
				ctx.fill();
			}
		}
		return;
	}

	if (id === 'vignette') {
		const cx = width / 2;
		const cy = height / 2;
		const inner = Math.min(width, height) * 0.38;
		const outer = Math.hypot(width, height) * 0.62;
		const grad = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
		grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
		grad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, width, height);
	}
}
