#!/usr/bin/env node

var Client = require('irc').Client;
var client = new Client('irc.freenode.net', 'sudobot', {
    channels: [ '#sudoroom' ]
});

var split = require('split2');
var through = require('through2');

var spawn = require('child_process').spawn;
var ps = spawn('ssh', [ 'root@omnidoor.local', 'pm2 logs --raw doorjam' ]);
ps.on('exit', process.exit);
ps.stderr.pipe(process.stderr);
ps.stdout.pipe(process.stdout);
ps.stdout.pipe(split())
    .pipe(through(function (buf, enc, next) {
        var line = buf.toString();
        if (/^Access granted/.test(line)) {
            client.say('#sudoroom', 'somebody swiped into the building');
        }
    }))
;
