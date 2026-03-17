const cron = require('node-cron');
const qdb = require('../database/qotd');
const { EmbedBuilder } = require('discord.js');
const { QOTD } = require('../../config.json');

//  Initializes all scheduled tasks for the bot
//  @param { Client } client - The Discord.js client instance

const initScheduler = (client) => {
  cron.schedule(QOTD.CRON_TIME, async () => {
    try {
      const nextQuestion = await qdb.popNext();

      if (nextQuestion) {
        console.log('nextQuestion is real');
        const channel = await client.channels.fetch(QOTD.QOTD_CHANNEL_ID);
        if (channel && (channel.type === 0 ||
          typeof channel.send === 'function')) {
          const embed = new EmbedBuilder()
            .setTitle('☆ Question of the Day ☆')
            .setDescription(nextQuestion.question)
            .setColor('#FFCC00')
            .setFooter({ text: `Suggested by ${nextQuestion.added_by}` });

          await channel.send(
            { content: `<@&${QOTD.QOTD_ROLE_ID}>`, embeds: [embed] });
          console.log('Question Posted!');
        }
      } else {
        console.log('Queue is empty!');
      }
    } catch (error) {
      console.log('failed to post qotd: ', error);
    }
  }, {
    scheduled: true,
    timezone: 'America/Los_Angeles'
  });

  console.log('QOTD Scheduler Initialized');
};

module.exports = { initScheduler };
