const logger = require('./logger');

class ScamDetector {
  constructor() {
    this.scamKeywords = [
      'free',
      'new',
      'first come first serve',
      'dm',
      'pm',
      'macbook',
      'camera',
      'afford',
      'ps5',
      'tutor',
      'discord.gg',
      'exams'
    ];
  }

  isScamMessage(messageContent) {
    try {
      const content = messageContent.toLowerCase();
      
      let keywordCount = 0;
      for (const keyword of this.scamKeywords) {
        if (content.includes(keyword)) {
          keywordCount++;
        }
      }

      const isScam = keywordCount >= 3;

      if (isScam) {
        logger.warn(`Potential spam detected: ${keywordCount} matched`);
      }

      return isScam;
    } catch (error) {
      logger.error('Error in scam detection:', error);
      return false;
    }
  }

  async handleScamMessage(message, jailRoleId) {
    try {
      const member = message.member;
      if (!member) {
        logger.warn('Cannot jail user - member not found');
        return false;
      }

      const jailRole = message.guild.roles.cache.get(jailRoleId);
      if (!jailRole) {
        logger.error(`Jail role not found: ${jailRoleId}`);
        return false;
      }

      await member.roles.add(jailRole);
      await message.delete();
      
      logger.info(`Jailed user ${member.user.tag} for potential scam message`);
      return true;
    } catch (error) {
      logger.error('Error handling scam message:', error);
      return false;
    }
  }
}

module.exports = { ScamDetector };
