global.fetch = require('node-fetch');
global.localStorage = require('node-persist');
global.localStorage.initSync();

var scala = require('exp-js-sdk');
var say = require('say');
var _ = require('lodash');
var exec = require('child_process').exec;

var http = require('http');
var fs = require('fs');
var events = require('events');
var eventEmitter = new events.EventEmitter();

var config = require('./config.json');
var personality = require('./personality.json');

// roomba
var Roomba = require('roomba').Roomba
var roombaReady = false;


var bot = new Roomba({
    sp: { path: '/dev/ttyUSB0', options: { baudrate: 115200 }}
});

bot.once('ready', function () {
  roombaReady = true;
  bot.send({ cmd: 'SONG', data:
    [ 1, 6, 62, 30, 64, 30, 65, 160, 64, 50, 60, 50, 53, 120] });
  bot.send({ cmd: 'PLAY', data: [1] });
});


// gpio
var Gpio = require('onoff').Gpio;
var buttonRed = new Gpio(6, 'in', 'both');
var buttonGreen = new Gpio(13, 'in', 'both');
var buttonUp = new Gpio(19, 'in', 'both');
var buttonDown = new Gpio(26, 'in', 'both');

buttonRed.watch(function(err, value) {
  console.log('red ' + value);
  if (value === 0) {
    //sendEvent('buttonEvent', { 'button': 'off' });
  }
});

buttonGreen.watch(function(err, value) {
  console.log('green ' + value);
  if (value === 0) {
    console.log('go go go');
    if (roombaReady) {
      bot.send({ cmd: 'SONG', data:
        [ 1, 6, 62, 30, 64, 30, 65, 160, 64, 50, 60, 50, 53, 120] });
      bot.send({ cmd: 'PLAY', data: [1] });
    }  
    //sendEvent('buttonEvent', { 'button': 'on' });
  }
});

buttonUp.watch(function(err, value) {
  console.log('up ' + value);
  if (value === 0) {
    //sendEvent('buttonEvent', { 'button': 'up' });
  }
});

buttonDown.watch(function(err, value) {
  console.log('down ' + value);
  if (value === 0) {
    //sendEvent('buttonEvent', { 'button': 'down' });
  }
});



var download = function(url, dest, cb) {
  var file = fs.createWriteStream(dest);
  var request = http.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(cb);  // close() is async, call cb after close completes.
    });
  }).on('error', function(err) { // Handle errors
    fs.unlink(dest); // Delete the file async. (But we don't check the result)
    if (cb) cb(err.message);
  });
};

eventEmitter.on('emotion', function(event) {

  console.log(event);

  if (event.type === 'speech') {
    say.speak(null, event.value);
  } else if (event.type === 'sound' && /\.mp3$/.test(event.value)) {
    var url = event.value;
    var filename = '/tmp/' + url.substring(url.lastIndexOf('/')+1);

    download(event.value, filename, function() {
      exec('mpg321 ' + filename + ' && rm ' + filename);
    });
  }
});

var getRandomInterval = function() {
  return Math.floor(Math.random() * 5 * 60 * 1000);
};

var randomEmotion = function() {
  var randomInterval = getRandomInterval();
  console.log('interval ' + randomInterval);

  setTimeout(function() {
    var emotions = _.where(personality.emotions, { 'emotion': 'snark' });

    var index = Math.floor(Math.random() * emotions.length);

    eventEmitter.emit('emotion', emotions[index]);

    randomEmotion();
  }, randomInterval);
}

scala.init(config);

say.speak(null, 'oh hey. good morning');

// when connected say so
scala.connection.on('online', function () {
  console.log('Device is online.');
  say.speak(null, 'I\'m online.');

  randomEmotion();
});

process.stdin.resume();

