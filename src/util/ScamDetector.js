const logger = require('./logger');
const { EmbedBuilder } = require('discord.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

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
      'exams',
      'ticket',
      'tickets',
      'concert',
      'call',
      'assistant',
      'hire',
      '$',
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

      if (!scamLogChannel) {
        logger.warn('Scam log channel not found');
        return false;
      } 

      await member.roles.add(jailRole);
      await message.delete();
      
      logger.info(`Jailed user ${member.user.tag} for potential scam message`);


      
      const scamEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('Scam Message Detected')
        .addFields(
          { name: 'User', value: `<@${member.user.id}>`, inline: true },
          { name: 'Message', value: message.content.slice(0, 1024) }
        )
        .setTimestamp();

      const banButton = new ButtonBuilder()
        .setCustomId(`ban_scammer_${member.user.id}`)
        .setLabel('Ban User')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔨');

      const actionRow = new ActionRowBuilder()
        .addComponents(banButton);

      await scamLogChannel.send({ 
        embeds: [scamEmbed],
        components: [actionRow]
      });
      return true;
    } catch (error) {
      logger.error('Error handling scam message:', error);
      return false;
    }
  }

  async handleBanButton(interaction) {
    try {
      const userId = interaction.customId.split('_')[2];
      const guild = interaction.guild;
      
      let member = guild.members.cache.get(userId);
      if (!member) {
        try {
          member = await guild.members.fetch(userId);
        } catch (fetchError) {
          logger.warn(`Could not fetch member ${userId}:`, fetchError);
        }
      }

      if (!interaction.member.permissions.has('BanMembers')) {
        await interaction.reply({ 
          content: 'You do not have permission to ban members.', 
          ephemeral: true 
        });
        return false;
      }

      if (!guild.members.me.permissions.has('BanMembers')) {
        await interaction.reply({ 
          content: 'I do not have permission to ban members.', 
          ephemeral: true 
        });
        return false;
      }

      await guild.bans.create(userId, { reason: 'Banned for scam' });
      
      const userTag = member ? member.user.tag : `User ID: ${userId}`;
      logger.info(`User ${userTag} banned for scam activity`);
      
      await interaction.reply({ 
        content: `Successfully banned ${userTag} for scam activity.`, 
        ephemeral: true 
      });
      
      // Disable the button after successful ban
      const disabledButton = new ButtonBuilder()
        .setCustomId(`ban_scammer_${userId}`)
        .setLabel('User Banned')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('✅')
        .setDisabled(true);

      const disabledRow = new ActionRowBuilder()
        .addComponents(disabledButton);

      await interaction.message.edit({ 
        embeds: interaction.message.embeds,
        components: [disabledRow]
      });
      
      return true;
    } catch (error) {
      logger.error('Error handling ban button:', error);
      
      let errorMessage = 'Failed to ban user. ';
      if (error.code === 10007) {
        errorMessage += 'User not found.';
      } else if (error.code === 50013) {
        errorMessage += 'Missing permissions.';
      } else if (error.code === 10026) {
        errorMessage += 'User is already banned.';
      } else {
        errorMessage += 'Please try again or ban manually.';
      }
      
      await interaction.reply({ 
        content: errorMessage,
        ephemeral: true 
      });
      return false;
    }
  }
}

module.exports = { ScamDetector };
