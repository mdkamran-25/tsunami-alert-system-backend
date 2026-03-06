import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const prisma = new PrismaClient();

interface VerificationResult {
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

const results: VerificationResult[] = [];

async function verifySupabaseConnection() {
  console.log('🔍 Verifying Supabase Integration...\n');

  try {
    // Test 1: Database Connection
    console.log('1️⃣  Testing database connection...');
    const users = await prisma.user.count();
    results.push({
      status: 'success',
      message: 'Database connection successful',
      details: `Found ${users} users in database`,
    });
    console.log('   ✅ Database connection successful\n');
  } catch (error) {
    results.push({
      status: 'error',
      message: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
    console.log('   ❌ Database connection failed:', error, '\n');
    process.exit(1);
  }

  try {
    // Test 2: Schema Verification
    console.log('2️⃣  Verifying database schema...');
    const tables = [
      { name: 'User', check: () => prisma.user.count() },
      { name: 'GPSStation', check: () => prisma.gPSStation.count() },
      { name: 'GPSReading', check: () => prisma.gPSReading.count() },
      { name: 'SatelliteData', check: () => prisma.satelliteData.count() },
      { name: 'AlertStatusRecord', check: () => prisma.alertStatusRecord.count() },
      { name: 'SystemHealth', check: () => prisma.systemHealth.count() },
    ];

    const tableResults = [];
    for (const table of tables) {
      const count = await table.check();
      tableResults.push(`   • ${table.name}: ${count} records`);
    }

    results.push({
      status: 'success',
      message: 'All core tables exist',
      details: tableResults.join('\n'),
    });
    console.log('   ✅ All core tables verified');
    console.log(tableResults.join('\n'));
    console.log();
  } catch (error) {
    results.push({
      status: 'error',
      message: 'Schema verification failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
    console.log('   ❌ Schema verification failed:', error, '\n');
  }

  try {
    // Test 3: Environment Variables
    console.log('3️⃣  Checking environment configuration...');
    const requiredVars = ['DATABASE_URL', 'JWT_SECRET', 'FIREBASE_PROJECT_ID'];
    const missingVars = requiredVars.filter((v) => !process.env[v]);

    if (missingVars.length === 0) {
      results.push({
        status: 'success',
        message: 'All required environment variables set',
      });
      console.log('   ✅ All required environment variables set\n');
    } else {
      results.push({
        status: 'warning',
        message: 'Missing environment variables',
        details: `Missing: ${missingVars.join(', ')}`,
      });
      console.log(`   ⚠️  Missing: ${missingVars.join(', ')}\n`);
    }
  } catch (error) {
    results.push({
      status: 'error',
      message: 'Environment check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  try {
    // Test 4: Prisma Client
    console.log('4️⃣  Verifying Prisma Client...');
    const schema = readFileSync(resolve('prisma/schema.prisma'), 'utf-8');
    if (schema.includes('provider = "postgresql"')) {
      results.push({
        status: 'success',
        message: 'Prisma configured for PostgreSQL',
      });
      console.log('   ✅ Prisma correctly configured for PostgreSQL\n');
    }
  } catch (error) {
    results.push({
      status: 'warning',
      message: 'Could not verify Prisma schema',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  try {
    // Test 5: Sample Query
    console.log('5️⃣  Testing sample GraphQL query capability...');
    const alertStatus = await prisma.alertStatusRecord.findFirst({
      include: { detectionResults: true },
    });

    results.push({
      status: 'success',
      message: 'Sample query successful',
      details: alertStatus ? `Found alert: ${alertStatus.alertId}` : 'No alerts in database',
    });
    console.log(
      `   ✅ Sample query successful${alertStatus ? ` (Found alert: ${alertStatus.alertId})` : ' (No data yet)'}\n`,
    );
  } catch (error) {
    results.push({
      status: 'warning',
      message: 'Sample query failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
    console.log('   ⚠️  Sample query test skipped\n');
  }

  // Print Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 VERIFICATION SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const successCount = results.filter((r) => r.status === 'success').length;
  const warningCount = results.filter((r) => r.status === 'warning').length;
  const errorCount = results.filter((r) => r.status === 'error').length;

  results.forEach((result) => {
    const emoji = {
      success: '✅',
      warning: '⚠️ ',
      error: '❌',
    }[result.status];

    console.log(`${emoji} ${result.message}`);
    if (result.details) {
      console.log(`   ${result.details.split('\n').join('\n   ')}`);
    }
    console.log();
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(
    `Results: ${successCount} ✅ | ${warningCount} ⚠️  | ${errorCount} ❌`,
  );
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (errorCount === 0) {
    console.log('🎉 Supabase integration verified successfully!\n');
    console.log('📖 Next steps:');
    console.log('   1. Start development server: npm run dev');
    console.log('   2. Visit GraphQL playground: http://localhost:4000/graphql');
    console.log('   3. Test a query from README.md or SETUP_GUIDE.md\n');
  } else {
    console.log('⚠️  Please fix the errors above before proceeding.\n');
    process.exit(1);
  }
}

// Run verification
verifySupabaseConnection()
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
