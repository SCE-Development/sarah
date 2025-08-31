const axios = require('axios');
const { EmbedBuilder } = require('discord.js');
const { PARKING_CHANNEL_ID } = require('../../config.json');
const logger = require('./logger');

/**
 * Simple parking scraper for SJSU parking status
 * Caches data for 2 minutes to avoid spamming the website
 * Auto-updates embed in designated channel
 */
class ParkingScraper {
  constructor() {
    this.cache = null;
    this.UPDATE_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes for auto-updates
    this.embedMessage = null;
    this.client = null;
    this.updateInterval = null;
  }

  /**
   * Initialize the auto-updater with Discord client
   */
  initialize(client) {
    this.client = client;
    this.startAutoUpdate();
  }

  /**
   * Start the auto-update interval
   */
  startAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Initial fetch and cache
    this.fetchAndCacheData();

    // Set up recurring updates every 2 minutes
    this.updateInterval = setInterval(() => {
      this.fetchAndCacheData();
    }, this.UPDATE_INTERVAL_MS);

    logger.info('Parking auto-updater started - updates every 2 minutes');
  }

  /**
   * Fetch data and update cache (used by auto-updater)
   */
  async fetchAndCacheData() {
    try {
      logger.info('Fetching parking data...');
      const result = await this.scrapeParkingData();
      
      if (!result.success) {
        logger.error(`Failed to update parking cache: ${result.error}`);
        return;
      }

      // Update cache with successful result
      this.cache = {
        data: result.data,
        websiteTimestamp: result.websiteTimestamp,
        timestamp: Date.now()
      };

      // Update embed if we have a client
      if (this.client) {
        await this.updateParkingEmbed();
      }

      logger.info('Parking data cache updated successfully');
    } catch (error) {
      logger.error('Error in fetchAndCacheData:', error);
    }
  }

  /**
   * Stop the auto-update interval
   */
  stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      logger.info('Parking auto-updater stopped');
    }
  }

  /**
   * Get cached data (used by commands)
   */
  getCachedData() {
    if (this.cache) {
      return {
        success: true,
        data: this.cache.data,
        websiteTimestamp: this.cache.websiteTimestamp,
        fromCache: true
      };
    } else {
      return {
        success: false,
        error: 'No cached data available yet',
        fromCache: true
      };
    }
  }

  /**
   * Check if cache is still valid
   * (not used anymore since we always use cache)
   */
  isCacheValid() {
    return this.cache !== null;
  }

  /**
     * Format timestamp to ensure two-digit month and day and add PST timezone
     * Input: "2025-8-26 1:01:00 PM" -> Output: "2025-08-26 1:01:00 PM PST"
     */
  formatTimestamp(timestamp) {
    if (!timestamp || timestamp === 'Unknown') {
      return timestamp;
    }

    try {
      // Match pattern like "2025-8-26 1:01:00 PM"
      const match = timestamp.match(/(\d{4})-(\d{1,2})-(\d{1,2})(.+)/);
      if (match) {
        const [, year, month, day, timepart] = match;
        const formattedMonth = month.padStart(2, '0');
        const formattedDay = day.padStart(2, '0');
        return `${year}-${formattedMonth}-${formattedDay}${timepart} PST`;
      }

      return timestamp + ' PST';
    } catch (error) {
      logger.warn('Error formatting timestamp:', error);
      return timestamp;
    }
  }

  /**
     * Extract parking data from HTML using simple string parsing
     * Since we don't have cheerio, we'll use regex/string methods
     */
  parseHtml(html) {
    const parkingData = [];

    try {
      // Extract timestamp - look for pattern like 
      // "Last updated 2025-08-26 01:01:00 PM"
      const timestampMatch = html.match(
        /Last updated\s*([^<\n]+?)(?:\s*Refresh|<)/i
      );
      const rawTimestamp = timestampMatch ?
        timestampMatch[1].trim() : 'Unknown';
      const websiteTimestamp = this.formatTimestamp(rawTimestamp);

      // Simple regex to find garage names and their fullness
      // Look for patterns like: <h2 class="garage__name">North Garage</h2>
      // followed by: <span class="garage__fullness">85%</span>
      const garagePattern = new RegExp(
        '<h2[^>]*garage__name[^>]*>([^<]+?)(?:\\s*Garage)?\\s*</h2>[\\s\\S]*?' +
          '<span[^>]*garage__fullness[^>]*>([^<]+?)</span>',
        'gi'
      );

      let match;
      while ((match = garagePattern.exec(html)) !== null) {
        const name = match[1].trim();
        let fullness = match[2].trim();

        // Clean up fullness data
        if (fullness.toLowerCase() === 'full') {
          fullness = '100%';
        }

        // Ensure percentage sign
        if (!fullness.includes('%') && !isNaN(parseInt(fullness))) {
          fullness = fullness + '%';
        }

        parkingData.push({ name, fullness });
      }

      return { parkingData, websiteTimestamp };
    } catch (error) {
      throw new Error(`Failed to parse HTML: ${error.message}`);
    }
  }

  /**
   * Scrape parking data from SJSU parking website (internal method)
   */
  async scrapeParkingData() {
    try {
      const response = await axios.get('https://sjsuparkingstatus.sjsu.edu/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
              'AppleWebKit/537.36 (KHTML, like Gecko) ' +
              'Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000, // 10 second timeout
        httpsAgent: new (require('https').Agent)({
          // Ignore SSL certificate errors
          rejectUnauthorized: false
        })
      });

      const { parkingData, websiteTimestamp } = this.parseHtml(response.data);

      return {
        success: true,
        data: parkingData,
        websiteTimestamp
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get parking data (always returns cached data for commands)
   */
  async fetchParkingData() {
    return this.getCachedData();
  }

  /**
     * Format parking data as simple text
     */
  formatSimple(data) {
    if (!data || data.length === 0) {
      return 'No parking data available';
    }

    return data.map(garage => `${garage.name}: ${garage.fullness}`).join('\n');
  }

  /**
   * Update the parking embed in the designated channel
   */
  async updateParkingEmbed() {
    try {
      if (!this.client || !PARKING_CHANNEL_ID) {
        return;
      }

      const channel = this.client.channels.cache.get(PARKING_CHANNEL_ID);
      if (!channel) {
        logger.warn(`Parking channel ${PARKING_CHANNEL_ID} not found`);
        return;
      }

      // Use cached data for embed
      if (!this.cache) {
        logger.warn('No cached parking data available for embed update');
        return;
      }

      const { data, websiteTimestamp } = this.cache;
      const embed = this.createParkingEmbed(data, websiteTimestamp);

      // Try to edit existing message first
      if (this.embedMessage) {
        try {
          await this.embedMessage.edit({ embeds: [embed] });
          logger.info(
            'Parking embed updated successfully (edited existing message)'
          );
          return;
        } catch (error) {
          logger.warn(
            'Failed to edit existing message, will find or create new one:',
            error.message
          );
          this.embedMessage = null;
        }
      }

      // Check for existing bot messages in the channel
      try {
        const messages = await channel.messages.fetch({ limit: 10 });
        const botMessage = messages.find(
          msg => msg.author.id === this.client.user.id
        );

        if (botMessage) {
          // Edit the found message
          this.embedMessage = await botMessage.edit({ embeds: [embed] });
          logger.info(
            'Parking embed updated successfully (edited found message)'
          );
        } else {
          // No existing messages found - delete any old ones and create fresh
          const allBotMessages = messages.filter(
            msg => msg.author.id === this.client.user.id
          );
          
          if (allBotMessages.size > 0) {
            await Promise.all(allBotMessages.map(
              msg => msg.delete().catch(() => {})
            ));
            logger.info(`Deleted ${allBotMessages.size} old parking messages`);
          }

          // Create new message
          this.embedMessage = await channel.send({ embeds: [embed] });
          logger.info(
            'Parking embed updated successfully (created new message)'
          );
        }
      } catch (error) {
        logger.warn(
          'Error finding/editing message, creating new one:',
          error.message
        );
        this.embedMessage = await channel.send({ embeds: [embed] });
        logger.info(
          'Parking embed updated successfully (fallback new message)'
        );
      }

    } catch (error) {
      logger.error('Error updating parking embed:', error);
    }
  }

  /**
     * Create Discord embed for parking data
     */
  createParkingEmbed(data, websiteTimestamp) {
    if (!data || data.length === 0) {
      return new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('🚗 SJSU Parking Status')
        .setDescription('❌ No parking data available')
        .setTimestamp();
    }

    // Create status summary
    const summary = data.map(garage => {
      const percentage = parseInt(garage.fullness.replace('%', ''));
      let statusEmoji = '🟢'; // Green for low usage
      if (percentage >= 90) statusEmoji = '🔴'; // Red for high usage
      else if (percentage >= 70) statusEmoji = '🟡'; // Yellow for medium usage

      return `${statusEmoji} **${garage.name}**: ${garage.fullness}`;
    }).join('\n');

    return new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('🚗 SJSU Parking Garage Status')
      .setDescription(summary)
      .addFields({
        name: '📊 Visual Chart',
        value: '```\n' + this.createSimpleChart(data) + '\n```',
        inline: false
      })
      .addFields({
        name: '🕒 Last Updated',
        value: websiteTimestamp,
        inline: true
      })
      .setFooter({
        text: 'Updates every 2 minutes • Use s!parking for cached data'
      })
      .setTimestamp();
  }

  /**
     * Create a simple chart for embed
     */
  createSimpleChart(data) {
    if (!data || data.length === 0) {
      return 'No data available';
    }

    const maxNameLength = Math.max(...data.map(d => d.name.length));

    return data.map(garage => {
      const fullness = parseInt(garage.fullness.replace('%', ''));
      const barLength = Math.floor(fullness / 5); // 20 character bar
      const filledBar = '█'.repeat(barLength);
      const emptyBar = '░'.repeat(20 - barLength);
      const paddedName = garage.name.padEnd(maxNameLength);

      return `${paddedName} ${filledBar}${emptyBar} ${garage.fullness}`;
    }).join('\n');
  }

  /**
     * Create a simple text chart using ASCII characters (for command usage)
     */
  createChart(data, websiteTimestamp) {
    if (!data || data.length === 0) {
      return 'No parking data available';
    }

    const maxNameLength = Math.max(...data.map(d => d.name.length));

    let chart = 'SJSU Parking Status\n';
    chart += '='.repeat(50) + '\n\n';

    data.forEach(garage => {
      const fullness = parseInt(garage.fullness.replace('%', ''));
      // 20 character bar (100% / 5 = 20)
      const barLength = Math.floor(fullness / 5);
      const filledBar = '█'.repeat(barLength);
      const emptyBar = '░'.repeat(20 - barLength);
      const paddedName = garage.name.padEnd(maxNameLength + 2);

      chart += `${paddedName} ${filledBar}${emptyBar} ${garage.fullness}\n`;
    });

    chart += `\nLast updated: ${websiteTimestamp}`;

    return chart;
  }
}

// Export singleton instance
module.exports = new ParkingScraper();
