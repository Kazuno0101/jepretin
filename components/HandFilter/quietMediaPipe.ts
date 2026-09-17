// Runtime TensorFlow Lite di dalam WASM MediaPipe mengirim log INFO-nya
// (mis. "INFO: Created TensorFlow Lite XNNPACK delegate for CPU.") lewat
// console.error, sehingga dev overlay Next menampilkannya sebagai
// "Console Error" dengan stack yang menunjuk ke pemanggil JS (close() /
// detectForVideo). Pesan itu benign — hanya memberi tahu delegate CPU aktif.
// Filter ini menyaring persis pesan itu; semua console.error/log lain
// diteruskan apa adanya.

const XNNPACK_NOISE = 'XNNPACK delegate';

let installed = false;

/** Pasang filter sekali per halaman (idempotent). */
export function quietMediaPipe(): void {
	if (installed) return;
	installed = true;

	for (const method of ['log', 'error'] as const) {
		const original = console[method].bind(console);
		console[method] = (...args: unknown[]) => {
			if (
				typeof args[0] === 'string' &&
				args[0].includes(XNNPACK_NOISE)
			) {
				return; // redam — bukan error, hanya info delegate CPU
			}
			original(...args);
		};
	}
}
