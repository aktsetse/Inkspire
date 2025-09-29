/**
 * Service for interacting with the celebrity API endpoints
 */

/**
 * Get all celebrity users in the system
 * @param {number} followerThreshold - Minimum number of followers required (default=5)
 * @param {number} commentThreshold - Minimum size of comment tree to be considered "large" (default=10)
 * @param {boolean} requireComments - Whether to require engaging comments (default=false)
 * @returns {Promise<Array>} - Array of celebrity user objects
 */
export const getAllCelebrities = async (
  followerThreshold = 5,
  commentThreshold = 10,
  requireComments = false
) => {
  try {
    const response = await fetch(
      `/api/celebrities?followers=${followerThreshold}&comments=${commentThreshold}&requireComments=${requireComments}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch celebrities: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching celebrities:", error);
    throw error;
  }
};

/**
 * Check if a specific user is a celebrity
 * @param {number} userId - The user ID to check
 * @param {number} followerThreshold - Minimum number of followers required (default=5)
 * @param {number} commentThreshold - Minimum size of comment tree to be considered "large" (default=10)
 * @returns {Promise<boolean>} - True if the user is a celebrity
 */
export const isUserCelebrity = async (
  userId,
  followerThreshold = 5,
  commentThreshold = 10
) => {
  try {
    const response = await fetch(
      `/api/celebrities/${userId}?followers=${followerThreshold}&comments=${commentThreshold}`
    );

    if (!response.ok) {
      throw new Error(`Failed to check celebrity status: ${response.status}`);
    }

    const data = await response.json();
    return data.isCelebrity;
  } catch (error) {
    console.error("Error checking celebrity status:", error);
    throw error;
  }
};
