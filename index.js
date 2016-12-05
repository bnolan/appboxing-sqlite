const path = require('path');
// const WebSocketServer = require('ws').Server;
// const wss = new WebSocketServer({ server: server });
const PORT = 4100;

const assert = require('assert');
const sqlite3 = require('sqlite3').verbose();

const eshttp = require('eshttp');

const server = new eshttp.HttpServer();
const response = new eshttp.HttpResponse(200, { 'x-header': 'value' }, 'hello');
const handleUpgrade = require('./node-ws');

server.onrequest = (request) => {
  if (request.headers.get('upgrade') === 'websocket') {
    request.isComplete = () => {
      // Tell eshttp not to close the connection
      return false;
    };

    const ws = handleUpgrade(request, request._connection._socket);

    ws.on('message', (message) => {
      console.log('#message');
      console.log(message);

      ws.send(JSON.stringify({beep: 'boop'}));
    });
  }
  // request.respondWith(response);
};

server.listen(PORT);

console.log('Listening on ' + PORT);

/*

app.use(function (req, res) {
  res.send({ msg: 'hello' });
});

wss.on('connection', (ws) => {
  // var location = url.parse(ws.upgradeReq.url, true);
  // you might use location.query.access_token to authenticate or share sessions
  // or ws.upgradeReq.headers.cookie (see http://stackoverflow.com/a/16395220/151312)

  // todo - send hello message?

  var db = null;
  var databaseConnected = false;
  var queue = [];

  ws.on('message', (message) => {
    console.log('received: %s', message);
    const packet = JSON.parse(message);

    if (packet.command === 'hello') {
      // todo parse and check many many things
      db = new sqlite3.Database(path.join(__dirname, '..', packet.app.name + '.sqlite'), onConnected);
      // db = new sqlite3.Database(':memory:');

      return;
    }

    if (databaseConnected) {
      processPacket(packet);
    } else {
      assert(queue);
      queue.push(packet);
    }
  });

  function onConnected () {
    databaseConnected = true;

    queue.forEach((packet) => {
      processPacket(packet);
    });

    queue = null;

    // We always force this
    db.serialize();
  }

  function processPacket (packet) {
    var callback = () => {};

    if (packet.callback === true) {
      // nb: Callback can trigger multiple times (in an each for example)
      callback = (err, row) => {
        ws.send(JSON.stringify({
          id: packet.id,
          err: err,
          row: row
        }));
      };
    }

    const query = packet.query;

    assert(typeof query === 'object');

    if (packet.command === 'run') {
      db.run(query.query, query.arguments, callback);
    }

    if (packet.command === 'each') {
      db.each(query.query, query.arguments, callback);
    }
  }
});

server.on('request', app);

server.listen(port, () => { 
  console.log('Listening on ' + server.address().port); 
});

*/