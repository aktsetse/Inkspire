const express = require('express');
const { PrismaClient } = require('../generated/prisma');
const router = express.Router();
const prisma = new PrismaClient();

// Get user's joined channels
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the user by supabase_id (since frontend sends supabase user ID)
    const user = await prisma.user.findUnique({
      where: {
        supabase_id: userId
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userChannels = await prisma.userChannel.findMany({
      where: {
        user_id: user.id // Use the internal user ID
      },
      include: {
        channel: true
      },
      orderBy: {
        joined_at: 'desc'
      }
    });

    // Format the response to match what the frontend expects
    const formattedChannels = userChannels.map(uc => ({
      id: uc.channel.book_id, // Use book_id as the channel identifier
      title: uc.channel.book_title,
      author: uc.channel.book_data?.volumeInfo?.authors?.join(', ') || 'Unknown',
      displayText: `${uc.channel.book_title} - ${uc.channel.book_data?.volumeInfo?.authors?.join(', ') || 'Unknown'}`,
      joined_at: uc.joined_at,
      channel_id: uc.channel.id
    }));

    res.json(formattedChannels);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user channels' });
  }
});

// Join a channel
router.post('/join', async (req, res) => {
  try {
    const { userId, bookId, bookTitle, bookData } = req.body;

    // Find the user by supabase_id (since frontend sends supabase user ID)
    const user = await prisma.user.findUnique({
      where: {
        supabase_id: userId
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // First, find or create the channel
    let channel = await prisma.channel.findFirst({
      where: {
        book_id: bookId
      }
    });

    if (!channel) {
      // Create new channel if it doesn't exist
      channel = await prisma.channel.create({
        data: {
          name: `Discussion: ${bookTitle}`,
          book_id: bookId,
          book_title: bookTitle,
          book_data: bookData
        }
      });
    }

    // Check if user is already a member
    const existingMembership = await prisma.userChannel.findUnique({
      where: {
        user_id_channel_id: {
          user_id: user.id, // Use the internal user ID
          channel_id: channel.id
        }
      }
    });

    if (existingMembership) {
      return res.status(400).json({ error: 'User already joined this channel' });
    }

    // Add user to channel
    const userChannel = await prisma.userChannel.create({
      data: {
        user_id: user.id, // Use the internal user ID
        channel_id: channel.id
      },
      include: {
        channel: true
      }
    });

    // Format response
    const formattedChannel = {
      id: channel.book_id,
      title: channel.book_title,
      author: bookData?.volumeInfo?.authors?.join(', ') || 'Unknown',
      displayText: `${channel.book_title} - ${bookData?.volumeInfo?.authors?.join(', ') || 'Unknown'}`,
      joined_at: userChannel.joined_at,
      channel_id: channel.id
    };

    res.json(formattedChannel);
  } catch (error) {
    res.status(500).json({ error: 'Failed to join channel' });
  }
});

// Leave a channel
router.delete('/leave', async (req, res) => {
  try {
    const { userId, bookId } = req.body;

    // Find the user by supabase_id (since frontend sends supabase user ID)
    const user = await prisma.user.findUnique({
      where: {
        supabase_id: userId
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find the channel
    const channel = await prisma.channel.findFirst({
      where: {
        book_id: bookId
      }
    });

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Remove user from channel
    const deletedMembership = await prisma.userChannel.deleteMany({
      where: {
        user_id: user.id, // Use the internal user ID
        channel_id: channel.id
      }
    });

    if (deletedMembership.count === 0) {
      return res.status(404).json({ error: 'User not found in channel' });
    }

    res.json({ message: 'Successfully left channel' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to leave channel' });
  }
});

// Check if user is in a channel
router.get('/check/:userId/:bookId', async (req, res) => {
  try {
    const { userId, bookId } = req.params;

    // Find the user by supabase_id (since frontend sends supabase user ID)
    const user = await prisma.user.findUnique({
      where: {
        supabase_id: userId
      }
    });

    if (!user) {
      return res.json({ isJoined: false });
    }

    // Find the channel
    const channel = await prisma.channel.findFirst({
      where: {
        book_id: bookId
      }
    });

    if (!channel) {
      return res.json({ isJoined: false });
    }

    // Check if user is a member
    const membership = await prisma.userChannel.findUnique({
      where: {
        user_id_channel_id: {
          user_id: user.id, // Use the internal user ID
          channel_id: channel.id
        }
      }
    });

    res.json({ isJoined: !!membership });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check channel membership' });
  }
});

module.exports = router;
