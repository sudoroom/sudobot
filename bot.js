#!/usr/bin/env node

var Client = require('irc').Client;
var client = new Client('irc.freenode.net', 'sudobot', {
    channels: [ '#sudoroom' ]
});

var split = require('split2');
var through = require('through2');

var spawn = require('ssh', [ 'omnidoor.local', 'pm2 logs --raw doorjam' ]);
spawn.stdout.pipe(split())
    .pipe(through(function (buf, enc, next) {
        var line = buf.toString();
        if (/^Access granted/.test(line)) {
            client.say('#sudoroom', 'somebody swiped into the building');
        }
    }))
;
