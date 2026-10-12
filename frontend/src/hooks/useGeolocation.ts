import { useCallback, useState } from 'react';

export type GeolocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';

export function useGeolocation() {
  const [status, setStatus] = useState<GeolocationStatus>('idle');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

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
      () => {
        setStatus('denied');
      },
      { timeout: 10000 },
    );
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setCoords(null);
  }, []);

  return { status, coords, requestLocation, reset };
}
