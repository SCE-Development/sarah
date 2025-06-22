const http = require('http');
const Discord = require('discord.js');
const promClient = require('prom-client');
const logger = require('./src/util/logger');
const {
  prefix,
  API_TOKEN,
} = require('./config.json');
const { MessageHandler } = require('./src/handlers/MessageHandler');
const {
  VoiceChannelChangeHandler,
} = require('./src/handlers/VoiceChannelChangeHandler');
const { NewMemberAddHandler } = require('./src/handlers/NewMemberAddHandler');
const { MemberLeaveHandler } = require('./src/handlers/MemberLeaveHandler');
const { ReactionHandler } = require ('./src/handlers/ReactionHandler');

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
  const reactionHandler = new ReactionHandler();
  client.once('ready', () => {
    messageHandler.initialize();
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

  client.on('guildMemberAdd', (newMember) => {
    newMemberHandler.handleNewMember(newMember);
  });

  client.on('guildMemberRemove', (member) => {
    memberLeaveHandler.handleMemberLeave(member);
  });

  client.on('messageReactionAdd', async (reaction, user) => {
    const botpfp = client.user.displayAvatarURL();
    reactionHandler.handleReaction(reaction, user, botpfp);
  });

  client.on('messageReactionRemove', async (reaction, user) => {
    const botpfp = client.user.displayAvatarURL();
    reactionHandler.handleReaction(reaction, user, botpfp, true);
  });

  client.login(API_TOKEN);
};

startBot();
