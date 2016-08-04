# discobot-pogo
Discord bot written for node.js using discord.js. Monitors and announces Pokemon Go server status, obtained from [go.jooas.com](https://go.jooas.com/).

To connect to my bot without setting up your own, use this link:
[add PogoBot](https://discordapp.com/oauth2/authorize?client_id=205426428479537153&scope=bot&permissions=0)


### Requirements

* [node.js 0.12+](http://nodejs.org)

* [discord.js](http://github.com/hydrabolt/discord.js)

          npm install --save --no-optional discord.js

* [winston](https://github.com/winstonjs/winston)

          npm install winston

* [jsonfile](https://www.npmjs.com/package/jsonfile)

          npm install --save jsonfile

---

### Settings

`adminID` is the ID of the user which can send admin commands via PM to the bot. Also receives error messages. You can get your user ID by typing `\@User#num` in Discord. ex: `\@Jigglypuff#5293`

`botToken` is the token acquired after [creating your bot](https://discordapp.com/developers/applications/me).

`channelPath` is the file path where you want to store subscribed channels. The bot only listens on subscribed channels. To subscribe, see usage below.

---

### Usage

**TO SUBSCRIBE** - in your target channel, mention the bot and send `!subscribe` ie. `@PogoBot !subscribe`

**TO UNSUBSCRIBE** - in a subscribed channel, just type `!unsubscribe`, mention is not required.

**Admin commands** - sent to the bot in a PM

* `!kill` terminates the bot
* `!mute` prevents the bot from announcing status changes
* `!shutup` mutes the bot for 10 minutes

**Public commands** - sent to the bot in target channel (`channelName`)

* `!ping` bot connection check
* `!status` forces a refresh and announcement of the current server status
* `!uptime` announces the server uptime stats
* `!unsubscribe` unsubscribes from the bot's channel list
