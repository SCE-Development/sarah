const config = require('../../config.json');
const Canvas = require('@napi-rs/canvas');
const logger = require('../util/logger');
const { request } = require('undici');

const { AttachmentBuilder } = require('discord.js');

/**
 * Class which handles a new member coming to the server
 */
class NewMemberAddHandler {
  
  /**
   * Function that handles a new member joining the server
   * @param {GuildMember} newMember The new member in the server
   */
  async handleNewMember(newMember) {
    try {
      const guild = newMember.guild;
      const channels = guild.channels.cache;
      const newMemberChannelId = config.WELCOME.NEW_MEMBER_CHANNEL_ID;
      const welcomeChannel = channels.get(newMemberChannelId);
      const guildName = guild.name;
      
      // Create a canvas
      const canvas = Canvas.createCanvas(150, 150);
      const context = canvas.getContext('2d');

      
      // Avatar
      const { body } = await request(
        newMember.displayAvatarURL({ extension: 'png' })
      );
      const avatar = await Canvas.loadImage(await body.arrayBuffer());
      

      context.drawImage(avatar, 0, 0, 150, 150);

      const attachment = new AttachmentBuilder(
        await canvas.encode('png'),
        { name: 'profile-image.png' }
      );
      const defaultRoles = config.DEFAULT_ROLES || [];

      const message = 
        `<@${newMember.user.id}> welcome to ${guildName}! Please read ` +
        `server rules in <#${config.WELCOME.WELCOME_CHANNEL_ID}> and ` +
        `<#${config.WELCOME.INTRODUCE_YOURSELF_CHANNEL_ID}> so we can ` +
        'get to know you.';

      // send message to new member in welcome channel
      if (welcomeChannel) {
        await welcomeChannel.send({
          content: message,
          files: [attachment]
        });
      } else {
        logger.warn('Welcome channel not found');
      }

      // assign new member default roles
      defaultRoles.forEach(roleId => {
        const role = newMember.guild.roles.cache.get(roleId);
        if (role) {
          newMember.roles.add(role);
        }
      });
    } catch (e) {
      logger.error(e);
    }
  }
}

module.exports = { NewMemberAddHandler };
