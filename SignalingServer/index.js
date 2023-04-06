'use strict';

var os = require('os');
var nodeStatic = require('node-static');
var http = require('http');
var https = require("https");
var socketIO = require('socket.io');
var fs = require( 'fs' );
const port = process.env.PORT || 3030;

var fileServer = new(nodeStatic.Server)();
// var app = http.createServer(function(req, res) {
//   fileServer.serve(req, res);//
// }).listen(port);

var privateKey = fs.readFileSync( 'bandung.dev.key' ).toString();
var certificate = fs.readFileSync( 'bandung.dev.crt' ).toString();
var options = {key: privateKey, cert: certificate};
var apps = https.createServer( options, function(req,res)
{
  fileServer.serve(req, res);
} ).listen( 443 );

var io = socketIO.listen(apps);
io.sockets.on('connection', function(socket) {

  // convenience function to log server messages on the client
  function log() {
    var array = ['Message from server:'];
    array.push.apply(array, arguments);
    socket.emit('log', array);
  }

  socket.on('message', function(message) {
    console.log('Client said: ', message);
    // for a real app, would be room-only (not broadcast)
    socket.broadcast.emit('message', message);
  });

  socket.on('create or join', function(room) {
    console.log('Received request to create or join room ' + room);

    var clientsInRoom = io.sockets.adapter.rooms[room];
    var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
    console.log('Room ' + room + ' now has ' + numClients + ' client(s)');

    if (numClients === 0) {
      socket.join(room);
      console.log('Client ID ' + socket.id + ' created room ' + room);
      socket.emit('created', room, socket.id);

    } else if (numClients === 1) {
      log('Client ID ' + socket.id + ' joined room ' + room);
      io.sockets.in(room).emit('join', room);
      socket.join(room);
      socket.emit('joined', room, socket.id);
      io.sockets.in(room).emit('ready');
    } else { // max two clients
      socket.emit('full', room);
    }
  });

  socket.on('ipaddr', function() {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function(details) {
        console.log(details.address);
        if (details.family === 'IPv4' && details.address !== '127.0.0.1' && details.address !== '10.173.1.175') {
          socket.emit('ipaddr', details.address);
        }
      });
    }
  });

  socket.on('bye', function(){
    console.log('received bye');
  });

});
