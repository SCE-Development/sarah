const Command = require('../Command');
const sharp = require('sharp');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const { GEMINI_API_KEY } = require('../../../config.json');

function fileToGenerativePart(arrayBuffer, mimeType) {
    // Convert ArrayBuffer to Node.js Buffer, then to Base64 string
    const buffer = Buffer.from(arrayBuffer);
    return {
        inlineData: {
            data: buffer.toString('base64'),
            mimeType,
        },
    };
}

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Use gemini-pro-vision for image analysis

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

            // Fetch the user's avatar buffer
            const response = await fetch(userAvatarURL);
            const userAvatarBuffer = await response.arrayBuffer(); // Use arrayBuffer for Sharp

            // https://ai.google.dev/tutorials/node_quickstart#use_the_gemini_api
            const geminiBugger = fileToGenerativePart(userAvatarBuffer, 'image/png'); // Convert ArrayBuffer to Generative Part 

            // Gemini Prompt Engineering: THIS IS KEY!
            // Adjust this prompt heavily to get the desired output.
            const prompt = `
            We are welcoming new users to our club called SCE (Student Computer Engineering) on Discord.
            You are provided with the name of the user which is "${message.author.username}" and their profile picture.
            Analyze the user's profile picture and provide a sentence in response that starts with the user's name and describes how that person can help a computer science club like SCE.
                            For example: "A cat lover," "A gamer," "A nature enthusiast," "A person who enjoys memes," "A professional," "A digital artist."
                            If the image is generic or a default avatar, say "A standard user" or "A default avatar user."
                            For example: "A passionate gamer who can help SCE with game development projects, John Doe we welcome you to SCE!"`; // Providing username as additional context

            const result = await model.generateContent([prompt, geminiBugger]);
            const responseText = result.response.text();

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