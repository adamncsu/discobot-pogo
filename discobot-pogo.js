const discord = require('discord.js');
const https = require('https');
const jsonfile = require('jsonfile');

// logging
require( "console-stamp" )( console, { pattern : "dd/mm/yy HH:MM:ss.l" } );

// server status and info
var pokeStatus = require('./status.js');

// settings
var settings = require('./settings.js');

// variables
var bot;
var targetChannels;
var muted;
var timer;



// bot initialization
function init(){
	console.log('Initializing bot...');
	bot = new discord.Client({
		autoReconnect: true,
		rateLimitAsError: true
	});
	bot.loginWithToken(settings.botToken);
	
	muted = false;
}
init();


// bot event handler -- connected
bot.on('ready', function(){
	console.log('Bot online');
	bot.sendMessage(settings.adminID, 'Bot online');
	
	// list connected servers
	if(bot.servers.length > 0){
		console.log('Connected servers: ');
		for (var i=0; i<bot.servers.length; i++)
			console.log('  - %s (%s)', bot.servers[i].name, bot.servers[i].id);
	}
	else{
		console.warn('Not connected to any servers. Disconnecting...');
		bot.destroy(function(){
			console.log('Ending process...');
			process.exit();
		});
		return;
	}
		
	// list connected channels
	var textChannels = bot.channels.getAll('type', 'text');
	if(textChannels.length > 0){
		console.log('Connected channels: ');
		for (var i=0; i<textChannels.length; i++) 
			console.log('  - %s (%s)', textChannels[i].name, textChannels[i].id);
	}
	
	// load subscribed channels
	try{
		targetChannels = jsonfile.readFileSync(settings.channelPath);
	}
	catch(err){
		console.log('Channel file does not exist. Creating...');
		targetChannels = [];
			jsonfile.writeFile(settings.channelPath, [], function (err){
			if(err){
				console.error('Unable to write file. Ending process...');
				process.exit();
			}
		});
	}
	
	console.log('Subscribed channels:');
	console.log(targetChannels);
	
	// set up timer
	clearInterval(timer);
	timer = setInterval(updatePogoStatus, 60000);
	updatePogoStatus();
});


// bot event handler -- disconnected
bot.on('disconnected', function(){
	console.log('Bot offline');
});


// bot event handler -- message received
bot.on('message', function(message){
	
	// ignore self
	if(message.author.id == bot.user.id)
		return;
	
	// check if mentioned (subscribe)
	if(message.mentions.indexOf(bot.user) > -1 && message.content.indexOf('!subscribe') > -1){
		subscribeChannel(message);
		return;
	}
	
	// PM received
	if(message.channel instanceof discord.PMChannel){
		// also allow pm subscriptions
		if(message.content.indexOf('!subscribe') > -1)
			subscribeChannel(message);

		// admin commands
		else if(message.author.id == settings.adminID)
			processAdminCommand(message);
		
		// public commands
		else
			processCommand(message);
	}
	
	// listen only on target channels for public commands
	else if(targetChannels.indexOf(message.channel.id) > -1)
		processCommand(message);
	
});


// bot event handler -- warning
bot.on('warn', function(error){
	console.warn(error);
	bot.sendMessage(settings.adminID, error);
});


// bot event handler -- error
bot.on('error', function(error){
	console.error(error);
	bot.sendMessage(settings.adminID, error);
});


function processAdminCommand(message){
	if(message.content.charAt(0) != '!')
		return;
		
	console.log('Admin command received: ' + message.content);
	switch(message.content.substring(1).toLowerCase()){
		
		case 'status':
		case 'uptime':
		case 'ping':
		case 'unsubscribe':
			processCommand(message);
		break;
		
		case 'kill':
			bot.sendMessage(message.channel, 'Terminating bot...', {}, function(){
				bot.destroy(function(){
					console.log('Ending process...');
					process.exit();
				});
			});
		break;
		
		case 'mute':
			muted = !muted;
			announce('Bot ' + (muted ? 'muted' : 'unmuted'));
		break;
		
		case 'shutup':
			bot.sendMessage(message.channel, 'Bot muted for 10 minutes');
			muted = true;
			
			// announce
			for(var i=0; i<targetChannels.length; i++)
				bot.sendMessage(targetChannels[i], "Shutting up for 10 minutes...");
			setTimeout(function(){
				muted = false;
			}, 600000);
		break;
	}
}


function processCommand(message){
	if(message.content.charAt(0) != '!')
		return;

	console.log('Command received: ' + message.content);
	switch(message.content.substring(1).toLowerCase()){
		case 'ping':
			bot.reply(message, 'pong');
		break;
	
		case 'status':
			updatePogoStatus(message);
		break;
	
		case 'uptime':
			var str = '\nGO has been ' + pokeStatus.goStatus() + ' for ' + pokeStatus.go_idle + ' minutes';
			str += '\nPast hour uptime: ' + pokeStatus.go_uptime_hour + '%';
			str += '\nPast day uptime: ' + pokeStatus.go_uptime_day + '%';
			str += '\nPTC has been ' + pokeStatus.ptcStatus() + ' for ' + pokeStatus.ptc_idle + ' minutes';
			str += '\nPast hour uptime: ' + pokeStatus.ptc_uptime_hour + '%';
			str += '\nPast day uptime: ' + pokeStatus.ptc_uptime_day + '%';
			bot.reply(message, str);
		break;
		
		case 'unsubscribe':
			unsubscribeChannel(message);
		break;
	}
}


// server status check function
function updatePogoStatus(message){
	var request = https.request(pokeStatus.https_options, function(response){
		var str = '';
		response.on('data', function(data){
			str += data;
		}).on('end', function(){
			var firstCheck = pokeStatus.go_response == -1;
			
			// update server status object
			try{
				pokeStatus.update(JSON.parse(str));
			}
			catch(err){ 
				bot.sendMessage(settings.adminID, "Error parsing JSON");
				console.log(err);
			}
			
			// if this is the first check, just print to console
			if(firstCheck){
				console.log('Server status initialized: GO:' + pokeStatus.goStatus() + ' PTC:' + pokeStatus.ptcStatus());
				pokeStatus.go_online_prev = pokeStatus.go_online;
				pokeStatus.ptc_online_prev = pokeStatus.ptc_online;
			}
			
			// else, if the server status changed, log and announce it
			else {
				// GO
				if(pokeStatus.goChanged() && pokeStatus.go_idle > 5.0){
					console.log('GO status changed: ' + pokeStatus.goStatus());
					pokeStatus.go_online_prev = pokeStatus.go_online;
					
					// announce to all target channels
					if(!muted)
						announce('GO server is ' + pokeStatus.goStatus());
				}
				
				// PTC
				if(pokeStatus.ptcChanged() && pokeStatus.ptc_idle > 5.0){
					console.log('PTC status changed: ' + pokeStatus.ptcStatus());
					pokeStatus.ptc_online_prev = pokeStatus.ptc_online;
					
					// announce to all target channels
					if(!muted)
						announce('PTC server is ' + pokeStatus.ptcStatus());
				}
				
				// if this is in response to a request, send a reply
				if(typeof message !== 'undefined')
					bot.reply(message, 'GO ' + pokeStatus.goStatus() + ', PTC ' + pokeStatus.ptcStatus());
			}
			
		});
		
	}).on('error', function(e){
		console.error(e);
	}).end();
}

function announce(message){
	var d = new Date();
	for(var i=0; i<targetChannels.length; i++)
		bot.sendMessage(targetChannels[i], '[' + d.toLocaleTimeString() + '] ' + message);
}

function subscribeChannel(message){
	if(targetChannels.indexOf(message.channel.id) > -1){
		console.log('Channel ' + message.channel.id + ' already subscribed');
		bot.sendMessage(message.author.id, 'Channel ' + message.channel.id + ' already subscribed');
	}
	else{
		targetChannels.push(message.channel.id);
		jsonfile.writeFile(settings.channelPath, targetChannels, function (err){
			if(err)
				console.error('Unable to write file!');
			else{
				console.log('Added ' + message.channel.id + ' to subscribed channels');
				bot.sendMessage(message.author.id, 'Added ' + message.channel.id + ' to subscribed channels');
			}
		});
	}
}

function unsubscribeChannel(message){
	if(targetChannels.indexOf(message.channel.id) > -1){
		targetChannels.splice(targetChannels.indexOf(message.channel.id), 1);
		jsonfile.writeFile(settings.channelPath, targetChannels, function (err){
			if(err){
				console.error('Unable to write file!');
			}
			else{
				console.log('Removed ' + message.channel.id + ' from subscribed channels');
				bot.sendMessage(message.author.id, 'Removed ' + message.channel.id + ' from subscribed channels');
			}
		});
	}
	else{
		console.log('Channel ' + message.channel.id + ' is not subscribed');
		bot.sendMessage(message.author.id, 'Channel ' + message.channel.id + ' is not subscribed');
	}
}
