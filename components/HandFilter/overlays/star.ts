// Tema "Bintang" — bintang emas di KEPALA (FaceLandmarker), tiga gaya:
// Mahkota (deret bintang melengkung), Tunggal (satu bintang besar),
// Taburan (bintang tersekar di sekitar kepala).
// Tema STATIS: tidak memakai `time` (bentuk tetap, enak untuk foto).

import { faceAnchor, type FaceAnchor } from '../faceGeometry';
import type { OverlayModule, OverlayRenderContext } from '../types';

const GOLD = '#fbbf24';
const GOLD_DEEP = '#d97706';

/** Bintang lima sudut menghadap ke atas di ruang lokal. */
function drawStar(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	r: number,
	rot = 0,
): void {
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(rot);
	ctx.beginPath();
	for (let i = 0; i < 10; i++) {
		const radius = i % 2 === 0 ? r : r * 0.45;
		const ang = -Math.PI / 2 + (i * Math.PI) / 5;
		const px = Math.cos(ang) * radius;
		const py = Math.sin(ang) * radius;
		if (i === 0) ctx.moveTo(px, py);
		else ctx.lineTo(px, py);
	}
	ctx.closePath();
	ctx.fillStyle = GOLD;
	ctx.fill();
	ctx.strokeStyle = GOLD_DEEP;
	ctx.lineWidth = 2;
	ctx.stroke();
	ctx.restore();
}

function render({ ctx, width, height, face, presetId }: OverlayRenderContext) {
	if (!face) return;
	const a = faceAnchor(face.landmarks, width, height);
	if (!a) return;
	const style = presetId ?? 'mahkota';

	ctx.save();
	ctx.translate(a.top.x, a.top.y);
	ctx.rotate(a.roll);

	if (style === 'mahkota') {
		for (let i = -2; i <= 2; i++) {
			const ang = i * 0.34;
			const r = a.width * 0.38;
			drawStar(ctx, Math.sin(ang) * r, -Math.cos(ang) * r, a.width * 0.09);
		}
	} else if (style === 'tunggal') {
		drawStar(ctx, 0, -a.width * 0.55, a.width * 0.22);
	} else {
		// taburan — posisi tetap (deterministik) melingkari kepala
		for (let i = 0; i < 8; i++) {
			const ang = (i / 8) * Math.PI * 2 + 0.4;
			const r = a.width * (0.5 + (i % 3) * 0.16);
			drawStar(
				ctx,
				Math.sin(ang) * r,
				-Math.cos(ang) * r * 0.8,
				a.width * (0.05 + (i % 2) * 0.03),
				ang * 0.5,
			);
		}
	}

	ctx.restore();
}

export default {
	id: 'star',
	label: 'Bintang',
	presets: [
		{ id: 'mahkota', label: 'Mahkota' },
		{ id: 'tunggal', label: 'Tunggal' },
		{ id: 'taburan', label: 'Taburan' },
	],
	defaultPresetId: 'mahkota',
	render,
} satisfies OverlayModule;
