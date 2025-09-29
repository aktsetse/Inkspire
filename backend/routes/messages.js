const express = require("express");
const { PrismaClient } = require("../generated/prisma");
const {
  checkChannelActivity,
  createHighActivityNotifications,
} = require("../services/notificationService");

const router = express.Router();
const prisma = new PrismaClient();

// Get messages for a channel
router.get("/channel/:channelId", async (req, res) => {
  try {
    const { channelId } = req.params;

    const messages = await prisma.message.findMany({
      where: {
        channelId: channelId,
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            supabase_id: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Format messages for frontend
    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      content: msg.content,
      sender:
        msg.user.first_name || msg.user.email.split("@")[0] || "Anonymous",
      created_at: msg.createdAt,
      userId: msg.userId,

      supabase_id: msg.user.supabase_id, // Include Supabase ID for frontend comparison
    }));

    res.json(formattedMessages);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Create a new message
router.post("/", async (req, res) => {
  try {
    const { content, channelId, userId } = req.body;


    // Find the user by supabase_id (since frontend sends supabase user ID)
    // Make sure userId is treated as a string
    const user = await prisma.user.findUnique({
      where: {
        supabase_id: String(userId),
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }


    // Verify channelId exists
    const channelExists = await prisma.channel.findUnique({
      where: {
        id: channelId,
      },
    });

    if (!channelExists) {
      return res.status(404).json({ error: "Channel not found" });
    }



    // Create the message
    const message = await prisma.message.create({
      data: {
        content: content,
        channelId: channelId,
        userId: user.id, // Use the internal user ID
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            supabase_id: true,
          },
        },
      },
    });


    // Check if the channel has high activity before sending notifications
    try {
      console.log("Checking channel activity for notifications...");

      // Check if the channel meets the high activity threshold
      const hasHighActivity = await checkChannelActivity(channelId);

      if (hasHighActivity) {
        console.log(
          `High activity detected in channel ${channelId}. Creating notifications...`
        );
        // Create notifications for all channel members since high activity threshold is met
        await createHighActivityNotifications(channelId, user.id, message.id);
      } else {
        console.log(
          `Channel ${channelId} does not meet high activity threshold. No notifications sent.`
        );
      }
    } catch (notificationError) {
     
      console.error("Notification error details:", {
        name: notificationError.name,
        message: notificationError.message,
        code: notificationError.code,
      });
    }

    // Format message for frontend
    const formattedMessage = {
      id: message.id,
      content: message.content,
      sender: user.first_name || user.email.split("@")[0] || "Anonymous",
      created_at: message.createdAt,
      userId: message.userId,
      supabase_id: message.user.supabase_id, // Include Supabase ID for frontend comparison
    };

    res.status(201).json(formattedMessage);
  } catch (error) {
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
    });

    // Check for specific Prisma errors
    if (error.code === "P2003") {
      return res.status(400).json({
        error: "Failed to create message: Foreign key constraint failed",
        details: error.meta,
      });
    }

    res.status(500).json({
      error: "Failed to create message",
      message: error.message,
    });
  }
});

module.exports = router;
