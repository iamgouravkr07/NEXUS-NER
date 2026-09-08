import { Capacitor } from '@capacitor/core';
import { Geolocation, type Position } from '@capacitor/geolocation';

export const NER_BOUNDS = {
  MIN_LAT: 20.0,
  MAX_LAT: 30.0,
  MIN_LON: 88.0,
  MAX_LON: 98.0,
};

export interface GpsPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  isStale: boolean;
  isWithinNER: boolean;
}

export function validateNERCoordinates(
  lat: number,
  lon: number
): { valid: boolean; reason?: string } {
  if (typeof lat !== 'number' || isNaN(lat) || typeof lon !== 'number' || isNaN(lon)) {
    return { valid: false, reason: 'Latitude and Longitude must be valid numbers' };
  }
  if (lat < NER_BOUNDS.MIN_LAT || lat > NER_BOUNDS.MAX_LAT) {
    return {
      valid: false,
      reason: `Latitude ${lat.toFixed(4)} is outside North Eastern Region bounds [${NER_BOUNDS.MIN_LAT}, ${NER_BOUNDS.MAX_LAT}]`,
    };
  }
  if (lon < NER_BOUNDS.MIN_LON || lon > NER_BOUNDS.MAX_LON) {
    return {
      valid: false,
      reason: `Longitude ${lon.toFixed(4)} is outside North Eastern Region bounds [${NER_BOUNDS.MIN_LON}, ${NER_BOUNDS.MAX_LON}]`,
    };
  }
  return { valid: true };
}

export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

class GeolocationService {
  private lastPosition: GpsPosition | null = null;
  private trackingIntervalId: number | null = null;

  async getCurrentPosition(timeoutMs = 10000, maxAgeMs = 60000): Promise<GpsPosition> {
    if (Capacitor.isNativePlatform()) {
      try {
        const hasPerms = await Geolocation.checkPermissions();
        if (hasPerms.location !== 'granted') {
          const req = await Geolocation.requestPermissions();
          if (req.location !== 'granted') {
            throw new Error('Location permission denied on device.');
          }
        }

        const pos: Position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: timeoutMs,
          maximumAge: 5000,
        });

        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const accuracy = pos.coords.accuracy || 10;
        const ts = pos.timestamp;
        const isStale = Date.now() - ts > maxAgeMs;
        const isWithinNER = validateNERCoordinates(lat, lon).valid;

        const gpsPos: GpsPosition = {
          latitude: lat,
          longitude: lon,
          accuracy,
          timestamp: ts,
          isStale,
          isWithinNER,
        };
        this.lastPosition = gpsPos;
        return gpsPos;
      } catch (err: any) {
        throw new Error(err?.message || 'Failed to acquire GPS fix from device.');
      }
    }

    // Browser Fallback
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      throw new Error('Geolocation is not supported in this browser environment.');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const accuracy = pos.coords.accuracy || 10;
          const ts = pos.timestamp;
          const isStale = Date.now() - ts > maxAgeMs;
          const isWithinNER = validateNERCoordinates(lat, lon).valid;

          const gpsPos: GpsPosition = {
            latitude: lat,
            longitude: lon,
            accuracy,
            timestamp: ts,
            isStale,
            isWithinNER,
          };
          this.lastPosition = gpsPos;
          resolve(gpsPos);
        },
        (error) => {
          let msg = 'Failed to acquire GPS fix.';
          if (error.code === error.PERMISSION_DENIED) {
            msg = 'Location access permission was denied.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            msg = 'GPS positioning is currently unavailable.';
          } else if (error.code === error.TIMEOUT) {
            msg = 'GPS acquisition timed out. Please try again.';
          }
          reject(new Error(msg));
        },
        {
          enableHighAccuracy: true,
          timeout: timeoutMs,
          maximumAge: 10000,
        }
      );
    });
  }

  getLastPosition(): GpsPosition | null {
    return this.lastPosition;
  }

  startThrottledTracking(
    callback: (pos: GpsPosition) => void,
    intervalMs = 60000, // Minimum 60s
    minDistanceMeters = 100 // Minimum 100m displacement
  ): () => void {
    if (this.trackingIntervalId !== null) {
      clearInterval(this.trackingIntervalId);
    }

    let previousBroadcastPos: GpsPosition | null = null;

    const poll = async () => {
      try {
        const current = await this.getCurrentPosition(8000, 30000);
        if (!previousBroadcastPos) {
          previousBroadcastPos = current;
          callback(current);
          return;
        }

        const distance = haversineDistanceMeters(
          previousBroadcastPos.latitude,
          previousBroadcastPos.longitude,
          current.latitude,
          current.longitude
        );

        if (distance >= minDistanceMeters) {
          previousBroadcastPos = current;
          callback(current);
        }
      } catch {}
    };

    // Initial check
    poll();
    this.trackingIntervalId = window.setInterval(poll, intervalMs);

    return () => {
      if (this.trackingIntervalId !== null) {
        clearInterval(this.trackingIntervalId);
        this.trackingIntervalId = null;
      }
    };
  }
}

export const geolocationService = new GeolocationService();
