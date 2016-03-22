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

var RaspiCam = require('raspicam');

// roomba 
var Roomba = require('roomba').Roomba
var roombaReady = false;


var bot = new Roomba({
    sp: { path: '/dev/ttyUSB0', options: { baudrate: 115200 }},
    update_freq: 200
});

bot.once('ready', function () {
  roombaReady = true;
  say.speak(null, 'the roomba is ready');

//  bot.send({ cmd: 'SAFE', data: [] });

//  setTimeout(function() {
//    bot.send({ cmd: 'SONG', data:
//      [ 1, 6, 62, 30, 64, 30, 65, 160, 64, 50, 60, 50, 53, 120] });
//    bot.send({ cmd: 'PLAY', data: [1] });
//  }, 1000);

//  setTimeout(function() {
    //bot.send({ cmd: 'LEDS', data: [0,1,0,1,0,0,0,0]});
//    bot.send({ cmd: 'DRIVE', data: [100, 32768] });
//  }, 5000);

//	bot.send({ cmd: 'DRIVE', data: [-500, -1] });
//	setTimeout(function () {
//		console.log('stopping spin');
//		bot.send({ cmd: 'DRIVE', data: [0, -1] });
//	}, 2000);

//  bot.send({ cmd: 'CLEAN' });

//  setTimout(function() {
//    bot.send({ cmd: 'DRIVE', data: [-100, 32768] });
//  }, 5000);

//  setTimeout(function(){
//    bot.send({ cmd: 'DRIVE', data: [0, 32768] });
//  }, 11000);

});

/*
var drive = function() {
  bot.once('ready', function () {
    console.log('spinning up');
    bot.send({ cmd: 'DRIVE', data: [500, -1] });
  });

  bot.on('sense', function (sensors) {
    if (sensors.bump.right || sensors.bump.left) {
        console.log('bump detected');
        // stop spinning
        bot.send({ cmd: 'DRIVE', data: [0, -1] });
    }
  });
};
*/

// gpio
var Gpio = require('onoff').Gpio;
var buttonRed = new Gpio(6, 'in', 'both');
var buttonGreen = new Gpio(13, 'in', 'both');
var buttonUp = new Gpio(19, 'in', 'both');
var buttonDown = new Gpio(26, 'in', 'both');

buttonRed.watch(function(err, value) {
  console.log('red ' + value);
  if (value === 0) {
    //a-e-d-e-g-d, a-e-d-e-a-d, c-b-a-g-a-e, c-b-a-g-b-e
    if (roombaReady) {
      bot.send({ cmd: 'SONG', data:
        [ 1, 33, 40, 38, 40, 31, 38, 33, 40, 38, 40, 33, 38] });
      bot.send({ cmd: 'PLAY', data: [1] });
    }
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
  } else if (event.type === 'sound' && /\.wav$/.test(event.value)) {
    var url = event.value;
    var filename = '/tmp/' + url.substring(url.lastIndexOf('/')+1);

    download(event.value, filename, function() {
      exec('aplay ' + filename + ' && rm ' + filename);
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


say.speak(null, 'starting');

scala.on('online', function() {
  say.speak(null, 'I am connected to E X P');
});

scala.on('error', function(err) {
  console.error(err);
  say.speak(null, 'there was an error');
});

scala.start(config).then(function() {
  var chan = scala.getChannel('roomba');

  chan.listen('say', function(payload, cb) {
    say.speak(null, payload.text);
    cb('got it');
  });

  chan.listen('drive', function(payload, cb) {
    cb('ok driving');
    console.log(payload);
      
      if (payload.text === 'back') bot.send({ cmd: 'DRIVE', data: [-100, 32768] });
      if (payload.text === 'forward') bot.send({ cmd: 'DRIVE', data: [100, 32768] });
      if (payload.text === 'turn') bot.send({ cmd: 'DRIVE', data: [-100, 1] });

    setTimeout(function() {
      bot.send({ cmd: 'DRIVE', data: [0, 32768] });
    }, payload.timeout || 1000);
  });

  chan.listen('home', function(payload, cb) {
    cb('heading home');
    bot.send({ cmd: 'DOCK', data: [] });
  });


  chan.listen('photo', function(payload, cb) {

    var imagename = './photo/image-' + new Date().getTime() + '.png';

    var options = _.merge(payload || {}, {
      mode: 'photo',
      output: imagename,
      encoding: 'png',
      timeout: 0 // take the picture immediately
    });

    var camera = new RaspiCam(options);

    camera.on('started', function( err, timestamp ){
      console.log('photo started at ' + timestamp );
    });

    camera.on('read', function( err, timestamp, filename ){
      console.log('photo image captured with filename: ' + filename );
      if (filename.indexOf('~') === -1) {
        camera.stop();
        say.speak(null, 'say cheese');
      }
    });

    camera.on('exit', function( timestamp ){
      console.log('photo child process has exited at ' + timestamp );
      var data = fs.readFileSync(imagename).toString('base64');
      var uri = 'data:image/png;base64,' + data;

      console.log(uri.length);

      scala.createData({ group: 'photos', key: imagename, value: { uri: uri } }).then(function() {
          chan.broadcast('image', { key: imagename });
      }).catch(function(err) { console.log(err); });

    });

    camera.start();
  });


}).catch(function(err) { console.error(err); say.speak(null, 'uh oh'); });



process.stdin.resume();

