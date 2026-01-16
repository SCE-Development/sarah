const {
  createAudioPlayer,
  joinVoiceChannel,
  AudioPlayerStatus,
  getVoiceConnection,
  createAudioResource,
} = require('@discordjs/voice');
// at the top of your file
const { EmbedBuilder } = require('discord.js');
const logger = require('./logger');

// see https://stackoverflow.com/a/59626464
class MusicSingleton {
  constructor() {
    if (MusicSingleton._instance) {
      return MusicSingleton._instance;
    }
    MusicSingleton._instance = this;
    this.youtubeReady = (async () => {
      const { Innertube } = await import('youtubei.js');
      return Innertube.create();
    })();
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
  extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }
  
  async announceNowPlaying(originalThis) {
    if (originalThis.alreadyAnnouncedCurrentVideo) {
      return;
    }
    originalThis.alreadyAnnouncedCurrentVideo = true;
    const embeddedSong = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle(originalThis.nowPlayingMetadata.title)
      .setURL(originalThis.nowPlayingMetadata.video_url)
      .setAuthor({ name: 'Now playing' })
      .setThumbnail(originalThis.nowPlayingMetadata.thumbnails[2].url)
      .setFooter(
        {
          text: `Requested by ${this._currentMessage.author.username}`,
          iconURL: `${this._currentMessage.author.displayAvatarURL()}`
        }
      );
    originalThis._currentMessage.channel.send({ embeds: [embeddedSong] });
  }

  async playNextUpcomingUrl(originalThis) {
    try {
      await this.youtubeReady;
    } catch (e) {
      logger.error('couldnt play next song:', e);
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
        this.nowPlayingMetadata.video_url === metadata.video_url;

      this.nowPlayingMetadata = metadata;

      try {
        const info = await this.youtube.getInfo(videoId);
        const format = info.chooseFormat({ type: 'audio' });
        const stream = format.decipher(this.youtube.session.player);

        const resource = createAudioResource(stream);
        originalThis.audioPlayer.play(resource);
      } catch (e) {
        logger.error('couldnt create audio resource:', e);
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
      await this.youtubeReady;
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
        this.nowPlayingMetadata = { ...videoDetails, repetitions: 1 };

        const format = info.chooseFormat({ type: 'audio' });
        const stream = format.decipher(this.youtube.session.player);        
        
        this.audioPlayer.play(
          createAudioResource(stream)
        );

        if (repetitions > 1) {
          this.playOrAddYouTubeUrlToQueue(message, url, repetitions - 1);
        }
      }
      return true;
    } catch (e) {
      logger.error('couldnt play song:', e);
      return false;
    }
  }
}


module.exports = MusicSingleton;
