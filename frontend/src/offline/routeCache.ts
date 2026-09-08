import { getStorage, type RouteCacheRecord } from './database';

export class RouteCacheManager {
  async saveRoute(
    corridorKey: string,
    originName: string,
    destinationName: string,
    geometryGeojson: Record<string, any> | string,
    distanceKm: number,
    durationMinutes: number,
    riskScore: number,
    ttlHours = 24
  ): Promise<void> {
    const storage = getStorage();
    await storage.init();

    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlHours * 3600 * 1000);

    const record: RouteCacheRecord = {
      corridor_key: corridorKey,
      origin_name: originName,
      destination_name: destinationName,
      geometry_geojson:
        typeof geometryGeojson === 'string'
          ? geometryGeojson
          : JSON.stringify(geometryGeojson),
      distance_km: distanceKm,
      duration_minutes: durationMinutes,
      risk_score: riskScore,
      cached_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    await storage.setCachedRoute(record);
  }

  async getRoute(
    corridorKey: string
  ): Promise<{ record: RouteCacheRecord | null; isStale: boolean }> {
    const storage = getStorage();
    await storage.init();

    const record = await storage.getCachedRoute(corridorKey);
    if (!record) {
      return { record: null, isStale: false };
    }

    const isStale = Date.now() > new Date(record.expires_at).getTime();
    return { record, isStale };
  }

  async getAllRoutes(): Promise<RouteCacheRecord[]> {
    const storage = getStorage();
    await storage.init();
    return storage.getAllCachedRoutes();
  }
}

export const routeCache = new RouteCacheManager();
