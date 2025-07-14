const { REACTIONS = {} } = require('../../config.json');
const { EmbedBuilder } = require('discord.js');
const logger = require('../util/logger');
/**
* Add a reaction handler to the handler list.
* @param {Message} message - The message to add reaction to.
* @param {string} emoji - The emoji to react with.
* @param {boolean} reactionWasRemoved - Whether reaction was removed
* @param {string} botpfp - Bot's profile picture
*/
class ReactionHandler {
  async handleReaction(reaction, user, botpfp, reactionWasRemoved = false) {
    const emoji = reaction.emoji.name;
    const member = reaction.message.guild.members.cache.get(user.id);

    if (!REACTIONS[reaction.message.id]) {
      return;
    }

    try {
      const role = reaction.message.guild.roles.cache.get(
        REACTIONS[reaction.message.id][emoji]
      );
      // If reverse is true, flip. If not keep as is
      let roleAction = reactionWasRemoved;
      if (REACTIONS[reaction.message.id].reverse) {
        roleAction = !roleAction;
      }

      const guildName = reaction.message.guild.name;
      const embed = new EmbedBuilder()
        .setTitle('Roles Updated')
        .setFooter({
          text: 'Sent by the Reaction Roles bot'
            + ` on behalf of the server, ${guildName}`,
          iconURL: `${botpfp}`
        });
        
      let verb = 'reacted';
      let addedOrRemoved = 'Added';
      if (roleAction) {
        member.roles.remove(role);
        verb = 'removed your reaction';
        addedOrRemoved = 'Removed';
      } else {
        member.roles.add(role);
      }
      const name = `Roles ${addedOrRemoved}`;
      let description = `You ${verb} to this ` + 
        `[this message](${reaction.message.url}) in the server, `
        + `${guildName}, and changed your roles.`;
      embed.setDescription(description);
      embed.addFields(
        { name, value: `${role.name}` }
      );
      await member.send({embeds: [embed]});
    } catch (e) {
      logger.warn('Role does not exist', e);
    }
  }
}

module.exports = { ReactionHandler };