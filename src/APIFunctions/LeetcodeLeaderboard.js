const axios = require('axios');
const { LEETCODE_LEADERBOARD_API_URL } = require('../../config.json');

/**
 * @summary Query stats from the LeetCode Leaderboard.
 * @return {Promise} A promise that contains the leaderboard stats
 */
function queryLeetcodeLeaderboard() {
  return new Promise((resolve) => {
    axios.get(
      LEETCODE_LEADERBOARD_API_URL,
    )
      .then((res) => {
        const responseData = res.data.map((user, index) => {
          const profileUrl = `https://leetcode.com/u/${user.user}/`;
          return (
            `${index + 1}. [${user.user}](${profileUrl}): ` +
              (user.points > 1
                ? user.points + ' points'
                : user.points + ' point')
          );
        });
        const trimmedResponseData = responseData.slice(0, 10).join('\n');
        resolve(trimmedResponseData);
      })
      .catch(() => {
        resolve('Error querying LeetCode Leaderboard.');
      });
  });
}

module.exports = { queryLeetcodeLeaderboard };
