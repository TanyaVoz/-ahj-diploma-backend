/* eslint-disable no-shadow */
const http = require('http');
const Koa = require('koa');
const cors = require('koa2-cors');
const WS = require('ws');
const { v4 } = require('uuid');
const app = new Koa();
const { addInitialPost } = require('./addInitialPost');

app.use(
  cors({
    origin: '*',
    credentials: true,
    'Access-Control-Allow-Origin': true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  }),
);

const port = process.env.PORT || 7070;
const server = http.createServer(app.callback());
const wsServer = new WS.Server({ server });
const posts = addInitialPost();
const users = [];

wsServer.on('connection', (ws) => {
  ws.on('message', (msg) => {
    const request = JSON.parse(msg);
    if (request.event === 'connected') {
      users.push(ws);
      const lastIndex = posts.findIndex((elem) => elem.pin === true);
      let pinId = null;
      if (lastIndex !== -1) {
        pinId = posts[lastIndex].id;
      }
      const chaosEvent = JSON.stringify({
        event: 'connected',
        message: {
          posts: posts.slice(posts.length - 10, posts.length),
          pinId,
        },
      });
      ws.send(chaosEvent);
    }

    if (request.event === 'newPost') {
      const post = {
        date: new Date(),
        text: request.message,
        geoStatus: request.geoStatus,
        geo: request.geo,
        id: v4(),
        type: request.type,
        file: request.file,
        fileName: request.fileName,
      };

      posts.push(post);
      const chaosEvent = JSON.stringify({
        event: 'newPost',
        post,
      });
      users.forEach((user) => {
        user.send(chaosEvent);
      });
      users.forEach((user) => {
        user.send(JSON.stringify(posts));
      });
    }

    if (request.event === 'getMore') {
      const id = request.message;
      const index = posts.findIndex((elem) => elem.id === id);
      let secondIndex = 0;
      if (index > 10) {
        secondIndex = index - 10;
      }
      const previous = posts.slice(secondIndex, index);
      const chaosEvent = JSON.stringify({
        event: 'morePosts',
        posts: previous,
      });
      ws.send(chaosEvent);
    }

    if (request.event === 'pinPost') {
      const lastIndex = posts.findIndex((elem) => elem.pin === true);
      const id = request.message;
      const index = posts.findIndex((elem) => elem.id === id);
      let reply;

      if (lastIndex === -1) {
        posts[index].pin = true;
        reply = posts[index].id;
      }

      if (lastIndex !== -1) {
        posts[lastIndex].pin = false;
        if (posts[lastIndex].id === id) {
          reply = null;
        } else {
          posts[index].pin = true;
          reply = posts[index].id;
        }
      }

      const chaosEvent = JSON.stringify({
        event: 'pinPost',
        id: reply,
      });
      users.forEach((user) => {
        user.send(chaosEvent);
      });
    }

    if (request.event === 'getPost') {
      const index = posts.findIndex((elem) => elem.pin === true);
      const chaosEvent = JSON.stringify({
        event: 'getPost',
        post: posts[index],
      });
      users.forEach((user) => {
        user.send(chaosEvent);
      });
    }

    if (request.event === 'deletePost') {
      const id = request.message;
      const index = posts.findIndex((elem) => elem.id === id);
      posts.splice(index, 1);
      const chaosEvent = JSON.stringify({
        event: 'deletePost',
        id,
      });
      users.forEach((user) => {
        user.send(chaosEvent);
      });
    }
  });
});

server.listen(port, () => console.log(`Server has been started on ${port}...`));
