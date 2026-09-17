'use client';

// Hook pemuat model MediaPipe HandLandmarker (sekali saja, di-cache di ref).
// Library di-import dinamis di dalam effect supaya tidak dieksekusi saat SSR
// dan tidak membebani bundle awal. Instance di-close() saat cleanup.

import { useEffect, useRef, useState } from 'react';
import type { HandLandmarker } from '@mediapipe/tasks-vision';
import { quietMediaPipe } from './quietMediaPipe';
import type { ModelStatus } from './types';

// Versi WASM CDN sengaja dipin sama dengan versi package di package.json
// supaya tidak terjadi mismatch JS/WASM.
const MEDIAPIPE_VERSION = '0.10.14';
const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL =
	'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export function useHandLandmarker() {
	const landmarkerRef = useRef<HandLandmarker | null>(null);
	const [status, setStatus] = useState<ModelStatus>('loading');
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		// Redam log INFO XNNPACK dari WASM (dikirim sebagai console.error).
		quietMediaPipe();

		(async () => {
			try {
				const vision = await import('@mediapipe/tasks-vision');
				const fileset = await vision.FilesetResolver.forVisionTasks(WASM_BASE);

				const create = (delegate: 'GPU' | 'CPU') =>
					vision.HandLandmarker.createFromOptions(fileset, {
						baseOptions: { modelAssetPath: MODEL_URL, delegate },
						runningMode: 'VIDEO',
						numHands: 2,
					});

				// Coba GPU dulu; fallback ke CPU untuk device tanpa WebGL yang layak.
				let landmarker: HandLandmarker;
				try {
					landmarker = await create('GPU');
				} catch {
					landmarker = await create('CPU');
				}

				if (cancelled) {
					// close() bisa melempar jika teardown MediaPipe terjadi saat
					// inisialisasi belum stabil (mis. StrictMode remount di dev).
					// Tangkap supaya tidak mengganggu cleanup React.
					try {
						landmarker.close();
					} catch {
						/* abaikan — WASM membebaskan sendiri sisanya */
					}
					return;
				}
				landmarkerRef.current = landmarker;
				setStatus('ready');
			} catch (err) {
				if (cancelled) return;
				setStatus('error');
				setError(err instanceof Error ? err.message : String(err));
			}
		})();

		return () => {
			cancelled = true;
			// Penutupan instance bisa melempar (keadaan internal MediaPipe/WASM);
			// jangan biarkan lemparan itu keluar dari cleanup React.
			try {
				landmarkerRef.current?.close();
			} catch {
				/* abaikan */
			}
			landmarkerRef.current = null;
		};
	}, []);

	return { landmarkerRef, status, error };
}
