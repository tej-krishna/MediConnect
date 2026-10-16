import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { LatLng } from '../types/provider';

export type UserLocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';

interface UserLocationContextValue {
  status: UserLocationStatus;
  coords: LatLng | null;
  requestLocation: () => void;
}

const UserLocationContext = createContext<UserLocationContextValue | null>(null);

/**
 * Requests the browser's geolocation once, as soon as the app mounts, so every
 * "near me" page (Find Care, Medicines, Tests, Health camps) shares the same
 * location instead of each one prompting/fetching separately.
 */
export function UserLocationProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<UserLocationStatus>('idle');
  const [coords, setCoords] = useState<LatLng | null>(null);

  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unavailable');
      return;
    }
    setStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setStatus('granted');
      },
      () => setStatus('denied'),
      { timeout: 10000 },
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const value = useMemo(() => ({ status, coords, requestLocation }), [status, coords, requestLocation]);

  return <UserLocationContext.Provider value={value}>{children}</UserLocationContext.Provider>;
}

export function useUserLocation() {
  const ctx = useContext(UserLocationContext);
  if (!ctx) {
    throw new Error('useUserLocation must be used within a UserLocationProvider');
  }
  return ctx;
}
