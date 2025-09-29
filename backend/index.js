const express = require("express");
require("dotenv").config(); // Load environment variables
const cors = require("cors");
const morgan = require("morgan");
const { PrismaClient } = require("./generated/prisma");
const fetch = require("node-fetch");

// Import routes
const usersRoutes = require("./routes/users.js");
const favoritesRoutes = require("./routes/favorites.js");
const shelfRoutes = require("./routes/shelf.js");
const channelsRoutes = require("./routes/channels.js");
const messagesRoutes = require("./routes/messages.js");
const commentsRoutes = require("./routes/comments.js");
const userChannelsRoutes = require("./routes/user-channels.js");
const categoryScoresRoutes = require("./routes/category-scores.js");
const recommendationsRoutes = require("./routes/recommendations.js");
const notificationsRoutes = require("./routes/notifications.js");
const newReleasesRoutes = require("./routes/new-releases.js");
const userFollowsRoutes = require("./routes/user-follows.js");
const celebritiesRoutes = require("./routes/celebrities.js");

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json()); // to parse JSON request bodies
app.use(morgan("dev"));
// Routes
app.use("/api/users", usersRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/shelf", shelfRoutes);
app.use("/api/channels", channelsRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/comments", commentsRoutes);
app.use("/api/user-channels", userChannelsRoutes);
app.use("/api/category-scores", categoryScoresRoutes);
app.use("/api/recommendations", recommendationsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/new-releases", newReleasesRoutes);
app.use("/api/user-follows", userFollowsRoutes);
app.use("/api/celebrities", celebritiesRoutes);

// Default route
app.get("/", (_req, res) => {
  res.send("Welcome to StoryStack API");
});

// Function to check for new book releases and notify users
async function checkAndNotifyNewReleases() {
  try {
    // Call the new-releases/notify endpoint directly
    try {
      const router = require("./routes/new-releases");

      // Create a mock request and response
      const mockReq = {};
      const mockRes = {
        json: (data) => {
          return mockRes;
        },
        status: (code) => {
          console.log(`New releases notification status: ${code}`);
          return {
            json: (data) => {
              console.log(`New releases notification error (${code}):`, data);
            },
          };
        },
      };

      await fetch(`http://localhost:${PORT}/api/new-releases/notify`, {
        method: "POST",
      });

    } catch (error) {
      console.error("Error in new releases check:", error);
    }
  } catch (error) {
    // Error checking for new releases
  }
}

// Function to send recommendation notifications
async function sendRecommendationNotifications() {
  try {
    // Call the recommendation-notifications task
    const {
      sendRecommendationNotifications,
    } = require("./scheduled-tasks/recommendation-notifications");
    await sendRecommendationNotifications();
  } catch (error) {
    // Error sending recommendation notifications
  }
}

// Function to check for users who need recommendations
async function checkAndSendRecommendations() {
  try {
    // Get all users
    const users = await prisma.user.findMany();

    for (const user of users) {
      try {
        // Check if user has received a recommendation notification in the last 7 days
        const recentNotification = await prisma.notification.findFirst({
          where: {
            user_id: user.id,
            is_recommendation: true,
            created_at: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
            },
          },
        });

        // If no recent recommendation, check if there are new books to recommend
        if (!recentNotification) {
          // Get user's top categories
          const topCategories = await prisma.userCategoryScore.findMany({
            where: { user_id: user.id },
            orderBy: { score: "desc" },
            take: 1, // Just need the top category
          });

          // Only proceed if the user has at least one category
          if (topCategories.length > 0) {
            // Call the recommendations endpoint directly
            try {
              const recommendationsController = require("./routes/recommendations");
              // Create a mock request with the necessary parameters
              const mockReq = {
                params: { userId: user.supabase_id },
                query: { notify: "true" },
              };
              // Create a mock response
              const mockRes = {
                json: (data) => {
                  console.log(`Recommendation for user ${user.id} sent:`, data);
                  return mockRes;
                },
                status: (code) => {
                  return {
                    json: (data) => {
                      console.log(`Recommendation error (${code}):`, data);
                    },
                  };
                },
              };

              // Use the actual API endpoint but within the same process
              await fetch(
                `http://localhost:${PORT}/api/recommendations/${user.supabase_id}?notify=true`
              );
            } catch (recError) {
              console.error(
                `Error sending recommendation to user ${user.id}:`,
                recError
              );
            }
          }
        }
      } catch (userError) {
        // Continue with next user
      }
    }
  } catch (error) {
    // Error checking for recommendations
  }
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Schedule periodic checks
  const RECOMMENDATION_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  const NEW_RELEASES_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds


  // Run an initial check for new releases
  checkAndNotifyNewReleases();
  console.log(`New releases check scheduled every ${NEW_RELEASES_CHECK_INTERVAL/1000/60/60} hours`);

  // Set up recurring new releases checks (daily)
  setInterval(checkAndNotifyNewReleases, NEW_RELEASES_CHECK_INTERVAL);

  // Check for recommendations (less urgent, after a short delay)
  setTimeout(() => {
    checkAndSendRecommendations();
    // Set up recurring recommendation checks
    setInterval(checkAndSendRecommendations, RECOMMENDATION_CHECK_INTERVAL);
  }, 30000); // 30 second delay for recommendations
});
