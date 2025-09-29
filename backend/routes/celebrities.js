const express = require("express");
const { PrismaClient } = require("../generated/prisma");
const {
  isUserCelebrity,
  getAllCelebrities,
  calculateCelebrityWeight,
} = require("../utils/celebrityDetection");

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/celebrities
 * Get all celebrity users in the system
 */
router.get("/", async (req, res) => {
  try {
    // Get query parameters with defaults
    const followerThreshold = parseInt(req.query.followers) || 5;
    const commentTreeThreshold = parseInt(req.query.comments) || 10;
    const requireComments = req.query.requireComments === "true";

    const celebrities = await getAllCelebrities(
      followerThreshold,
      commentTreeThreshold,
      requireComments
    );

    res.json(celebrities);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch celebrities" });
  }
});

/**
 * GET /api/celebrities/:userId
 * Check if a specific user is a celebrity
 */
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Get query parameters with defaults
    const followerThreshold = parseInt(req.query.followers) || 5;
    const commentTreeThreshold = parseInt(req.query.comments) || 10;

    const isCelebrity = await isUserCelebrity(
      userId,
      followerThreshold,
      commentTreeThreshold
    );

    // Get user details including follower count
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: {
        id: true,
        num_followers: true,
        celebrity_weight: true,
      },
    });

    // Calculate weight based on follower count
    const calculatedWeight = calculateCelebrityWeight(user?.num_followers || 0);

    res.json({
      userId,
      isCelebrity,
      followerCount: user?.num_followers || 0,
      currentWeight: user?.celebrity_weight || 1.0,
      calculatedWeight,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to check celebrity status" });
  }
});

/**
 * POST /api/celebrities/:userId/update-weight
 * Update a user's celebrity weight
 */
router.post("/:userId/update-weight", async (req, res) => {
  try {
    const { userId } = req.params;
    const userIdInt = parseInt(userId);

    // Get the user
    const user = await prisma.user.findUnique({
      where: { id: userIdInt },
      select: { num_followers: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Calculate weight based on follower count
    const weight = calculateCelebrityWeight(user.num_followers);

    // Update the user's celebrity weight
    const updatedUser = await prisma.user.update({
      where: { id: userIdInt },
      data: { celebrity_weight: weight },
      select: {
        id: true,
        num_followers: true,
        celebrity_weight: true,
      },
    });

    res.json({
      message: "Celebrity weight updated successfully",
      userId: userIdInt,
      followerCount: updatedUser.num_followers,
      celebrityWeight: updatedUser.celebrity_weight,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update celebrity weight" });
  }
});

/**
 * POST /api/celebrities/update-all-weights
 * Update all users' celebrity weights
 */
router.post("/update-all-weights", async (_, res) => {
  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: { id: true, num_followers: true },
    });

    // Update each user's weight
    const updates = [];
    for (const user of users) {
      const weight = calculateCelebrityWeight(user.num_followers);
      updates.push(
        prisma.user.update({
          where: { id: user.id },
          data: { celebrity_weight: weight },
        })
      );
    }

    // Execute all updates
    await Promise.all(updates);

    res.json({
      message: "All celebrity weights updated successfully",
      updatedCount: users.length,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update celebrity weights" });
  }
});

module.exports = router;
