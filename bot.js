#!/usr/bin/env node

var Client = require('irc').Client;
var client = new Client('irc.freenode.net', 'sudobot', {
    channels: [ '#sudoroom' ]
});

var split = require('split2');
var through = require('through2');

var spawn = require('child_process').spawn;
var ps = spawn('ssh', [ 'root@omnidoor.local', 'pm2 logs --raw doorjam' ]);
var lastmsg = 0;

ps.on('exit', process.exit);
ps.stderr.pipe(process.stderr);
ps.stdout.pipe(process.stdout);
ps.stdout.pipe(split())
    .pipe(through(function (buf, enc, next) {
        var line = buf.toString();
        if (/^Access granted/i.test(line)) {
            client.say('#sudoroom', 'DOOR EVENT: somebody swiped into the building');
        }
        else if (/^Everything initialized and ready/i.test(line)) {
            client.say('#sudoroom', 'DOOR EVENT: READY');
        }
        else if (/^Error:/i.test(line)) {
            client.say('#sudoroom', 'DOOR EVENT: ' + line);
        }
        next();
    }))
;
