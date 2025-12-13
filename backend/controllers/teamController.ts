import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../config/database';

// Create a new team
export const createTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { name, description, type } = req.body;
    const userId = (req as any).user.id;

    const team = await prisma.team.create({
      data: {
        name,
        description,
        type: type || 'PERSONAL',
        members: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json({
      message: 'Team created successfully',
      team,
    });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all teams for the current user
export const getUserTeams = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    const teams = await prisma.team.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
        isActive: true,
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            Activity: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({ teams });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get a single team by ID
export const getTeamById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const team = await prisma.team.findFirst({
      where: {
        id,
        members: {
          some: {
            userId,
          },
        },
        isActive: true,
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
              },
            },
          },
        },
        _count: {
          select: {
            Activity: true,
          },
        },
      },
    });

    if (!team) {
      res.status(404).json({ error: 'Team not found or access denied' });
      return;
    }

    res.status(200).json({ team });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a team
export const updateTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, settings } = req.body;
    const userId = (req as any).user.id;

    // Check if user is owner or admin of the team
    const membership = await prisma.teamMember.findFirst({
      where: {
        teamId: id,
        userId,
        role: {
          in: ['OWNER', 'ADMIN'],
        },
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'Only team owners and admins can update the team' });
      return;
    }

    const team = await prisma.team.update({
      where: { id },
      data: {
        name,
        description,
        settings,
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      message: 'Team updated successfully',
      team,
    });
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a team (soft delete)
export const deleteTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    // Check if user is owner of the team
    const membership = await prisma.teamMember.findFirst({
      where: {
        teamId: id,
        userId,
        role: 'OWNER',
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'Only team owner can delete the team' });
      return;
    }

    const team = await prisma.team.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    res.status(200).json({
      message: 'Team deleted successfully',
      team,
    });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add a member to the team
export const addTeamMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { userEmail, role } = req.body;
    const userId = (req as any).user.id;

    // Check if current user is owner or admin
    const membership = await prisma.teamMember.findFirst({
      where: {
        teamId: id,
        userId,
        role: {
          in: ['OWNER', 'ADMIN'],
        },
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'Only team owners and admins can add members' });
      return;
    }

    // Find the user to add
    const userToAdd = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!userToAdd) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check if user is already a member
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId: userToAdd.id,
          teamId: id,
        },
      },
    });

    if (existingMember) {
      res.status(400).json({ error: 'User is already a team member' });
      return;
    }

    const teamMember = await prisma.teamMember.create({
      data: {
        teamId: id,
        userId: userToAdd.id,
        role: role || 'MEMBER',
        invitedBy: userId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({
      message: 'Team member added successfully',
      member: teamMember,
    });
  } catch (error) {
    console.error('Add team member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Remove a member from the team
export const removeTeamMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, memberId } = req.params;
    const userId = (req as any).user.id;

    // Check if current user is owner or admin
    const membership = await prisma.teamMember.findFirst({
      where: {
        teamId: id,
        userId,
        role: {
          in: ['OWNER', 'ADMIN'],
        },
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'Only team owners and admins can remove members' });
      return;
    }

    // Cannot remove owner
    const memberToRemove = await prisma.teamMember.findUnique({
      where: {
        id: memberId,
      },
    });

    if (!memberToRemove) {
      res.status(404).json({ error: 'Team member not found' });
      return;
    }

    if (memberToRemove.role === 'OWNER') {
      res.status(403).json({ error: 'Cannot remove team owner' });
      return;
    }

    await prisma.teamMember.delete({
      where: {
        id: memberId,
      },
    });

    res.status(200).json({
      message: 'Team member removed successfully',
    });
  } catch (error) {
    console.error('Remove team member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
