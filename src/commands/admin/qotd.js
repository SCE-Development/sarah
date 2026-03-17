const Command = require('../Command');
const { isOfficer } = require('../../util/Permission');
const { EmbedBuilder } = require('discord.js');
const qdb = require('../../database/qotd');

module.exports = new Command({
  name: 'qotd',
  description: 'question of the day queue',
  aliases: [],
  example: 's!qotd add <message> | s!qotd list',
  permissions: 'admin',
  category: 'mod',
  execute: async (message, args) => {
    const author = message.member;
    if (isOfficer(author)) {
      const sub = (args[0] && args[0].toLowerCase()) || null;
      const content = args.slice(1).join(' ');

      switch (sub) {
        case 'add':
        case 'priority': {
          if (!content) return message.reply('Please provide a question !');
          await qdb.addQuestion(content, message.author.username,
            sub === 'priority');
          message.channel.send(`Added to ${sub === 'priority' ?
            'front' : 'back'} of queue!`);
          break;
        }

        case 'remove': {
          const id = args[1];
          if (isNaN(id)) return message.reply('Please use a valid ID !');
          await qdb.removeQuestion(id);
          message.channel.send(`Removed question #${id}.`);
          break;
        }

        case 'list': {
          const queue = await qdb.getQueue();
          const queueEmbed = new EmbedBuilder()
            .setTitle(`QOTD Queue (${queue.length} questions)`)
            .setColor(0xA47DAB)
            .setDescription(
              queue.map((q, i) =>
                `#${i + 1} (ID ${q.id}) - ${q.question}`)
                .join('\n') || 'Queue is empty.');
          message.channel.send({ embeds: [queueEmbed] });
          break;
        }
        case 'past': {
          const past = await qdb.getPast();
          const pastEmbed = new EmbedBuilder()
            .setTitle('Past QOTDs')
            .setColor('#5865F2')
            .setDescription(past.map(q => {
              const date = new Date(q.posted_at).toLocaleDateString(
                'en-US', { month: '2-digit', day: '2-digit' });
              return `**${date}** — ${q.question} (added by ${q.added_by})`;
            }).join('\n') || 'No history found.');
          message.channel.send({ embeds: [pastEmbed] });
          break;
        }

        default:
          message.reply(
            'Invalid Command! Usage: `s!qotd <add|priority|remove|list|past>`');
      }
    } else {
      message.channel.send(
        `Sorry ${author}, you have to be an officer to access QOTD commands!`);
    }

  },
});
