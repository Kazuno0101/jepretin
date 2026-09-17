import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Caveat, Fraunces, Instrument_Sans } from 'next/font/google';
import './globals.css';

const display = Fraunces({
	subsets: ['latin'],
	variable: '--font-display',
	style: ['normal', 'italic'],
	axes: ['opsz'],
});

const body = Instrument_Sans({
	subsets: ['latin'],
	variable: '--font-body',
});

/** Font tulisan tangan untuk caption polaroid (juga dipakai di canvas export). */
const hand = Caveat({
	subsets: ['latin'],
	variable: '--font-hand',
});

export const metadata: Metadata = {
	title: 'Comvi — Studio Filter Tangan',
	description:
		'Bentuk bingkai dengan kedua tanganmu, jepret dengan kepalan. Filter gesture real-time berbasis MediaPipe — 100% di perangkat, tanpa server.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="id" className={`${display.variable} ${body.variable} ${hand.variable}`}>
			<body>{children}</body>
		</html>
	);
}
