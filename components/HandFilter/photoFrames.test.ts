import { describe, expect, it } from 'vitest';
import { perforationCenters, PHOTO_FRAMES, polaroidInsets } from './photoFrames';

describe('polaroidInsets', () => {
	it('proporsional terhadap sisi terpendek, strip bawah lebih tebal', () => {
		const g = polaroidInsets(640, 480);
		expect(g.side).toBeCloseTo(24, 5);
		expect(g.top).toBeCloseTo(24, 5);
		expect(g.bottom).toBeCloseTo(24 * 2.8, 5);
		expect(g.bottom).toBeGreaterThan(g.side);
	});
});

describe('perforationCenters', () => {
	it('menghasilkan ≥3 lubang yang naik teratur dan di dalam lebar', () => {
		const xs = perforationCenters(640, 43.2); // strip = 9% dari 480
		expect(xs.length).toBeGreaterThanOrEqual(3);
		for (let i = 1; i < xs.length; i++) {
			expect(xs[i]).toBeGreaterThan(xs[i - 1]);
		}
		expect(xs[0]).toBeGreaterThan(0);
		expect(xs[xs.length - 1]).toBeLessThan(640);
	});

	it('jarak antar lubang konsisten', () => {
		const xs = perforationCenters(640, 43.2);
		const gaps = xs.slice(1).map((x, i) => x - xs[i]);
		for (const gap of gaps) {
			expect(gap).toBeCloseTo(gaps[0], 5);
		}
	});
});

describe('PHOTO_FRAMES', () => {
	it('preset pertama adalah tanpa bingkai (default aman)', () => {
		expect(PHOTO_FRAMES[0].id).toBe('none');
		expect(PHOTO_FRAMES.length).toBeGreaterThanOrEqual(3);
	});
});
