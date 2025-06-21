const { ERROR_CHANNEL_ID = null } = require('../../config.json');
const { EmbedBuilder } = require('discord.js');
const logger = require('../util/logger');
const util = require('util');

/**
 * Log an error to both stderr and conditionally send an embed with error
 * information to a discord channel. The discord channel will only be sent
 * a message if the ERROR_CHANNEL_ID field in config.json is a numerical id.
 * @param {Object} message Discord js Message object. For more information see
 * https://old.discordjs.dev/#/docs/discord.js/14.11.0/class/Message
 * @param {Object} error Normal JavaScript error
 */
function logError(message, error) {
  try {
    logger.error(error);
    const channel = message.client.channels.cache.find(
      channel => channel.id === ERROR_CHANNEL_ID
    );
    if (!channel) {
      // If the channel is not found skip sending the embed
      return;
    }
    const exampleEmbed = new EmbedBuilder()
      .setColor(0x990000)
      .setTitle('SCE Discord Bot Error')
      .setDescription('```\n' + ` ${util.inspect(error)} ` + '\n```')
      .addFields(
        { name: 'Author', value: message.author.username },
        { name: `Original message: ${message.url}`, value: message.content },
        {
          name: 'Message timestamp',
          value: new Date(message.createdTimestamp).toISOString(),
        },
      );
    channel.send({ embeds: [exampleEmbed] });
  } catch (anotherError) {
    // For some reason if the above code throws a new error, we need
    // to catch it so we dont crash the bot. When this happens log
    // both errors to stderr.
    logger.error(
      'while handling the above error, another error occurred:',
      anotherError,
    );
  }
}

module.exports = class Command {
  constructor(args) {
    this.name = args.name;
    this.description = args.description;
    this.aliases = args.aliases;
    this.example = args.example;
    this.permissions = args.permissions;
    this.category = args.category;
    this.disabled = args.disabled || false;
    this.executeCommand = args.execute;
  }

  async execute(message, args) {
    try {
      this.executeCommand(message, args);
    } catch (error) {
      logError(message, error);
    }
  }
};
