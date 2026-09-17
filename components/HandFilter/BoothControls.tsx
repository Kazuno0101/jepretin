'use client';

// Panel kontrol kios: tombol kamera + grup tema/gaya/bingkai cetak/mode.
// Komponen presentational (semua state lewat props) — variasi & pengujian
// terpisah dari pipeline hand-tracking. Prop kini memakai preset generik
// (OverlayPreset[]) sehingga setiap tema bisa punya sub-gaya sendiri.

import { useState } from 'react';
import { OVERLAYS } from './overlays';
import { PHOTO_FRAMES } from './photoFrames';
import type { CaptureMode, OverlayPreset } from './types';

export interface BoothControlsProps {
	isRunning: boolean;
	canStart: boolean;
	/** Label tombol start saat menunggu (mis. "Memuat model…"). */
	pendingLabel?: string;
	// ── Tema overlay ──────────────────────────────────────────────────────
	overlayId: string;
	onOverlayChange: (id: string) => void;
	/** Preset gaya tema aktif (null = tema tidak punya sub-gaya). */
	themePresets: OverlayPreset[] | null;
	themePresetId: string;
	onThemePresetChange: (id: string) => void;
	// ── Bingkai cetak (ortogonal terhadap tema) ────────────────────────
	photoFrameId: string;
	onPhotoFrameChange: (id: string) => void;
	// ── Mode jepretan ─────────────────────────────────────────────────
	captureMode: CaptureMode;
	onCaptureModeChange: (mode: CaptureMode) => void;
	onStart: () => void;
	onStop: () => void;
}

export default function BoothControls({
	isRunning,
	canStart,
	pendingLabel,
	overlayId,
	onOverlayChange,
	themePresets,
	themePresetId,
	onThemePresetChange,
	photoFrameId,
	onPhotoFrameChange,
	captureMode,
	onCaptureModeChange,
	onStart,
	onStop,
}: BoothControlsProps) {
	// Opsi default terlipat di layar sempit (mobile) supaya kamera langsung
	// terlihat tanpa scroll; terbuka di desktop. Komponen ini hanya dirender
	// client-side (dynamic import ssr:false) sehingga matchMedia aman.
	const [open, setOpen] = useState(
		() =>
			typeof window !== 'undefined' &&
			window.matchMedia('(min-width: 1025px)').matches,
	);

	return (
		<div className="booth-panel">
			{/* ── Kepala panel: tombol kamera (baris sendiri, penuh) ───────────
			    Tombol merah jadi anchor visual yang kuat di puncak panel, dan
			    tinggi panel tidak lagi bergantung pada berapa chip tema terbungkus. */}
			{isRunning ?
				<button type="button" className="btn btn--stop btn--full" onClick={onStop}>
					Hentikan kamera
				</button>
			:	<button
					type="button"
					className="btn btn--primary btn--full"
					onClick={onStart}
					disabled={!canStart}
				>
					{!isRunning && !canStart && pendingLabel ?
						pendingLabel
					:	'Aktifkan kamera'}
				</button>
			}

			{/* ── Toggle seluruh opsi (Tema/Gaya/Bingkai/Mode) ────────────────
			    Satu tombol untuk membuka/melipat — di mobile panel tidak rame. */}
			<button
				type="button"
				className="btn btn--ghost btn--full disclosure"
				aria-expanded={open}
				aria-controls="booth-options"
				onClick={() => setOpen((v) => !v)}
			>
				Opsi jepret
				<svg
					className="disclosure-chevron"
					width="14"
					height="14"
					viewBox="0 0 12 12"
					aria-hidden="true"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M2.5 4.5 6 8l3.5-3.5" />
				</svg>
			</button>

			<div
				id="booth-options"
				className="booth-panel__groups"
				hidden={!open}
			>
			{/* ── Tema ────────────────────────────────────────────────────── */}
			<div className="control-group">
				<span className="group-label" id="group-tema">
					Tema
				</span>
				<div className="chips" role="group" aria-labelledby="group-tema">
					{OVERLAYS.map((o) => (
						<button
							key={o.id}
							type="button"
							className={`chip${o.id === overlayId ? ' chip--active' : ''}`}
							aria-pressed={o.id === overlayId}
							onClick={() => onOverlayChange(o.id)}
						>
							{o.label}
						</button>
					))}
				</div>
			</div>

			{/* ── Sub-gaya tema (muncul jika tema aktif punya preset) ──────── */}
			{themePresets && themePresets.length > 0 && (
				<div className="control-group">
					<span className="group-label" id="group-gaya">
						Gaya
					</span>
					<div className="chips" role="group" aria-labelledby="group-gaya">
						{themePresets.map((p) => (
							<button
								key={p.id}
								type="button"
								className={`chip${p.id === themePresetId ? ' chip--active' : ''}`}
								aria-pressed={p.id === themePresetId}
								onClick={() => onThemePresetChange(p.id)}
							>
								{p.label}
							</button>
						))}
					</div>
				</div>
			)}

			{/* ── Bingkai cetak (ortogonal terhadap tema) ──────────────────── */}
			<div className="control-group">
				<span className="group-label" id="group-frame">
					Bingkai cetak
				</span>
				<div className="chips" role="group" aria-labelledby="group-frame">
					{PHOTO_FRAMES.map((f) => (
						<button
							key={f.id}
							type="button"
							className={`chip${f.id === photoFrameId ? ' chip--active' : ''}`}
							aria-pressed={f.id === photoFrameId}
							onClick={() => onPhotoFrameChange(f.id)}
						>
							{f.label}
						</button>
					))}
				</div>
			</div>

			{/* ── Mode jepretan — segmented control ────────────────────────── */}
			<div className="control-group">
				<span className="group-label" id="group-mode">
					Mode jepretan
				</span>
				<div className="segmented" role="group" aria-labelledby="group-mode">
					<button
						type="button"
						className={`chip${captureMode === 'single' ? ' chip--active' : ''}`}
						aria-pressed={captureMode === 'single'}
						onClick={() => onCaptureModeChange('single')}
					>
						1×
					</button>
					<button
						type="button"
						className={`chip${captureMode === 'triple' ? ' chip--active' : ''}`}
						aria-pressed={captureMode === 'triple'}
						onClick={() => onCaptureModeChange('triple')}
					>
						3× strip
					</button>
				</div>
			</div>
			</div>
		</div>
	);
}
