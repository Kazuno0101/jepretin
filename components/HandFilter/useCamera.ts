'use client';

// Hook kamera: request izin via getUserMedia, expose status + stop().
// Semua track dihentikan saat stop()/unmount (AGENTS.md aturan #3).

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

export type CameraStatus =
	| 'idle'
	| 'requesting'
	| 'active'
	| 'denied'
	| 'not-found'
	| 'error';

export function useCamera(videoRef: RefObject<HTMLVideoElement | null>) {
	const streamRef = useRef<MediaStream | null>(null);
	const [status, setStatus] = useState<CameraStatus>('idle');
	const [error, setError] = useState<string | null>(null);

	const releaseStream = useCallback(() => {
		streamRef.current?.getTracks().forEach((track) => track.stop());
		streamRef.current = null;
		if (videoRef.current) videoRef.current.srcObject = null;
	}, [videoRef]);

	const stop = useCallback(() => {
		releaseStream();
		setStatus('idle');
		setError(null);
	}, [releaseStream]);

	const start = useCallback(async () => {
		if (streamRef.current) return;

		if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
			setStatus('error');
			setError(
				'Browser tidak mendukung akses kamera — halaman harus dibuka via HTTPS atau localhost.',
			);
			return;
		}

		setStatus('requesting');
		setError(null);
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { width: { ideal: 640 }, height: { ideal: 480 } },
				audio: false,
			});
			streamRef.current = stream;

			const video = videoRef.current;
			if (!video) throw new Error('Elemen video belum tersedia.');
			video.srcObject = stream;
			video.muted = true; // autoplay muted hampir selalu diizinkan browser
			await video.play().catch(() => {
				/* beberapa browser menunda play sampai gesture; frame tetap mengalir */
			});

			setStatus('active');
		} catch (err) {
			releaseStream();
			if (err instanceof DOMException) {
				if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
					setStatus('denied');
					setError('Izin kamera ditolak.');
					return;
				}
				if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') {
					setStatus('not-found');
					setError('Kamera tidak ditemukan pada perangkat ini.');
					return;
				}
			}
			setStatus('error');
			setError(err instanceof Error ? err.message : String(err));
		}
	}, [releaseStream, videoRef]);

	// Cleanup otomatis saat unmount.
	useEffect(() => releaseStream, [releaseStream]);

	return { status, error, start, stop };
}
