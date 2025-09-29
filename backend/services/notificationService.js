const { PrismaClient } = require("../generated/prisma");
const { HIGH_ACTIVITY } = require("../config/notification-config");
const prisma = new PrismaClient();

/**
 * checks if a channel has high activity based on configured thresholds
 * @param {string} channelId - The ID of the channel to check
 * @returns {Promise<boolean>} - True if the channel has high activity, false otherwise
 */
async function checkChannelActivity(channelId) {
  try {
    const timeThreshold = new Date();
    timeThreshold.setMinutes(
      timeThreshold.getMinutes() - HIGH_ACTIVITY.TIME_WINDOW_MINUTES
    );

    // get distinct users who have sent messages in the channel within the time window
    const recentMessages = await prisma.message.findMany({
      where: {
        channelId: channelId,
        createdAt: {
          gte: timeThreshold,
        },
      },
      select: {
        userId: true,
      },
      distinct: ["userId"],
    });

    // count distinct users
    const distinctUserCount = recentMessages.length;



    // return true if the number of distinct users meets or exceeds the threshold
    return distinctUserCount >= HIGH_ACTIVITY.DISTINCT_USERS_THRESHOLD;
  } catch (error) {
    // default to false if there's an error
    return false;
  }
}

/**
 * this creates notifications for channel members about high activity
 * @param {string} channelId - the ID of the channel with high activity
 * @param {number} senderId - the ID of the user who sent the latest message (to exclude from notifications)
 * @param {string} messageId - the ID of the latest message
 * @returns {Promise<void>}
 */
async function createHighActivityNotifications(channelId, senderId, messageId) {
  try {
    // get channel information
    const channel = await prisma.channel.findUnique({
      where: {
        id: channelId,
      },
    });

    if (!channel) {
      console.error(`Channel ${channelId} not found`);
      return;
    }

    // get all users in the channel except the message sender
    const channelMembers = await prisma.userChannel.findMany({
      where: {
        channel_id: channelId,
        user_id: {
          not: senderId, // exclude the message sender
        },
      },
      select: {
        user_id: true,
      },
    });

    // create notifications for all channel members
    const notificationContent = `Active discussion happening in ${channel.book_title}! ${HIGH_ACTIVITY.DISTINCT_USERS_THRESHOLD}+ people are discussing this book right now. Join the conversation!`;

    if (channelMembers.length > 0) {
      await prisma.notification.createMany({
        data: channelMembers.map((member) => ({
          user_id: member.user_id,
          channel_id: channelId,
          message_id: messageId,
          content: notificationContent,
          is_read: false,
        })),
      });
      console.log(
        `Created high activity notifications for ${channelMembers.length} members in channel ${channelId}`
      );
    }
  } catch (error) {
    console.error("Error creating high activity notifications:", error);
  }
}

module.exports = {
  checkChannelActivity,
  createHighActivityNotifications,
};
