import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: 'admin@tsunami.local' },
    update: {},
    create: {
      email: 'admin@tsunami.local',
      displayName: 'Admin User',
      role: 'ADMIN',
      preferences: {
        create: {
          alertTypes: ['WATCH', 'WARNING', 'ALERT'],
          monitoredRegions: ['Pacific Northwest', 'Northern California'],
        },
      },
    },
  });

  console.log('✅ Created admin user:', user.email);

  // Create GPS stations
  const gpsStations = [
    {
      stationId: 'ALBH',
      name: 'Alberni, BC',
      network: 'PBO',
      latitude: 49.2378,
      longitude: -124.8056,
      elevation: 45.2,
    },
    {
      stationId: 'NANO',
      name: 'Nanaimo, BC',
      network: 'PBO',
      latitude: 49.1666,
      longitude: -123.9406,
      elevation: 23.5,
    },
    {
      stationId: 'P202',
      name: 'Port Angeles, WA',
      network: 'PBO',
      latitude: 48.1178,
      longitude: -123.4307,
      elevation: 12.1,
    },
    {
      stationId: 'SEAT',
      name: 'Seattle, WA',
      network: 'PBO',
      latitude: 47.6062,
      longitude: -122.3321,
      elevation: 175.0,
    },
  ];

  for (const station of gpsStations) {
    await prisma.gPSStation.upsert({
      where: { stationId: station.stationId },
      update: {},
      create: station,
    });
  }

  console.log(`✅ Created ${gpsStations.length} GPS stations`);

  // Create initial alert status
  const alert = await prisma.alertStatusRecord.upsert({
    where: { alertId: 'INITIAL-STATUS' },
    update: {},
    create: {
      alertId: 'INITIAL-STATUS',
      status: 'SAFE',
      level: 'NONE',
      confidence: 15.0,
      message: '✅ Normal conditions - System initialized',
      region: 'Pacific Northwest',
      gpsTriggered: false,
      satelliteTriggered: false,
      isActive: true,
    },
  });

  console.log('✅ Created initial alert status:', alert.alertId);

  // Create system health record
  const health = await prisma.systemHealth.create({
    data: {
      overallStatus: 'HEALTHY',
      uptime: 100.0,
      metrics: JSON.stringify({
        responseTime: 145,
        errorRate: 0,
        dataFreshness: 'current',
      }),
      components: {
        create: [
          {
            name: 'Database',
            status: 'HEALTHY',
            responseTime: 50,
            errorRate: 0,
          },
          {
            name: 'GPS Data Pipeline',
            status: 'HEALTHY',
            responseTime: 200,
            errorRate: 0,
          },
          {
            name: 'Satellite Pipeline',
            status: 'HEALTHY',
            responseTime: 500,
            errorRate: 0,
          },
          {
            name: 'Alert Detection',
            status: 'HEALTHY',
            responseTime: 150,
            errorRate: 0,
          },
          {
            name: 'Notification Service',
            status: 'HEALTHY',
            responseTime: 300,
            errorRate: 0,
          },
        ],
      },
    },
  });

  console.log('✅ Created system health record');

  // Create sample GPS readings for demonstration
  // Get station data for reference
  const stations = await prisma.gPSStation.findMany();

  for (const station of stations) {
    // Create 3 readings per station with varying displacement values
    const readings = [
      { displacementX: 2.5, displacementY: -1.2, displacementZ: 0.8, magnitude: 2.8 },
      { displacementX: 2.3, displacementY: -1.1, displacementZ: 0.9, magnitude: 2.7 },
      { displacementX: 2.6, displacementY: -1.3, displacementZ: 0.7, magnitude: 2.9 },
    ];

    for (const reading of readings) {
      await prisma.gPSReading.create({
        data: {
          stationId: station.id,
          latitude: station.latitude,
          longitude: station.longitude,
          elevation: station.elevation,
          displacementX: reading.displacementX,
          displacementY: reading.displacementY,
          displacementZ: reading.displacementZ,
          magnitude: reading.magnitude,
          timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000), // Random time in last 24h
        },
      });
    }
  }

  console.log(`✅ Created ${stations.length * 3} sample GPS readings`);

  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
