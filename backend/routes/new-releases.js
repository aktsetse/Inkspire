const express = require("express");
const { PrismaClient } = require("../generated/prisma");
const fetch = require("node-fetch");

const router = express.Router();
const prisma = new PrismaClient();

// Get new releases from Google Books API
router.get("/", async (_req, res) => {
  try {
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    if (!apiKey) {
      return res
        .status(500)
        .json({ error: "Google Books API key not configured" });
    }

    // Get the current date and date from 30 days ago (for recent books)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    // Use a query that specifically targets new books
    const query = `subject:fiction&orderBy=newest`;

    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
        query
      )}&orderBy=newest&maxResults=40&key=${apiKey}`
    );

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: "Failed to fetch new releases from API" });
    }

    const data = await response.json();

    const newReleases =
      data.items?.filter((book) => {
        // Check if book has all required fields
        if (
          !(book.id && book.volumeInfo?.title && book.volumeInfo?.publishedDate)
        ) {
          return false;
        }

        // Parse the published date
        try {
          // Handle partial dates (YYYY or YYYY-MM format)
          let publishedDate;
          const dateStr = book.volumeInfo.publishedDate;

          if (dateStr.length === 4) {
            // If only year is provided (YYYY format)
            publishedDate = new Date(parseInt(dateStr), 0, 1); // January 1st of that year
          } else if (dateStr.length === 7) {
            // If year and month are provided (YYYY-MM format)
            const [year, month] = dateStr.split("-");
            publishedDate = new Date(parseInt(year), parseInt(month) - 1, 1); // 1st day of that month
          } else {
            // Full date format
            publishedDate = new Date(dateStr);
          }

          // Check if the date is valid
          if (isNaN(publishedDate.getTime())) {
            return false;
          }

          // Get date from 30 days ago
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(today.getDate() - 30);

          // Special handling for current month books
          const isCurrentMonth =
            publishedDate.getFullYear() === today.getFullYear() &&
            publishedDate.getMonth() === today.getMonth();

          // Make sure the book is recent AND not in the future
          const isRecent = publishedDate >= thirtyDaysAgo;
          const isNotFuture = publishedDate <= today;

          // Accept books from current month or within the last 30 days
          const isValid = (isRecent || isCurrentMonth) && isNotFuture;

          return isValid;
        } catch (error) {
          return false;
        }
      }) || [];

    res.json({
      newReleases,
      count: newReleases.length,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch new releases" });
  }
});

// Notify users about new releases - completely rewritten for reliability
router.post("/notify", async (_req, res) => {
  try {
    console.log("Starting new releases notification process...");

    // Get all users
    const users = await prisma.user.findMany();

    if (!users.length) {
      console.log("No users found to notify");
      return res.json({ message: "No users to notify" });
    }

    console.log(`Found ${users.length} users to potentially notify`);

    // Get new releases using a reliable approach
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    if (!apiKey) {
      console.log("Google Books API key not configured");
      return res
        .status(500)
        .json({ error: "Google Books API key not configured" });
    }

    // Use multiple queries to increase chances of finding good books
    const queries = [
      "subject:fiction",
      "subject:novel",
      "subject:thriller",
      "subject:romance",
      "subject:fantasy",
      "subject:mystery",
      "inauthor:stephen+king", // Popular author example
      "inauthor:j+k+rowling", // Popular author example
      "inauthor:james+patterson", // Popular author example
    ];

    let allBooks = [];

    for (const queryString of queries) {
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
        queryString
      )}&orderBy=newest&maxResults=40&key=${apiKey}`;

      try {
        const response = await fetch(url);

        if (!response.ok) {
          continue;
        }

        const data = await response.json();

        if (data.items && data.items.length > 0) {
          allBooks = [...allBooks, ...data.items];
        }
      } catch (error) {
        // Continue with next query
      }
    }

    if (allBooks.length === 0) {
      return res.json({ message: "No books found to notify about" });
    }

    // Process the books found
    const today = new Date(); // Add the missing today variable

    // Filter to books with good data AND recent publication date
    const validBooks = allBooks.filter((book) => {
      // Check if book has the minimum required fields
      const hasRequiredFields = !!(
        book.id &&
        book.volumeInfo?.title &&
        book.volumeInfo?.publishedDate
      );

      if (!hasRequiredFields) {
        return false;
      }

      // Check if the book is actually recent (published within the last 2 years)
      try {
        // Parse the published date
        let publishedDate;
        const dateStr = book.volumeInfo.publishedDate;

        if (dateStr.length === 4) {
          // If only year is provided (YYYY format)
          publishedDate = new Date(parseInt(dateStr), 0, 1); // January 1st of that year
        } else if (dateStr.length === 7) {
          // If year and month are provided (YYYY-MM format)
          const [year, month] = dateStr.split("-");
          publishedDate = new Date(parseInt(year), parseInt(month) - 1, 1); // 1st day of that month
        } else {
          // Full date format
          publishedDate = new Date(dateStr);
        }

        // Check if the date is valid
        if (isNaN(publishedDate.getTime())) {
          return false;
        }

        // Get date from 30 days ago
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);

        // Special handling for current month books
        const isCurrentMonth =
          publishedDate.getFullYear() === today.getFullYear() &&
          publishedDate.getMonth() === today.getMonth();

        // Check if the book is recent (published within the last 30 days) AND not in the future
        const isRecent = publishedDate >= thirtyDaysAgo;
        const isNotFuture = publishedDate <= today;

        // Accept books from current month or within the last 30 days, but not future dates
        if ((!isRecent && !isCurrentMonth) || !isNotFuture) {
          return false;
        }

        return true;
      } catch (error) {
        return false;
      }
    });

    // Check if we have valid books after filtering

    if (validBooks.length === 0) {
      return res.json({ message: "No suitable books found to notify about" });
    }

    // Pick a random book to feature as a "new release"
    const bookToNotify =
      validBooks[Math.floor(Math.random() * validBooks.length)];

    // Selected book for notification

    // Create or find a channel for this book
    let channel;
    const existingChannel = await prisma.channel.findFirst({
      where: { book_id: bookToNotify.id },
    });

    if (existingChannel) {
      channel = existingChannel;
    } else {
      // Create a new channel for this book
      channel = await prisma.channel.create({
        data: {
          name: bookToNotify.volumeInfo.title,
          book_id: bookToNotify.id,
          book_title: bookToNotify.volumeInfo.title,
          book_data: bookToNotify,
        },
      });
    }

    // Check if users have already been notified about this book in the last 30 days
    let notificationCount = 0;

    // Create notifications only for users who haven't been notified about this book recently
    for (const user of users) {
      try {
        // Check if user already has a notification for this book in the last 30 days
        const existingNotification = await prisma.notification.findFirst({
          where: {
            user_id: user.id,
            book_id: bookToNotify.id,
            created_at: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            },
          },
        });

        if (existingNotification) {
          continue;
        }

        // Format the published date nicely
        let publishedDate = "";
        try {
          const dateStr = bookToNotify.volumeInfo.publishedDate;
          const date = new Date(dateStr);
          publishedDate = date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
        } catch (error) {
          publishedDate = bookToNotify.volumeInfo.publishedDate || "recent";
        }

        // Create a notification for this user
        await prisma.notification.create({
          data: {
            user_id: user.id,
            channel_id: channel.id,
            book_id: bookToNotify.id,
            content: `NEW RELEASE: "${bookToNotify.volumeInfo.title}" by ${bookToNotify.volumeInfo.authors[0]} (Published: ${publishedDate})`,
            is_recommendation: true, // Mark as recommendation
            book_data: bookToNotify,
          },
        });

        notificationCount++;
      } catch (userError) {
        // Continue with next user
      }
    }

    return res.json({
      success: true,
      message: `Notified ${notificationCount} users about new release: ${bookToNotify.volumeInfo.title}`,
      bookTitle: bookToNotify.volumeInfo.title,
      bookId: bookToNotify.id,
      notificationCount,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to notify users about new releases" });
  }
});

module.exports = router;
