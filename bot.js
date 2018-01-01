#!/usr/bin/env node

var Client = require('irc').Client;
var client = new Client('irc.freenode.net', 'sudobot', {
    channels: [ '#sudoroom' ],
    autoConnect: false
});
var minimist = require('minimist');

var split = require('split2');
var through = require('through2');
var spawn = require('child_process').spawn;

var failing = {};
var timeout = null;
var last = {};

client.addListener('message#sudoroom', function (from, message) {
    if (/^!say\s+/.test(message)) {
        var argv = minimist(message.split(/\s+/).slice(1));
        var args = [];
        // amplitude
        if (argv.a) {
          var amp = parseInt(argv.a);
          if(amp) args.push('-a', amp);
        }

        // Indicate capital letters with: 1=sound, 2=the word "capitals", higher values = a pitch increase (try -k20).
        var k = 20;
        if (argv.k) {
          k = parseInt(argv.k) || k;
        }

        args.push('-k', k);

        var voice = "en+f3";
        if (argv.v) {
          var m = args.v.match(/[\w\+_-]+/);
          if(m)
            voice = m.pop();
        }

        var s = 87;
        if (argv.s) {
          s = parseInt(args.s) || s;
        }

        args.push('-s', s);

        if (argv.p) {
          var p = parseInt(args.p);
          if(p)
            args.push('-p', p);
        }

        args.unshift('pi@100.64.64.27', 'bin/mainscreenturnon; espeak ');
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
    }
    if (/sudoroom_BigTV/.test(message)) {
      spawn('ssh', ['pi@100.64.64.27', 'bin/mainscreenturnon']);
    }
});

function say (msg) {
    client.say('#sudoroom', msg);
}

function currentHour() {
    var timeNow = new Date();
    var hour = timeNow.getHours();
    return hour;
}

var prev = { ssh: null, health: null };

client.connect(5, function () { ssh(); })

function ssh () {
    var ps = spawn('ssh', [ 'root@100.64.64.11', 'psy log doorjam' ]);
    ps.on('exit', function () {
        clearTimeout(timeout);
        timeout = null;
        setTimeout(ssh, 300000);
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
	if (line.indexOf('Could not resolve') > -1) {
           say('DOOR EVENT: omnidoor ssh connection FAILED!!!!');
	}
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
                if (currentHour() < 11) {
                    say('!say DOOR EVENT: somebody swiped into the building');
                }
                else {
                    say('DOOR EVENT: somebody swiped into the building');
                }
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
            if ((isNaN(health.voltage) || health.voltage < 13.0)
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
