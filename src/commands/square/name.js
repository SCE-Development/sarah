const Command = require('../Command');

module.exports = new Command({
  name: 'square',
  description: 'square the number',
  aliases: [],
  example: 's!square',
  permissions: 'general',
  category: 'information',
  // eslint-disable-next-line
  execute: async (message, args) => {
    if (args.length === 0) {
      return message.reply(
        `please specify a value`,
      );
    } else if (isNaN(args[0])) {
      return message.reply(
        `please specify a number to square`,
      );
    } else {
      const number = Number(args[0]);
      const squared = number * number;
      return message.reply(
        `${number} squared is ${squared}`,
      );
    }
  },
});
