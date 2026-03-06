-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OPERATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "GPSQuality" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('SAFE', 'WATCH', 'WARNING', 'ALERT');

-- CreateEnum
CREATE TYPE "AlertLevel" AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "DetectionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EMAIL', 'SMS', 'PUSH', 'IN_APP', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED');

-- CreateEnum
CREATE TYPE "ComponentStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'UNHEALTHY', 'UNKNOWN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "photoURL" TEXT,
    "firebaseUID" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "alertTypes" TEXT[] DEFAULT ARRAY['WATCH', 'WARNING', 'ALERT']::TEXT[],
    "monitoredRegions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "smsNotifications" BOOLEAN NOT NULL DEFAULT false,
    "pushNotifications" BOOLEAN NOT NULL DEFAULT true,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "language" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GPSStation" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "network" TEXT NOT NULL DEFAULT 'PBO',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "elevation" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GPSStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GPSReading" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "elevation" DOUBLE PRECISION NOT NULL,
    "displacementX" DOUBLE PRECISION NOT NULL,
    "displacementY" DOUBLE PRECISION NOT NULL,
    "displacementZ" DOUBLE PRECISION NOT NULL,
    "magnitude" DOUBLE PRECISION NOT NULL,
    "quality" "GPSQuality" NOT NULL DEFAULT 'GOOD',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 95.0,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GPSReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SatelliteData" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "cloudinaryPublicId" TEXT,
    "region" TEXT NOT NULL,
    "regionBounds" TEXT NOT NULL,
    "regionCenter" TEXT NOT NULL,
    "anomalyScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "anomalyDetected" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL,
    "processingInfo" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SatelliteData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertStatusRecord" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'SAFE',
    "level" "AlertLevel" NOT NULL DEFAULT 'NONE',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "message" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "gpsTriggered" BOOLEAN NOT NULL DEFAULT false,
    "satelliteTriggered" BOOLEAN NOT NULL DEFAULT false,
    "anomalyDetails" JSONB,
    "estimatedImpactTime" TIMESTAMP(3),
    "affectedAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "evacuationZones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertStatusRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetectionResult" (
    "id" TEXT NOT NULL,
    "alertId" TEXT,
    "status" "DetectionStatus" NOT NULL DEFAULT 'PENDING',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gpsAnalysis" JSONB NOT NULL,
    "gpsAnomalyDetected" BOOLEAN NOT NULL DEFAULT false,
    "gpsConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "satelliteAnalysis" JSONB NOT NULL,
    "satelliteAnomalyDetected" BOOLEAN NOT NULL DEFAULT false,
    "satelliteConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "combinedAnalysis" JSONB NOT NULL,
    "combinedConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "recommendedAction" TEXT,
    "processingTime" INTEGER NOT NULL DEFAULT 0,
    "region" TEXT NOT NULL,
    "metadata" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetectionResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "htmlContent" TEXT,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "metadata" JSONB,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemHealth" (
    "id" TEXT NOT NULL,
    "overallStatus" "ComponentStatus" NOT NULL DEFAULT 'HEALTHY',
    "uptime" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "metrics" JSONB NOT NULL,
    "lastCheck" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemHealth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentHealth" (
    "id" TEXT NOT NULL,
    "systemHealthId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ComponentStatus" NOT NULL DEFAULT 'UNKNOWN',
    "responseTime" INTEGER NOT NULL DEFAULT 0,
    "errorRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "lastCheck" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComponentHealth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "changes" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataIngestionLog" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
    "recordsFailed" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "errorMessage" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataIngestionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUID_key" ON "User"("firebaseUID");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_firebaseUID_idx" ON "User"("firebaseUID");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_userId_key" ON "UserPreferences"("userId");

-- CreateIndex
CREATE INDEX "UserPreferences_userId_idx" ON "UserPreferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_token_idx" ON "RefreshToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "GPSStation_stationId_key" ON "GPSStation"("stationId");

-- CreateIndex
CREATE INDEX "GPSStation_stationId_idx" ON "GPSStation"("stationId");

-- CreateIndex
CREATE INDEX "GPSStation_latitude_longitude_idx" ON "GPSStation"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "GPSStation_network_idx" ON "GPSStation"("network");

-- CreateIndex
CREATE INDEX "GPSReading_stationId_idx" ON "GPSReading"("stationId");

-- CreateIndex
CREATE INDEX "GPSReading_timestamp_idx" ON "GPSReading"("timestamp");

-- CreateIndex
CREATE INDEX "GPSReading_magnitude_idx" ON "GPSReading"("magnitude");

-- CreateIndex
CREATE INDEX "SatelliteData_region_idx" ON "SatelliteData"("region");

-- CreateIndex
CREATE INDEX "SatelliteData_timestamp_idx" ON "SatelliteData"("timestamp");

-- CreateIndex
CREATE INDEX "SatelliteData_anomalyScore_idx" ON "SatelliteData"("anomalyScore");

-- CreateIndex
CREATE UNIQUE INDEX "AlertStatusRecord_alertId_key" ON "AlertStatusRecord"("alertId");

-- CreateIndex
CREATE INDEX "AlertStatusRecord_region_idx" ON "AlertStatusRecord"("region");

-- CreateIndex
CREATE INDEX "AlertStatusRecord_status_idx" ON "AlertStatusRecord"("status");

-- CreateIndex
CREATE INDEX "AlertStatusRecord_timestamp_idx" ON "AlertStatusRecord"("timestamp");

-- CreateIndex
CREATE INDEX "AlertStatusRecord_isActive_idx" ON "AlertStatusRecord"("isActive");

-- CreateIndex
CREATE INDEX "DetectionResult_alertId_idx" ON "DetectionResult"("alertId");

-- CreateIndex
CREATE INDEX "DetectionResult_status_idx" ON "DetectionResult"("status");

-- CreateIndex
CREATE INDEX "DetectionResult_timestamp_idx" ON "DetectionResult"("timestamp");

-- CreateIndex
CREATE INDEX "DetectionResult_region_idx" ON "DetectionResult"("region");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_status_idx" ON "Notification"("status");

-- CreateIndex
CREATE INDEX "Notification_recipient_idx" ON "Notification"("recipient");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "SystemHealth_overallStatus_idx" ON "SystemHealth"("overallStatus");

-- CreateIndex
CREATE INDEX "SystemHealth_lastCheck_idx" ON "SystemHealth"("lastCheck");

-- CreateIndex
CREATE INDEX "ComponentHealth_systemHealthId_idx" ON "ComponentHealth"("systemHealthId");

-- CreateIndex
CREATE INDEX "ComponentHealth_status_idx" ON "ComponentHealth"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ComponentHealth_systemHealthId_name_key" ON "ComponentHealth"("systemHealthId", "name");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_resource_idx" ON "AuditLog"("resource");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "DataIngestionLog_source_idx" ON "DataIngestionLog"("source");

-- CreateIndex
CREATE INDEX "DataIngestionLog_status_idx" ON "DataIngestionLog"("status");

-- CreateIndex
CREATE INDEX "DataIngestionLog_createdAt_idx" ON "DataIngestionLog"("createdAt");

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GPSReading" ADD CONSTRAINT "GPSReading_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "GPSStation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetectionResult" ADD CONSTRAINT "DetectionResult_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "AlertStatusRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentHealth" ADD CONSTRAINT "ComponentHealth_systemHealthId_fkey" FOREIGN KEY ("systemHealthId") REFERENCES "SystemHealth"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
