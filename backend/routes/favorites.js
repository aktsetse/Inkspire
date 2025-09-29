const express = require("express");
const { PrismaClient } = require("../generated/prisma");

const router = express.Router();
const prisma = new PrismaClient();

// Get favorites for a user
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Convert userId to integer
    const userIdInt = parseInt(userId);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userIdInt },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Find all favorites for the user
    const favorites = await prisma.favorite.findMany({
      where: {
        user_id: userIdInt,
      },
    });

    res.json(favorites);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch favorites" });
  }
});

// Add a book to favorites
router.post("/", async (req, res) => {
  try {
    const { supabase_id, book_id, book_title, book_data } = req.body;

    // Find user by supabase_id
    const user = await prisma.user.findUnique({
      where: {
        supabase_id: supabase_id,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the book is already in favorites
    const existingFavorite = await prisma.favorite.findFirst({
      where: {
        user_id: user.id,
        book_id: book_id,
      },
    });

    if (existingFavorite) {
      return res.status(400).json({ error: "Book already in favorites" });
    }

    // Add to favorites
    const favorite = await prisma.favorite.create({
      data: {
        user_id: user.id,
        book_id: book_id,
        book_title: book_title,
        book_data: book_data,
      },
    });

    // Trigger score recalculation in the background
    try {
      // Use direct prisma call instead of fetch
      await prisma.userCategoryScore.updateMany({
        where: {
          user_id: user.id,
        },
        data: {
          needs_recalculation: true,
        },
      });
    } catch (scoreError) {
      console.warn("Error marking scores for recalculation:", scoreError);
    }

    res.status(201).json(favorite);
  } catch (error) {
    res.status(500).json({ error: "Failed to add to favorites" });
  }
});

// Remove a book from favorites
router.delete("/", async (req, res) => {
  try {
    const { supabase_id, book_id } = req.body;

    // Find user by supabase_id
    const user = await prisma.user.findUnique({
      where: {
        supabase_id: supabase_id,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Remove from favorites
    const result = await prisma.favorite.deleteMany({
      where: {
        user_id: user.id,
        book_id: book_id,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: "Book not found in favorites" });
    }

    // Trigger score recalculation in the background
    try {
      // Use direct prisma call instead of fetch
      await prisma.userCategoryScore.updateMany({
        where: {
          user_id: user.id,
        },
        data: {
          needs_recalculation: true,
        },
      });
    } catch (scoreError) {
      console.warn("Error marking scores for recalculation:", scoreError);
    }

    res.json({ message: "Book removed from favorites" });
  } catch (error) {
    res.status(500).json({ error: "Failed to remove from favorites" });
  }
});

module.exports = router;
