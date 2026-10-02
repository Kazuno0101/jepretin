import { describe, expect, it } from 'vitest';
import { OVERLAYS } from './index';

// List tema tiap mode hasil harus berbeda (permintaan user): mode Foto
// memuat semua tema kecuali Blur; mode Video hanya Blur. Registry adalah
// sumber kebenaran untuk chips "Tema" di BoothControls (filter per mode).

describe('registry tema per mode hasil', () => {
	it('tema Blur hanya tersedia di mode video', () => {
		const blur = OVERLAYS.find((o) => o.id === 'blur');
		expect(blur?.modes).toEqual(['video']);
	});

	it('mode video hanya menawarkan tema Blur', () => {
		const video = OVERLAYS.filter((o) => o.modes?.includes('video') ?? true);
		expect(video.map((o) => o.id)).toEqual(['blur']);
	});

	it('mode foto memuat semua tema kecuali Blur', () => {
		const photo = OVERLAYS.filter((o) => o.modes?.includes('photo') ?? true);
		expect(photo.map((o) => o.id)).toEqual(
			OVERLAYS.filter((o) => o.id !== 'blur').map((o) => o.id),
		);
		expect(photo.some((o) => o.id === 'blur')).toBe(false);
	});
});
