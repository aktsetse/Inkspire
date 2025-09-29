const express = require("express");
const { PrismaClient } = require("../generated/prisma");
const router = express.Router();
const prisma = new PrismaClient();

// Get user by Supabase ID
router.get("/supabase/:supabaseId", async (req, res) => {
  try {
    const { supabaseId } = req.params;

    const user = await prisma.user.findUnique({
      where: {
        supabase_id: supabaseId,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: {
        id: parseInt(id),
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        bio: true,
        created_at: true,
        supabase_id: true,
        num_followers: true,
        num_following: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create new user profile
router.post("/", async (req, res) => {
  try {
    const { supabase_id, email, first_name, last_name, bio } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        supabase_id: supabase_id,
      },
    });

    if (existingUser) {
      return res.json(existingUser);
    }

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        supabase_id,
        email,
        first_name: first_name || null,
        last_name: last_name || null,
        bio: bio || null,
      },
    });

    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update user profile
router.put("/:supabaseId", async (req, res) => {
  try {
    const { supabaseId } = req.params;
    const { first_name, last_name, bio } = req.body;

    const updatedUser = await prisma.user.update({
      where: {
        supabase_id: supabaseId,
      },
      data: {
        first_name: first_name !== undefined ? first_name : undefined,
        last_name: last_name !== undefined ? last_name : undefined,
        bio: bio !== undefined ? bio : undefined,
      },
    });

    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
