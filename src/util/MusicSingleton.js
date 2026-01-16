const {
  createAudioPlayer,
  joinVoiceChannel,
  AudioPlayerStatus,
  getVoiceConnection,
  createAudioResource,
  StreamType,
} = require('@discordjs/voice');
// at the top of your file
const { EmbedBuilder } = require('discord.js');
const play = require('play-dl');
const logger = require('./logger');


// see https://stackoverflow.com/a/59626464
class MusicSingleton {
  constructor() {
    if (MusicSingleton._instance) {
      return MusicSingleton._instance;
    }
    MusicSingleton._instance = this;


    this._currentMessage = null;
    this.upcoming = [];
    this.nowPlayingMetadata = {};
    this.alreadyAnnouncedCurrentVideo = false;
    this.botWasKicked = false;
    this.audioPlayer = createAudioPlayer();
    this.audioPlayer.on(AudioPlayerStatus.Idle, () => {
      this.playNextUpcomingUrl(this);
    });
    this.audioPlayer.on(AudioPlayerStatus.Playing, () => {
      if (this.botWasKicked) {
        return;
      }
      this.announceNowPlaying(this);
    });
    this.audioPlayer.on(AudioPlayerStatus.AutoPaused, async () => {
      // clear queues and stop the streaming
      this.botWasKicked = true;
      this.stop();
      this.setIsBotConnectedToChannel(false);
    });
    this.audioPlayer.on('error', (error) => {
      logger.error('Audio player encountered an error:', error);
    });
  }

  async initYouTube() {
    const { Innertube, Platform, Types } = await import("youtubei.js/web");
    Platform.shim.eval = async (data, env) => {
        const properties = [];
        if (env.n) properties.push(`n: exportedVars.nFunction("${env.n}")`);
        if (env.sig) properties.push(`sig: exportedVars.sigFunction("${env.sig}")`);
        const code = `${data.output}\nreturn { ${properties.join(', ')} };`;
        return new Function(code)();
      };
    
    this.youtube = await Innertube.create({
      enable_session_cache: true,
      player_id: "0004de42",
      client_type: "ANDROID",
    });

    return this.youtube;
  }

  extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  videoIdToUrl(videoId) {
  if (typeof videoId !== 'string' || videoId.length !== 11) {
    throw new Error('Invalid YouTube video ID');
  }
  return `https://www.youtube.com/watch?v=${videoId}`;
  }

  
  async announceNowPlaying(originalThis) {
    console.log('📢 announceNowPlaying called!');
    console.log('alreadyAnnounced:', originalThis.alreadyAnnouncedCurrentVideo);
    console.log('metadata:', originalThis.nowPlayingMetadata);
      
    if (originalThis.alreadyAnnouncedCurrentVideo) {
      console.log('Already announced, returning early');
      return;
    }

      if (originalThis.alreadyAnnouncedCurrentVideo) {
      return;
    }
    originalThis.alreadyAnnouncedCurrentVideo = true;
    const metadata = originalThis.nowPlayingMetadata;
    
    const embeddedSong = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle(metadata.title)
      .setURL(metadata.url_canonical || `https://www.youtube.com/watch?v=${metadata.id}`)
      .setAuthor({ name: 'Now playing' })
      .setThumbnail(metadata.thumbnail?.[0]?.url || `https://i.ytimg.com/vi/${metadata.id}/hqdefault.jpg`)
      .setFooter({
        text: `Requested by ${this._currentMessage.author.username}`,
        iconURL: `${this._currentMessage.author.displayAvatarURL()}`
      });
    originalThis._currentMessage.channel.send({ embeds: [embeddedSong] });
  }

  async playNextUpcomingUrl(originalThis) {
    try {
      this.youtube = await this.initYouTube();   
     } catch (e) {
      logger.error('couldnt initialize yt:', e);
      return;
    }

    if (originalThis.upcoming.length) {
      const { url: latestTrack, videoId, metadata } = originalThis.upcoming[0];
      metadata.repetitions -= 1;
      if (metadata.repetitions === 0) {
        originalThis.upcoming.shift();
      }

      this.alreadyAnnouncedCurrentVideo =
        this.nowPlayingMetadata &&
        this.nowPlayingMetadata.id === metadata.id;

      this.nowPlayingMetadata = metadata;


      try {
        const info = await this.youtube.getInfo(videoId);

        const stream = await info.download(this.videoIdToUrl(videoId), {
          type: "audio",
          format: "opus",
        });

        const resource = createAudioResource(stream, {
          inputType: StreamType.Opus,
        });

        this.audioPlayer.play(resource);
      } catch (e) {
        logger.error("couldn't create audio resource:", e);
      }

    } else if (this.botWasKicked) {
      this.botWasKicked = false;
    } else {
      const connection = getVoiceConnection(
        originalThis._currentMessage.guild.voiceStates.guild.id
      );
      originalThis._isBotConnectedToChannel = false;
      connection.destroy();
    }
  }
  isBotConnectedToChannel() {
    return this._isBotConnectedToChannel;
  }

  setIsBotConnectedToChannel(value) {
    this._isBotConnectedToChannel = value;
  }

  disconnectBot() {
    this.upcoming = [];
    this.nowPlayingMetadata = {};
    this.alreadyAnnouncedCurrentVideo = false;
    this.audioPlayer.stop();
  }

  skip(message) {
    if (!message.member.voice.channel) {
      return message.reply('Please join a voice channel first!');
    }
    if (this.isBotConnectedToChannel()) {
      if (this.audioPlayer.state.status === AudioPlayerStatus.Playing) {
        // we stop the audio player here so the state becomes idle
        // once idle, the next song will play
        this.audioPlayer.stop();
      } else {
        message.reply('There are no songs to skip!');
      }
    } else {
      // bot is not on
      message.reply('The bot is not connected to a voice channel!');
    }
  }

  stop(message) {
    if (!message) return;
    if (!message.member.voice.channel) {
      return message.reply('Please join a voice channel first!');
    }


    if (this.audioPlayer.state.status === AudioPlayerStatus.Idle) {
      return false;
    }
    this.upcoming = [];
    this.nowPlayingMetadata = {};
    this.audioPlayer.stop();
    const embeddedStop = new EmbedBuilder()
      .setColor(0x0099FF)
      .setAuthor({ name: 'The bot is stopped' })
      .setFooter(
        {
          text: `Requested by ${this._currentMessage.author.username}`,
          iconURL: `${this._currentMessage.author.displayAvatarURL()}`
        }
      );
    this._currentMessage.channel.send({ embeds: [embeddedStop] });
  }

  pause(message) {
    if (!message.member.voice.channel) {
      message.reply('You need to join a voice channel first!');
      return false;
    }
    if (this.audioPlayer.state.status !== AudioPlayerStatus.Paused) {
      this.audioPlayer.pause();
    }
    const embeddedPause = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle(this.nowPlayingMetadata.title)
      .setAuthor({ name: 'Paused' })
      .setURL(this.nowPlayingMetadata.video_url)
      .setThumbnail(this.nowPlayingMetadata.thumbnails[2].url)
      .setFooter(
        {
          text: `Requested by ${this._currentMessage.author.username}`,
          iconURL: `${this._currentMessage.author.displayAvatarURL()}`
        }
      );
    message.channel.send({ embeds: [embeddedPause] });
  }

  resume(message) {
    if (!message.member.voice.channel) {
      return message.reply('Please join a voice channel first!');
    }
    if (this.audioPlayer.state.status === AudioPlayerStatus.Paused) {
      this.audioPlayer.unpause();
      return message.reply('Unpaused!');
    } else {
      // the above will call announceNowPlaying implicitly, so we put the
      // below call in an else to avoid showing the user what's playing twice
      console.log("heyyyy: ", this);
      this.announceNowPlaying(this);
    }
  }
  
  remove(message, index) {
    if (!message.member.voice.channel) {
      return message.reply('Please join a voice channel first!');
    }
    if (index < 0) {
      return message.reply('That\'s not a valid position in the queue!');
    }
    if (this.upcoming.length === 0) {
      return message.reply('There aren\'t any songs in the queue...');
    }
    if (index >= this.upcoming.length) {
      return message.reply('There aren\'t that many songs in the queue...');
    }
    const song = this.upcoming[index].metadata.title;
    this.upcoming.splice(index, 1);
    const embeddedRemove = new EmbedBuilder()
      .setColor(0x0099FF)
      .setAuthor({ name: `Removed ${song} from the queue` })
      .setFooter(
        {
          text: `Requested by ${this._currentMessage.author.username}`,
          iconURL: `${this._currentMessage.author.displayAvatarURL()}`
        }
      );
    this._currentMessage.channel.send({ embeds: [embeddedRemove] });
  }

  queue(message) {
    if (this.upcoming.length === 0) {
      return message.reply('There\'s nothing in the queue...');
    }
    const queue = this.upcoming
      .slice(0, 10)
      .map((song, index) => `${index}. ${song.metadata.title}`
      ).join('\n');
    const embeddedQueue = new EmbedBuilder()
      .setColor(0x0099FF)
      .setAuthor({ name: 'Queue' })
      .setTitle(queue);
    this._currentMessage.channel.send({ embeds: [embeddedQueue] });
  }

  // not assumed sent url is valid YouTube URL anymore
  async playOrAddYouTubeUrlToQueue(message, url, repetitions = 1) {
    try {
      this.youtube = await this.initYouTube();   
      const videoId = this.extractVideoId(url);

      if (videoId === null) {
        message.reply(
          `${url} is not a valid YouTube URL`
        );
        return false;
      }

      const info = await this.youtube.getInfo(videoId);
      const videoDetails = info.basic_info;

      if (!message.member.voice.channel) {
        message.reply('You need to join a voice channel first!');
        return false;
      }

      if (!this._isBotConnectedToChannel) {
        const voiceChannel = message.member.voice.channel;
        this.setIsBotConnectedToChannel(true);
        joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: voiceChannel.guild.id,
          adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        }).subscribe(this.audioPlayer);
      }
      const isInPlayingState =
        this.audioPlayer.state.status === AudioPlayerStatus.Playing;

      if (isInPlayingState) {
        const embeddedQueue = new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle(videoDetails.title)
          .setURL(videoDetails.url_canonical)
          .setAuthor({ name: 'Added Track' })
          .addFields(
            {
              name: 'Position in upcoming',
              value: `${this.upcoming.length}`,
              inline: true,
            },
            {
              name: 'Repetitions',
              value: `${repetitions}`,
              inline: true,
            }
          )
          .setThumbnail(videoDetails.thumbnails[2].url)
          .setTimestamp()
          .setFooter(
            {
              text: `Requested by ${message.author.username}`,
              iconURL: `${message.author.displayAvatarURL()}`
            }
          );
        // push after sending message to preserve 0-indexing
        this.upcoming.push({ 
          url, 
          videoId,
          metadata: { ...videoDetails, repetitions }
        });
        message.channel.send({ embeds: [embeddedQueue] });
      } else {
        console.log('▶️ Playing immediately, not in queue');
        this._currentMessage = message; 
        this.nowPlayingMetadata = { ...videoDetails, repetitions: 1 };
        
        console.log('Now playing metadata set:', this.nowPlayingMetadata);
        
        //const stream = await play.stream(this.videoIdToUrl(videoId)) 
        const stream = await info.download(this.videoIdToUrl(videoId), {
          type: "audio",
          quality: "best",
          format: "opus", // 👈 IMPORTANT
        });
        // const playResult = await play.stream(this.videoIdToUrl(videoId));
        const resource = createAudioResource(stream, {
          inputType: StreamType.Opus, // 👈 REQUIRED
        });          

        console.log('About to play audio...');
        this.audioPlayer.play(resource);
        console.log('Audio player state:', this.audioPlayer.state.status);
      }
      return true;
    } catch (e) {
      logger.error('couldnt play song:', e);
      return false;
    }
  }
}


module.exports = MusicSingleton;
