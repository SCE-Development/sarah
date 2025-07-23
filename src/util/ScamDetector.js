const logger = require('./logger');
const { EmbedBuilder } = require('discord.js');

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

  async handleScamMessage(message, jailRoleId, scamLogChannelId) {
    try {
      const member = message.member;
      if (!member) {
        logger.warn('Cannot jail user - member not found');
        return false;
      }

      const jailRole = message.guild.roles.cache.get(jailRoleId);
      const scamLogChannel = message.guild.channels.cache.get(scamLogChannelId);

      if (!jailRole) {
        logger.error(`Jail role not found: ${jailRoleId}`);
        return false;
      }

      await member.roles.add(jailRole);
      await message.delete();
      
      logger.info(`Jailed user ${member.user.tag} for potential scam message`);
      if (scamLogChannel) {
        const scamEmbed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle('Scam Message Detected')
          .addFields(
            { name: 'User', value: `<@${member.user.id}>`, inline: true },
            { name: 'Message', value: message.content.slice(0, 1024) }
          )
          .setTimestamp();
        await scamLogChannel.send({ embeds: [scamEmbed] });
      } else {
        logger.warn('Scam log channel not found');
      }
      return true;
    } catch (error) {
      logger.error('Error handling scam message:', error);
      return false;
    }
  }
}

module.exports = { ScamDetector };
