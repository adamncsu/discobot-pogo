const discord = require('discord.js');
const https = require('https');

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
	
	// list servers
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
		
	// list channels
	var textChannels = bot.channels.getAll('type', 'text');
	if(textChannels.length > 0){
		console.log('Connected channels: ');
		for (var i=0; i<textChannels.length; i++) 
			console.log('  - %s (%s)', textChannels[i].name, textChannels[i].id);
			
		targetChannels = textChannels.getAll('name', settings.channelName);
	}
	
	if(typeof targetChannels === 'undefined' || targetChannels.length == 0){
		console.warn('No valid channels. Disconnecting...');
		bot.destroy(function(){
			console.log('Ending process...');
			process.exit();
		});
		return;
	}
	
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
	
	// PM received
	if(message.channel instanceof discord.PMChannel){
	
		// admin commands
		if(message.author.id == settings.adminID){
			console.log('Admin command received: ' + message.content);
			switch(message.content.toLowerCase()){
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
	}
	
	// listen only on target channels
	else if(!targetChannels.has('id', message.channel.id))
		return;
	
	// public commands
	else if(message.content.charAt(0) == '!'){
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
		}
	}
	
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


// server status check function
function updatePogoStatus(message){
	var request = https.request(pokeStatus.https_options, function(response){
		var str = '';
		response.on('data', function(data){
			str += data;
		}).on('end', function(){
			var firstCheck = pokeStatus.go_response == -1;
			
			// update server status object
			pokeStatus.update(JSON.parse(str));
			
			// if this is the first check, just print to console
			if(firstCheck)
				console.log('Server status initialized:\n  GO:  ' + pokeStatus.goStatus() + '\n  PTC: ' + pokeStatus.ptcStatus());
			
			// else, if the server status changed, log and announce it
			else {
				// GO
				if(pokeStatus.goChanged()){
					console.log('GO status changed: ' + pokeStatus.goStatus());
					
					// announce to all target channels
					if(!muted)
						announce('GO server is ' + pokeStatus.goStatus());
				}
				
				// PTC
				if(pokeStatus.ptcChanged()){
					console.log('PTC status changed: ' + pokeStatus.ptcStatus());
					
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