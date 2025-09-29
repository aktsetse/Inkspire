const express = require("express");
const { PrismaClient } = require("../generated/prisma");
const router = express.Router();
const prisma = new PrismaClient();

// Get user's shelf items
router.get("/:supabaseId", async (req, res) => {
  try {
    const { supabaseId } = req.params;

    // First get the user
    const user = await prisma.user.findUnique({
      where: { supabase_id: supabaseId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get shelf items for the user
    const shelfItems = await prisma.shelfItem.findMany({
      where: { user_id: user.id },
    });

    res.json(shelfItems);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add book to shelf
router.post("/", async (req, res) => {
  try {
    const { supabase_id, book_id, book_title, book_data } = req.body;

    // First get the user
    const user = await prisma.user.findUnique({
      where: { supabase_id: supabase_id },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if already on shelf
    const existingShelfItem = await prisma.shelfItem.findFirst({
      where: {
        user_id: user.id,
        book_id: book_id,
      },
    });

    if (existingShelfItem) {
      return res.json({
        message: "Already on shelf",
        shelfItem: existingShelfItem,
      });
    }

    // Add to shelf
    const shelfItem = await prisma.shelfItem.create({
      data: {
        user_id: user.id,
        book_id,
        book_title,
        book_data,
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

    res.status(201).json(shelfItem);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Remove book from shelf
router.delete("/", async (req, res) => {
  try {
    const { supabase_id, book_id } = req.body;

    // First get the user
    const user = await prisma.user.findUnique({
      where: { supabase_id: supabase_id },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Remove from shelf
    await prisma.shelfItem.deleteMany({
      where: {
        user_id: user.id,
        book_id: book_id,
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
      console.log(`Marked user ${user.id} scores for recalculation`);
    } catch (scoreError) {
      console.warn("Error marking scores for recalculation:", scoreError);
    }

    res.json({ message: "Removed from shelf" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
