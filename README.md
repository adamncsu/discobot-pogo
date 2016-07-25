# discobot-pogo
Discord bot written in node.js using discord.js. Monitors and announces Pokemon Go server status, obtained from [go.jooas.com](https://go.jooas.com/).

### Requirements

* [node.js 0.12+](http://nodejs.org)

* [discord.js](http://github.com/hydrabolt/discord.js)

          npm install --save --no-optional discord.js

* [console-stamp](https://www.npmjs.com/package/console-stamp)

          npm install console-stamp

---

### Settings

`adminID` is the ID of the user which can send admin commands via PM to the bot. Also receives error messages. You can get your user ID by typing `\@User#num` in Discord. ex: `\@Jigglypuff#5293`

`botToken` is the token acquired after [creating your bot](https://discordapp.com/developers/applications/me).

`channelName` is the name of the channel that you want to listen to public commands in. This is also the channel that announcements are made in. Can connect to channel on multiple servers.

---

### Usage

**Admin commands** - sent to the bot in a PM

* `kill` terminates the bot
* `mute` prevents the bot from announcing status changes
* `shutup` mutes the bot for 10 minutes


**Public commands** - sent to the bot in target channel (`channelName`)

* `!ping` bot status check
* `!status` forces a refresh and announcement of the current server status
* `!uptime` announces the server uptime stats
