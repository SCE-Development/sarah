const axios = require('axios');
const { LEETCODE_LEADERBOARD_API_URL } = require('../../config.json');

/**
 * @summary Query stats from the LeetCode Leaderboard.
 * @return {Promise} A promise that contains the leaderboard stats
 */
function queryLeetcodeLeaderboard() {
  return new Promise((resolve, reject) => {
    axios.get(
      LEETCODE_LEADERBOARD_API_URL,
    )
      .then((res) => {
        resolve(res.data);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

module.exports = { queryLeetcodeLeaderboard };
