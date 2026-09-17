// Tema "Topi Pesta" — topi kerucut di KEPALA (FaceLandmarker), mengikuti
// kemiringan kepala; tiga gaya: Polkadot / Strip / Polos. Cincin konfeti
// statis tetap muncul di titik cubit sebagai feedback gesture.
// Tema STATIS: tidak memakai `time` (bentuk tetap, enak untuk foto).

import { faceAnchor, type FaceAnchor } from '../faceGeometry';
import type { OverlayModule, OverlayRenderContext } from '../types';

const INK = '#1c1917';
const CONE = '#22c55e';
const RIBBON = '#f472b6';
const POMPOM = '#fde68a';
const CONFETTI = ['#fde68a', '#f472b6', '#67e8f9', '#a78bfa', '#6ee7b7'];

/** Posisi polkadot sebagai fraksi lebar/tinggi kerucut. */
const DOTS: ReadonlyArray<readonly [number, number]> = [
	[-0.35, -0.5],
	[0.3, -0.8],
	[-0.05, -1.3],
	[0.32, -1.7],
	[-0.38, -1.9],
];

/** Kerucut + hiasan di ruang LOKAL kepala (origin puncak kepala, -y = atas). */
function drawConeLocal(
	ctx: CanvasRenderingContext2D,
	s: number,
	style: string,
): void {
	ctx.save();
	ctx.beginPath();
	ctx.moveTo(-s * 0.85, s * 0.1);
	ctx.lineTo(0, -s * 2.4);
	ctx.lineTo(s * 0.85, s * 0.1);
	ctx.closePath();
	ctx.fillStyle = CONE;
	ctx.fill();
	ctx.strokeStyle = INK;
	ctx.lineWidth = 2;
	ctx.stroke();

	if (style === 'polkadot') {
		ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
		for (const [dx, dy] of DOTS) {
			ctx.beginPath();
			ctx.arc(dx * s, dy * s, s * 0.1, 0, Math.PI * 2);
			ctx.fill();
		}
	} else if (style === 'strip') {
		// Garis pita vertikal (dari puncak ke dasar), di-clip ke bentuk kerucut.
		ctx.save();
		ctx.clip();
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
		ctx.lineWidth = s * 0.14;
		for (const fx of [-0.55, -0.18, 0.18, 0.55]) {
			ctx.beginPath();
			ctx.moveTo(fx * s, s * 0.2);
			ctx.lineTo(fx * s * 0.18, -s * 2.6);
			ctx.stroke();
		}
		ctx.restore();
	}

	// Pita dasar + pompom puncak (semua gaya).
	ctx.fillStyle = RIBBON;
	ctx.fillRect(-s * 0.92, -s * 0.02, s * 1.84, s * 0.3);
	ctx.beginPath();
	ctx.arc(0, -s * 2.4, s * 0.22, 0, Math.PI * 2);
	ctx.fillStyle = POMPOM;
	ctx.fill();
	ctx.strokeStyle = INK;
	ctx.stroke();
	ctx.restore();
}

function render({ ctx, width, height, face, presetId, pinchPoints }: OverlayRenderContext) {
	if (face) {
		const a = faceAnchor(face.landmarks, width, height);
		if (a) {
			const s = a.width * 0.5;
			ctx.save();
			ctx.translate(a.top.x, a.top.y);
			ctx.rotate(a.roll);
			drawConeLocal(ctx, s, presetId ?? 'polkadot');
			ctx.restore();
		}
	}

	// Cincin konfeti statis mengelilingi titik cubit (feedback gesture).
	for (const p of pinchPoints) {
		for (let i = 0; i < 10; i++) {
			const ang = (i / 10) * Math.PI * 2;
			ctx.save();
			ctx.translate(p.x + Math.cos(ang) * 22, p.y + Math.sin(ang) * 22);
			ctx.rotate(ang);
			ctx.fillStyle = CONFETTI[i % CONFETTI.length];
			ctx.fillRect(-3, -2, 6, 4);
			ctx.restore();
		}
	}
}

export default {
	id: 'hat',
	label: 'Topi Pesta',
	presets: [
		{ id: 'polkadot', label: 'Polkadot' },
		{ id: 'strip', label: 'Strip' },
		{ id: 'polos', label: 'Polos' },
	],
	defaultPresetId: 'polkadot',
	render,
} satisfies OverlayModule;
