// Mostki między aplikacjami (web ↔ panel) — jedno źródło prawdy.
// Dev: lokalne porty Vite. Prod: subdomeny fisheryfinder.pl.
const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';

// Strona wędkarza (web)
export const APP_URL = isLocal ? 'http://localhost:5173' : 'https://fisheryfinder.pl';

// Panel właściciela (CRM)
export const PANEL_URL = isLocal ? 'http://localhost:5174' : 'https://biznes.fisheryfinder.pl';
