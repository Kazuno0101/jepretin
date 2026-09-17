import { describe, expect, it } from 'vitest';
import {
	distance,
	isFist,
	frameCorners,
	isPinching,
	pinchMidpoint,
	sortPointsClockwise,
	toPixels,
} from './gestures';
import type { HandFrame, Landmark } from './types';

const lm = (x: number, y: number): Landmark => ({ x, y });

/** Dummy 21 landmark; ujung jempol (4) & telunjuk (8) bisa diatur. */
function handWith(thumbTip: Landmark, indexTip: Landmark): Landmark[] {
	const marks: Landmark[] = Array.from({ length: 21 }, () => lm(0.5, 0.5));
	marks[4] = thumbTip;
	marks[8] = indexTip;
	return marks;
}

describe('distance', () => {
	it('menghitung jarak Euclidean ternormalisasi', () => {
		expect(distance(lm(0, 0), lm(0.3, 0.4))).toBeCloseTo(0.5);
	});

	it('nol untuk titik yang sama', () => {
		expect(distance(lm(0.2, 0.2), lm(0.2, 0.2))).toBe(0);
	});
});

describe('isPinching', () => {
	it('true saat jempol & telunjuk berdekatan', () => {
		expect(isPinching(handWith(lm(0.4, 0.4), lm(0.43, 0.42)))).toBe(true);
	});

	it('false saat jari terbuka lebar', () => {
		expect(isPinching(handWith(lm(0.3, 0.4), lm(0.6, 0.4)))).toBe(false);
	});

	it('menghormati threshold kustom', () => {
		const hand = handWith(lm(0.4, 0.4), lm(0.45, 0.45)); // jarak ~0.0707
		expect(isPinching(hand, 0.08)).toBe(true);
		expect(isPinching(hand, 0.05)).toBe(false);
	});

	it('aman untuk data landmark tidak lengkap', () => {
		expect(isPinching([lm(0, 0), lm(1, 1)])).toBe(false);
		expect(isPinching([])).toBe(false);
	});
});

describe('pinchMidpoint', () => {
	it('mengembalikan titik tengah jempol–telunjuk', () => {
		const mid = pinchMidpoint(handWith(lm(0.2, 0.4), lm(0.4, 0.4)));
		expect(mid).not.toBeNull();
		expect(mid?.x).toBeCloseTo(0.3);
		expect(mid?.y).toBeCloseTo(0.4);
	});

	it('null jika landmark tidak lengkap', () => {
		expect(pinchMidpoint([lm(0, 0)])).toBeNull();
	});
});

describe('toPixels', () => {
	it('mengonversi koordinat ternormalisasi ke piksel', () => {
		expect(toPixels({ x: 0.5, y: 0.25 }, 640, 480)).toEqual({ x: 320, y: 120 });
	});
});

describe('isFist', () => {
	/** Telapak di (0.5, 0.7); jari terentang menjauh ke atas, terlipat dekat telapak. */
	function handWithFingers(curled: boolean): Landmark[] {
		const marks: Landmark[] = Array.from({ length: 21 }, () => lm(0.5, 0.7));
		const pairs = [
			[8, 6],
			[12, 10],
			[16, 14],
			[20, 18],
		];
		for (const [tip, pip] of pairs) {
			// terentang: ujung jari jauh dari pergelangan (ke atas)
			marks[tip] = curled ? lm(0.5, 0.66) : lm(0.5, 0.3);
			// sendi tengah selalu di antara
			marks[pip] = lm(0.5, 0.5);
		}
		return marks;
	}

	it('true saat minimal 3 jari terlipat (kepalan)', () => {
		expect(isFist(handWithFingers(true))).toBe(true);
	});

	it('false saat jari terentang', () => {
		expect(isFist(handWithFingers(false))).toBe(false);
	});

	it('false untuk data landmark kosong', () => {
		expect(isFist([])).toBe(false);
	});

	it('false saat pose bingkai: telunjuk terbuka, tiga jari lain terlipat', () => {
		// Regresi bug "memotret sendiri": membentuk bingkai (jempol+telunjuk
		// terbuka) tidak boleh dianggap kepalan.
		const hand = handWithFingers(true);
		hand[8] = lm(0.5, 0.3); // telunjuk terentang ke atas
		expect(isFist(hand)).toBe(false);
	});

	it('true saat telunjuk terlipat walau satu jari lain terbuka', () => {
		const hand = handWithFingers(true);
		hand[20] = lm(0.5, 0.3); // kelingking terbuka → 3 terlipat (termasuk telunjuk)
		expect(isFist(hand)).toBe(true);
	});
});

describe('sortPointsClockwise', () => {
	it('mengurutkan titik acak searah jarum jam terhadap centroid', () => {
		const shuffled = [
			{ x: 1, y: 0 },
			{ x: 1, y: 1 },
			{ x: 0, y: 0 },
			{ x: 0, y: 1 },
		];
		const sorted = sortPointsClockwise(shuffled);
		const angles = sorted.map((p) => Math.atan2(p.y - 0.5, p.x - 0.5));
		for (let i = 1; i < angles.length; i++) {
			expect(angles[i]).toBeGreaterThanOrEqual(angles[i - 1]);
		}
	});
});

describe('frameCorners', () => {
	it('mengembalikan 4 titik jempol+telunjuk saat tepat dua tangan', () => {
		const handA: HandFrame = {
			handedness: 'Left',
			landmarks: handWith(lm(0.1, 0.1), lm(0.2, 0.2)),
		};
		const handB: HandFrame = {
			handedness: 'Right',
			landmarks: handWith(lm(0.8, 0.1), lm(0.9, 0.9)),
		};
		const corners = frameCorners([handA, handB]);
		expect(corners).not.toBeNull();
		expect(corners).toHaveLength(4);
	});

	it('null kalau tangan tidak tepat dua', () => {
		const one: HandFrame = {
			handedness: 'Left',
			landmarks: handWith(lm(0.1, 0.1), lm(0.2, 0.2)),
		};
		expect(frameCorners([one])).toBeNull();
		expect(frameCorners([])).toBeNull();
	});
});
