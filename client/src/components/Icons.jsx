const base = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

export const HomeIcon = () => (
  <svg {...base}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" /></svg>
);
export const GridIcon = () => (
  <svg {...base}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></svg>
);
export const BoxIcon = () => (
  <svg {...base}><path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" /><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" /></svg>
);
export const DownloadIcon = () => (
  <svg {...base}><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5" /><path d="M4 17v2.5h16V17" /></svg>
);
export const CartIcon = () => (
  <svg {...base}><path d="M3 4h2.2l2.1 10.2a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.1L20.5 8H6.1" /><circle cx="9.5" cy="19.5" r="1.3" /><circle cx="17" cy="19.5" r="1.3" /></svg>
);
export const UserIcon = () => (
  <svg {...base}><circle cx="12" cy="8" r="4" /><path d="M4 20.5c1.2-3.8 4.2-5.5 8-5.5s6.8 1.7 8 5.5" /></svg>
);
export const SearchIcon = () => (
  <svg {...base} width={18} height={18}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>
);
