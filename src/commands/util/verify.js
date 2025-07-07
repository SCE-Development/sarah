const Command = require('../Command');
const { EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = new Command({
  name: 'verify',
  description: 'sends a message to the user to verify them',
  aliases: [],
  example: 'r!verify',
  permissions: 'general',
  category: 'information',
  execute: async(message, args) => {
    // this will return a GuildMember object
    const member = message.member;

    // this gets the name of the server
    const guildName = message.guild.name;

    let memberName = message.member.nickname;
    if (message.member.nickname === null) {
      memberName = message.member.user.username;
    }
    // const botpfp = client.user.displayAvatarURL();
    try {
        // gets the role object by its id
        const role = message.guild.roles.cache.get('831500120558010378');
        const embed = new EmbedBuilder()
            .setTitle(`Who is this diva!?? Welcome to the` + `
                SCE Discord Server ${memberName}!`)
            .setDescription('psssst.... hey queen......' + 
                'click on the button to verify yourself ' + 
                'and get access to the rest of the server......')
            .setFooter({
            text: 'Sent by the Reaction Roles bot' +
            `on behalf of the server, ${guildName}`
            // ,
            // iconURL: `${botpfp}`
            });

        const button = new ButtonBuilder()
            .setCustomId(`role_toggle_${role.id}`)
            .setLabel(role.name)
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder()
            .addComponents(button);
        
        // attempts to send the embed as a dm first
        await member.send({embeds: [embed], components: [row]});

        // if there is an error when sending, 
        // won't reply with the confirmation msg in the server
        return await message.reply('mamacita check your dm');
    } catch (e) {
        console.log('ik im not your type but can i ' +
            'be the EXCEPTION hehehehe: ', e);
        // if the error object caught has a code of 50007
        // that means that it is the 'cannot send message to the user error'
        if (e.code === 50007) {
            const replyEmbed = new EmbedBuilder()
                // send an appropriate error message 
                // replying to the user in the server
                .setDescription(`uhhhhhh ${memberName} mamacita, ` + 
                    `i can't dm you,,,,,, can you check your settings`)
                // with an appropriate gif
                .setImage('https://media0.giphy.com/media/v1.Y2lkPTc5' +
                    'MGI3NjExcDkzbWdqNDU5NDl2ZGNsZDRxOWc4bDlsejIwZHJvaXB' +
                    'wdzJua3hydCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw' +
                    '/YAnpMSHcurJVS/giphy.gif');
            return await message.reply({embeds: [replyEmbed]});
        }
    }
    }
})
