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
var last = {};
var checked = { health: Date.now() };

setInterval(function () {
    var elapsed = Date.now() - checked.health;
    var mins = Math.floor(elapsed / 1000 / 60);
    if (mins > 3) {
        say('NO RESPONSE FROM OMNIDOOR IN ' + mins + ' MINUTES');
        failing.healthping = true;
    }
}, 1000 * 60 * 5);

function say (msg) {
    client.say('#sudoroom', msg);
}

ssh();
health();

function ssh () {
    var spawn = require('child_process').spawn;
    var ps = spawn('ssh', [ 'root@omnidoor.local', 'psy log doorjam' ]);
    
    ps.on('exit', function () {
        clearTimeout(timeout);
        timeout = null;
        setTimeout(ssh, 5000);
        failing.ssh = true;
    });
    ps.stderr.pipe(process.stderr);
    ps.stdout.pipe(process.stdout);
    ps.stdout.pipe(split()).pipe(through(write));
    ps.stderr.pipe(split()).pipe(through(write));
    
    function write (buf, enc, next) {
        if (failing.ssh && !timeout) {
            timeout = setTimeout(function () {
                say('DOOR EVENT: omnidoor ssh connection established');
                failing.ssh = false;
                timeout = null;
            }, 5000)
        }
        
        var line = buf.toString();
        if (/^Access granted/i.test(line)) {
            failing.logs = false;
            if (!last.swipe || Date.now() - last.swipe > 1000*15) {
                say('DOOR EVENT: somebody swiped into the building');
                last.swipe = Date.now();
            }
        }
        else if (/^Everything initialized and ready/i.test(line)) {
            failing.logs = false;
            failing.serial = false;
            say('DOOR EVENT: READY');
        }
        else if (/^(Error:|SERIAL ERROR)/i.test(line)) {
            failing.logs = false;
            if (!failing.serial) {
                say('DOOR EVENT: ' + line);
            }
            failing.serial = true;
        }
        else if (/^Can not find log files,/.test(line)) {
            if (!failing.logs) {
                say('DOOR EVENT: log read failure');
            }
            failing.logs = true;
        }
        next();
    }
}

function health () {
    var spawn = require('child_process').spawn;
    var ps = spawn('ssh', [ 'root@omnidoor.local', 'psy log doorhealth' ]);
    
    ps.on('exit', function () {
        clearTimeout(timeout);
        timeout = null;
        setTimeout(health, 5000);
    });
    ps.stdout.pipe(process.stdout);
    ps.stderr.pipe(process.stderr);
    ps.stdout.pipe(split()).pipe(through(write));
    
    function write (buf, enc, next) {
        var line = buf.toString();
        try { var msg = JSON.parse(line) }
        catch (err) { return console.error(err) }
        
        checked.health = Date.now();
        if (!msg.charging) {
            say('OMNIDOOR LAPTOP IS DISCHARGING: ' + msg.percent + '% REMAINS');
        }
        if (failing.healthping) {
            say('OMNIDOOR HEALTH CONNECTION RESTORED');
        }
        failing.healthping = false;
        next();
    }
}
