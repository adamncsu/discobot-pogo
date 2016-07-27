module.exports = {
	go_online: false,
	go_online_prev: false,
	go_response: -1,
	go_idle: -1,
	go_uptime_hour: -1,
	go_uptime_day: -1,
	ptc_online: false,
	ptc_online_prev: false,
	ptc_response: -1,
	ptc_idle: -1,
	ptc_uptime_hour: -1,
	ptc_uptime_day: -1,
	
	https_options: {
		host: 'go.jooas.com',
		path: '/status',
		port: 443,
		method: 'GET'
	},
	
	update: function(json){
		this.go_online = 		json.go_online;
		this.go_response = 		json.go_response;
		this.go_idle = 			json.go_idle;
		this.go_uptime_hour = 	json.go_uptime_hour;
		this.go_uptime_day = 	json.go_uptime_day;
		this.ptc_online = 		json.ptc_online;
		this.ptc_response = 	json.ptc_response;
		this.ptc_idle = 		json.ptc_idle;
		this.ptc_uptime_hour = 	json.ptc_uptime_hour;
		this.ptc_uptime_day = 	json.ptc_uptime_day;
	},
	
	goChanged: function(){
		return this.go_online_prev != this.go_online;
	},
	
	ptcChanged: function(){
		return this.ptc_online_prev != this.ptc_online;
	},
	
	goStatus: function(){
		return this.go_online ? 'ONLINE' : 'OFFLINE';
	},
	
	ptcStatus: function(){
		return this.ptc_online ? 'ONLINE' : 'OFFLINE';
	}
}
