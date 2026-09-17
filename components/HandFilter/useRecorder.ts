'use client';

// Hook perekam video: merekam canvas (yang sudah berisi video + efek,
// lihat HandFilter.step() lapisan dasar) via canvas.captureStream() +
// MediaRecorder. Hasil = blob URL lokal — tidak ada upload (privasi).
// Berhenti otomatis di 60 detik (pengaman memori) & saat unmount/kamera mati.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

/** Batas durasi rekaman (ms) — mencegah file blob membesar tanpa batas. */
export const MAX_RECORDING_MS = 60_000;

/** Prioritas codec webm (Chrome/Edge/Firefox); '' = default browser. */
function pickMimeType(): string {
	if (typeof MediaRecorder === 'undefined') return '';
	const candidates = [
		'video/webm;codecs=vp9',
		'video/webm;codecs=vp8',
		'video/webm',
	];
	return candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? '';
}

export type RecorderStatus = 'unsupported' | 'idle' | 'recording';

/** Satu hasil rekaman (blob URL lokal + durasi). */
export interface RecordingResult {
	url: string;
	durationMs: number;
}

export function useRecorder(canvasRef: RefObject<HTMLCanvasElement | null>) {
	const recorderRef = useRef<MediaRecorder | null>(null);
	const chunksRef = useRef<Blob[]>([]);
	const startedAtRef = useRef(0);
	const stopPromiseRef = useRef<((r: RecordingResult) => void) | null>(null);
	const [status, setStatus] = useState<RecorderStatus>(() =>
		typeof MediaRecorder !== 'undefined' && 'captureStream' in HTMLCanvasElement ?
			'idle'
		:	'unsupported',
	);

	/**
	 * Mulai merekam. Mengembalikan true bila berhasil.
	 * Canvas wajib sudah digambar (kamera aktif) — tanpa itu tidak ada frame.
	 */
	const start = useCallback((): boolean => {
		if (status !== 'idle') return false;
		const canvas = canvasRef.current;
		if (!canvas || !canvas.width) return false;

		const stream = canvas.captureStream(30);
		const mimeType = pickMimeType();
		const recorder = new MediaRecorder(stream, {
			mimeType: mimeType || undefined,
			videoBitsPerSecond: 6_000_000,
		});
		chunksRef.current = [];
		startedAtRef.current = performance.now();

		recorder.ondataavailable = (e) => {
			if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
		};
		recorder.onstop = () => {
			const type = recorder.mimeType || mimeType || 'video/webm';
			const blob = new Blob(chunksRef.current, { type });
			chunksRef.current = [];
			const url = URL.createObjectURL(blob);
			const result: RecordingResult = {
				url,
				durationMs: performance.now() - startedAtRef.current,
			};
			stopPromiseRef.current?.(result);
			stopPromiseRef.current = null;
			recorderRef.current = null;
			setStatus('idle');
		};

		// Auto-stop pengaman durasi — pemicunya one-shot setelah start.
		const maxTimer = window.setTimeout(() => {
			if (recorderRef.current === recorder && recorder.state === 'recording') {
				recorder.stop();
			}
		}, MAX_RECORDING_MS);
		recorder.onstop = ((original) => (e: Event) => {
			window.clearTimeout(maxTimer);
			original.call(recorder, e);
		})(recorder.onstop);

		recorder.start();
		recorderRef.current = recorder;
		setStatus('recording');
		return true;
	}, [status, canvasRef]);

	/** Hentikan rekaman; resolve ke blob URL + durasi (null bila tidak sedang rekam). */
	const stop = useCallback((): Promise<RecordingResult | null> => {
		const recorder = recorderRef.current;
		if (!recorder || recorder.state !== 'recording') return Promise.resolve(null);
		return new Promise<RecordingResult | null>((resolve) => {
			stopPromiseRef.current = resolve as (r: RecordingResult) => void;
			recorder.stop();
		});
	}, []);

	/** Hentikan rekaman tanpa menghasilkan file (mis. kamera dimatikan). */
	const cancel = useCallback(() => {
		const recorder = recorderRef.current;
		if (!recorder || recorder.state !== 'recording') return;
		// Buang resolve supaya promise stop() (bila ada) tak menggantung.
		stopPromiseRef.current = null;
		recorder.onstop = null;
		recorderRef.current = null;
		recorder.stop();
		chunksRef.current = [];
		setStatus('idle');
	}, []);

	// Unmount: hentikan rekaman & bebaskan recorder (blob URL tetap milik pemanggil).
	useEffect(() => {
		return () => {
			const recorder = recorderRef.current;
			if (recorder && recorder.state !== 'inactive') {
				recorder.onstop = null;
				recorder.stop();
			}
			recorderRef.current = null;
			chunksRef.current = [];
		};
	}, []);

	return { status, start, stop, cancel };
}
