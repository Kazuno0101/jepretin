'use client';

// Wrapper client: HandFilter dimuat dinamis tanpa SSR supaya tidak ada akses
// window/navigator saat render server (AGENTS.md aturan #2).

import dynamic from 'next/dynamic';

const HandFilter = dynamic(() => import('./HandFilter'), {
	ssr: false,
	loading: () => <div className="stage stage--loading" aria-hidden="true" />,
});

export default function HandFilterDemo() {
	return <HandFilter />;
}
