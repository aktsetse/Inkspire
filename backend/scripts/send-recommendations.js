#!/usr/bin/env node

/**
 * Script to send book recommendations as notifications
 *
 * Usage:
 * node scripts/send-recommendations.js
 */

const {
  sendRecommendationNotifications,
} = require("../scheduled-tasks/recommendation-notifications");

sendRecommendationNotifications()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    process.exit(1);
  });
