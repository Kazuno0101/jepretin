'use client';

// Bar aksi lightbox: caption + tombol Unduh / Hapus. "Hapus" dua langkah:
// klik pertama mengubah tombol jadi konfirmasi terisi merah (klik kedua
// barulah menghapus) supaya foto tidak terhapus tanpa sengaja.

import { useEffect, useRef, useState } from 'react';
import { formatCaptureTimestamp } from './polaroid';
import type { Photo } from './types';

export interface LightboxBarProps {
	photo: Photo;
	onDownload: (photo: Photo) => void;
	onDelete: (id: number) => void;
}

/** Lama tombol konfirmasi hapus ditampilkan sebelum kembali normal (ms). */
const CONFIRM_RESET_MS = 3000;

export default function LightboxBar({ photo, onDownload, onDelete }: LightboxBarProps) {
	const [confirming, setConfirming] = useState(false);
	const timerRef = useRef<number | null>(null);
	const isStrip = (photo.frames?.length ?? 1) > 1;

	// Ganti foto → reset konfirmasi.
	useEffect(() => {
		setConfirming(false);
	}, [photo.id]);

	// Bersihkan timer saat bar dilepas.
	useEffect(
		() => () => {
			if (timerRef.current !== null) window.clearTimeout(timerRef.current);
		},
		[],
	);

	const handleDelete = () => {
		if (!confirming) {
			setConfirming(true);
			timerRef.current = window.setTimeout(() => setConfirming(false), CONFIRM_RESET_MS);
			return;
		}
		if (timerRef.current !== null) window.clearTimeout(timerRef.current);
		onDelete(photo.id);
	};

	return (
		<div className="lightbox-bar">
			<span className="lightbox-caption">
				{isStrip ? 'Strip — ' : ''}
				{formatCaptureTimestamp(photo.id)}
			</span>
			<div className="lightbox-actions">
				<button
					type="button"
					className="btn"
					onClick={() => onDownload(photo)}
				>
					{isStrip ? 'Unduh strip' : 'Unduh polaroid'}
				</button>
				<button
					type="button"
					className={`btn btn--stop${confirming ? ' btn--confirm' : ''}`}
					onClick={handleDelete}
				>
					{confirming ? 'Hapus foto?' : 'Hapus'}
				</button>
			</div>
		</div>
	);
}
