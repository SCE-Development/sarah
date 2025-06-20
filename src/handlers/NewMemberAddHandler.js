const config = require('../../config.json');
const Canvas = require('@napi-rs/canvas');
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

      // build from background image
      const url = '/sarah/assets/sce_background.png';
      const backgroundImage = await Canvas.loadImage(url);

      // Get the dimensions from the loaded background image
      const canvasWidth = backgroundImage.width;
      const canvasHeight = backgroundImage.height;

      // Create a new canvas with the background image's dimensions
      const canvas = Canvas.createCanvas(canvasWidth, canvasHeight);
      const ctx = canvas.getContext('2d');

      // Draw the background image to fill the entire canvas
      ctx.drawImage(backgroundImage, 0, 0, canvasWidth, canvasHeight);

      // Avatar
      const { body } = await request(
        newMember.displayAvatarURL({ extension: 'png' })
      );
      const avatar = await Canvas.loadImage(await body.arrayBuffer());
      const avatarX = 512;
      const avatarY = 512;
      const x = (canvasWidth - avatarX) / 2;
      const y = (canvasHeight - avatarY) / 2;
      ctx.drawImage(avatar, x, y, avatarX, avatarY);

      const buffer = await canvas.encode('png');
      const attachment = new AttachmentBuilder(
        buffer,
        { name: 'welcome.png' }
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
          files: [attachment],
        });
      } else {
        console.log('Welcome channel not found');
      }

      // assign new member default roles
      defaultRoles.forEach(roleId => {
        const role = newMember.guild.roles.cache.get(roleId);
        if (role) {
          newMember.roles.add(role);
        }
      });
    } catch (e) {
      console.error(e);
    }
  }
}

module.exports = { NewMemberAddHandler };
