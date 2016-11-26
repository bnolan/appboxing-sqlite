const server = require('http').createServer();
const url = require('url');
const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({ server: server });
const express = require('express');
const app = express();
const port = 4100;

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:');

app.use(function (req, res) {
  res.send({ msg: 'hello' });
});
 
wss.on('connection', (ws) => {
  var location = url.parse(ws.upgradeReq.url, true);
  // you might use location.query.access_token to authenticate or share sessions 
  // or ws.upgradeReq.headers.cookie (see http://stackoverflow.com/a/16395220/151312) 

  // todo - send hello message?

  db.serialize(() => {
    ws.on('message', (message) => {
      console.log('received: %s', message);

      const packet = JSON.parse(message);
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

      if (packet.command === 'run') {
        if (typeof query === 'string') {
          db.run(query, [], callback);
        } else {
          db.run(query.query, query.arguments, callback);
        }
      }

      if (packet.command === 'each') {
        if (typeof query === 'string') {
          db.each(query, [], callback);
        } else {
          db.each(query.query, query.arguments, callback);
        }
      }
    });
  });
});

server.on('request', app);
server.listen(port, () => { 
  console.log('Listening on ' + server.address().port); 
});
