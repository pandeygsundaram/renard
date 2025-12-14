const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

async function createAdminTeam() {
  const email = 'admin@devgraph.io';

  try {
    // Find admin user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error('Admin user not found! Run create-admin.js first.');
      return;
    }

    // Check if team already exists
    const existingTeam = await prisma.team.findFirst({
      where: {
        members: {
          some: { userId: user.id },
        },
      },
    });

    if (existingTeam) {
      console.log('Admin already has a team:', existingTeam.name);
      console.log('Team ID:', existingTeam.id);
      return;
    }

    // Create team
    const team = await prisma.team.create({
      data: {
        name: 'Admin Team',
        description: 'Administrative team',
        type: 'ORGANIZATION',
        isActive: true,
      },
    });

    // Add admin as owner
    await prisma.teamMember.create({
      data: {
        userId: user.id,
        teamId: team.id,
        role: 'OWNER',
      },
    });

    console.log('✓ Admin team created successfully!');
    console.log('Team ID:', team.id);
    console.log('Team Name:', team.name);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminTeam();
