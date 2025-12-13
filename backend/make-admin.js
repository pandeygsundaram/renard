const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

async function makeAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: node make-admin.js <email>');
    process.exit(1);
  }

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' },
    });

    console.log(`✓ User ${user.email} is now an ADMIN`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Name: ${user.name}`);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

makeAdmin();
