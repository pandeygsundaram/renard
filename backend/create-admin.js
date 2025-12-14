const { PrismaClient } = require('./generated/prisma');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createAdmin() {
  const email = 'admin@devgraph.io';
  const password = 'Admin@123456';
  const name = 'Admin User';

  try {
    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      console.log('Admin user already exists!');
      console.log('Email:', email);
      console.log('Password: (use the one you created with)');

      // Make sure they're admin
      await prisma.user.update({
        where: { email },
        data: { role: 'ADMIN' },
      });
      console.log('✓ User role updated to ADMIN');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'ADMIN',
        accountType: 'INDIVIDUAL',
        apiKey: `admin_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      },
    });

    console.log('✓ Admin user created successfully!');
    console.log('');
    console.log('=== ADMIN CREDENTIALS ===');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('API Key:', user.apiKey);
    console.log('========================');
    console.log('');
    console.log('IMPORTANT: Save these credentials! The password is hashed in the database.');
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
