const express = require("express");
const { PrismaClient } = require("../generated/prisma");
const {
  shouldCreateNotification,
  containsBadWords,
  countWords,
} = require("../utils/commentFilters");

const router = express.Router();
const prisma = new PrismaClient();

// Helper function to get all comments for a book with their full reply tree
async function getAllCommentsWithReplies(bookId) {
  // First, get all comments for this book (both top-level and replies)
  const allComments = await prisma.comment.findMany({
    where: {
      book_id: bookId,
    },
    include: {
      user: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true, // Include email field
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // Create a map for quick lookup
  const commentMap = new Map();
  allComments.forEach((comment) => {
    // Initialize replies array for each comment
    comment.replies = [];
    commentMap.set(comment.id, comment);
  });

  // Build the tree structure
  const rootComments = [];
  allComments.forEach((comment) => {
    if (comment.parentId) {
      // This is a reply, add it to its parent's replies
      const parent = commentMap.get(comment.parentId);
      if (parent) {
        parent.replies.push(comment);
      }
    } else {
      // This is a top-level comment
      rootComments.push(comment);
    }
  });

  // Sort replies by creation time
  const sortReplies = (comments) => {
    comments.forEach((comment) => {
      if (comment.replies.length > 0) {
        comment.replies.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
        sortReplies(comment.replies);
      }
    });
  };

  sortReplies(rootComments);

  // Sort root comments by creation time (newest first)
  rootComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return rootComments;
}

// GET /api/comments/book/:bookId - Get comments for a book
router.get("/book/:bookId", async (req, res) => {
  try {
    const { bookId } = req.params;

    // Get all comments for this book (both top-level and replies)
    const allComments = await prisma.comment.findMany({
      where: {
        book_id: bookId,
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true, // Include email field
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Create a map for quick lookup
    const commentMap = new Map();
    allComments.forEach((comment) => {
      // Initialize replies array for each comment
      comment.replies = [];
      commentMap.set(comment.id, comment);
    });

    // Build the tree structure
    const rootComments = [];
    allComments.forEach((comment) => {
      if (comment.parentId) {
        // This is a reply, add it to its parent's replies
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          parent.replies.push(comment);
        }
      } else {
        // This is a top-level comment
        rootComments.push(comment);
      }
    });

    // Sort replies by creation time
    const sortReplies = (comments) => {
      comments.forEach((comment) => {
        if (comment.replies.length > 0) {
          comment.replies.sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
          );
          sortReplies(comment.replies);
        }
      });
    };

    sortReplies(rootComments);

    // Sort root comments by creation time (newest first)
    rootComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(rootComments);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// POST /api/comments - Create a new comment or reply
router.post("/", async (req, res) => {
  try {
    const { content, book_id, book_title, book_data, userId, parentId } =
      req.body;

    console.log("Creating comment with data:", {
      content,
      book_id,
      book_title,
      userId,
      parentId,
    });

    if (!content || !book_id || !userId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Prepare comment data
    const commentData = {
      content,
      book_id,
      book_title: book_title || "Unknown",
      book_data,
      userId: parseInt(userId),
    };

    // If parentId is provided, add it to the comment data
    let parentComment = null;
    let parentCommentUser = null;

    if (parentId) {
      console.log("Reply to comment requested with parentId:", parentId);

      // Verify the parent comment exists
      parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        include: {
          user: true, // Include the user who made the original comment
        },
      });

      if (!parentComment) {
        return res.status(404).json({ error: "Parent comment not found" });
      }

      commentData.parentId = parentId;
      parentCommentUser = parentComment.user;
    }

    // Create comment
    const comment = await prisma.comment.create({
      data: commentData,
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true, // Include email field
          },
        },
        parent: true,
      },
    });

    // If comment contains bad words, we should NOT create a notification
    if (containsBadWords(content)) {
      console.log("NOTIFICATION BLOCKED - Comment contains bad words");
    }
    // create notification if this is a reply to someone else's comment
    // AND the comment passes our notification criteria (no bad words, sufficient length)
    else if (
      parentComment &&
      parentCommentUser &&
      parentCommentUser.id !== parseInt(userId) &&
      shouldCreateNotification(content) // Check if notification should be created
    ) {
      try {
        console.log("Creating notification for reply to comment");

        // Get or create a general channel for book discussions
        let channel = await prisma.channel.findFirst({
          where: {
            book_id: book_id,
          },
        });

        if (!channel) {
          // Create a new channel for this book
          channel = await prisma.channel.create({
            data: {
              name: `${book_title} Discussion`,
              book_id: book_id,
              book_title: book_title,
              book_data: book_data,
            },
          });
        } else {
          console.log("Using existing channel:", channel.id);
        }

        // Format the notification content
        const commenterName =
          user.first_name || user.email.split("@")[0] || "Someone";
        const notificationContent = `${commenterName} replied to your comment on ${book_title}: "${content.substring(
          0,
          50
        )}${content.length > 50 ? "..." : ""}"`;

        // Create notification for the parent comment author
        // Include all necessary fields including comment_id
        const notification = await prisma.notification.create({
          data: {
            user_id: parentCommentUser.id,
            channel_id: channel.id,
            content: notificationContent,
            is_read: false,
            comment_id: comment.id, // Add the comment ID
            book_id: book_id, // Add the book ID
          },
        });
      } catch (notificationError) {
        console.error(
          "Error creating notification for comment reply:",
          notificationError
        );
        console.error("Error details:", {
          name: notificationError.name,
          message: notificationError.message,
          stack: notificationError.stack,
        });
      }
    }

    res.status(201).json(comment);
  } catch (error) {
    console.error("Error creating comment:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Failed to create comment" });
  }
});

// DELETE /api/comments/:commentId - Delete a comment
router.delete("/:commentId", async (req, res) => {
  try {
    const { commentId } = req.params;
    const { userId } = req.body;

    // Verify comment exists and belongs to user
    const comment = await prisma.comment.findUnique({
      where: { id: parseInt(commentId) },
    });

    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    if (comment.userId !== parseInt(userId)) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this comment" });
    }

    await prisma.comment.delete({
      where: { id: parseInt(commentId) },
    });

    res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

module.exports = router;
