const express = require("express");
const { PrismaClient } = require("../generated/prisma");

const router = express.Router();
const prisma = new PrismaClient();

// Get channel by book ID
router.get('/book/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;

    const channel = await prisma.channel.findFirst({
      where: {
        book_id: bookId
      }
    });


    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    res.json(channel);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch channel' });
  }
});

module.exports = router;
