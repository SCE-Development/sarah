const Command = require('../Command');


module.exports = new Command({
    name: 'internship',
    description: 'Internship information doc',
    aliases: [],
    example: 's!internship',
    permissions: 'general',
    category: 'information',
    // eslint-disable-next-line
    execute: async (message, args) => {
        await message.channel.send(
            'https://docs.google.com/document/d/1hqSKPdD8BYJs1Oqc1AWJoJg5hovUv-IR_NVx9QSqPSo/edit?usp=sharing'
        );
    },
});
