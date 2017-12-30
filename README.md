# sudobot

[Sudo Room](https://sudoroom.org)'s IRC robot, the canonical instance of
which lives in [our IRC channel](https://sudoroom.org/chat/).

## Getting Started

These instructions should get you a copy of the project up and running
on your local machine for development and testing purposes. See deployment
for notes on how to deploy the project on a live system.

### Prerequisites

sudoboot is known to run in production on the nodejs provided by [chris
lea](https://launchpad.net/~chris-lea)'s
[node.js PPA](https://launchpad.net/~chris-lea/+archive/ubuntu/node.js)
(specifically version `0.10.37-1chl1~trusty1`).  However, you might not be
running Ubuntu, so an alternative way to get the right node.js runtime
is suggested: using [Node Version Manager](http://nvm.sh).

First, install nvm as described in its documentation. Then, install node
version 0.10.37 with the following command:

```
nvm install 0.10.37
```

Once this is done, start using this newly installed node:

```
nvm use 0.10.37
```

Next, install the bot's dependencies. Be sure you are in the package's
root directory (wherever this readme file is located) and do the following:

```
npm install
```

At this point, you should probably be able to run the bot, like so:

```
node bot.js
```

If this doesn't work, you may have found a bug. In that case, please
[see our issues](https://github.com/sudoroom/sudobot/issues) and open
a new one if the bug you've found is not already documented.

## Deployment

It seems to be deployed using something called psy.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code
of conduct, and the process for submitting pull requests to us.

## Versioning

¯\\\_(ツ)\_/¯

## Authors

* **substack** - *most of the commits through 2015*
* **jerkey** - *some door and speech related code*
* **deilann**, **morganrallen**, and **Juul** - *various contributions*
* **karissa** - *almost all maintenance in 2017*
* **rcsheets** - *docs, etc*

## License

This project is licensed under the MIT license - see the
[LICENSE.md](LICENSE.md) file for details.

