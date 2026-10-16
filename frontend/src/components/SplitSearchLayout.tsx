import type { ReactNode } from 'react';
import './SplitSearchLayout.css';

interface SplitSearchLayoutProps {
  map: ReactNode;
  children: ReactNode;
}

export function SplitSearchLayout({ map, children }: SplitSearchLayoutProps) {
  return (
    <div className="split-search">
      <div className="split-search__panel">{children}</div>
      <div className="split-search__map">{map}</div>
    </div>
  );
}
