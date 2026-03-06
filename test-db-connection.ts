import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');

    const result = await prisma.$queryRaw`SELECT NOW()`;
    console.log('✅ Connection successful!', result);
  } catch (error) {
    console.error('❌ Connection failed!');
    console.error('Error:', (error as Error).message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
