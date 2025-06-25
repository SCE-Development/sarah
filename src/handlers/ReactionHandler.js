const { REACTIONS = {} } = require('../../config.json');
const logger = require('../util/logger');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
* Add a reaction handler to the handler list.
* @param {Message} message - The message to add reaction to.
* @param {string} emoji - The emoji to react with.
* @param {boolean} reactionWasRemoved - Whether reaction was removed
* @param {string} botpfp - Bot's profile picture
*/



class ReactionHandler {

  //MessageReaction object, User object, botpfp object is passed in
  //reaction object has emoji, message, users properties

  async handleReaction(reaction, user, botpfp, reactionWasRemoved = false) {
    //this makes sure that we are only executing the below code when a reaction happens
    //on the specific message that we want stuff to happen
    //we define the REACTIONS object in config.json, where specific messages of our choosing
    //contain maps from emojis to role ids
    //this is basically checking if REACTIONS contains the message id of the reaction that just happened
    if (!REACTIONS[reaction.message.id]) {
      return;
    }
    //what dis function needs to do is
    //find the user
    //make an embed with a message such as "Welcome to SCE discord server react with thumps up if u a real one"
    //dm the user that embed

    //this returns a GuildMember object
    //we need a GuildMember object to assign roles to the member, but like
    //to dm them we lowkey don't need dat, we just need the user.id lolz
    const member = reaction.message.guild.members.cache.get(user.id);

    const guildName = reaction.message.guild.name;
    const emoji = reaction.emoji.name;


    try {
      //roles.cache.get(roleId) will give you the whole role object from the role id
      const role = reaction.message.guild.roles.cache.get(REACTIONS[reaction.message.id][emoji]);

      //makes an embed with our message
      const embed = new EmbedBuilder()
        .setTitle('Hey Queen! Welcome to the SCE Discord Server!')
        .setDescription('psssst.... hey kid......' + 'click on the button for a role......')
        .setFooter({
          text: 'Sent by the Reaction Roles bot' +
          `on behalf of the server, ${guildName}`,
          iconURL: `${botpfp}`
        });
      
      //makes a button
      const button = new ButtonBuilder()
      //whenever the button is pressed, an interaction event is sent to the bot
      //we set the id of the interaction event to be the roleid
      //this allows us to handle this specific interaction in our server.js
        .setCustomId(`role_toggle_${role.id}`)  // unique ID per role
        .setLabel(role.name)
        .setStyle(ButtonStyle.Primary);
      
      //adds the button to an action row
      const row = new ActionRowBuilder()
        .addComponents(button);

      //sends a dm to the member with the embed
      //the embed will also have the action 
      await member.send({embeds: [embed], components: [row]})
    } catch (e) {
      logger.warn('ik im not your type but can i be the EXCEPTION hehehehe: ', e)
    }
  }
}

module.exports = { ReactionHandler };