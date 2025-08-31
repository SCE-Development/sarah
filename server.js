const http = require('http');
const Discord = require('discord.js');
const promClient = require('prom-client');
const logger = require('./src/util/logger');
const {
  prefix,
  API_TOKEN,
  guildId,
} = require('./config.json');

const { MessageHandler } = require('./src/handlers/MessageHandler');
const {
  VoiceChannelChangeHandler,
} = require('./src/handlers/VoiceChannelChangeHandler');
const { NewMemberAddHandler } = require('./src/handlers/NewMemberAddHandler');
const { MemberLeaveHandler } = require('./src/handlers/MemberLeaveHandler');
const { ReactionHandler } = require ('./src/handlers/ReactionHandler');
const { ScamDetector } = require('./src/util/ScamDetector');


const PROMETHEUS_PORT = process.env.PROMETHEUS_PORT || 9000;

const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const server = http.createServer(async (req, res) => {
  if (req.url !== '/metrics') {
    return res.writeHead(404).end('only GET /metrics allowed');
  }
  res.writeHead(200, { 'Content-Type': register.contentType });
  res.end(await register.metrics());
});

server.listen(
  PROMETHEUS_PORT,
  () => logger.info(`Metrics server started on ${PROMETHEUS_PORT}`),
);


const startBot = async () => {
  const client = new Discord.Client({
    intents: [
      Discord.GatewayIntentBits.Guilds,
      Discord.GatewayIntentBits.GuildMessages,
      Discord.GatewayIntentBits.MessageContent,
      Discord.GatewayIntentBits.GuildVoiceStates,
      Discord.GatewayIntentBits.GuildMessageReactions,
      Discord.GatewayIntentBits.GuildMembers,
      Discord.GatewayIntentBits.GuildPresences,
    ],
    partials:
      [
        Discord.Partials.Channel,
        Discord.Partials.Message,
        Discord.Partials.Reaction],
  });
  const messageHandler = new MessageHandler(prefix);
  const vcChangeHandler = new VoiceChannelChangeHandler();
  const newMemberHandler = new NewMemberAddHandler();
  const memberLeaveHandler = new MemberLeaveHandler();
  // creating a new ReactionHandler object
  // we can call the methods defined in the ReactionHandler class by 
  // calling them on the reactionHandler object
  const reactionHandler = new ReactionHandler();
  const scamDetector = new ScamDetector();
  const parkingScraper = require('./src/util/ParkingScraper');
  
  client.once('ready', () => {
    messageHandler.initialize();
    parkingScraper.initialize(client);
    client.user.setPresence({
      activity: {
        name: `${prefix}help`,
        type: 'LISTENING',
      },
    });
    logger.info('Discord bot live');
  });

  client.on('messageCreate', (message) => {
    messageHandler.handleMessage(message);
  });

  client.on('voiceStateUpdate', (oldState, newState) => {
    vcChangeHandler.handleChangeMemberInVoiceChannel(oldState, newState);
  });

  // newMember is a GuildMember object
  client.on('guildMemberAdd', (newMember) => {
    newMemberHandler.handleNewMember(newMember);
  });

  client.on('guildMemberRemove', (member) => {
    memberLeaveHandler.handleMemberLeave(member);
  });
  // client.on basically triggers a function whenever an event happens
  // checks to see if a reaction has been added to a message in the server
  // whenever a messageReactionAdd event happens
  // Discord.js sends MessageReaction object, and User object
  // into our specified function
  // passes in the MessageReaction object and User object containing data
  // the reaction and the user are passed into the handleReaction method
  // from the reactionHandler class

  // we can use reaction.message, to get the message object, or reaction.emoji
  // we can use message.id, or message.content, to access information about 
  // the message
  // user is a User object, and contains information about the person 
  // that reacted
  // we can use user.id or user.username on the User object
  // everything is a json........... MessageReaction...... User......... 
  // Message........
  // what if WE yes me and you are jsons too......... 
  // look at the love inside my heart for you with 
  // JSON.stringify(me.heart) vro.......

  client.on('messageReactionAdd', async (reaction, user) => {
    const botpfp = client.user.displayAvatarURL();
    reactionHandler.handleReaction(reaction, user, botpfp);
  });

  client.on('messageReactionRemove', async (reaction, user) => {
    const botpfp = client.user.displayAvatarURL();
    reactionHandler.handleReaction(reaction, user, botpfp, true);
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return; // Only handle button interactions

    const customId = interaction.customId;

    if (customId.startsWith('ban_scammer_')) {
      await scamDetector.handleBanButton(interaction);
      return;
    }

    // Check if this is one of our role toggle buttons
    if (!customId.startsWith('role_toggle_'))
      return;

    const roleId = customId.replace('role_toggle_', '');

    // Replace with your actual guild ID where roles exist
    const guild = client.guilds.cache.get(guildId);

    if (!guild) {
      return interaction.reply({ content: 'Guild not found.', 
        ephemeral: true });
    }

    try {
      // Fetch member from the guild
      const member = await guild.members.fetch(interaction.user.id);

      // Get the role from the guild's cache
      const role = guild.roles.cache.get(roleId);

      if (!role) {
        return interaction.reply({ content: 'Role not found.', 
          ephemeral: true });
      }

      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(role);
        await interaction.reply({ content: 'Removed the role ' + 
          `**${role.name}** from you.`, ephemeral: true });
      } else {
        await member.roles.add(role);
        await interaction.reply({ content: 'Added the role ' + 
          `**${role.name}** to you.`, ephemeral: true });
      }
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'There was an error while' +
        'updating your roles.', ephemeral: true });
    }});
  client.login(API_TOKEN);
};

startBot();
