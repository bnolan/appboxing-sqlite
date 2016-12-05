'use strict';

const crypto = require('crypto');
const EventEmitter = require('events');
const Reciever = require('ws/lib/receiver');
const Sender = require('ws/lib/sender');

const WebSocket = {
  OPEN: 1
};

class WebsocketClient extends EventEmitter {
  constructor (req, socket) {
    super();

    this.socket = socket;
    this.request = req;
    this.readyState = WebSocket.OPEN;

    this._sender = new Sender(socket, []);

    this._sender.on('error', (error) => {
      console.error('Sender error', error);
      this.close(1002, '');
      this.emit('error', error);
    });

    const maxPayload = 0;

    this._receiver = new Reciever([], maxPayload);

    socket.on('data', (data) => {
      this._receiver.add(data);
    });

    this._receiver.ontext = (data, flags) => {
      flags = flags || {};

      this.emit('message', data, flags);
    };

    this._receiver.onbinary = (data, flags) => {
      flags = flags || {};

      flags.binary = true;
      this.emit('message', data, flags);
    };

    this._receiver.onping = (data, flags) => {
      flags = flags || {};

      this.pong(data, {
        mask: !this._isServer,
        binary: flags.binary === true
      }, true);

      this.emit('ping', data, flags);
    };

    this._receiver.onpong = (data, flags) => {
      this.emit('pong', data, flags || {});
    };

    this._receiver.onclose = (code, data, flags) => {
      flags = flags || {};

      this._closeReceived = true;
      this.close(code, data);
    };
  }

  send (data, options, cb) {
    console.log('sending..');
    this._sender.send(data, options, cb);
  }

  close () {
    throw 'not implemented #close';
  }

  pong (data, options) {
    this._sender.pong(data, options);
  }
}

// Does hybi upgrade, we don't handle anything else
module.exports = function handleUpgrade (req, socket, upgradeHead, cb) {
  // handle premature socket errors
  // var errorHandler = function () {
  //   try { socket.destroy(); } catch (e) {}
  // };

  // socket.on('error', errorHandler);

  // verify key presence
  if (!req.headers.get('sec-websocket-key')) {
    throw new Error('Bad Request');
  }

  // verify version
  var version = parseInt(req.headers.get('sec-websocket-version'));

  if ([8, 13].indexOf(version) === -1) {
    throw new Error('Bad Request');
  }

  // handle extensions offer
  // handler to call when the connection sequence completes
  var completeUpgrade = function (protocol) {
    // calc key
    var key = req.headers.get('sec-websocket-key');
    var shasum = crypto.createHash('sha1');
    shasum.update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11');
    key = shasum.digest('base64');

    var headers = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      'Sec-WebSocket-Accept: ' + key
    ];

    if (typeof protocol !== 'undefined') {
      headers.push('Sec-WebSocket-Protocol: ' + protocol);
    }

    socket.setTimeout(0);
    socket.setNoDelay(true);

    try {
      socket.write(headers.concat('', '').join('\r\n'));
    } catch (e) {
      // if the upgrade write fails, shut the connection down hard
      try { socket.destroy(); } catch (e) {}
      return;
    }
  };

  const protocol = req.headers.get('sec-websocket-protocol');
  completeUpgrade(protocol);

  return new WebsocketClient(req, socket);
};
