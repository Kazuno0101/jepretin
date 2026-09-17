// Tema "Cahaya" — halo dengan tiga penempatan: Kepala (cincin melayang di
// atas kepala via FaceLandmarker), Ujung jari (perilaku asli), atau Keduanya.
// Halo berdenyut halus (satu-satunya tema lama yang tetap memakai `time`).

import { faceAnchor } from '../faceGeometry';
import { INDEX_TIP } from '../gestures';
import type { OverlayModule, OverlayRenderContext } from '../types';

const CYAN = '#22d3ee';
const CYAN_SOFT = 'rgba(34, 211, 238, 0.25)';
const PINK = 'rgba(244, 114, 182, 0.9)';

function render({
	ctx,
	width,
	height,
	hands,
	pinchPoints,
	time,
	face,
	presetId,
}: OverlayRenderContext) {
	const pulse = 0.5 + 0.5 * Math.sin(time / 300);
	const place = presetId ?? 'kepala';

	// Halo di atas kepala (ruang lokal kepala: -y = arah puncak kepala).
	if ((place === 'kepala' || place === 'keduanya') && face) {
		const a = faceAnchor(face.landmarks, width, height);
		if (a) {
			ctx.save();
			ctx.translate(a.top.x, a.top.y);
			ctx.rotate(a.roll);
			const cy = -a.width * (0.52 + pulse * 0.03);
			ctx.beginPath();
			ctx.ellipse(0, cy, a.width * 0.3, a.width * 0.1, 0, 0, Math.PI * 2);
			ctx.strokeStyle = CYAN_SOFT;
			ctx.lineWidth = 6;
			ctx.stroke();
			ctx.beginPath();
			ctx.ellipse(0, cy, a.width * 0.3, a.width * 0.1, 0, 0, Math.PI * 2);
			ctx.strokeStyle = CYAN;
			ctx.lineWidth = 3;
			ctx.stroke();
			ctx.restore();
		}
	}

	// Halo di ujung telunjuk (perilaku asli tema ini).
	if (place === 'jari' || place === 'keduanya') {
		for (const hand of hands) {
			const tip = hand.landmarks[INDEX_TIP];
			if (!tip) continue;
			const x = tip.x * width;
			const y = tip.y * height;

			ctx.beginPath();
			ctx.arc(x, y, 22 + pulse * 4, 0, Math.PI * 2);
			ctx.strokeStyle = CYAN_SOFT;
			ctx.lineWidth = 6;
			ctx.stroke();

			ctx.beginPath();
			ctx.arc(x, y, 14, 0, Math.PI * 2);
			ctx.strokeStyle = CYAN;
			ctx.lineWidth = 3;
			ctx.stroke();

			ctx.beginPath();
			ctx.arc(x, y, 4, 0, Math.PI * 2);
			ctx.fillStyle = '#e0faff';
			ctx.fill();
		}
	}

	// feedback eksplisit saat gesture pinch terdeteksi (design.md §5)
	for (const p of pinchPoints) {
		ctx.beginPath();
		ctx.arc(p.x, p.y, 26, 0, Math.PI * 2);
		ctx.strokeStyle = PINK;
		ctx.lineWidth = 2;
		ctx.stroke();
	}
}

export default {
	id: 'glow',
	label: 'Cahaya',
	presets: [
		{ id: 'kepala', label: 'Kepala' },
		{ id: 'jari', label: 'Ujung jari' },
		{ id: 'keduanya', label: 'Keduanya' },
	],
	defaultPresetId: 'kepala',
	render,
} satisfies OverlayModule;
