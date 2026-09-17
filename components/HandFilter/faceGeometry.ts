// Pure function geometri wajah — tidak bergantung pada DOM/canvas, jadi bisa
// di-unit-test terpisah (pola yang sama dengan gestures.ts). Dipakai modul
// overlay untuk menempatkan dekorasi kepala (telinga/topi/hati/bintang).

import type { Landmark, Point } from './types';

/** Indeks landmark MediaPipe FaceLandmarker (478 titik) yang dipakai di sini. */
export const FACE_FOREHEAD = 10; // puncak dahi (tepi atas oval wajah)
export const FACE_CHIN = 152; // dagu (tepi bawah)
export const FACE_LEFT_EDGE = 234; // tepi pipi sisi satu
export const FACE_RIGHT_EDGE = 454; // tepi pipi sisi lain
export const FACE_NOSE_TIP = 1; // ujung hidung
export const FACE_MOUTH_LEFT = 61; // sudut bibir
export const FACE_MOUTH_RIGHT = 291; // sudut bibir lainnya

/** Jika landmark wajah tidak lengkap, dekorasi kepala dilewati (null). */
export interface FaceAnchor {
	/** Titik puncak kepala (piksel) — dasar penempatan topi/telinga/mahkota. */
	top: Point;
	/** Dagu & ujung hidung (piksel) — untuk elemen wajah (kumis, dll). */
	chin: Point;
	nose: Point;
	/** Tepi kiri/kanan wajah (piksel) — lebar & arah kepala. */
	left: Point;
	right: Point;
	/** Lebar wajah (piksel) — skala dekorasi. */
	width: number;
	/**
	 * Rotasi kepala (radian) siap dipakai: setelah ctx.translate(top),
	 * ctx.rotate(roll) membuat sumbu -y lokal mengarah ke puncak kepala.
	 * 0 = kepala tegak; positif = kepala miring searah jarum jam.
	 */
	roll: number;
	/** Sudut bibir (piksel) — untuk kumis & elemen sekitar mulut. */
	mouthLeft: Point;
	mouthRight: Point;
}

/**
 * Hitung jangkar kepala dari landmark wajah ternormalisasi (0–1) pada canvas
 * berukuran width×height. Mengembalikan null jika landmark tidak lengkap.
 */
export function faceAnchor(
	landmarks: Landmark[],
	width: number,
	height: number,
): FaceAnchor | null {
	if (
		landmarks.length <= FACE_RIGHT_EDGE ||
		!landmarks[FACE_FOREHEAD] ||
		!landmarks[FACE_CHIN]
	) {
		return null;
	}
	const px = (lm: Landmark): Point => ({ x: lm.x * width, y: lm.y * height });

	const top = px(landmarks[FACE_FOREHEAD]);
	const chin = px(landmarks[FACE_CHIN]);
	const nose = px(landmarks[FACE_NOSE_TIP] ?? landmarks[FACE_FOREHEAD]);
	const left = px(landmarks[FACE_LEFT_EDGE]);
	const right = px(landmarks[FACE_RIGHT_EDGE]);
	const mouthLeft = px(landmarks[FACE_MOUTH_LEFT] ?? landmarks[FACE_CHIN]);
	const mouthRight = px(landmarks[FACE_MOUTH_RIGHT] ?? landmarks[FACE_CHIN]);

	const faceWidth = Math.hypot(right.x - left.x, right.y - left.y) || 1;
	// Sudut garis pipi kiri→kanan; dipakai langsung sebagai ctx.rotate()
	// setelah translate(top) — sumbu -y lokal jatuh ke arah puncak kepala.
	const roll = Math.atan2(right.y - left.y, right.x - left.x);

	return { top, chin, nose, left, right, width: faceWidth, roll, mouthLeft, mouthRight };
}
