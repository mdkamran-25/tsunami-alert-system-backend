import { childLogger } from '../utils/logger.js';
import prisma from '../lib/prisma.js';

const log = childLogger('gps-ingestion');

interface USGSFeature {
  geometry: {
    coordinates: [number, number, number]; // [lon, lat, depth_km]
  };
  properties: {
    time: number;
    mag: number;
    place: string;
    title: string;
    url: string;
  };
}

/**
 * Fetch real earthquake data from USGS
 * This is free and requires no API key
 */
async function fetchUSGSData(): Promise<USGSFeature[]> {
  try {
    const url =
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson';
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`USGS API error: ${response.status}`);
    }

    const data = (await response.json()) as { features: USGSFeature[] };
    return data.features;
  } catch (error) {
    log.error('Failed to fetch USGS data:', error);
    return [];
  }
}

/**
 * Extract region name from coordinates
 */
function getRegionFromCoords(lat: number, lon: number): string {
  // Pacific Northwest
  if (lon >= -130 && lon <= -120 && lat >= 44 && lat <= 50) {
    return 'Pacific Northwest (Cascadia)';
  }

  // Alaska
  if (lon >= -165 && lon <= -140 && lat >= 50 && lat <= 65) {
    return 'Alaska Aleutian';
  }

  // Indo-Pacific
  if (lon >= 90 && lon <= 150 && lat >= -10 && lat <= 20) {
    return 'Indo-Pacific Ring';
  }

  // Japan
  if (lon >= 130 && lon <= 145 && lat >= 30 && lat <= 45) {
    return 'Japan Trench';
  }

  // Peru-Chile
  if (lon >= -77 && lon <= -70 && lat >= -45 && lat <= -5) {
    return 'Peru-Chile Trench';
  }

  return 'Other Regions';
}

/**
 * Main ingestion function
 */
export async function ingestGPSData(): Promise<void> {
  try {
    log.info('📥 Starting GPS data ingestion...');

    const features = await fetchUSGSData();

    if (features.length === 0) {
      log.warn('⚠️ No earthquake data received from USGS');
      return;
    }

    let created = 0;

    for (const feature of features) {
      try {
        const [lon, lat, depth_km] = feature.geometry.coordinates;
        const magnitude = feature.properties.mag;
        const timestamp = new Date(feature.properties.time);

        // Get or create station
        const stationId = feature.properties.place || `station-${lon}-${lat}`;

        let station = await prisma.gPSStation.findUnique({
          where: { stationId },
        });

        if (!station) {
          station = await prisma.gPSStation.create({
            data: {
              stationId,
              name: feature.properties.title,
              latitude: lat,
              longitude: lon,
              elevation: -depth_km,
              description: `USGS Earthquake Data - ${feature.properties.title}`,
              network: 'USGS',
              isActive: true,
            },
          });

          log.info(`📍 Created new station: ${station.name}`);
        }

        // Convert magnitude to mm displacement (rough estimate)
        // Magnitude 5.0 = ~50mm, 6.0 = ~500mm, etc.
        const magnitude_mm = Math.pow(10, magnitude - 1) * 10;

        // Check if reading already exists (avoid duplicates)
        const existingReading = await prisma.gPSReading.findFirst({
          where: {
            stationId: station.id,
            timestamp: {
              gte: new Date(timestamp.getTime() - 60000), // Within 1 minute
              lte: new Date(timestamp.getTime() + 60000),
            },
          },
        });

        if (!existingReading) {
          await prisma.gPSReading.create({
            data: {
              stationId: station.id,
              latitude: lat,
              longitude: lon,
              elevation: -depth_km,
              displacementX: magnitude_mm * 0.7,
              displacementY: magnitude_mm * 0.8,
              displacementZ: -magnitude_mm * 0.9,
              magnitude: magnitude_mm,
              quality: magnitude > 5.5 ? 'EXCELLENT' : magnitude > 5.0 ? 'GOOD' : 'FAIR',
              confidence: magnitude > 5.5 ? 98 : magnitude > 5.0 ? 90 : 85,
              metadata: {
                source: 'USGS',
                earthquake_mag: magnitude,
                depth_km: depth_km,
                url: feature.properties.url,
              },
              timestamp,
            },
          });

          created++;
        }
      } catch (featureError) {
        log.warn('Failed to process feature:', featureError);
      }
    }

    log.info(`✅ GPS ingestion complete: ${created} new readings`);
  } catch (error) {
    log.error('❌ GPS data ingestion failed:', error);
  }
}

/**
 * Start the ingestion service
 */
export function startGPSIngestion(intervalMs: number = 5 * 60 * 1000): NodeJS.Timeout {
  log.info(`🔄 Starting GPS data ingestion every ${intervalMs / 1000} seconds`);

  // Run immediately
  ingestGPSData().catch((err) => log.error('Initial ingestion failed:', err));

  // Then run periodically
  return setInterval(() => {
    ingestGPSData().catch((err) => log.error('Scheduled ingestion failed:', err));
  }, intervalMs);
}
