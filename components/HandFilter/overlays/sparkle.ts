// Tema "Kilau" — bintang kilau berputar; tiga gaya: Tiara (kilau di puncak
// kepala via FaceLandmarker), Keliling (kilau mengelilingi kepala), atau
// Ujung jari (perilaku asli). Bintang berdenyut menggunakan `time`.

import { faceAnchor } from '../faceGeometry';
import { FINGER_TIPS } from '../gestures';
import type { OverlayModule, OverlayRenderContext } from '../types';

const COLORS = ['#67e8f9', '#f472b6', '#a78bfa', '#fde68a', '#6ee7b7'];

/** Bentuk bintang 4 sudut dengan lengkungan halus di koordinat lokal. */
function drawSpark(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	r: number,
	rot: number,
	color: string,
): void {
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(rot);
	ctx.beginPath();
	ctx.moveTo(0, -r);
	ctx.quadraticCurveTo(r * 0.18, -r * 0.18, r, 0);
	ctx.quadraticCurveTo(r * 0.18, r * 0.18, 0, r);
	ctx.quadraticCurveTo(-r * 0.18, r * 0.18, -r, 0);
	ctx.quadraticCurveTo(-r * 0.18, -r * 0.18, 0, -r);
	ctx.closePath();
	ctx.fillStyle = color;
	ctx.fill();
	ctx.restore();
}

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
	const place = presetId ?? 'tiara';

	if ((place === 'tiara' || place === 'keliling') && face) {
		const a = faceAnchor(face.landmarks, width, height);
		if (a) {
			ctx.save();
			ctx.translate(a.top.x, a.top.y);
			ctx.rotate(a.roll);

			if (place === 'tiara') {
				// 3 kilau melengkung di puncak kepala: pusat besar + dua sisi kecil
				const positions: [number, number, number][] = [
					[0, -a.width * 0.42, 0],
					[-a.width * 0.24, -a.width * 0.28, 1],
					[a.width * 0.24, -a.width * 0.28, 2],
				];
				positions.forEach(([x, y, i]) => {
					const big = i === 0;
					const tw = 0.55 + 0.45 * Math.sin(time / 220 + i * 1.3);
					drawSpark(ctx, x, y, a.width * (big ? 0.1 : 0.065) * (0.8 + tw * 0.5),
						time / 900 + i, COLORS[i % COLORS.length]);
				});
			} else {
				// keliling: 6 kilau kecil melingkari kepala
				for (let i = 0; i < 6; i++) {
					const ang = (i / 6) * Math.PI * 2 + time / 4000;
					const r = a.width * 0.54;
					const tw = 0.55 + 0.45 * Math.sin(time / 220 + i * 1.05);
					drawSpark(
						ctx,
						Math.sin(ang) * r,
						-Math.cos(ang) * r * 0.7,
						a.width * 0.065 * (0.7 + tw * 0.5),
						time / 900 + i,
						COLORS[i % COLORS.length],
					);
				}
			}
			ctx.restore();
		}
	}

	if (place === 'jari') {
		for (const hand of hands) {
			FINGER_TIPS.forEach((tipIndex, i) => {
				const lm = hand.landmarks[tipIndex];
				if (!lm) return;
				const x = lm.x * width;
				const y = lm.y * height;
				const twinkle = 0.55 + 0.45 * Math.sin(time / 220 + i * 1.3);
				const color = COLORS[i % COLORS.length];
				ctx.beginPath();
				ctx.arc(x, y, 10 + twinkle * 6, 0, Math.PI * 2);
				ctx.fillStyle = color;
				ctx.globalAlpha = 0.15;
				ctx.fill();
				ctx.globalAlpha = 1;
				drawSpark(ctx, x, y, 6 + twinkle * 5, time / 900 + i, color);
			});
		}
	}

	for (const p of pinchPoints) {
		ctx.beginPath();
		ctx.arc(p.x, p.y, 24, 0, Math.PI * 2);
		ctx.strokeStyle = 'rgba(253, 230, 138, 0.9)';
		ctx.lineWidth = 2;
		ctx.stroke();
	}
}

export default {
	id: 'sparkle',
	label: 'Kilau',
	presets: [
		{ id: 'tiara', label: 'Tiara' },
		{ id: 'keliling', label: 'Keliling' },
		{ id: 'jari', label: 'Ujung jari' },
	],
	defaultPresetId: 'tiara',
	render,
} satisfies OverlayModule;
