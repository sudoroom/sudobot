#!/usr/bin/env node
var exec = require('child_process').exec;

setInterval(check, 1000*60);
check();

function check () {
    exec('acpi', function (err, stdout, stderr) {
        var m = /^Battery \d+: (Charging|Discharging|Full), (\d+)%/.exec(stdout);
        var msg = {};
        if (m) {
            msg.charging = m[1] !== 'Discharging';
            msg.percent = Number(m[2]);
        }
        console.log(msg);
    });
}
