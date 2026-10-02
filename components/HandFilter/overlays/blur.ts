// Tema "Blur" — khusus MODE VIDEO (satu-satunya tema di list video).
// SELURUH foto selalu blur, tanpa gesture, tanpa outline/kerangka —
// blur saja. (Sebelumnya blur hanya aktif saat dua tangan membentuk
// bingkai, padahal pemicu foto adalah kepalan satu tangan — tak mungkin
// bersamaan — sehingga efeknya cuma ikut tersimpan di rekaman video.)
// Tema STATIS: tidak memakai `time`. Kekuatan blur via sub-gaya.

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
	video,
	presetId,
}: OverlayRenderContext): void {
	// Selalu blur: video digambar ulang (di atas lapisan dasar) dengan
	// ctx.filter blur — tanpa syarat gesture, tanpa garis/outline.
	if (!video || !video.videoWidth) return;

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
	// Hanya tampil di list tema mode Video (list Foto: semua tema kecuali Blur).
	modes: ['video'],
	presets: BLUR_PRESETS.map((p) => ({ id: p.id, label: p.label })),
	defaultPresetId: DEFAULT_BLUR_PRESET_ID,
	render,
} satisfies OverlayModule;
