const paths = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  box: <><path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/></>,
  tag: <><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1"/></>,
  video: <><rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3z"/><path d="m8 9 4 3-4 3z"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  folder: <><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H10l2 2h7.5A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-11Z"/><path d="M3 9h18"/></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></>,
  star: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
  layout: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M9 9h12"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.3 1-1.3 2.3-1.6-.6a8 8 0 0 1-1.7 1l-.3 1.7h-2.7l-.3-1.7a8 8 0 0 1-1.7-1l-1.6.6-1.3-2.3 1.3-1a8 8 0 0 1 0-2l-1.3-1 1.3-2.3 1.6.6a8 8 0 0 1 1.7-1l.3-1.7h2.7l.3 1.7a8 8 0 0 1 1.7 1l1.6-.6 1.3 2.3-1.3 1a8 8 0 0 1-.1 2Z" transform="translate(-1 -1) scale(1.08)"/></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
  announcement: <><path d="M3 11v2a2 2 0 0 0 2 2h2l8 4V5l-8 4H5a2 2 0 0 0-2 2Z"/><path d="M7 15l1.5 5h3L10 16M18 9a5 5 0 0 1 0 6M21 7a8 8 0 0 1 0 10"/></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
  close: <><path d="m18 6-12 12M6 6l12 12"/></>,
  chevron: <path d="m9 18 6-6-6-6"/>,
  collapse: <><path d="M4 5h16v14H4zM9 5v14M15 9l-3 3 3 3"/></>,
  more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
};

export default function Icon({ name, size = 20, ...props }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>{paths[name] || paths.grid}</svg>;
}
