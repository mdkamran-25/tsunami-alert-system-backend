import * as ee from '@google/earthengine';
import * as fs from 'fs';
import { childLogger } from '../utils/logger.js';

const logger = childLogger('earthengine');

let eeInitialized = false;
let eeAvailable = false;

export async function initializeEarthEngine(): Promise<void> {
  if (eeInitialized) {
    return;
  }

  eeInitialized = true;

  return new Promise((resolve) => {
    try {
      const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

      if (!credentialsPath) {
        logger.warn('⚠️ GOOGLE_APPLICATION_CREDENTIALS not set - using fallback mode');
        eeAvailable = false;
        resolve();
        return;
      }

      // Read and parse service account credentials
      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));

      logger.info('Authenticating with Earth Engine using service account...');

      (ee.data as any).authenticateViaPrivateKey(credentials, () => {
        (ee as any).initialize(null, null, () => {
          eeAvailable = true;
          logger.info('✅ Earth Engine initialized successfully');
          resolve();
        });
      });

      // Set timeout for initialization
      setTimeout(() => {
        if (!eeAvailable) {
          logger.warn('⚠️ Earth Engine initialization timeout - using fallback mode');
          resolve();
        }
      }, 5000);
    } catch (error) {
      logger.warn('⚠️ Earth Engine initialization failed, using fallback:', error);
      eeAvailable = false;
      resolve();
    }
  });
}

// Fallback mock data generator
function generateMockSatelliteData(region: { name: string; bounds: number[][] }): {
  imageUrl: string;
  anomalyScore: number;
  timestamp: Date;
  metadata: any;
} {
  // Generate realistic anomaly scores
  const baseScore = Math.random() * 0.4; // Most readings 0-0.4 (normal)
  const anomalyScore = Math.random() > 0.85 ? Math.random() * 1 : baseScore; // 15% chance of anomaly

  // Simple SVG placeholder image as base64
  const svgBase64 =
    'PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5TYXRlbGxpdGUgSW1hZ2VyeTwvdGV4dD48L3N2Zz4=';

  return {
    imageUrl: `data:image/svg+xml;base64,${svgBase64}`,
    anomalyScore: Math.round(anomalyScore * 100) / 100,
    timestamp: new Date(),
    metadata: {
      satellite: 'Sentinel-1 (Simulated)',
      sensor: 'SAR (Synthetic Aperture Radar)',
      resolution: '10m',
      band: 'VV (Vertical-Vertical Polarization)',
      mode: 'IW (Interferometric Wide swath)',
      region: region.name,
      dataSource: 'Fallback Mode',
    },
  };
}

export async function fetchSatelliteImage(region: { name: string; bounds: number[][] }): Promise<{
  imageUrl: string;
  anomalyScore: number;
  timestamp: Date;
  metadata: any;
}> {
  await initializeEarthEngine();

  try {
    logger.info(`📡 Fetching satellite data for: ${region.name}`);

    if (!eeAvailable) {
      logger.info(`⚠️ Using fallback data for ${region.name}`);
      return generateMockSatelliteData(region);
    }

    // Create polygon geometry from bounds [[minLon, minLat], [maxLon, maxLat]]
    const coords = [
      [region.bounds[0][0], region.bounds[0][1]],
      [region.bounds[1][0], region.bounds[0][1]],
      [region.bounds[1][0], region.bounds[1][1]],
      [region.bounds[0][0], region.bounds[1][1]],
    ];

    const geometry = (ee.Geometry as any).Polygon([coords]);

    // Load Sentinel-1 SAR imagery (C-band, works in all weather conditions)
    const sentinel1 = (ee as any)
      .ImageCollection('COPERNICUS/S1_GRD')
      .filterBounds(geometry)
      .filterDate('2024-11-23', '2024-12-23')
      .filter((ee.Filter as any).eq('instrumentMode', 'IW'))
      .select('VV');

    // Check if data exists
    const imageCount = sentinel1.size().getInfo();
    if (imageCount === 0) {
      logger.info(`No Earth Engine data found for ${region.name}, using fallback`);
      return generateMockSatelliteData(region);
    }

    logger.info(`Found ${imageCount} Sentinel-1 images for ${region.name}`);

    // Get the most recent image
    const latestImage = sentinel1.sort('system:time_start', false).first();

    // Calculate baseline (historical median)
    const baseline = (ee as any)
      .ImageCollection('COPERNICUS/S1_GRD')
      .filterBounds(geometry)
      .filterDate('2024-01-01', '2024-11-22')
      .filter((ee.Filter as any).eq('instrumentMode', 'IW'))
      .select('VV')
      .median();

    // Calculate anomaly as deviation from baseline
    const anomaly = latestImage
      .subtract(baseline)
      .abs()
      .reduceRegion({
        reducer: (ee.Reducer as any).mean(),
        geometry: geometry,
        scale: 10,
      });

    // Visualization parameters
    const visParams = {
      bands: ['VV'],
      min: -25,
      max: 5,
      palette: ['#000000', '#0033ff', '#00ff00', '#ffff00', '#ff0000'],
    };

    // Get map tile URL
    const mapId = (ee.data as any).getMapId({
      image: latestImage,
      visualization: visParams,
    });

    const imageUrl = `https://earthengine.googleapis.com/v1alpha/projects/earthengine-legacy/maps/${mapId.mapid}/tiles/{z}/{x}/{y}?token=${mapId.token}`;

    // Get anomaly value and normalize
    const anomalyValue = anomaly.getInfo();
    const rawScore = Math.abs((anomalyValue?.VV || 0) / 10);
    const normalizedScore = Math.min(1, rawScore);

    logger.info(`✅ ${region.name}: Anomaly Score = ${(normalizedScore * 100).toFixed(2)}%`);

    return {
      imageUrl,
      anomalyScore: Math.round(normalizedScore * 100) / 100,
      timestamp: new Date(),
      metadata: {
        satellite: 'Sentinel-1',
        sensor: 'SAR (Synthetic Aperture Radar)',
        resolution: '10m',
        band: 'VV (Vertical-Vertical Polarization)',
        mode: 'IW (Interferometric Wide swath)',
        region: region.name,
      },
    };
  } catch (error) {
    logger.error(`❌ Error fetching ${region.name}:`, error);
    logger.info(`⚠️ Falling back to mock data for ${region.name}`);
    return generateMockSatelliteData(region);
  }
}

export async function fetchMultipleRegions(
  regions: Array<{ name: string; bounds: number[][] }>,
): Promise<
  Array<{
    region: string;
    imageUrl: string;
    anomalyScore: number;
    timestamp: Date;
    metadata: any;
  }>
> {
  const results = await Promise.allSettled(regions.map((region) => fetchSatelliteImage(region)));

  const successful = results
    .map((result, index) => {
      if (result.status === 'fulfilled') {
        return {
          region: regions[index].name,
          ...result.value,
        };
      } else {
        logger.error(
          `Failed to fetch ${regions[index].name}:`,
          (result as PromiseRejectedResult).reason,
        );
        return null;
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  logger.info(`✅ Successfully fetched ${successful.length}/${regions.length} regions`);

  return successful;
}
