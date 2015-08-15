global.fetch = require('node-fetch');
global.localStorage = require('node-persist');
global.localStorage.initSync();

var scala = require('exp-js-sdk');
var say = require('say');
var events = require('events');
var eventEmitter = new events.EventEmitter();

var config = require('./config.json');


eventEmitter.on('emotion', function(event) {
  if (event.type === 'speech') {
    say.speak(null, event.value);
  }
});

var getRandomInterval = function() {
  return Math.floor(Math.random() * 15 * 60 * 1000);
};

var randomEmotion = function() {
  var randomInterval = getRandomInterval();
  setTimeout(function() {
    eventEmitter.emit('emotion', { emotion: 'snark', type: 'speech', value: 'goodie goodie' });

    randomEmotion();
  }, randomInterval);
}

scala.init(config);

say.speak(null, 'oh good morning');

// when connected say so
scala.connection.on('online', function () {
  console.log('Device is online.');
  say.speak(null, 'Annnnd I\'m online.');

  randomEmotion();
});

process.stdin.resume();

