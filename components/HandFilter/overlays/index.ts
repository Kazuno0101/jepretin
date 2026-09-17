// Registry tema overlay — menambah filter baru cukup mendaftarkan modul di sini,
// tanpa menyentuh komponen inti (design.md §8).

import glow from './glow';
import skeleton from './skeleton';
import sparkle from './sparkle';
import frame from './frame';
import blur from './blur';
import cat from './cat';
import hat from './hat';
import heart from './heart';
import star from './star';
import type { OverlayModule } from '../types';

export const OVERLAYS: OverlayModule[] = [
	glow,
	skeleton,
	sparkle,
	frame,
	blur,
	cat,
	hat,
	heart,
	star,
];

export function getOverlay(id: string): OverlayModule {
	return OVERLAYS.find((o) => o.id === id) ?? glow;
}
