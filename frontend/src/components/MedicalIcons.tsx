interface IconProps {
  className?: string;
}

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function StethoscopeIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M6 3v6a4 4 0 0 0 8 0V3" />
      <path d="M10 13v2a5 5 0 0 0 10 0v-2.5" />
      <circle cx="20" cy="10.5" r="1.8" />
      <circle cx="6" cy="3" r="1.2" />
      <circle cx="14" cy="3" r="1.2" />
    </svg>
  );
}

export function PulseIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M2 12h4l2-6 4 12 2-9 2 3h6" />
    </svg>
  );
}

export function PillIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-35 12 12)" />
      <path d="M8.5 15.5 15.5 8.5" transform="rotate(-35 12 12)" />
    </svg>
  );
}

export function CrossIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M12 4v16M4 12h16" />
    </svg>
  );
}

export function SyringeIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M21 3 19 5M17 3l4 4M16 6l2 2-8.5 8.5-3-1-1-3L14 4l2 2Z" />
      <path d="M4.5 19.5 3 21" />
      <path d="M9 11l2 2M11 9l2 2" />
    </svg>
  );
}

export function DropIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M12 3s6 7 6 11.5a6 6 0 0 1-12 0C6 10 12 3 12 3Z" />
    </svg>
  );
}
