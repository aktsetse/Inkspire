/**
 * Configuration settings for the notification system
 */
module.exports = {
  // High activity threshold configuration
  HIGH_ACTIVITY: {
    // Number of distinct users required to trigger a high activity notification
    DISTINCT_USERS_THRESHOLD: 5,

    // Time window in minutes to check for high activity
    TIME_WINDOW_MINUTES: 30,
  },
};
