const Command = require('../Command');
const { getLeetCodeLeaderboard } = require('../util/leetcodeLeaderboard');
const { EmbedBuilder } = require('discord.js');

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

module.exports = new Command({
  name: 'leetcode',
  description: 'Query the LeetCode Leaderboard',
  aliases: [],
  example: 's!leetcode',
  permissions: 'member',
  category: 'member services',
  execute: async (message) => {
    const data = await getLeetCodeLeaderboard();

    if (!data || !data.leaderboard) {
      return message.channel.send('Error querying LeetCode Leaderboard.');
    }

    const { leaderboard, month } = data;
    const top10 = leaderboard.slice(0, 10);

    let maxNameLen = 'Username'.length;
    let maxPointsLen = 'Points'.length;

    top10.forEach((user, index) => {
      let name = user.username;
      if (name.length > 10) {
        name = name.substring(0, 10);
      }
      user.displayName = name;

      const rank = index + 1;
      const rankStr = rank < 10 ? ` ${rank}. ` : `${rank}. `;
      
      if (rankStr.length + name.length > maxNameLen) {
        maxNameLen = rankStr.length + name.length;
      }
      
      const pointsStr = user.points.toString();
      if (pointsStr.length > maxPointsLen) {
        maxPointsLen = pointsStr.length;
      }
    });

    const gap = 4;
    
    let description = '```ansi\n';
    
    const title = 'LeetCode Leaderboard';
    const totalWidth = maxNameLen + gap + maxPointsLen;
    const titlePadding = Math.floor((totalWidth - title.length) / 2);
    description += `\u001b[0;33m${' '.repeat(titlePadding)}${title}\u001b[0m\n`;
    
    const headerName = 'Username';
    const headerPoints = 'Points';
    const headerNamePadding = ' '.repeat(maxNameLen - headerName.length + gap);
    const headerPointsPadding = ' '.repeat(maxPointsLen - headerPoints.length);
    
    description += `\u001b[0;37m${headerName}${headerNamePadding}` +
      `${headerPointsPadding}${headerPoints}\u001b[0m\n`;

    top10.forEach((user, index) => {
      const rank = index + 1;
      const name = user.displayName;
      const points = user.points.toString();
      
      const rankStr = rank < 10 ? ` ${rank}. ` : `${rank}. `;
      const nameCol = `${rankStr}${name}`;
      const namePadding = ' '.repeat(maxNameLen - nameCol.length + gap);
      const pointsPadding = ' '.repeat(maxPointsLen - points.length);
      
      let colorCode = '\u001b[0;37m';
      if (rank === 1) colorCode = '\u001b[0;33m';
      else if (rank === 2) colorCode = '\u001b[0;31m';
      else if (rank === 3) colorCode = '\u001b[0;34m';
      
      description += `${colorCode}${nameCol}${namePadding}` +
        `${pointsPadding}${points}\u001b[0m\n`;
    });

    const monthText = `Month: ${MONTHS[month]}`;
    const monthPadding = Math.floor((totalWidth - monthText.length) / 2);
    description += `\u001b[0;33m${' '.repeat(monthPadding)}` +
      `${monthText}\u001b[0m\n`;

    description += '```';

    const embed = new EmbedBuilder()
      .setColor('#000000')
      .setDescription(description);

    return message.channel.send({ embeds: [embed] });
  },
});
