import type { CSSProperties } from 'react';

export type IconName =
  | 'search' | 'pin' | 'star' | 'heart' | 'calendar' | 'sliders' | 'funnel'
  | 'chevronDown' | 'chevronUp' | 'chevronLeft' | 'chevronRight' | 'x' | 'check'
  | 'fish' | 'map' | 'list' | 'user' | 'phone' | 'mail' | 'globe' | 'trophy'
  | 'cash' | 'people' | 'navigate' | 'arrowRight' | 'logout' | 'time' | 'water'
  | 'home' | 'bolt' | 'car' | 'droplet' | 'wifi' | 'flame' | 'bag' | 'logoFish' | 'sync'
  | 'lock' | 'eye' | 'eyeOff' | 'bell';

const P: Record<IconName, string> = {
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  pin: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  funnel: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
  chevronDown: 'M6 9l6 6 6-6',
  chevronUp: 'M18 15l-6-6-6 6',
  chevronLeft: 'M15 18l-6-6 6-6',
  chevronRight: 'M9 18l6-6-6-6',
  x: 'M18 6L6 18M6 6l12 12',
  check: 'M20 6L9 17l-5-5',
  fish: 'M9 12c2-5 9.5-6.5 12.5 0-3 6.5-10.5 5-12.5 0z M9 12 L4.5 8.5 Q6.5 12 4.5 15.5 Z M16.5 11h.01',
  map: 'M9 3L3 6v15l6-3 6 3 6-3V3l-6 3-6-3zM9 3v15M15 6v15',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z',
  mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6',
  lock: 'M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM8 11V7a4 4 0 0 1 8 0v4',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeOff: 'M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 8 10 8a18 18 0 0 1-2.16 3.19M6.1 6.1A18 18 0 0 0 2 12s3.5 7 10 7a9.1 9.1 0 0 0 3.07-.53M1 1l22 22',
  globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
  trophy: 'M6 9a6 6 0 0 0 12 0V3H6v6zM6 5H3v2a3 3 0 0 0 3 3M18 5h3v2a3 3 0 0 1-3 3M9 21h6M12 17v4',
  cash: 'M2 6h20v12H2zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM5 9h.01M19 15h.01',
  people: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  navigate: 'M3 11l19-9-9 19-2-8-8-2z',
  arrowRight: 'M5 12h14M12 5l7 7-7 7',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  time: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  water: 'M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z',
  home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  bolt: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  car: 'M5 17a2 2 0 1 0 0 .01M19 17a2 2 0 1 0 0 .01M3 17h-1v-5l2-5h12l3 5v5h-1M5 12h14',
  droplet: 'M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z',
  wifi: 'M5 13a10 10 0 0 1 14 0M8.5 16.5a5 5 0 0 1 7 0M2 8.82a15 15 0 0 1 20 0M12 20h.01',
  flame: 'M12 2c1 3 4 5 4 9a4 4 0 0 1-8 0c0-1 .2-2 1-3 0 2 1.5 3 1.5 3S9 8 12 2z',
  bag: 'M6 2l-2 4v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6l-2-4H6zM4 6h16M16 10a4 4 0 0 1-8 0',
  logoFish: 'M2 12c3-5 8-7 13-7 3 0 5 1 7 3-2 2-4 3-7 3-5 0-10-2-13 1zM2 12c3 5 8 7 13 7M16 10.5h.01',
  sync: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
};

interface Props { name: IconName; size?: number; color?: string; strokeWidth?: number; style?: CSSProperties; fill?: boolean; }

export default function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 2, style, fill }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? color : 'none'}
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }} aria-hidden="true">
      <path d={P[name]} />
    </svg>
  );
}
