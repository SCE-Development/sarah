const {
  createAudioPlayer,
  joinVoiceChannel,
  AudioPlayerStatus,
  getVoiceConnection,
  createAudioResource,
} = require('@discordjs/voice');
// at the top of your file
const { EmbedBuilder } = require('discord.js');

const ytdl = require('@distube/ytdl-core');
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
    if (originalThis.upcoming.length) {
      const { url: latestTrack, metadata } = originalThis.upcoming[0];
      metadata.repetitions -= 1;
      if (metadata.repetitions === 0) {
        originalThis.upcoming.shift();
      }
      this.alreadyAnnouncedCurrentVideo = this.nowPlayingMetadata && 
        this.nowPlayingMetadata.video_url === metadata.video_url;
      this.nowPlayingMetadata = metadata;
      let stream = ytdl(latestTrack, { filter: 'audioonly' });
      const resource = createAudioResource(stream);
      originalThis.audioPlayer.play(resource);
    }
    else if (this.botWasKicked) {
      // when the bot is kicked from a channel, the next time it plays a song,
      // the state first goes to idle. we handle this case here by
      // playing the next song instead of disconnecting the bot
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

  // Assumes sent url is valid YouTube URL
  async playOrAddYouTubeUrlToQueue(message, url, repetitions = 1) {
    try {
      const { videoDetails } = await ytdl.getInfo(url);
      this._currentMessage = message;

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
        this.upcoming.push({ 
          url, 
          metadata: { ...videoDetails, repetitions }
        });
        const embeddedQueue = new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle(videoDetails.title)
          .setURL(videoDetails.video_url)
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
        message.channel.send({ embeds: [embeddedQueue] });
      } else {
        this.nowPlayingMetadata = { ...videoDetails, repetitions: 1 };
        const stream = ytdl(url, { filter: 'audioonly' });
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
