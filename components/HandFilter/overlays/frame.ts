// Tema "Bingkai" — port dari prototipe statis (index.html):
// dua tangan membentuk persegi (jempol+telunjuk), bagian dalam bingkai
// diberi filter warna, bagian luar grayscale, plus outline + titik sudut.
// Angka countdown auto-capture digambar terpusat di HandFilter.tsx (semua tema).

import { frameCorners, toPixels } from '../gestures';
import type { OverlayModule, OverlayRenderContext, Point } from '../types';

/** Preset filter warna di dalam bingkai (urutan sama dengan index.html). */
export interface FrameFilterPreset {
	id: string;
	label: string;
	/** colorInside: luar bingkai grayscale; grayInside: dalam bingkai grayscale. */
	mode: 'colorInside' | 'grayInside';
	css: string;
}

export const FRAME_FILTERS: FrameFilterPreset[] = [
	{ id: 'vivid', label: 'Vivid', mode: 'colorInside', css: 'saturate(1.8) contrast(1.1)' },
	{ id: 'sepia', label: 'Sepia', mode: 'colorInside', css: 'sepia(1) contrast(1.1) saturate(1.3)' },
	{ id: 'invert', label: 'Invert', mode: 'colorInside', css: 'invert(1)' },
	{ id: 'cool', label: 'Dingin', mode: 'colorInside', css: 'hue-rotate(200deg) saturate(1.4)' },
	{ id: 'mono', label: 'Mono', mode: 'grayInside', css: 'contrast(1.2)' },
];

export const DEFAULT_FRAME_FILTER_ID = FRAME_FILTERS[0].id;

/** Faktor smoothing bingkai — makin besar makin lengket ke posisi lama. */
const SMOOTHING = 0.35;

// State smoothing milik tema ini; di-reset setiap kali bingkai hilang
// (lebih dari / kurang dari dua tangan) supaya bingkai baru tidak "terbang".
let smoothed: Point[] | null = null;

function smooth(points: Point[]): Point[] {
	if (!smoothed || smoothed.length !== points.length) {
		smoothed = points.map((p) => ({ ...p }));
		return smoothed;
	}
	smoothed = points.map((p, i) => ({
		x: smoothed![i].x * SMOOTHING + p.x * (1 - SMOOTHING),
		y: smoothed![i].y * SMOOTHING + p.y * (1 - SMOOTHING),
	}));
	return smoothed;
}

function tracePath(ctx: CanvasRenderingContext2D, points: Point[]): void {
	ctx.beginPath();
	ctx.moveTo(points[0].x, points[0].y);
	for (let i = 1; i < points.length; i++) {
		ctx.lineTo(points[i].x, points[i].y);
	}
	ctx.closePath();
}

function render({
	ctx,
	width,
	height,
	hands,
	video,
	frameFilterId,
	presetId,
}: OverlayRenderContext): void {
	// Tema ini menggambar ulang video ke canvas, jadi wajib ada frame video.
	if (!video || !video.videoWidth || !video.videoHeight) return;

	// presetId (chips "Gaya") menyatukan mekanisme preset semua tema;
	// frameFilterId tetap diterima demi kompatibilitas pemanggil lama.
	const preset =
		FRAME_FILTERS.find((f) => f.id === (presetId ?? frameFilterId)) ??
		FRAME_FILTERS[0];

	const corners = frameCorners(hands);
	const frame = corners ? smooth(corners.map((p) => toPixels(p, width, height))) : null;
	if (!frame) smoothed = null;

	// Dasar: saat bingkai aktif, area luar bingkai grayscale (kecuali preset
	// mono). Tanpa bingkai (0/1 tangan) video digambar normal, seperti prototipe.
	ctx.filter = frame && preset.mode === 'colorInside' ? 'grayscale(1)' : 'none';
	ctx.drawImage(video, 0, 0, width, height);
	ctx.filter = 'none';

	if (frame) {
		// Dalam bingkai: video dengan filter preset, terpotong bentuk bingkai.
		ctx.save();
		tracePath(ctx, frame);
		ctx.clip();
		ctx.filter =
			preset.mode === 'grayInside' ?
				`grayscale(1) ${preset.css}`
			:	preset.css;
		ctx.drawImage(video, 0, 0, width, height);
		ctx.filter = 'none';
		ctx.restore();

		// Outline bingkai + titik di tiap sudut (jempol & telunjuk).
		tracePath(ctx, frame);
		ctx.strokeStyle = '#60a5fa';
		ctx.lineWidth = 3;
		ctx.stroke();
		for (const p of frame) {
			ctx.beginPath();
			ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
			ctx.fillStyle = '#f472b6';
			ctx.fill();
		}
	}
}

export default {
	id: 'frame',
	label: 'Bingkai',
	// Filter warna tampil sebagai chips "Gaya" (mekanisme preset generik).
	presets: FRAME_FILTERS.map((f) => ({ id: f.id, label: f.label })),
	defaultPresetId: DEFAULT_FRAME_FILTER_ID,
	render,
} satisfies OverlayModule;
