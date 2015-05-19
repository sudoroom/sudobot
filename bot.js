#!/usr/bin/env node

var Client = require('irc').Client;
var client = new Client('irc.freenode.net', 'sudobot', {
    channels: [ '#sudoroom' ]
});

var split = require('split2');
var through = require('through2');

var lastmsg = 0;
var failing = {};
var timeout = null;

function say (msg) {
    client.say(msg);
}

ssh();

function ssh () {
    var spawn = require('child_process').spawn;
    var ps = spawn('ssh', [ 'root@omnidoor.local', 'psy log doorjam' ]);
    
    ps.on('exit', function () {
        clearTimeout(timeout);
        timeout = null;
        setTimeout(ssh, 5000);
    });
    ps.stderr.pipe(process.stderr);
    ps.stdout.pipe(process.stdout);
    ps.stdout.pipe(split()).pipe(through(write, end));
    
    function write (buf, enc, next) {
        if (failing.ssh && !timeout) {
            timeout = setTimeout(function () {
                say('#sudoroom', 'DOOR EVENT: omnidoor ssh connection established');
                failing.ssh = false;
                timeout = null;
            }, 5000)
        }
        
        var line = buf.toString();
        if (/^Access granted/i.test(line)) {
            failing.logs = false;
            say('#sudoroom', 'DOOR EVENT: somebody swiped into the building');
        }
        else if (/^Everything initialized and ready/i.test(line)) {
            failing.logs = false;
            say('#sudoroom', 'DOOR EVENT: READY');
        }
        else if (/^Error:/i.test(line)) {
            failing.logs = false;
            say('#sudoroom', 'DOOR EVENT: ' + line);
        }
        else if (/^Can not find log files,/.test(line)) {
            if (!failing.logs) {
                say('#sudoroom', 'DOOR EVENT: log read failure');
            }
            failing.logs = true;
        }
        next();
    }
}
