const express = require("express");
const { PrismaClient } = require("../generated/prisma");

const router = express.Router();
const prisma = new PrismaClient();

// Base weights for different interaction types
const baseWeights = {
  favorite: 5,
  shelf: 4,
  joinChannel: 3,
  comment: 2,
};

// Total interaction points per user
const TOTAL_INTERACTION_POINTS = 100;

// Activity thresholds for scaling total points
const ACTIVITY_THRESHOLDS = {
  low: 10, // Up to 10 interactions: base 100 points
  medium: 50, // 11-50 interactions: 125 points
  high: 200, // 51-200 interactions: 150 points
  veryHigh: 500, // 201+ interactions: 200 points
};

/**
 * Calculate dynamic weights based on user interaction counts
 * @param {Object} interactionCounts - Object containing counts of different interaction types
 * @returns {Object} - Object containing calculated dynamic weights and related data
 */
function calculateDynamicWeights(interactionCounts) {
  // Calculate total interactions to determine scaling factor
  const totalInteractions = Object.values(interactionCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  // Determine total points based on activity level
  let totalPoints = TOTAL_INTERACTION_POINTS;
  if (totalInteractions > ACTIVITY_THRESHOLDS.veryHigh) {
    totalPoints = 200;
  } else if (totalInteractions > ACTIVITY_THRESHOLDS.high) {
    totalPoints = 150;
  } else if (totalInteractions > ACTIVITY_THRESHOLDS.medium) {
    totalPoints = 125;
  }

  // Calculate dynamic weights based on interaction counts
  const dynamicWeights = {};
  Object.entries(baseWeights).forEach(([type, baseWeight]) => {
    const count = interactionCounts[type];
    if (count === 0) {
      dynamicWeights[type] = 0;
    } else {
      // Calculate the proportion of total points this interaction type should get
      const typeImportance =
        baseWeight / Object.values(baseWeights).reduce((sum, w) => sum + w, 0);
      const typePoints = totalPoints * typeImportance;
      // Distribute points evenly across all interactions of this type
      dynamicWeights[type] = typePoints / count;
    }
  });

  return {
    dynamicWeights,
    totalInteractions,
    totalPoints,
  };
}

// Update category scores for a user
router.post("/update", async (req, res) => {
  try {
    const { userId, categoryScores } = req.body;

    if (!userId || !categoryScores) {
      return res
        .status(400)
        .json({ error: "userId and categoryScores are required" });
    }

    // Convert userId to integer
    const userIdInt = parseInt(userId);

    // Delete existing scores for this user
    await prisma.userCategoryScore.deleteMany({
      where: { user_id: userIdInt },
    });

    // Insert new scores
    const scoreEntries = Object.entries(categoryScores).map(
      ([category, score]) => ({
        user_id: userIdInt,
        category: category.toLowerCase().trim(),
        score: parseFloat(score),
      })
    );

    if (scoreEntries.length > 0) {
      await prisma.userCategoryScore.createMany({
        data: scoreEntries,
      });
    }

    res.json({
      message: "Category scores updated successfully",
      updatedCategories: scoreEntries.length,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update category scores" });
  }
});

// Get top categories for a user
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 5;

    const userIdInt = parseInt(userId);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userIdInt },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const topCategories = await prisma.userCategoryScore.findMany({
      where: { user_id: userIdInt },
      orderBy: { score: "desc" },
      take: limit,
    });

    res.json(topCategories);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch top categories" });
  }
});

// Get all category scores for a user
router.get("/:userId/all", async (req, res) => {
  try {
    const { userId } = req.params;
    const userIdInt = parseInt(userId);

    const allScores = await prisma.userCategoryScore.findMany({
      where: { user_id: userIdInt },
      orderBy: { score: "desc" },
    });

    res.json(allScores);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch category scores" });
  }
});

// Recalculate scores for a user (trigger recalculation)
router.post("/recalculate/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const userIdInt = parseInt(userId);

    // Fetch user's data
    const [favorites, shelfItems, comments, channels] = await Promise.all([
      prisma.favorite.findMany({ where: { user_id: userIdInt } }),
      prisma.shelfItem.findMany({ where: { user_id: userIdInt } }),
      prisma.comment.findMany({ where: { userId: userIdInt } }),
      prisma.userChannel.findMany({
        where: { user_id: userIdInt },
        include: { channel: true },
      }),
    ]);

    // Calculate raw interaction counts
    const interactionCounts = {
      favorite: favorites.length,
      shelf: shelfItems.length,
      comment: comments.length,
      joinChannel: channels.length,
    };

    // Calculate dynamic weights using the helper function
    const { dynamicWeights } = calculateDynamicWeights(interactionCounts);

    // Calculate scores
    const categoryScores = {};

    const addPoints = (categories, points) => {
      if (!categories) return;
      const categoryList = Array.isArray(categories)
        ? categories
        : [categories];

      categoryList.forEach((category) => {
        const normalizedCategory = category.trim().toLowerCase();
        categoryScores[normalizedCategory] =
          (categoryScores[normalizedCategory] || 0) + points;
      });
    };

    const getBookCategories = (book) => {
      if (book.book_data?.volumeInfo?.categories)
        return book.book_data.volumeInfo.categories;
      if (book.categories) return book.categories;
      return [];
    };

    // Add points for favorites
    favorites.forEach((book) =>
      addPoints(getBookCategories(book), dynamicWeights.favorite)
    );

    // Add points for shelf items
    shelfItems.forEach((book) =>
      addPoints(getBookCategories(book), dynamicWeights.shelf)
    );

    // Add points for comments
    comments.forEach((comment) => {
      const bookData = comment.book_data || {};
      addPoints(getBookCategories(bookData), dynamicWeights.comment);
    });

    // Add points for channels
    channels.forEach((userChannel) => {
      const channel = userChannel.channel;
      if (channel.book_data?.volumeInfo?.categories) {
        addPoints(
          channel.book_data.volumeInfo.categories,
          dynamicWeights.joinChannel
        );
      }
    });

    // Find celebrity interactions and add their weighted influence
    // Get all comments on books the user has favorited or shelved
    const userBookIds = new Set([
      ...favorites.map((f) => f.book_id),
      ...shelfItems.map((s) => s.book_id),
    ]);

    // Find comments from celebrities on these books
    const celebrityComments = await prisma.comment.findMany({
      where: {
        book_id: { in: Array.from(userBookIds) },
        userId: { not: userIdInt }, // Exclude the user's own comments
      },
      include: {
        user: true,
      },
    });

    // Add weighted points for celebrity comments
    for (const comment of celebrityComments) {
      if (comment.user && comment.user.celebrity_weight > 1.0) {
        const bookData = comment.book_data || {};
        const categories = getBookCategories(bookData);
        const celebrityWeight = comment.user.celebrity_weight;

        // Apply celebrity weight to comment points
        addPoints(categories, dynamicWeights.comment * celebrityWeight);
      }
    }

    // Find favorites from celebrities for the same books
    const celebrityFavorites = await prisma.favorite.findMany({
      where: {
        book_id: { in: Array.from(userBookIds) },
        user_id: { not: userIdInt }, // Exclude the user's own favorites
      },
      include: {
        user: true,
      },
    });

    // Add weighted points for celebrity favorites
    for (const favorite of celebrityFavorites) {
      if (favorite.user && favorite.user.celebrity_weight > 1.0) {
        const categories = getBookCategories(favorite);
        const celebrityWeight = favorite.user.celebrity_weight;

        // Apply celebrity weight to favorite points
        addPoints(categories, dynamicWeights.favorite * celebrityWeight);
      }
    }

    // Update scores in database
    await prisma.userCategoryScore.deleteMany({
      where: { user_id: userIdInt },
    });

    const scoreEntries = Object.entries(categoryScores).map(
      ([category, score]) => ({
        user_id: userIdInt,
        category: category.toLowerCase().trim(),
        score: parseFloat(score),
      })
    );

    if (scoreEntries.length > 0) {
      await prisma.userCategoryScore.createMany({
        data: scoreEntries,
      });
    }

    res.json({
      message: "Scores recalculated successfully",
      categoryScores,
      updatedCategories: scoreEntries.length,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to recalculate scores" });
  }
});

router.get("/:userId/weights", async (req, res) => {
  try {
    const { userId } = req.params;
    const userIdInt = parseInt(userId);

    // Fetch user's data to calculate interaction counts
    const [favorites, shelfItems, comments, channels] = await Promise.all([
      prisma.favorite.findMany({ where: { user_id: userIdInt } }),
      prisma.shelfItem.findMany({ where: { user_id: userIdInt } }),
      prisma.comment.findMany({ where: { userId: userIdInt } }),
      prisma.userChannel.findMany({
        where: { user_id: userIdInt },
        include: { channel: true },
      }),
    ]);

    // Calculate raw interaction counts
    const interactionCounts = {
      favorite: favorites.length,
      shelf: shelfItems.length,
      comment: comments.length,
      joinChannel: channels.length,
    };

    // Calculate dynamic weights using the helper function
    const { dynamicWeights, totalPoints, totalInteractions } =
      calculateDynamicWeights(interactionCounts);

    res.json({
      baseWeights,
      dynamicWeights,
      interactionCounts,
      totalInteractions,
      totalPoints,
      activityThresholds: ACTIVITY_THRESHOLDS,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch dynamic weights" });
  }
});

module.exports = router;
module.exports.baseWeights = baseWeights;
