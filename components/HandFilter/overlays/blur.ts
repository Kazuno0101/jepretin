// Tema "Blur" — saudara tema "Bingkai": saat dua tangan membentuk persegi
// (jempol + telunjuk direntangkan), SELURUH foto jadi blur (semua area).
// Tanpa outline/garis: blur saja tanpa hiasan. Tanpa gesture: video biasa
// (lapisan dasar sudah digambar HandFilter.step()).
// Tema STATIS: tidak memakai `time`. Kekuatan blur via sub-gaya.

import { frameCorners } from '../gestures';
import type { OverlayModule, OverlayRenderContext } from '../types';

/** Sub-gaya kekuatan blur = fraksi lebar canvas (canvas bisa 640–1280px). */
const BLUR_PRESETS: ReadonlyArray<{ id: string; label: string; factor: number }> = [
	{ id: 'ringan', label: 'Ringan', factor: 0.006 },
	{ id: 'sedang', label: 'Sedang', factor: 0.012 },
	{ id: 'kuat', label: 'Kuat', factor: 0.02 },
];

export const DEFAULT_BLUR_PRESET_ID = BLUR_PRESETS[0].id;

function render({
	ctx,
	width,
	height,
	hands,
	video,
	presetId,
}: OverlayRenderContext): void {
	// Gesture bingkai terbentuk → seluruh foto diblur. Video digambar ulang
	// (di atas lapisan dasar) dengan ctx.filter blur. Tanpa garis/outline
	// — blur saja.
	if (!frameCorners(hands) || !video || !video.videoWidth) return;

	const preset = BLUR_PRESETS.find((p) => p.id === presetId) ?? BLUR_PRESETS[0];
	const blurPx = Math.max(1, width * preset.factor);
	// Overscan ±(blurPx * 2): filter blur mengambil sampel di luar tepi
	// canvas → tanpa overscan muncul garis transparan di pinggir.
	const m = blurPx * 2;
	ctx.save();
	ctx.filter = `blur(${blurPx}px)`;
	ctx.drawImage(video, -m, -m, width + m * 2, height + m * 2);
	ctx.filter = 'none';
	ctx.restore();
}

export default {
	id: 'blur',
	label: 'Blur',
	presets: BLUR_PRESETS.map((p) => ({ id: p.id, label: p.label })),
	defaultPresetId: DEFAULT_BLUR_PRESET_ID,
	render,
} satisfies OverlayModule;

