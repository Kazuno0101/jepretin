// Pure function untuk deteksi gesture — tidak bergantung pada DOM/canvas,
// jadi bisa di-unit-test terpisah (lihat gestures.test.ts).

import type { GestureId, HandFrame, Landmark, Point } from './types';

/** Indeks landmark MediaPipe Hand yang dipakai di project ini. */
export const WRIST = 0;
export const THUMB_TIP = 4;
export const INDEX_TIP = 8;
export const FINGER_TIPS = [THUMB_TIP, 8, 12, 16, 20] as const;
export const INDEX_MCP = 5;
export const MIDDLE_MCP = 9;

/** Ambang jarak pinch default (koordinat ternormalisasi). */
export const DEFAULT_PINCH_THRESHOLD = 0.05;

/** Jarak Euclidean antara dua landmark ternormalisasi. */
export function distance(a: Landmark, b: Landmark): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	return Math.sqrt(dx * dx + dy * dy);
}

/**
 * true jika ujung jempol (4) dan ujung telunjuk (8) berdekatan
 * — gesture "pinch". Aman untuk array landmark tidak lengkap.
 */
export function isPinching(
	landmarks: Landmark[],
	threshold: number = DEFAULT_PINCH_THRESHOLD,
): boolean {
	if (landmarks.length <= THUMB_TIP || landmarks.length <= INDEX_TIP) return false;
	return distance(landmarks[THUMB_TIP], landmarks[INDEX_TIP]) < threshold;
}

/** Titik tengah antara ujung jempol & telunjuk (ternormalisasi), atau null jika data kurang. */
export function pinchMidpoint(landmarks: Landmark[]): Point | null {
	if (landmarks.length <= THUMB_TIP || landmarks.length <= INDEX_TIP) return null;
	const thumb = landmarks[THUMB_TIP];
	const index = landmarks[INDEX_TIP];
	return { x: (thumb.x + index.x) / 2, y: (thumb.y + index.y) / 2 };
}

/** Konversi koordinat ternormalisasi (0–1) ke piksel canvas. */
export function toPixels(p: Point, width: number, height: number): Point {
	return { x: p.x * width, y: p.y * height };
}

/* ---------- Gesture "kepalan tangan" (fist) — port dari index.html ---------- */

/** Pasangan [ujungJari, sendiTengah] untuk 4 jari (tanpa jempol). */
const CURL_FINGER_PAIRS: ReadonlyArray<readonly [number, number]> = [
	[8, 6], // telunjuk
	[12, 10], // tengah
	[16, 14], // manis
	[20, 18], // kelingking
];

/**
 * Jari dianggap "terlipat" kalau ujungnya lebih dekat ke pergelangan
 * dibanding sendi tengahnya (kebalikan jari terentang).
 */
export function isFingerCurled(
	landmarks: Landmark[],
	tipIdx: number,
	pipIdx: number,
): boolean {
	const wrist = landmarks[WRIST];
	const tip = landmarks[tipIdx];
	const pip = landmarks[pipIdx];
	if (!wrist || !tip || !pip) return false;
	return distance(tip, wrist) < distance(pip, wrist) * 0.9;
}

/** Lama kepalan harus ditahan sebelum countdown dimulai (anti-pemicu palsu). */
export const FIST_HOLD_MS = 600;

/**
 * true jika minimal 3 dari 4 jari terlipat DAN telunjuk ikut terlipat.
 * Syarat telunjuk penting: pose "bingkai" membuka jempol+telunjuk sambil
 * melipat tiga jari lain — tanpa syarat ini, membentuk bingkai sendiri
 * terdeteksi sebagai kepalan dan memicu foto (bug "memotret sendiri").
 */
export function isFist(landmarks: Landmark[]): boolean {
	const isCurled = (pair: readonly [number, number]) =>
		landmarks.length > pair[0] &&
		landmarks.length > pair[1] &&
		isFingerCurled(landmarks, pair[0], pair[1]);
	const curledCount = CURL_FINGER_PAIRS.filter(isCurled).length;
	return curledCount >= 3 && isCurled(CURL_FINGER_PAIRS[0]);
}

/* ---------- Geometri bingkai dua tangan ---------- */

/** Urutkan titik searah jarum jam terhadap centroid-nya (pure). */
export function sortPointsClockwise(points: Point[]): Point[] {
	const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
	const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
	return [...points].sort(
		(a, b) =>
			Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx),
	);
}

/**
 * 4 titik sudut bingkai dari dua tangan (ujung jempol & telunjuk masing-masing),
 * ternormalisasi. null kalau tidak tepat dua tangan atau landmark kurang lengkap.
 */
export function frameCorners(hands: HandFrame[]): Point[] | null {
	if (hands.length !== 2) return null;
	const corners: Point[] = [];
	for (const hand of hands) {
		const thumb = hand.landmarks[THUMB_TIP];
		const index = hand.landmarks[INDEX_TIP];
		if (!thumb || !index) return null;
		corners.push({ x: thumb.x, y: thumb.y });
		corners.push({ x: index.x, y: index.y });
	}
	return sortPointsClockwise(corners);
}
