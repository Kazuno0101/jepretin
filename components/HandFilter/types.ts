// Tipe bersama untuk pipeline hand- & face-tracking (design.md §3).

/** Satu titik landmark ternormalisasi (0–1) dari MediaPipe. */
export interface Landmark {
	x: number;
	y: number;
	z?: number;
}

/** Titik dalam koordinat piksel canvas. */
export interface Point {
	x: number;
	y: number;
}

export type Handedness = 'Left' | 'Right' | 'Unknown';

/** Simbol jari yang dikenali classifier (lihat gestures.ts). */
export type GestureId =
	| 'none'
	| 'fist'
	| 'open-palm'
	| 'point'
	| 'peace'
	| 'metal'
	| 'ily'
	| 'thumbs-up'
	| 'shaka';

/** Data satu tangan pada satu frame. */
export interface HandFrame {
	landmarks: Landmark[];
	handedness: Handedness;
	/** Simbol jari hasil classifyGesture (opsional, diisi komponen utama). */
	gesture?: GestureId;
}

/** Data satu wajah pada satu frame (FaceLandmarker, 478 landmark ternormalisasi). */
export interface FaceFrame {
	landmarks: Landmark[];
}

export type ModelStatus = 'loading' | 'ready' | 'error';

/** Satu pilihan sub-gaya / preset milik sebuah tema overlay. */
export interface OverlayPreset {
	id: string;
	label: string;
}

/** Input yang diterima setiap modul overlay saat render. */
export interface OverlayRenderContext {
	ctx: CanvasRenderingContext2D;
	width: number;
	height: number;
	hands: HandFrame[];
	/** Titik pinch aktif dalam koordinat piksel — untuk feedback ekstra per tema. */
	pinchPoints: Point[];
	/** performance.now() — untuk animasi berbasis waktu. */
	time: number;
	/**
	 * Elemen video sumber frame — dipakai tema yang menggambar ulang video
	 * ke canvas (mis. tema "Bingkai"). Opsional supaya tema lain tidak wajib.
	 */
	video?: HTMLVideoElement | null;
	/**
	 * ID preset filter warna untuk tema "Bingkai" (lihat overlays/frame.ts).
	 * Nilai default 'vivid' jika tidak dikirim.
	 */
	frameFilterId?: string;
	/** Wajah terdeteksi pada frame ini (null = tidak ada → dekorasi kepala dilewati). */
	face?: FaceFrame | null;
	/** ID preset/gaya aktif untuk tema ini (default: preset pertama tema). */
	presetId?: string;
}

/** Interface seragam untuk semua tema overlay (design.md §3.4). */
export interface OverlayModule {
	id: string;
	label: string;
	render: (input: OverlayRenderContext) => void;
	/** Sub-gaya opsional tema ini (tampil sebagai chips "Gaya" di panel kontrol). */
	presets?: OverlayPreset[];
	/** ID preset default (jika tema punya presets). */
	defaultPresetId?: string;
}

/** Mode jepretan: satu foto atau strip 3 jepretan dalam satu polaroid. */
export type CaptureMode = 'single' | 'triple';

/** Mode hasil: jepret foto (gesture/countdown) atau rekam video. */
export type MediaMode = 'photo' | 'video';

/**
 * Satu item galeri. Foto (data URL PNG) atau rekaman video (blob URL webm) —
 * semuanya disimpan LOKAL di perangkat, tidak pernah diunggah (privasi).
 */
export type Photo =
	| {
			id: number;
			kind: 'photo';
			/** Jepretan pertama — dipakai sebagai thumbnail kartu galeri. */
			dataUrl: string;
			/** Mode 3×: seluruh jepretan strip (unduhan = 1 PNG panjang). */
			frames?: string[];
	  }
	| {
			id: number;
			kind: 'video';
			/** Blob URL rekaman (dari useRecorder) — bukan data URL. */
			videoUrl: string;
			/** Durasi rekaman (ms) — dipakai caption kartu. */
			durationMs: number;
	  };
