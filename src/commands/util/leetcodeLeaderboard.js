const {
  queryLeetcodeLeaderboard
} = require('../../APIFunctions/LeetcodeLeaderboard');

/**
 * Queries stats from the LeetCode leaderboard.
 */
async function getLeetCodeLeaderboard() {
  return await queryLeetcodeLeaderboard();
}

module.exports = { getLeetCodeLeaderboard };
