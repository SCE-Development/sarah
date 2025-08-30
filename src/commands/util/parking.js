const Command = require('../Command');
const parkingScraper = require('../../util/ParkingScraper');
const { EmbedBuilder } = require('discord.js');
const { PARKING_CHANNEL_ID } = require('../../../config.json');

module.exports = new Command({
  name: 'parking',
  description: 'Get SJSU parking garage status (uses cached data)',
  aliases: ['park', 'garages'],
  example: 'parking',
  category: 'Util',
  execute: async function(message, args) {
    try {
      const result = await parkingScraper.fetchParkingData();
      
      if (!result.success) {
        message.channel.send(`❌ Failed to fetch parking data: ${result.error}`);
        return;
      }
      
      const { data, websiteTimestamp, fromCache } = result;
      
      if (!data || data.length === 0) {
        message.channel.send('❌ No parking data available');
        return;
      }
      
      // Check if user wants chart format
      const wantsChart = args.includes('chart') || args.includes('graph');
      
      if (wantsChart) {
        // Create text chart
        const chart = parkingScraper.createChart(data, websiteTimestamp);
        
        const embed = new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle('🚗 SJSU Parking Status')
          .setDescription('```\n' + chart + '\n```')
          .setFooter({ 
            text: fromCache ? 'Data from cache' : 'Fresh data' 
          })
          .setTimestamp();
        
        message.channel.send({ embeds: [embed] });
      } else {
        // Simple format with link to auto-updating channel
        const simpleText = parkingScraper.formatSimple(data);
        
        const embed = new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle('🚗 SJSU Parking Status')
          .setDescription(simpleText)
          .addFields({ 
            name: 'Last Updated', 
            value: websiteTimestamp, 
            inline: true 
          });

        // Add link to auto-updating channel if it exists
        if (PARKING_CHANNEL_ID) {
          embed.addFields({
            name: '📊 Live Updates',
            value: `Check <#${PARKING_CHANNEL_ID}> for auto-updating parking status`,
            inline: false
          });
        }

        embed.setFooter({ 
          text: 'Cached data • Use "parking chart" for visual chart' 
        })
        .setTimestamp();
        
        message.channel.send({ embeds: [embed] });
      }
      
    } catch (error) {
      message.channel.send(`❌ An error occurred: ${error.message}`);
    }
  }
});