const handlersPath = '.';
const utilPath = '../util';
const logger = require('../util/logger');
const config = require('../../config.json');

const { CommandHandler } = require(handlersPath + '/CommandHandler');
const { NonPrefixHandler } = require(handlersPath + '/NonPrefixHandler');
const { createNonPrefixRegex } = require(utilPath + '/NonPrefixRegexCreator');
const { ScamDetector } = require(utilPath + '/ScamDetector');

/**
 * Class which handles interpreting an input message and invoking the correct
 * command handler for the SCE discord bot
 */
class MessageHandler {
  /**
   * Create a MessageHandler.
   * @param {string} prefix The value used to trigger the bot, e.g. "s!".
   * @member {CommandHandler} commandHandler The handler for prefixed commands.
   * @member {NonPrefixHandler} nonPrefixHandler The handler
   * for non-prefix commands.
   */
  constructor(prefix) {
    this.prefix = prefix;
    this.commandHandler = new CommandHandler();
    this.nonPrefixHandler = new NonPrefixHandler();
    this.scamDetector = new ScamDetector();
  }

  /**
   * Initialize handlers and create nonPrefixRegex
   */
  initialize() {
    this.nonPrefixRegex = createNonPrefixRegex();
    this.commandHandler.initialize();
    this.nonPrefixHandler.initialize();
    // Initialize the Date object for the uptime command when the bot starts
    this.startTime = new Date();
  }

  /**
   * Function to handle when a user or bot sends a message in discord.
   * @param {string} message An event triggered by a user's input.
   * Ignores message if the author is a bot
   */
  async handleMessage(message) {
    try {
      // Add a botStartTime field to the message object
      message.botStartTime = this.startTime;
      if (message.author.bot) {
        return;
      }

      // Check for scam messages first
      if (this.scamDetector.isScamMessage(message)) {
        await this.scamDetector.handleScamMessage(
          message, config.jailRoleId, config.SCAM_LOG_CHANNEL_ID
        );
        return;
      }

      if (message.content.startsWith(this.prefix)) {
        this.commandHandler.handleCommand(this.prefix, message);
      } else if (this.nonPrefixRegex.test(message.content)) {
        this.nonPrefixHandler.handleCommand(message);
      }
    } catch (e) {
      logger.error(e);
    }
  }
}

module.exports = { MessageHandler };
