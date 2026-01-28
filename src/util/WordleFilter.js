const logger = require('./logger');
const config = require('../../config.json');

class WordleFilter {
  isWordleSpam(message) {
    if (message.author.id !== config.WORDLE_BOT_ID) {
      return false;
    }
    // keep streak result messages, delete everything else
    return !message.content.toLowerCase().includes('your group');
  }

  async handleWordleSpam(message) {
    try {
      await message.delete();
      return true;
    } catch (error) {
      logger.error('Error deleting Wordle message:', error);
      return false;
    }
  }
}

module.exports = { WordleFilter };
