// Sistem partikel untuk efek pinch. Logic update (murni, testable) dipisah
// dari drawing agar bisa dites tanpa canvas.

export interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	decay: number;
	hue: number;
	size: number;
}

/** Batas aman supaya array partikel tidak tumbuh tanpa kendali. */
export const MAX_PARTICLES = 320;

/** Rentang hue pink–magenta, selaras dengan aksen UI. */
const HUE_MIN = 290;
const HUE_SPAN = 60;

/** Ledakkan beberapa partikel dari satu titik (koordinat piksel). */
export function spawnBurst(
	particles: Particle[],
	x: number,
	y: number,
	count = 4,
): void {
	for (let i = 0; i < count; i++) {
		if (particles.length >= MAX_PARTICLES) return;
		const angle = Math.random() * Math.PI * 2;
		const speed = 0.6 + Math.random() * 2.4;
		particles.push({
			x,
			y,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed - 0.6,
			life: 1,
			decay: 0.015 + Math.random() * 0.02,
			hue: HUE_MIN + Math.random() * HUE_SPAN,
			size: 2 + Math.random() * 4,
		});
	}
}

/** Update fisika partikel & buang yang sudah mati (life <= 0). */
export function updateParticles(particles: Particle[]): void {
	for (let i = particles.length - 1; i >= 0; i--) {
		const p = particles[i];
		p.x += p.vx;
		p.y += p.vy;
		p.vy += 0.02; // gravitasi ringan
		p.vx *= 0.99;
		p.life -= p.decay;
		if (p.life <= 0) particles.splice(i, 1);
	}
}

/** Gambar partikel memudar ke canvas. */
export function drawParticles(
	ctx: CanvasRenderingContext2D,
	particles: Particle[],
): void {
	for (const p of particles) {
		ctx.beginPath();
		ctx.arc(p.x, p.y, Math.max(p.size * p.life, 0.1), 0, Math.PI * 2);
		ctx.fillStyle = `hsla(${p.hue}, 90%, 68%, ${Math.max(p.life, 0)})`;
		ctx.fill();
	}
}
