# SCE Discord bot

The SCE has a [discord server](https://discord.gg/e2Dsgd9) where
its members gather online. The purpose of this bot is to manage
the Discord server with custom commands. 

## How to Run
### Prerequisites
1. [npm](https://www.npmjs.com)
1. [docker](https://www.docker.com)

### With Docker
1.  Create a `config.json` file with the same format as `config.example.json`
2. `API_TOKEN` is the Discord API token (ask a team member for this)
3. In your terminal (in the root directory of the project) run `docker-compose up --build bot`
   1. Make sure Docker is running first
   2. Omit the `--build` flag to reuse an old build
4. Test out the bot in the discord channel!

### Without Docker

1. Create a `config.json` file with the same format as `config.example.json`
   1. `API_TOKEN` is the Discord API token (ask a team member for this)
2. In your terminal (in the root directory of the project)
   1. run `npm install`
   2. run `npm start`
3. Test out the bot in the discord channel!

## Reaction Roles
To have the bot assign a role to a user when they react to a message, add
an entry to the `REACTIONS` object in `config.json` like below:
```json
{
   "REACTIONS": {
      "MESSAGE_ID": {
         "EMOJI": "ROLE_ID"
      }
   }
}
```

For example, if we want to assign a role if a user reacts to a message
with either 😂 or 👍, we would create an entry like below:
```json
{
   "REACTIONS": {
      "1162195531150393364": {
         "😂": "847528126207885383",
         "👍": "622587142639714304"
      }
   }
}
```
**Note:** The role will be removed if the user un-reacts to the message.

### Reverse Reaction Role Behavior
If we want to un-assign a role if a user reacts to a message and
re-assign the role if the user un-reacts with 👍, we would create
an entry like below:
```json
{
   "REACTIONS": {
      "1162195531150393364": {
         "👍": "622587142639714304",
         "reverse": true
      }
   }
}
```

## Purpose of this bot

We are currently using Dyno/Tatsumaki/Reactionrole/Owobot to manage
our [Discord server](https://discord.gg/e2Dsgd9). This Discord bot
will allow us to combine the functionalities of these four bots
into one. It will also be tailored specifically towards the SCE discord
server.

## Directory structure

1. src/
1. api/
1. test/

`src/` contains all the commands and bot interface
`api/` is used to connect to the website
`test/` is used for testing
