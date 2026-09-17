// Tema "Kucing" — dekorasi di KEPALA (FaceLandmarker): sepasang telinga di
// atas kepala (gaya runcing/bulat) + hidung pink & kumis di wajah.
// Tema STATIS: tidak memakai `time` (bentuk tetap, enak untuk foto).

import { faceAnchor, type FaceAnchor } from '../faceGeometry';
import type { OverlayModule, OverlayRenderContext } from '../types';

const FUR = '#f6f1e7';
const INNER = '#f9a8d4';
const INK = '#1c1917';

/** Satu telinga di ruang LOKAL kepala (origin = puncak kepala, -y = atas). */
function drawEarLocal(
	ctx: CanvasRenderingContext2D,
	x: number,
	s: number,
	round: boolean,
): void {
	ctx.save();
	ctx.translate(x, 0);
	ctx.beginPath();
	if (round) {
		ctx.moveTo(-s * 0.55, s * 0.15);
		ctx.quadraticCurveTo(-s * 0.35, -s * 1.15, 0, -s * 1.35);
		ctx.quadraticCurveTo(s * 0.35, -s * 1.15, s * 0.55, s * 0.15);
	} else {
		ctx.moveTo(-s * 0.5, s * 0.1);
		ctx.lineTo(0, -s * 1.5);
		ctx.lineTo(s * 0.5, s * 0.1);
	}
	ctx.closePath();
	ctx.fillStyle = FUR;
	ctx.fill();
	ctx.strokeStyle = INK;
	ctx.lineWidth = 2;
	ctx.stroke();

	// Bagian dalam telinga (pink).
	ctx.beginPath();
	if (round) {
		ctx.moveTo(-s * 0.28, s * 0.05);
		ctx.quadraticCurveTo(-s * 0.18, -s * 0.7, 0, -s * 0.9);
		ctx.quadraticCurveTo(s * 0.18, -s * 0.7, s * 0.28, s * 0.05);
	} else {
		const k = 0.5;
		ctx.moveTo(-s * 0.5 * k, s * 0.05);
		ctx.lineTo(0, -s * 1.5 * k);
		ctx.lineTo(s * 0.5 * k, s * 0.05);
	}
	ctx.closePath();
	ctx.fillStyle = INNER;
	ctx.fill();
	ctx.restore();
}

/** Hidung + kumis di wajah (ruang canvas biasa, berbasis jangkar wajah). */
function drawFaceCat(ctx: CanvasRenderingContext2D, a: FaceAnchor): void {
	const s = a.width * 0.07;

	// Hidung segitiga pink di ujung hidung.
	ctx.beginPath();
	ctx.moveTo(a.nose.x - s, a.nose.y);
	ctx.lineTo(a.nose.x + s, a.nose.y);
	ctx.lineTo(a.nose.x, a.nose.y + s * 1.1);
	ctx.closePath();
	ctx.fillStyle = INNER;
	ctx.fill();
	ctx.strokeStyle = INK;
	ctx.lineWidth = 2;
	ctx.stroke();

	// Kumis: 3 garis dari dekat tiap sudut bibir, menjauhi pusat wajah.
	ctx.lineWidth = Math.max(1.5, a.width * 0.012);
	ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
	for (const corner of [a.mouthLeft, a.mouthRight]) {
		const dx = corner.x - a.nose.x;
		const dy = corner.y - a.nose.y;
		const len = Math.hypot(dx, dy) || 1;
		const ux = dx / len;
		const uy = dy / len;
		const start = a.width * 0.12;
		for (const spread of [-0.22, 0, 0.22]) {
			ctx.beginPath();
			ctx.moveTo(corner.x + ux * start, corner.y + uy * start);
			ctx.lineTo(
				corner.x + (ux - uy * spread) * a.width * 0.34,
				corner.y + (uy + ux * spread) * a.width * 0.34,
			);
			ctx.stroke();
		}
	}
}

function render({ ctx, width, height, face, presetId }: OverlayRenderContext) {
	if (!face) return;
	const a = faceAnchor(face.landmarks, width, height);
	if (!a) return;
	const round = (presetId ?? 'runcing') === 'bulat';

	// Telinga sepasang di atas kepala, mengikuti kemiringan kepala.
	const s = a.width * 0.3;
	ctx.save();
	ctx.translate(a.top.x, a.top.y);
	ctx.rotate(a.roll);
	drawEarLocal(ctx, -a.width * 0.3, s, round);
	drawEarLocal(ctx, a.width * 0.3, s, round);
	ctx.restore();

	drawFaceCat(ctx, a);
}

export default {
	id: 'cat',
	label: 'Kucing',
	presets: [
		{ id: 'runcing', label: 'Runcing' },
		{ id: 'bulat', label: 'Bulat' },
	],
	defaultPresetId: 'runcing',
	render,
} satisfies OverlayModule;
