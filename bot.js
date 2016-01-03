#!/usr/bin/env node

var Client = require('irc').Client;
var client = new Client('irc.freenode.net', 'sudobot', {
    channels: [ '#sudoroom' ]
});
var minimist = require('minimist');

var SerialPort = require('serialport').SerialPort
var serial = new SerialPort('/dev/ttyS0', { baud: 9600 })

var split = require('split2');
var through = require('through2');
var spawn = require('child_process').spawn;

var lastmsg = 0;
var failing = {};
var timeout = null;
var last = {};

client.addListener('message#sudoroom', function (from, message) {
    if (/^!say\s+/.test(message)) {
        var argv = minimist(message.split(/\s+/).slice(1));
        var args = [];
        if (argv.a) args.push('-a', argv.a);

        if (argv.k) {
            args.push('-k', argv.k);
        } else {
            args.push('-k20');
        }

        if (argv.v) {
            args.push('-v', argv.v);
        } else {
            args.push('-ven+f3');
        }

        if (argv.s) {
            args.push('-s', argv.s);
        } else {
            args.push('-s 87');
        }

        if (argv.p) args.push('-p', argv.p);
        
        args.unshift('pi@100.64.64.27', 'espeak ');
        args.push('-w /tmp/out.wav --stdin && aplay /tmp/out.wav');
        var ps = spawn('ssh', args);
        ps.stdin.end(argv._.join(' '));
        ps.stderr.pipe(process.stdout); ps.stdout.pipe(process.stdout)
    } else if(/^!ssay\s+/.test(message)) {
        var argv = minimist(message.split(/\s+/).slice(1));

        var ps = spawn('aoss', ['flite', '-voice', '/opt/voices/cmu_us_awb.flitevox']);
        ps.stdin.end(argv._.join(' '));
    } else if(/^!fsay\s+/.test(message)) {
        var argv = minimist(message.split(/\s+/).slice(1));

        var ps = spawn('aoss', ['flite', '-voice', '/opt/voices/cmu_us_slt.flitevox']);
        ps.stdin.end(argv._.join(' '));
    } else if (/^!print\s+/.test(message) && serial.isOpen()) {
        var txt = message.replace(/^print\s+/, '')
        serial.write(txt + '\r\n')
    }
});

function say (msg) {
    client.say('#sudoroom', msg);
}

var prev = { ssh: null, health: null };

ssh();

function ssh () {
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
        var m;
        if (/^#ANNOUNCE/.test(line) && (m = /"([^"]+)"/.exec(line))) {
            failing.logs = false;
            if (!last.swipe || Date.now() - last.swipe > 1000*15) {
                say('DOOR EVENT: ' + m[1] + ' swiped into the building');
                last.swipe = Date.now();
            }
        }
        else if (/^Access granted/i.test(line) && !/^#ANNOUNCE/.test(prev)) {
            failing.logs = false;
            if (!last.swipe || Date.now() - last.swipe > 1000*15) {
                say('DOOR EVENT: somebody swiped into the building');
                last.swipe = Date.now();
            }
        }
        else if (/^Everything initialized and ready/i.test(line)) {
            failing.logs = false;
            failing.serial = false;
            failing.magstripe = false;
            say('DOOR EVENT: READY');
        }
        else if (/^(Error:|SERIAL ERROR)/i.test(line)) {
            failing.logs = false;
            if (!failing.serial) {
                say('DOOR EVENT: ' + line);
            }
            failing.serial = true;
        }
        else if (/^(Error:|MAGSTRIPE ERROR)/i.test(line)) {
            failing.logs = false;
            if (!failing.magstripe) {
                say('DOOR EVENT: ' + line);
            }
            failing.magstripe = true;
        }
        else if (/^Can not find log files,/.test(line)) {
            if (!failing.logs) {
                say('DOOR EVENT: log read failure');
            }
            failing.logs = true;
        }
        else if (/^health/.test(line)) {
            try { var health = JSON.parse(line.replace(/^health\s+/, '')) }
            catch (err) { return next() }
            if ((isNaN(health.voltage) || health.voltage < 13.5)
            && health.sinceMotor > 1000*10
            && health.voltage >= 0
            && (!last.criticalVoltage
            || Date.now() - last.criticalVoltage >= 1000*60*10)) {
                say('CRITICAL ARDUINO VOLTAGE: ' + health.voltage);
                last.criticalVoltage = Date.now();
            }
            if (health.sinceVoltage > 1000 * 60 * 2
            && Date.now() - last.sinceVoltage >= 1000*60*10) {
                var mins = Math.floor(sinceVoltage / 1000 / 60);
                say('NO ARDUINO VOLTAGE REPORTED IN ' + mins + ' MINUTES');
                last.sinceVoltage = Date.now();
            }
        }
        next();
    }
}
