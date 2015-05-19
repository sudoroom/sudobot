#!/usr/bin/env node

var Client = require('irc').Client;
var client = new Client('irc.freenode.net', 'sudobot', {
    channels: [ '#sudoroom' ]
});

var split = require('split2');
var through = require('through2');

var lastmsg = 0;
var failing = {};
var connected = false;
ssh();

function ssh () {
    if (connected) return;
    connected = true;
    
    var spawn = require('child_process').spawn;
    var ps = spawn('ssh', [ 'root@omnidoor.local', 'psy log doorjam' ]);
    ps.on('exit', function () {
        connected = false;
        setTimeout(ssh, 5000);
    });
    ps.stderr.pipe(process.stderr);
    ps.stdout.pipe(process.stdout);
    ps.stdout.pipe(split()).pipe(through(write, end));
    
    function write (buf, enc, next) {
        if (failing.ssh) {
            client.say('#sudoroom', 'DOOR EVENT: omnidoor ssh connection established');
        }
        failing.ssh = false;
        
        var line = buf.toString();
        if (/^Access granted/i.test(line)) {
            failing.logs = false;
            client.say('#sudoroom', 'DOOR EVENT: somebody swiped into the building');
        }
        else if (/^Everything initialized and ready/i.test(line)) {
            failing.logs = false;
            client.say('#sudoroom', 'DOOR EVENT: READY');
        }
        else if (/^Error:/i.test(line)) {
            failing.logs = false;
            client.say('#sudoroom', 'DOOR EVENT: ' + line);
        }
        else if (/^Can not find log files,/.test(line)) {
            if (!failing.logs) {
                client.say('#sudoroom', 'DOOR EVENT: log read failure');
            }
            failing.logs = true;
        }
        next();
    }
    function end () {
        if (!failing.ssh) {
            client.say('#sudoroom', 'DOOR EVENT: omnidoor ssh connection closed');
        }
        failing.ssh = true;
        connected = false;
        setTimeout(ssh, 5000);
    }
}
