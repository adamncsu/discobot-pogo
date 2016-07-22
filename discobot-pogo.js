const discord = require('discord.js');
const https = require('https');

// logging
require( "console-stamp" )( console, { pattern : "dd/mm/yy HH:MM:ss.l" } );

// server status url
const httpo = {
	host: 'pokemongostatus.org',
	path: '/status.jsonp',
	port: 443,
	method: 'GET'
};

// settings
const adminID = "XXX";  // bot only accepts admin commands from this user ID
const botToken = "XXX";	 // bot login token
const channelName = "pogo";	// only listens and announces in this channel (on all connected servers)

// variables
var bot;
var targetChannels;
var serverStatus;
var muted;




// bot initialization
function init(){
	console.log('Initializing bot...');
	bot = new discord.Client({
		autoReconnect: true,
		rateLimitAsError: true
	});
	bot.loginWithToken(botToken);
	
	muted = false;
}
init();


// bot event handler -- connected
bot.on('ready', function(){
	console.log('Bot online');
	bot.sendMessage(adminID, 'Bot online');
	
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
			
		targetChannels = textChannels.getAll('name', channelName);
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
	setInterval(updatePogoStatus, 60000);
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
		if(message.author.id == adminID){
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
					bot.sendMessage(message.channel, 'Bot ' + (muted ? 'muted' : 'unmuted'));
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
		}
	}
	
});


// bot event handler -- warning
bot.on('warn', function(error){
	console.warn(error);
	bot.sendMessage(adminID, error);
});


// bot event handler -- error
bot.on('error', function(error){
	console.error(error);
	bot.sendMessage(adminID, error);
});


// server status check function
function updatePogoStatus(message){
	var request = https.request(httpo, function(response){
		var str = '';
		response.on('data', function(data){
			str += data;
		}).on('end', function(){
			str = str.substring(str.indexOf('{'), str.indexOf('}') + 1);
			var json = JSON.parse(str);
			
			if(typeof serverStatus === 'undefined')
				console.log('Server status initialized: ' + json.status.toUpperCase());
				
			else if(typeof message !== 'undefined')
				bot.reply(message, 'Server is currently ' + json.status.toUpperCase());
			
			else if(serverStatus != json.status.toUpperCase()){
				console.log('Server status changed from ' + serverStatus + ' to ' + json.status.toUpperCase());
				
				// announce to all target channels
				if(!muted){
					var d = new Date();
					for(var i=0; i<targetChannels.length; i++)
						bot.sendMessage(targetChannels[i], '[' + d.toLocaleTimeString() + '] Server is ' + json.status.toUpperCase());
				}
			}
			serverStatus = json.status.toUpperCase();
		});
		
	}).on('error', function(e){
		console.error(e);
	}).end();
}

