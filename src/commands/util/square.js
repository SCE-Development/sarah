const Command = require('../Command');

module.exports = new Command({
    name: 'square',
    description: 'Check if the bot is up',
    aliases: [],
    example: 's!square',
    permissions: 'general',
    category: 'information',
    // eslint-disable-next-line
    execute: async (message, args) => {
        if (args.length === 1) {
            if (isNaN(args[0])) {
                return message.reply("give me valid number or else..");
            }

            message.channel.send(`The square of ${args[0]} is ${args[0] * args[0]}`);
        } else {
            message.reply("need a number")
        }
    },
});