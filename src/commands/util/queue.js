const { prefix } = require('../../../config.json');

const Command = require('../Command');
const MusicSingleton = require('../../util/MusicSingleton');

const musicHandler = new MusicSingleton();

module.exports = new Command({
  name: 'queue',
  description: 'List out the songs in the queue',
  aliases: ['queue'],
  example: `${prefix}queue`,
  permissions: 'member',
  category: 'music',
  disabled: false,
  execute: async (message) => {
    return musicHandler.queue(message);
  } 
});
