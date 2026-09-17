'use client';

// Kartu galeri polaroid: thumbnail + caption tanggal-jam. Klik membuka
// pratinjau lightbox. Nama aksesibel tombol diambil dari caption yang
// terlihat (img/video dekoratif: alt kosong — caption sudah memuat penanda).

import { formatCaptureTimestamp } from './polaroid';
import type { Photo } from './types';

interface GalleryShotProps {
	photo: Photo;
	onOpen: (id: number) => void;
}

/** Caption kartu: penanda waktu (+ durasi video / strip). */
function caption(photo: Photo): string {
	const timestamp = formatCaptureTimestamp(photo.id);
	if (photo.kind === 'video') {
		const total = Math.max(0, Math.round(photo.durationMs / 1000));
		const dur = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
		return `Video ${dur} — ${timestamp}`;
	}
	if ((photo.frames?.length ?? 1) > 1) return `Strip — ${timestamp}`;
	return timestamp;
}

export default function GalleryShot({ photo, onOpen }: GalleryShotProps) {
	return (
		<button
			type="button"
			className={`shot${photo.kind === 'video' ? ' shot--video' : ''}`}
			data-photo-id={photo.id}
			title="Lihat pratinjau"
			onClick={() => onOpen(photo.id)}
		>
			{photo.kind === 'video' ? (
				// eslint-disable-next-line jsx-a11y/media-has-caption
				<video src={photo.videoUrl} muted playsInline preload="metadata" aria-hidden="true" />
			) : (
				// eslint-disable-next-line @next/next/no-img-element
				<img src={photo.dataUrl} alt="" />
			)}
			<span className="shot-caption">{caption(photo)}</span>
		</button>
	);
}
