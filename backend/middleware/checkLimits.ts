import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

export const checkTeamLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = (req as any).user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { teamMemberships: { where: { role: "OWNER" } } }, // Only count owned teams
  });

  if (!user) return res.status(401).json({ error: "User not found" });

  if (user.teamMemberships.length >= user.maxTeams) {
    return res.status(403).json({
      error: "Team limit reached",
      requiresUpgrade: true,
      message:
        "You need to purchase an 'Extra Team' add-on to create more teams.",
    });
  }

  next();
};

export const checkMemberLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = (req as any).user.id;
  const { teamId } = req.body; // Assuming teamId is in body

  // 1. Get the team and count current members
  const teamCount = await prisma.teamMember.count({
    where: { teamId },
  });

  // 2. Get the Team Owner's limits (The one who pays)
  // Note: We need to find the OWNER of this team, not necessarily the current requester
  const teamOwnerLink = await prisma.teamMember.findFirst({
    where: { teamId, role: "OWNER" },
    include: { user: true },
  });

  if (!teamOwnerLink)
    return res.status(404).json({ error: "Team owner not found" });

  const owner = teamOwnerLink.user;

  if (teamCount >= owner.maxSeats) {
    return res.status(403).json({
      error: "Seat limit reached",
      requiresUpgrade: true,
      message: `The team owner has reached their limit of ${owner.maxSeats} members. They need to purchase extra seats.`,
    });
  }

  next();
};
