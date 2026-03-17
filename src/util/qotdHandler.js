const cron = require('node-cron');
const qdb = require('../database/qotd');
const { MessageEmbed } = require('discord.js');
const { QOTD_CHANNEL_ID } = require('../../config.json');

//  Initializes all scheduled tasks for the bot
//  @param { Client } client - The Discord.js client instance

const initScheduler = (client) => {
  cron.schedule('0 8 * * *', async () => {
    const nextQuestion = qdb.popNext();

    if (nextQuestion) {
      const channel = client.channels.cache.get(QOTD_CHANNEL_ID);
      if (channel) {
        const embed = new MessageEmbed()
          .setTitle('📢 Question of the Day')
          .setDescription(nextQuestion.question)
          .setColor('#FFCC00')
          .setFooter({ text: `Suggested by ${nextQuestion.added_by}` });

        channel.send({ content: '@everyone', embeds: [embed] });
      }
    }
  }, {
    scheduled: true,
    timezone: 'America/Los_Angeles'
  });

  console.log('QOTD Scheduler Initialized');
};

module.exports = { initScheduler };
