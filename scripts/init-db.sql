-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create hypertable for GPS readings (time-series data)
SELECT create_hypertable(
  'public."GPSReading"',
  'timestamp',
  if_not_exists => TRUE
);

-- Create hypertable for satellite data
SELECT create_hypertable(
  'public."SatelliteData"',
  'timestamp',
  if_not_exists => TRUE
);

-- Create hypertable for component health metrics
SELECT create_hypertable(
  'public."ComponentHealth"',
  'createdAt',
  if_not_exists => TRUE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_gps_station_location" ON "GPSStation" 
  USING GIST(ll_to_earth(latitude, longitude));

CREATE INDEX IF NOT EXISTS "idx_satellite_region" ON "SatelliteData" (region);

CREATE INDEX IF NOT EXISTS "idx_alert_status_region" ON "AlertStatusRecord" (region, status);

-- Verify extensions are active
SELECT * FROM pg_extension WHERE extname IN ('postgis', 'timescaledb');
