// Tema "Hati" — dekorasi hat di KEPALA (FaceLandmarker), tiga gaya:
// Mahkota (deret hat melengkung), Sisi (sepasang hat di sisi kepala),
// Tunggal (satu hat besar di atas kepala).
// Tema STATIS: tidak memakai `time` (bentuk tetap, enak untuk foto).

import { faceAnchor, type FaceAnchor } from '../faceGeometry';
import type { OverlayModule, OverlayRenderContext } from '../types';

const RED = '#ef4444';
const PINK = '#f472b6';
const DEEP = '#be123c';

/** Bentuk hat dua kurva bezier (menghadap ke bawah) di ruang lokal. */
function drawHeart(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	s: number,
	color: string,
	rot = 0,
): void {
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(rot);
	ctx.beginPath();
	ctx.moveTo(0, s * 0.9);
	ctx.bezierCurveTo(-s * 1.3, -s * 0.2, -s * 0.55, -s, 0, -s * 0.35);
	ctx.bezierCurveTo(s * 0.55, -s, s * 1.3, -s * 0.2, 0, s * 0.9);
	ctx.closePath();
	ctx.fillStyle = color;
	ctx.fill();
	ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
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
		// 5 hat kecil melengkung mengikuti puncak kepala.
		for (let i = -2; i <= 2; i++) {
			const ang = i * 0.34;
			const r = a.width * 0.38;
			drawHeart(
				ctx,
				Math.sin(ang) * r,
				-Math.cos(ang) * r - a.width * 0.02,
				a.width * 0.1,
				i % 2 ? PINK : RED,
				ang,
			);
		}
	} else if (style === 'sisi') {
		drawHeart(ctx, -a.width * 0.36, -a.width * 0.05, a.width * 0.16, PINK, -0.45);
		drawHeart(ctx, a.width * 0.36, -a.width * 0.05, a.width * 0.16, PINK, 0.45);
	} else {
		// tunggal
		drawHeart(ctx, 0, -a.width * 0.5, a.width * 0.22, DEEP);
	}

	ctx.restore();
}

export default {
	id: 'heart',
	label: 'Hati',
	presets: [
		{ id: 'mahkota', label: 'Mahkota' },
		{ id: 'sisi', label: 'Sisi' },
		{ id: 'tunggal', label: 'Tunggal' },
	],
	defaultPresetId: 'mahkota',
	render,
} satisfies OverlayModule;
