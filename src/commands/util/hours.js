const Command = require('../Command');
const { EmbedBuilder } = require('discord.js');

module.exports = new Command({
  name: 'hours',
  description: 'Get the hours the SCE Room is open!',
  aliases: ['hrs'],
  example: 's!hours',
  permissions: 'general',
  category: 'information',
  // eslint-disable-next-line
  execute: async (message, args) => {
    const embed = new EmbedBuilder()
      .setTitle('SCE Room Hours')
      .setDescription('10:00 AM - 3:00 PM')
      .setColor(0x0099FF);

    await message.channel.send({ embeds: [embed] });
  },
});
