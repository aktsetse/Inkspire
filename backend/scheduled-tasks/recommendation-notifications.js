const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();
const fetch = require("node-fetch");

/**
 * Scheduled task to send book recommendations as notifications
 * This can be run on a schedule (e.g., daily or weekly) using a cron job
 */
async function sendRecommendationNotifications() {
  try {
    // Get all users
    const users = await prisma.user.findMany();

    // Process each user
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

        if (recentNotification) {
          // User already received a recommendation in the last 7 days, skipping
          continue;
        }

        // Trigger recommendation with notification
        await fetch(
          `http://localhost:3000/api/recommendations/${user.id}?notify=true`
        );
      } catch (userError) {
        // Continue with next user
      }
    }
  } catch (error) {
    // Task failed
  }
}

// Export for use in other files
module.exports = {
  sendRecommendationNotifications,
};

// If this file is run directly, execute the task
if (require.main === module) {
  sendRecommendationNotifications()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      process.exit(1);
    });
}
