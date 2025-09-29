const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

// Global variable for follower threshold. Set it to 1 for testing  purposes
let FOLLOWER_THRESHOLD = 1;

/**
 * Set the follower threshold for celebrity detection
 * @param {number} threshold - New threshold value
 */
function setFollowerThreshold(threshold) {
  FOLLOWER_THRESHOLD = threshold;
}

/**
 * Get the size of a comment tree using Depth-Limited BFS
 * @param {string} commentId - Root comment ID to start from
 * @param {number} depthLimit - Maximum depth to traverse (default: 5)
 * @returns {Promise<number>} - Number of unique replies in the comment tree
 */
async function getCommentTreeSize(commentId, depthLimit = 5) {
  const visited = new Set();
  const queue = [[commentId, 0]];

  while (queue.length > 0) {
    const [current, depth] = queue.shift();

    if (depth >= depthLimit) {
      continue;
    }

    // Get replies to the current comment
    const replies = await prisma.comment.findMany({
      where: { parentId: current },
      select: { id: true },
    });

    // Add unique replies to the queue
    for (const reply of replies) {
      if (!visited.has(reply.id)) {
        visited.add(reply.id);
        queue.push([reply.id, depth + 1]);
      }
    }
  }

  return visited.size;
}

/**
 * Check if a user has any comments that trigger large comment trees
 * @param {number} userId - User ID to check
 * @param {number} commentTreeThreshold - Minimum size for a "large" comment tree
 * @returns {Promise<boolean>} - True if the user has any large comment trees
 */
async function hasLargeCommentTrees(userId, commentTreeThreshold) {
  // Get all root comments by the user (comments without a parent)
  const userRootComments = await prisma.comment.findMany({
    where: {
      userId: userId,
      parentId: null,
    },
    select: { id: true },
  });

  // Check each comment tree
  for (const comment of userRootComments) {
    const treeSize = await getCommentTreeSize(comment.id);
    if (treeSize >= commentTreeThreshold) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a user is a celebrity based on follower count and comment engagement
 * @param {number} userId - User ID to check
 * @param {number} followerThreshold - Minimum followers required (default: global FOLLOWER_THRESHOLD)
 * @param {number} commentTreeThreshold - Minimum size for a "large" comment tree
 * @returns {Promise<boolean>} - True if the user is a celebrity
 */
async function isUserCelebrity(
  userId,
  followerThreshold = FOLLOWER_THRESHOLD,
  commentTreeThreshold = 10
) {
  try {
    // Get user with follower count
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { num_followers: true },
    });

    if (!user) {
      return false;
    }

    // Check if user meets follower threshold
    const hasEnoughFollowers = user.num_followers >= followerThreshold;

    // If they don't have enough followers, they're not a celebrity
    if (!hasEnoughFollowers) {
      return false;
    }

    // Check if they have any large comment trees
    const hasEngagingComments = await hasLargeCommentTrees(
      userId,
      commentTreeThreshold
    );

    // A user is a celebrity if they have enough followers AND have engaging comments
    return hasEngagingComments;
  } catch (error) {
    return false;
  }
}

/**
 * Calculate celebrity weight based on follower count
 * @param {number} followerCount - Number of followers
 * @returns {number} - Weight value between 1.0 and 5.0
 */
function calculateCelebrityWeight(followerCount) {
  // Base weight is 1.0
  if (followerCount < 5) return 1.0;

  // Scale weight based on follower count
  // 5-10 followers: 1.5x
  if (followerCount < 10) return 1.5;

  // 10-50 followers: 2.0x
  if (followerCount < 50) return 2.0;

  // 50-100 followers: 3.0x
  if (followerCount < 100) return 3.0;

  // 100-500 followers: 4.0x
  if (followerCount < 500) return 4.0;

  // 500+ followers: 5.0x
  return 5.0;
}

/**
 * Get all celebrity users in the system
 * @param {number} followerThreshold - Minimum followers required (default: global FOLLOWER_THRESHOLD)
 * @param {number} commentTreeThreshold - Minimum size for a "large" comment tree
 * @param {boolean} requireComments - Whether to require engaging comments (default: false)
 * @returns {Promise<Array>} - Array of celebrity user objects
 */
async function getAllCelebrities(
  followerThreshold = FOLLOWER_THRESHOLD,
  commentTreeThreshold = 10,
  requireComments = false
) {
  try {
    // Get all users with at least the minimum follower count
    const usersWithFollowers = await prisma.user.findMany({
      where: {
        num_followers: {
          gte: followerThreshold,
        },
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        bio: true,
        num_followers: true,
        num_following: true,
      },
    });

    // If we don't require comments, return all users with sufficient followers
    if (!requireComments) {
      return usersWithFollowers;
    }

    // Otherwise, filter to only those with engaging comments
    const celebrities = [];

    for (const user of usersWithFollowers) {
      const hasEngagingComments = await hasLargeCommentTrees(
        user.id,
        commentTreeThreshold
      );

      if (hasEngagingComments) {
        celebrities.push(user);
      }
    }

    return celebrities;
  } catch (error) {
    return [];
  }
}

module.exports = {
  isUserCelebrity,
  getAllCelebrities,
  setFollowerThreshold,
  getCommentTreeSize,
  calculateCelebrityWeight,
};
