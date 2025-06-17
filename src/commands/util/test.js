const Command = require('../Command');
const sharp = require('sharp');
const path = require('path');

module.exports = new Command({
    name: 'test',
    description: 'Returns your pfp with an SCE background using Sharp.',
    aliases: [],
    example: 'g!test',
    permissions: 'general',
    category: 'information',
    execute: async (message, args) => {
        try {
            const sceBackgroundPath = path.join(__dirname, '../../../assets/sce_background.png');
            const userAvatarURL = message.author.displayAvatarURL({ extension: 'png', size: 256 });

            // Create the composite image
            const outputBuffer = await sharp(sceBackgroundPath)
                .composite([
                    {
                        input: Buffer.from(userAvatarBuffer), // Convert ArrayBuffer to Buffer
                        // Positioning of the avatar on the background
                        // Example: Centering the avatar
                        left: Math.floor((await sharp(sceBackgroundPath).metadata()).width / 2 - 128 / 2),
                        top: Math.floor((await sharp(sceBackgroundPath).metadata()).height / 2 - 128 / 2),
                        blend: 'over', // or 'over' or other blend modes
                        gravity: 'center', // You can also use gravity for positioning
                    }
                ])
                .png() // Output as PNG
                .toBuffer();

            message.channel.send({
                content: `Welcome to SCE <@${message.author.id}>!\n` + responseText,
                files: [{ attachment: outputBuffer, name: 'pfp_with_sce_background_sharp.png' }],
            });

        } catch (error) {
            console.error('Error generating image with Sharp:', error);
            message.reply('Sorry, I encountered an error while trying to generate the image. Please try again later.');
        }
    },
});