const express = require("express");
const { PrismaClient } = require("../generated/prisma");

const router = express.Router();
const prisma = new PrismaClient();
const numTopCategories = 3; // Number of top categories to return

// Get personalized recommendations for a user
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const sendNotification = req.query.notify === "true";

    // Check if userId is a supabase_id (UUID) or database user ID (integer)
    let userIdInt;
    let supabaseId = userId;

    if (userId.includes("-")) {
      // It's a supabase_id, get the database user ID
      const user = await prisma.user.findUnique({
        where: { supabase_id: userId },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      userIdInt = user.id;
    } else {
      // It's already a database user ID
      userIdInt = parseInt(userId);

      // Get the supabase_id for later use
      const user = await prisma.user.findUnique({
        where: { id: userIdInt },
      });

      if (user) {
        supabaseId = user.supabase_id;
      }
    }

    // Get user's top categories
    let topCategories = await prisma.userCategoryScore.findMany({
      where: { user_id: userIdInt },
      orderBy: { score: "desc" },
      take: numTopCategories, // Top 3 categories
    });

    // If no categories exist, try to calculate them first
    if (topCategories.length === 0) {
      try {
        const recalculateResponse = await fetch(
          `http://localhost:3000/api/category-scores/recalculate/${userIdInt}`,
          {
            method: "POST",
          }
        );

        if (recalculateResponse.ok) {
          // Try to get categories again after recalculation
          topCategories = await prisma.userCategoryScore.findMany({
            where: { user_id: userIdInt },
            orderBy: { score: "desc" },
            take: numTopCategories,
          });
        }
      } catch (error) {
        // Failed to recalculate scores, continue with empty recommendations
      }

      // If still no categories after recalculation, return empty
      if (topCategories.length === 0) {
        return res.json({
          recommendations: [],
          message:
            "No recommendations available. Start by adding books to favorites or shelf!",
        });
      }
    }

    // If sendNotification is true, find a book the user hasn't seen before
    if (sendNotification) {
      try {
        // Get the top category
        const topCategory = topCategories[0].category;

        // Get user's favorites and shelf items to avoid recommending books they already have
        const [favorites, shelfItems, previousRecommendations] =
          await Promise.all([
            prisma.favorite.findMany({
              where: { user_id: userIdInt },
              select: { book_id: true },
            }),
            prisma.shelfItem.findMany({
              where: { user_id: userIdInt },
              select: { book_id: true },
            }),
            prisma.notification.findMany({
              where: {
                user_id: userIdInt,
                is_recommendation: true,
              },
              select: { book_id: true },
            }),
          ]);

        // Create a set of book IDs the user has already interacted with
        const existingBookIds = new Set([
          ...favorites.map((f) => f.book_id),
          ...shelfItems.map((s) => s.book_id),
          ...previousRecommendations.map((r) => r.book_id).filter(Boolean),
        ]);

        // Fetch multiple books to increase chances of finding a new one
        const searchQuery = `subject:${topCategory}`;
        const googleBooksResponse = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
            searchQuery
          )}&maxResults=10&orderBy=relevance`
        );

        if (googleBooksResponse.ok) {
          const data = await googleBooksResponse.json();
          if (data.items && data.items.length > 0) {
            // Find a book the user hasn't seen before
            const newBook = data.items.find(
              (book) => !existingBookIds.has(book.id)
            );

            // If we found a new book, create a notification
            if (newBook) {
              // Found new book recommendation

              // Find or create a channel for this book
              let channel;
              const existingChannel = await prisma.channel.findFirst({
                where: { book_id: newBook.id },
              });

              if (existingChannel) {
                channel = existingChannel;
              } else {
                // Create a new channel for this book
                channel = await prisma.channel.create({
                  data: {
                    name: newBook.volumeInfo?.title || "Book Discussion",
                    book_id: newBook.id,
                    book_title: newBook.volumeInfo?.title || "Unknown Book",
                    book_data: newBook,
                  },
                });
              }

              // Create a recommendation notification
              await fetch(
                `http://localhost:3000/api/notifications/recommendation`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    userId: supabaseId,
                    bookData: newBook,
                    channelId: channel.id,
                  }),
                }
              );

              // Recommendation notification created successfully
            } else {
              // No new books found to recommend
            }
          }
        }
      } catch (error) {
        // Continue even if notification creation fails
      }
    }

    // Return the top categories so frontend can fetch books from Google Books API
    res.json({
      topCategories: topCategories.map((cat) => ({
        category: cat.category,
        score: cat.score,
      })),
      message: "Recommendations based on your reading preferences",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch recommendations" });
  }
});

// Trigger score recalculation and get fresh recommendations
router.post("/refresh/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Recalculate scores first
    const recalculateResponse = await fetch(
      `http://localhost:3000/api/category-scores/recalculate/${userId}`,
      {
        method: "POST",
      }
    );

    if (!recalculateResponse.ok) {
      throw new Error("Failed to recalculate scores");
    }

    // Get fresh recommendations
    const recommendationsResponse = await fetch(
      `http://localhost:3000/api/recommendations/${userId}`
    );
    const recommendations = await recommendationsResponse.json();

    res.json({
      ...recommendations,
      message: "Recommendations refreshed based on your latest activity",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to refresh recommendations" });
  }
});

module.exports = router;
