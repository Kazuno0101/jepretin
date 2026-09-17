// Tema "Rangka" — gambar tulang tangan (koneksi 21 landmark) + persendian,
// plus opsi mesh wajah sederhana (oval + mata + mulut) dari FaceLandmarker.
// Warna garis mengikuti handedness agar dua tangan mudah dibedakan.

import { faceAnchor } from '../faceGeometry';
import type { HandFrame, OverlayModule, OverlayRenderContext } from '../types';

/** Topologi koneksi MediaPipe Hand: pasangan indeks [start, end] per tulang. */
export const HAND_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
	[0, 1], [1, 2], [2, 3], [3, 4], // jempol
	[0, 5], [5, 6], [6, 7], [7, 8], // telunjuk
	[5, 9], [9, 10], [10, 11], [11, 12], // tengah
	[9, 13], [13, 14], [14, 15], [15, 16], // manis
	[13, 17], [17, 18], [18, 19], [19, 20], // kelingking
	[0, 17], // telapak
];

/** Loop oval wajah (subset landmark FaceLandmarker) — digambar sebagai polyline tertutup. */
const FACE_OVAL: ReadonlyArray<number> = [
	10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379,
	378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
	162, 21, 54, 103, 67, 109,
];

const COLORS: Record<string, string> = {
	Right: '#22d3ee',
	Left: '#f472b6',
	Unknown: '#a78bfa',
};

function strokeConnections(
	ctx: CanvasRenderingContext2D,
	hand: HandFrame,
	width: number,
	height: number,
): void {
	ctx.beginPath();
	for (const [a, b] of HAND_CONNECTIONS) {
		const pa = hand.landmarks[a];
		const pb = hand.landmarks[b];
		if (!pa || !pb) continue;
		ctx.moveTo(pa.x * width, pa.y * height);
		ctx.lineTo(pb.x * width, pb.y * height);
	}
	ctx.stroke();
}

/** Mesh wajah sederhana: oval kontur + mata + mulut. */
function drawFaceMesh(
	ctx: CanvasRenderingContext2D,
	landmarks: { x: number; y: number }[],
	width: number,
	height: number,
): void {
	if (landmarks.length < 468) return;
	const px = (i: number) => ({ x: landmarks[i].x * width, y: landmarks[i].y * height });

	ctx.strokeStyle = '#a78bfa';
	ctx.lineWidth = 2;
	ctx.lineCap = 'round';

	// Oval wajah (tertutup)
	ctx.beginPath();
	FACE_OVAL.forEach((idx, i) => {
		const p = px(idx);
		if (i === 0) ctx.moveTo(p.x, p.y);
		else ctx.lineTo(p.x, p.y);
	});
	ctx.closePath();
	ctx.stroke();

	// Mata: garis kelopak + titik pupil
	for (const [outer, inner, top, bottom] of [
		[33, 133, 159, 145],
		[263, 362, 386, 374],
	] as const) {
		const o = px(outer);
		const i2 = px(inner);
		ctx.beginPath();
		ctx.moveTo(o.x, o.y);
		ctx.lineTo(i2.x, i2.y);
		ctx.stroke();
		const t = px(top);
		const b = px(bottom);
		ctx.beginPath();
		ctx.arc((t.x + b.x) / 2, (t.y + b.y) / 2, 2.5, 0, Math.PI * 2);
		ctx.fillStyle = '#a78bfa';
		ctx.fill();
	}

	// Mulut: garis sudut ke sudut + titik tengah
	const ml = px(61);
	const mr = px(291);
	ctx.beginPath();
	ctx.moveTo(ml.x, ml.y);
	ctx.lineTo(mr.x, mr.y);
	ctx.stroke();
	ctx.beginPath();
	ctx.arc((ml.x + mr.x) / 2, (ml.y + mr.y) / 2, 2.5, 0, Math.PI * 2);
	ctx.fillStyle = '#a78bfa';
	ctx.fill();
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
	const pulse = 0.6 + 0.4 * Math.sin(time / 260);
	ctx.lineCap = 'round';

	for (const hand of hands) {
		const color = COLORS[hand.handedness] ?? COLORS.Unknown;

		// pass 1: garis lebar samar (glow murah tanpa shadowBlur)
		ctx.globalAlpha = 0.18;
		ctx.strokeStyle = color;
		ctx.lineWidth = 7;
		strokeConnections(ctx, hand, width, height);

		// pass 2: garis utama tipis
		ctx.globalAlpha = 0.95;
		ctx.lineWidth = 2;
		strokeConnections(ctx, hand, width, height);
		ctx.globalAlpha = 1;

		// persendian
		for (const lm of hand.landmarks) {
			ctx.beginPath();
			ctx.arc(lm.x * width, lm.y * height, 2.5, 0, Math.PI * 2);
			ctx.fillStyle = color;
			ctx.fill();
		}
	}

	// Mesh wajah (opsi "wajah") — digambar saat wajah terdeteksi.
	if (face && (presetId ?? 'wajah') === 'wajah') {
		drawFaceMesh(ctx, face.landmarks, width, height);
	}

	for (const p of pinchPoints) {
		ctx.beginPath();
		ctx.arc(p.x, p.y, 20 + pulse * 6, 0, Math.PI * 2);
		ctx.strokeStyle = 'rgba(244, 114, 182, 0.9)';
		ctx.lineWidth = 2;
		ctx.stroke();
	}
}

export default {
	id: 'skeleton',
	label: 'Rangka',
	presets: [
		{ id: 'wajah', label: 'Wajah' },
		{ id: 'tanpa', label: 'Tanpa wajah' },
	],
	defaultPresetId: 'wajah',
	render,
} satisfies OverlayModule;
