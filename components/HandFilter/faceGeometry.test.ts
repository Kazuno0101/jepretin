import { describe, expect, it } from 'vitest';
import { faceAnchor } from './faceGeometry';
import type { Landmark } from './types';

const lm = (x: number, y: number): Landmark => ({ x, y });

/** Wajah dummy 478 landmark; titik penting bisa diatur. */
function faceWith(overrides: Record<number, Landmark>): Landmark[] {
	const marks: Landmark[] = Array.from({ length: 478 }, () => lm(0.5, 0.3));
	marks[10] = lm(0.5, 0.1); // dahi
	marks[152] = lm(0.5, 0.55); // dagu
	marks[234] = lm(0.36, 0.3); // pipi kiri
	marks[454] = lm(0.64, 0.3); // pipi kanan
	marks[1] = lm(0.5, 0.3); // hidung
	marks[61] = lm(0.44, 0.42); // bibir kiri
	marks[291] = lm(0.56, 0.42); // bibir kanan
	for (const [i, m] of Object.entries(overrides)) marks[Number(i)] = m;
	return marks;
}

describe('faceAnchor', () => {
	it('null jika landmark tidak lengkap', () => {
		expect(faceAnchor([lm(0.5, 0.5)], 640, 480)).toBeNull();
	});

	it('menghitung lebar wajah dari tepi pipi (piksel)', () => {
		const a = faceAnchor(faceWith({}), 640, 480);
		expect(a).not.toBeNull();
		// |0.64-0.36| * 640 = 179.2 (y sama → murni horizontal)
		expect(a!.width).toBeCloseTo(179.2, 1);
	});

	it('kepala tegak → roll 0 (rotate(roll) menempatkan -y ke puncak kepala)', () => {
		const a = faceAnchor(faceWith({}), 640, 480);
		expect(a!.roll).toBeCloseTo(0, 5);
	});

	it('kepala miring searah jarum jam → roll positif', () => {
		const a = faceAnchor(
			faceWith({ 234: lm(0.36, 0.26), 454: lm(0.64, 0.34) }),
			640,
			480,
		);
		// vektor kiri→kanan: dx=179.2, dy=38.4 → atan2 positif
		expect(a!.roll).toBeCloseTo(Math.atan2(38.4, 179.2), 5);
		expect(a!.roll).toBeGreaterThan(0);
	});

	it('puncak kepala memakai landmark dahi (10) dalam piksel', () => {
		const a = faceAnchor(faceWith({ 10: lm(0.25, 0.05) }), 640, 480);
		expect(a!.top).toEqual({ x: 160, y: 24 });
	});
});
