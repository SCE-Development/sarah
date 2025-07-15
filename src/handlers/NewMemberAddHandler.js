const config = require('../../config.json');
const Canvas = require('@napi-rs/canvas');
const logger = require('../util/logger');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, 
  ButtonStyle } = require('discord.js');
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
  // newMember is a GuildMember object
  // won't anyone say what the object is......
  // T_T
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
        logger.warn('Welcome channel not found');
      }

      // assign new member default roles
      defaultRoles.forEach(roleId => {
        const role = newMember.guild.roles.cache.get(roleId);
        if (role) {
          newMember.roles.add(role);
        }
      });
      
      try {

        // gets the username of the new member
        let memberName = newMember.user.username;
      
        // this will get the role object by using the role id for
        // the verified role which will be in config.json hopefully
        const role = guild.roles.cache.get(config.verifiedRoleId);

        // make an embed, which is what we will send to the new user's dms
        const embed = new EmbedBuilder()
          .setTitle('Who is this diva!!? Welcome to the SCE Discord ' + 
            `Server ${memberName}!`)
          .setDescription('psssst.... hey queen......' + 
            'click on the button to verify yourself......' +
            'and get access to the rest of the server')
          .setFooter({
            text: 'Sent by the Sarah bot' +
            `on behalf of the server, ${guildName}`
          });

        // makes a button, with the name of the verified role
        const button = new ButtonBuilder()
          .setCustomId(`role_toggle_${role.id}`)
          .setLabel(role.name)
          .setStyle(ButtonStyle.Primary);
        
        // adds the button to an action row
        const row = new ActionRowBuilder()
          .addComponents(button);

        // sends the embed and the action row with the button to
        // verify the user to their dms
        await newMember.send({embeds: [embed], components: [row]});

        // if successful, the bot will @user to check their dms
      } catch (e) {
        console.log(e);

        // the 50007 error code is when the bot doesn't have 
        // permission to dm the user
        if (e.code === 50007) {
          // in that case make an embed
          const replyEmbed = new EmbedBuilder()
            // attach a message that @'s the new member and tells them
            // that the bot cannot dm them
            // .setDescription(`uhhhhhh <@${newMember.user.id}> mamacita, 
            // i can't dm you,,,,,, can you check your settings`)
            .setImage('https://media0.giphy.com/media/v1.Y2lkPTc5MGI3' + 
              'NjExcDkzbWdqNDU5NDl2ZGNsZDRxOWc4bDlsejIwZHJvaXBwdzJua3' +
              'hydCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/YAnpMSHcu' +
              'rJVS/giphy.gif');
          // sends the embed into the channel
          await welcomeChannel.send({content: 'uhhhhh' + 
            `<@${newMember.user.id}> ` +
            'mamacita, i can\'t dm you,,,,,, can you check your ' + 
            `settings,,,, and then also go ${config.prefix}verify in the ` + 
            'chat for me', embeds: [replyEmbed]});
        }
      }
    } catch (e) {
      logger.error(e);
    }
    
  }
}

module.exports = { NewMemberAddHandler };
