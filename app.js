var express   = require('express'),
	app       = express(),
	server    = require('http').createServer(app),
	io        = require('socket.io').listen(server),
	users     = [],
	mongoose  = require('mongoose');


// connec tot mongoose and create the table chat
mongoose.connect('mongodb://localhost/chat', function(err){
	if(err){
		console.log(err);
	}else{
		console.log('database connected');
	}
});

// create the schema
var chatSchema = mongoose.Schema({
	nick:String,
	msg:String,
	created:{type:Date, default:Date.now}
})

// create the model
var Chat  = mongoose.model('message', chatSchema);

app.get('/', function(req, res){
	res.sendfile(__dirname + '/index.html');
});


// socket io et the message
io.sockets.on('connection', function(socket){
	// send message to the new users
	Chat.find({}, function(err, docs){
		// if error throw new error
		if(err) throw err;
		// else send the data
		socket.emit('load old msgs', docs);

	});
	// users on the chat
	socket.on('new user', function(data, callback){
		// if the user not exits
		if(data in users){
			callback(false);
		}else{
			callback(true);
			socket.nickname        = data;
			users[socket.nickname] = socket;
			updateNickname();
		}
	});

	// update method
	function updateNickname(){
		io.sockets.emit('usernames', Object.keys(users));
	}
	// chat message send back to the client
	socket.on('send message', function(data, callback){
		// trim the message
		var msg  = data.trim();
		// if message have the /w value
		if(msg.substr(0,3) === '/w '){
			// check the mesage
			msg     = msg.substr(3);
			var ind = msg.indexOf(' ');
			// if 
			if(ind !== -1){
				// find the name
				var name = msg.substring(0, ind);
				var mgs  = msg.substring(ind + 1);
				// if the name is on the user array
				if(name in users){
					// send the message
					users[name].emit('whisper', {msg:msg, user:socket.nickname});
					// log the console
					console.log(' you just wishper');
				}else{
					callback('!Error, enter a valid users');
				}
				
			}else{
				callback('Error, Please enter a whisper');
			}
			
		}else{
			// create the variable to save
			var newMsg = new Chat({
				msg:msg, 
				nick:socket.nickname
			});
			// save if to the db
			newMsg.save(function(err){
				// if error thrwo error
				if(err) throw err;
				// send the message
				io.sockets.emit('new message', {msg:msg, nick:socket.nickname});
			})
			
		}
	});

	// disconnect socket
	socket.on('disconnect', function(data){
		if(!socket.nickname) return ;
		delete users[socket.nickname];
		updateNickname();
	});
});
// run the server
server.listen(3000, function(){
	console.log('Server is running to the new server ...' + 3000);
});	