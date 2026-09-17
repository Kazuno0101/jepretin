'use client';

// Lightbox pratinjau FULLSCREEN: foto memenuhi seluruh layar (bukan kartu di
// tengah halaman), caption + aksi Unduh/Hapus jadi overlay di dasar layar.
// Strip 3× ditampilkan bertumpuk dan bisa di-scroll bila lebih panjang.
//
// Perilaku modal: fokus masuk ke dialog saat dibuka, Tab disikluskan di
// dalam dialog (focus trap), Esc menutup, dan latar belakang di-inert-kan
// oleh HandFilter (pemanggil) selama lightbox terbuka.

import { useEffect, useRef } from 'react';
import LightboxBar from './LightboxBar';
import { formatCaptureTimestamp } from './polaroid';
import type { Photo } from './types';

interface PhotoLightboxProps {
	photo: Photo;
	onDownload: (photo: Photo) => void;
	onDelete: (id: number) => void;
	onClose: () => void;
}

export default function PhotoLightbox({
	photo,
	onDownload,
	onDelete,
	onClose,
}: PhotoLightboxProps) {
	const dialogRef = useRef<HTMLDivElement>(null);
	const isVideo = photo.kind === 'video';
	const isStrip = !isVideo && (photo.frames?.length ?? 1) > 1;

	useEffect(() => {
		dialogRef.current?.focus();
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				onClose();
				return;
			}
			if (e.key !== 'Tab') return;
			// Focus trap: Tab/Shift+Tab tetap berputar di dalam dialog.
			const focusables =
				dialogRef.current?.querySelectorAll<HTMLElement>('button') ?? [];
			if (focusables.length === 0) return;
			const first = focusables[0];
			const last = focusables[focusables.length - 1];
			const active = document.activeElement;
			if (e.shiftKey && (active === first || active === dialogRef.current)) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && active === last) {
				e.preventDefault();
				first.focus();
			}
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [onClose]);

	return (
		<div
			ref={dialogRef}
			className="lightbox"
			role="dialog"
			aria-modal="true"
			tabIndex={-1}
			aria-label={`Pratinjau foto ${formatCaptureTimestamp(photo.id)}`}
		>
			{/* Strip: default zoom-out — SELURUH strip pas dalam satu layar
			    (tiap frame dibatasi tinggi (100% - gap)/jumlah frame via var).
			    Video: elemen <video> kontrol penuh, pas dalam satu layar. */}
			<div
				className={`lightbox-media${isStrip ? ' lightbox-media--strip' : ''}${isVideo ? ' lightbox-media--video' : ''}`}
				style={
					isStrip ?
						({
							'--frames': photo.frames!.length,
						} as React.CSSProperties)
					:	undefined
				}
				onClick={(e) => {
					if (e.target === e.currentTarget) onClose();
				}}
			>
				{isVideo ? (
					// eslint-disable-next-line jsx-a11y/media-has-caption
					<video
						src={photo.videoUrl}
						controls
						autoPlay
						muted
						loop
						playsInline
					/>
				) : isStrip ?
					photo.frames!.map((frame, i) => (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							key={i}
							src={frame}
							alt={`Jepretan ${i + 1} dari ${photo.frames!.length}`}
						/>
					))
				:	// eslint-disable-next-line @next/next/no-img-element
					<img src={photo.dataUrl} alt="Pratinjau foto hasil filter tangan" />}
			</div>

			<LightboxBar
				photo={photo}
				onDownload={onDownload}
				onDelete={onDelete}
			/>

			<button
				type="button"
				className="lightbox-close"
				aria-label="Tutup pratinjau"
				onClick={onClose}
			>
				×
			</button>
		</div>
	);
}
