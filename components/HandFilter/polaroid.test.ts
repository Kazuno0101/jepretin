import { describe, expect, it } from 'vitest';
import {
	formatCaptureTimestamp,
	polaroidGeometry,
	stripGeometry,
} from './polaroid';

describe('polaroidGeometry', () => {
	it('membuat bingkai lebih besar dari foto di semua sisi', () => {
		const g = polaroidGeometry(640, 480);
		expect(g.frameW).toBeGreaterThan(g.photoW);
		expect(g.frameH).toBeGreaterThan(g.photoH);
	});

	it('foto berada sepenuhnya di dalam bingkai', () => {
		const g = polaroidGeometry(640, 480);
		expect(g.photoX).toBeGreaterThan(0);
		expect(g.photoY).toBeGreaterThan(0);
		expect(g.photoX + g.photoW).toBeLessThan(g.frameW);
		expect(g.photoY + g.photoH).toBeLessThan(g.frameH);
	});

	it('caption berada di area bawah, di bawah foto', () => {
		const g = polaroidGeometry(640, 480);
		expect(g.captionY).toBeGreaterThan(g.photoY + g.photoH);
		expect(g.captionY).toBeLessThan(g.frameH);
	});

	it('geometri berskala linear terhadap ukuran foto', () => {
		const a = polaroidGeometry(320, 240);
		const b = polaroidGeometry(640, 480);
		expect(b.frameW).toBe(a.frameW * 2);
		expect(b.frameH).toBe(a.frameH * 2);
		expect(b.photoX).toBe(a.photoX * 2);
	});
});

describe('stripGeometry', () => {
	it('menumpuk foto vertikal dengan jarak antar foto', () => {
		const g = stripGeometry(640, 480, 3);
		expect(g.photoYs).toHaveLength(3);
		for (let i = 1; i < g.photoYs.length; i++) {
			expect(g.photoYs[i]).toBeGreaterThan(g.photoYs[i - 1] + 480);
		}
	});

	it('foto pertama & terakhir berada di dalam bingkai', () => {
		const g = stripGeometry(640, 480, 3);
		expect(g.photoYs[0]).toBeGreaterThan(0);
		expect(g.photoYs[2] + g.photoH).toBeLessThan(g.frameH);
	});

	it('caption berada di bawah foto terakhir', () => {
		const g = stripGeometry(640, 480, 3);
		const lastBottom = g.photoYs[g.photoYs.length - 1] + g.photoH;
		expect(g.captionY).toBeGreaterThan(lastBottom);
		expect(g.captionY).toBeLessThan(g.frameH);
	});

	it('bingkai memanjang seiring jumlah foto', () => {
		const a = stripGeometry(640, 480, 1);
		const b = stripGeometry(640, 480, 3);
		expect(b.frameH).toBeGreaterThan(a.frameH);
		expect(b.frameW).toBe(a.frameW);
	});
});

describe('formatCaptureTimestamp', () => {
	it('memuat tanggal dan jam dari timestamp', () => {
		const ts = new Date(2026, 8, 15, 14, 5).getTime();
		const label = formatCaptureTimestamp(ts);
		expect(label).toContain('2026');
		expect(label.length).toBeGreaterThan(4);
	});
});
