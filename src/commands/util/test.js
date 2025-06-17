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
            const userAvatarURL = message.author.displayAvatarURL({ extension: 'png', size: 512 });

            // Fetch the user's avatar buffer
            const response = await fetch(userAvatarURL);
            const userAvatarBuffer = await response.arrayBuffer(); // Use arrayBuffer for Sharp

            // --- Process and resize the user avatar ---
            const avatar = sharp(Buffer.from(userAvatarBuffer));

            // Define the desired size for the avatar on the final image
            const desiredAvatarWidth = 512; // Adjust as needed
            const desiredAvatarHeight = 512; // Adjust as needed (or keep aspect ratio)

            // Resize the avatar
            const resizedAvatarBuffer = await avatar
                .resize(desiredAvatarWidth, desiredAvatarHeight)
                .toBuffer();

            // --- Calculate position to center the avatar on the background ---
            const backgroundMetadata = await sharp(sceBackgroundPath).metadata();
            const avatarX = Math.floor((backgroundMetadata.width / 2) - (desiredAvatarWidth / 2));
            const avatarY = Math.floor((backgroundMetadata.height / 2) - (desiredAvatarHeight / 2));

            // Create the composite image
            const outputBuffer = await sharp(sceBackgroundPath)
                .composite([
                    {
                        input: Buffer.from(resizedAvatarBuffer), // Convert ArrayBuffer to Buffer
                        // Positioning of the avatar on the background
                        // Example: Centering the avatar
                        left: avatarX,
                        top: avatarY,
                        blend: 'over', // or 'over' or other blend modes
                        gravity: 'center', // You can also use gravity for positioning
                    }
                ])
                .png() // Output as PNG
                .toBuffer();

            message.channel.send({
                content: `Welcome to SCE <@${message.author.id}>!\n`,
                files: [{ attachment: outputBuffer, name: 'pfp_with_sce_background_sharp.png' }],
            });

        } catch (error) {
            console.error('Error generating image with Sharp:', error);
            message.reply('Sorry, I encountered an error while trying to generate the image. Please try again later.');
        }
    },
});