const Command = require('../Command');
const { getLeetCodeLeaderboard } = require('../util/leetcodeLeaderboard');
const { EmbedBuilder } = require('discord.js');

module.exports = new Command({
  name: 'leetcode',
  description: 'Query the LeetCode Leaderboard',
  aliases: [],
  example: 's!leetcode',
  permissions: 'member',
  category: 'member services',
  execute: async (message) => {
    const leaderboardData = await getLeetCodeLeaderboard();

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('LeetCode Leaderboard')
      .setDescription(leaderboardData);

    return message.channel.send({ embeds: [embed] });
  },
});
