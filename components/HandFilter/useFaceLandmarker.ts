'use client';

// Hook pemuat model MediaPipe FaceLandmarker — pola sama dengan
// useHandLandmarker: dynamic import (anti-SSR + bundle ringan), WASM dari CDN
// dengan versi yang dipin sama dengan package, GPU dulu lalu fallback CPU,
// dan close() saat cleanup. Model wajah dipakai tema overlay untuk dekorasi
// kepala (telinga/topi/hati/bintang). Gagal memuat → tema tetap berjalan
// tanpa dekorasi kepala (penurunan graceful).

import { useEffect, useRef, useState } from 'react';
import type { FaceLandmarker } from '@mediapipe/tasks-vision';
import { quietMediaPipe } from './quietMediaPipe';
import type { ModelStatus } from './types';

// Harus sama dengan MEDIAPIPE_VERSION di useHandLandmarker.ts.
const MEDIAPIPE_VERSION = '0.10.14';
const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL =
	'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

export function useFaceLandmarker() {
	const landmarkerRef = useRef<FaceLandmarker | null>(null);
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
					vision.FaceLandmarker.createFromOptions(fileset, {
						baseOptions: { modelAssetPath: MODEL_URL, delegate },
						runningMode: 'VIDEO',
						numFaces: 1,
						// Cukup landmark; blendshapes tidak dipakai (hemat komputasi).
						outputFaceBlendshapes: false,
						outputFacialTransformationMatrixes: false,
					});

				let landmarker: FaceLandmarker;
				try {
					landmarker = await create('GPU');
				} catch {
					landmarker = await create('CPU');
				}

				if (cancelled) {
					// close() bisa melempar jika teardown MediaPipe terjadi saat
					// inisialisasi belum stabil (mis. StrictMode remount di dev).
					// Model yatim ini harus dibebaskan, tapi lemparannya tidak boleh
					// mengganggu cleanup React — tangkap dan abaikan saja.
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
