'use client';

// Kartu galeri polaroid: thumbnail + caption tanggal-jam. Klik membuka
// pratinjau lightbox. Nama aksesibel tombol diambil dari caption yang
// terlihat (img dekoratif: alt kosong — caption sudah memuat penanda waktu).

import { formatCaptureTimestamp } from './polaroid';
import type { Photo } from './types';

interface GalleryShotProps {
	photo: Photo;
	onOpen: (id: number) => void;
}

export default function GalleryShot({ photo, onOpen }: GalleryShotProps) {
	const isStrip = (photo.frames?.length ?? 1) > 1;
	const timestamp = formatCaptureTimestamp(photo.id);

	return (
		<button
			type="button"
			className="shot"
			data-photo-id={photo.id}
			title="Lihat pratinjau"
			onClick={() => onOpen(photo.id)}
		>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img src={photo.dataUrl} alt="" />
			<span className="shot-caption">
				{isStrip ? 'Strip — ' : ''}
				{timestamp}
			</span>
		</button>
	);
}
