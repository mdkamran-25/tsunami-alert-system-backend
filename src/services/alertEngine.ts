import { childLogger } from '../utils/logger.js';
import prisma from '../lib/prisma.js';
import { notifySubscribedUsers } from './notificationService.js';

const log = childLogger('alert-engine');

interface AlertCriteria {
  gpsMagnitudeThreshold: number;
  satelliteAnomalyThreshold: number;
  minConfidence: number;
  checkIntervalMs: number;
}

const DEFAULT_CRITERIA: AlertCriteria = {
  gpsMagnitudeThreshold: 100, // mm
  satelliteAnomalyThreshold: 0.7, // 0-1 scale
  minConfidence: 85, // %
  checkIntervalMs: 2 * 60 * 1000, // 2 minutes
};

/**
 * Map displacement magnitude to alert level
 */
function getMagnitudeLevel(magnitude: number): {
  level: 'CRITICAL' | 'MEDIUM' | 'LOW' | 'NONE';
  status: 'ALERT' | 'WARNING' | 'WATCH' | 'SAFE';
  message: string;
} {
  if (magnitude > 200) {
    return {
      level: 'CRITICAL',
      status: 'ALERT',
      message: `🚨 CRITICAL: Significant ground displacement (${magnitude.toFixed(0)}mm)`,
    };
  }

  if (magnitude > 100) {
    return {
      level: 'MEDIUM',
      status: 'WARNING',
      message: `⚠️ WARNING: Significant displacement detected (${magnitude.toFixed(0)}mm)`,
    };
  }

  if (magnitude > 50) {
    return {
      level: 'LOW',
      status: 'WATCH',
      message: `👀 WATCH: Notable displacement (${magnitude.toFixed(0)}mm)`,
    };
  }

  return {
    level: 'NONE',
    status: 'SAFE',
    message: 'No significant activity',
  };
}

/**
 * Check GPS readings for anomalies and create alerts
 */
async function checkGPSAnomalies(criteria: AlertCriteria): Promise<void> {
  try {
    const checkTimeWindow = new Date(Date.now() - 15 * 60 * 1000); // Last 15 minutes

    // Get high-magnitude readings
    const anomalies = await prisma.gPSReading.findMany({
      where: {
        magnitude: { gte: criteria.gpsMagnitudeThreshold },
        confidence: { gte: criteria.minConfidence },
        timestamp: { gte: checkTimeWindow },
      },
      include: { station: true },
      orderBy: { magnitude: 'desc' },
    });

    for (const reading of anomalies) {
      // Check if we already created an alert for this
      const existingAlert = await prisma.alertStatusRecord.findFirst({
        where: {
          gpsTriggered: true,
          createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) }, // Last 30 min
          region: getRegionFromCoords(reading.latitude, reading.longitude),
        },
      });

      if (!existingAlert) {
        const { level, status, message } = getMagnitudeLevel(reading.magnitude);

        const alert = await prisma.alertStatusRecord.create({
          data: {
            status,
            level,
            message,
            region: getRegionFromCoords(reading.latitude, reading.longitude),
            gpsTriggered: true,
            satelliteTriggered: false,
            isActive: true,
          },
        });

        log.warn(`🚨 GPS ALERT CREATED: ${status} - ${message}`);
        log.info(
          `   Station: ${reading.station.name} (${reading.latitude.toFixed(2)}, ${reading.longitude.toFixed(2)})`,
        );
        log.info(
          `   Magnitude: ${reading.magnitude.toFixed(2)}mm, Confidence: ${reading.confidence.toFixed(1)}%`,
        );

        // Notify subscribed users about the alert
        try {
          const notifiedCount = await notifySubscribedUsers(alert);
          log.info(`📧 Alert notification sent to ${notifiedCount} users`);
        } catch (notifyError) {
          log.error('❌ Failed to send alert notifications:', notifyError);
        }
      }
    }
  } catch (error) {
    log.error('❌ GPS anomaly check failed:', error);
  }
}

/**
 * Check satellite data for anomalies and create alerts
 */
async function checkSatelliteAnomalies(criteria: AlertCriteria): Promise<void> {
  try {
    const checkTimeWindow = new Date(Date.now() - 30 * 60 * 1000); // Last 30 minutes

    // Get high-anomaly readings
    const anomalies = await prisma.satelliteData.findMany({
      where: {
        anomalyScore: { gte: criteria.satelliteAnomalyThreshold },
        timestamp: { gte: checkTimeWindow },
      },
      orderBy: { anomalyScore: 'desc' },
    });

    for (const satellite of anomalies) {
      // Check if we already created an alert
      const existingAlert = await prisma.alertStatusRecord.findFirst({
        where: {
          satelliteTriggered: true,
          createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
          region: satellite.region,
        },
      });

      if (!existingAlert) {
        const alertLevel = satellite.anomalyScore > 0.85 ? 'MEDIUM' : 'LOW';
        const alertStatus = satellite.anomalyScore > 0.85 ? 'WARNING' : 'WATCH';

        const alert = await prisma.alertStatusRecord.create({
          data: {
            status: alertStatus,
            level: alertLevel,
            message: `📡 SATELLITE: Anomaly detected (score: ${satellite.anomalyScore.toFixed(2)})`,
            region: satellite.region,
            gpsTriggered: false,
            satelliteTriggered: true,
            isActive: true,
          },
        });

        log.warn(
          `📡 SATELLITE ALERT: ${satellite.region} (anomaly: ${satellite.anomalyScore.toFixed(2)})`,
        );

        // Notify subscribed users about the alert
        try {
          const notifiedCount = await notifySubscribedUsers(alert);
          log.info(`📧 Alert notification sent to ${notifiedCount} users`);
        } catch (notifyError) {
          log.error('❌ Failed to send alert notifications:', notifyError);
        }
      }
    }
  } catch (error) {
    log.error('❌ Satellite anomaly check failed:', error);
  }
}

/**
 * Main alert checking function
 */
async function checkAndTriggerAlerts(criteria: AlertCriteria = DEFAULT_CRITERIA): Promise<void> {
  try {
    log.debug('🔍 Checking for anomalies...');

    // Check both data sources
    await Promise.all([checkGPSAnomalies(criteria), checkSatelliteAnomalies(criteria)]);

    log.debug('✅ Anomaly check complete');
  } catch (error) {
    log.error('❌ Alert check failed:', error);
  }
}

/**
 * Get region from coordinates
 */
function getRegionFromCoords(lat: number, lon: number): string {
  if (lon >= -130 && lon <= -120 && lat >= 44 && lat <= 50) return 'Pacific Northwest (Cascadia)';
  if (lon >= -165 && lon <= -140 && lat >= 50 && lat <= 65) return 'Alaska Aleutian';
  if (lon >= 90 && lon <= 150 && lat >= -10 && lat <= 20) return 'Indo-Pacific Ring';
  if (lon >= 130 && lon <= 145 && lat >= 30 && lat <= 45) return 'Japan Trench';
  if (lon >= -77 && lon <= -70 && lat >= -45 && lat <= -5) return 'Peru-Chile Trench';
  return 'Unknown Region';
}

/**
 * Start the alert engine service
 */
export function startAlertEngine(criteria: AlertCriteria = DEFAULT_CRITERIA): NodeJS.Timeout {
  log.info(`🚨 Starting Alert Engine`);
  log.info(`   GPS Threshold: ${criteria.gpsMagnitudeThreshold}mm`);
  log.info(`   Satellite Threshold: ${criteria.satelliteAnomalyThreshold}`);
  log.info(`   Check Interval: ${criteria.checkIntervalMs / 1000}s`);

  // Run immediately
  checkAndTriggerAlerts(criteria).catch((err) => log.error('Initial check failed:', err));

  // Then run periodically
  return setInterval(() => {
    checkAndTriggerAlerts(criteria).catch((err) => log.error('Scheduled check failed:', err));
  }, criteria.checkIntervalMs);
}

export { checkAndTriggerAlerts };
