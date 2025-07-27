const { prefix } = require('../../../config.json');

const Command = require('../Command');
const MusicSingleton = require('../../util/MusicSingleton');

const musicHandler = new MusicSingleton();

module.exports = new Command({
  name: 'remove',
  description: 'Remove a song from the queue',
  aliases: ['remove'],
  example: `${prefix}remove <index of song>`,
  permissions: 'member',
  category: 'music',
  disabled: false,
  execute: async (message, args) => {
    const index = Number(args[0]);
    return musicHandler.remove(message, index);
  } 
});
