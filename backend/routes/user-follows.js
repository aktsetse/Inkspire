const express = require("express");
const { PrismaClient } = require("../generated/prisma");

const router = express.Router();
const prisma = new PrismaClient();

// Get followers for a user
router.get("/followers/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const followers = await prisma.userFollows.findMany({
      where: {
        following_id: parseInt(userId),
      },
      include: {
        follower: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            bio: true,
            supabase_id: true,
            num_followers: true,
            num_following: true,
          },
        },
      },
    });

    const formattedFollowers = followers.map((follow) => follow.follower);

    res.json(formattedFollowers);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get users that a user is following
router.get("/following/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const following = await prisma.userFollows.findMany({
      where: {
        follower_id: parseInt(userId),
      },
      include: {
        following: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            bio: true,
            supabase_id: true,
            num_followers: true,
            num_following: true,
          },
        },
      },
    });

    const formattedFollowing = following.map((follow) => follow.following);

    res.json(formattedFollowing);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Follow a user
router.post("/follow", async (req, res) => {
  try {
    const { followerId, followingId } = req.body;

    // Check if users exist
    const follower = await prisma.user.findUnique({
      where: { id: parseInt(followerId) },
    });

    const following = await prisma.user.findUnique({
      where: { id: parseInt(followingId) },
    });

    if (!follower || !following) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if already following
    const existingFollow = await prisma.userFollows.findFirst({
      where: {
        follower_id: parseInt(followerId),
        following_id: parseInt(followingId),
      },
    });

    if (existingFollow) {
      return res.status(400).json({ error: "Already following this user" });
    }

    // Create follow relationship
    await prisma.$transaction([
      // Create the follow relationship
      prisma.userFollows.create({
        data: {
          follower_id: parseInt(followerId),
          following_id: parseInt(followingId),
        },
      }),

      // Update follower's following count
      prisma.user.update({
        where: { id: parseInt(followerId) },
        data: { num_following: { increment: 1 } },
      }),

      // Update following's follower count
      prisma.user.update({
        where: { id: parseInt(followingId) },
        data: { num_followers: { increment: 1 } },
      }),
    ]);

    res.status(201).json({ message: "Successfully followed user" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Unfollow a user
router.delete("/unfollow", async (req, res) => {
  try {
    const { followerId, followingId } = req.body;

    // Check if the follow relationship exists
    const existingFollow = await prisma.userFollows.findFirst({
      where: {
        follower_id: parseInt(followerId),
        following_id: parseInt(followingId),
      },
    });

    if (!existingFollow) {
      return res.status(400).json({ error: "Not following this user" });
    }

    // Delete follow relationship
    await prisma.$transaction([
      // Delete the follow relationship
      prisma.userFollows.deleteMany({
        where: {
          follower_id: parseInt(followerId),
          following_id: parseInt(followingId),
        },
      }),

      // Update follower's following count
      prisma.user.update({
        where: { id: parseInt(followerId) },
        data: { num_following: { decrement: 1 } },
      }),

      // Update following's follower count
      prisma.user.update({
        where: { id: parseInt(followingId) },
        data: { num_followers: { decrement: 1 } },
      }),
    ]);

    res.json({ message: "Successfully unfollowed user" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Check if a user is following another user
router.get("/is-following/:followerId/:followingId", async (req, res) => {
  try {
    const { followerId, followingId } = req.params;

    const existingFollow = await prisma.userFollows.findFirst({
      where: {
        follower_id: parseInt(followerId),
        following_id: parseInt(followingId),
      },
    });

    res.json({ isFollowing: !!existingFollow });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get follower and following counts for a user
router.get("/counts/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: {
        num_followers: true,
        num_following: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      followers: user.num_followers,
      following: user.num_following,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
