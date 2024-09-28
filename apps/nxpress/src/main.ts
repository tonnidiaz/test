import express from 'express';
import {sayHello} from '@_-nx-wp/shared-lib'
import { createServer } from 'http';
const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const app = express();

app.set("port", port)
const server = createServer(app);

sayHello("Johnathan")
app.get('/', (req, res) => {
    
  res.send({ message: 'Hello API' });
});

// app.listen(port, host, () => {
//   console.log(`[ ready ] http://${host}:${port}`);
// });
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

function onError(error: any) {
    if (error.syscall !== 'listen') {
      throw error;
    }
  
    let bind = typeof port === 'string'
      ? 'Pipe ' + port
      : 'Port ' + port;
  
    // handle specific listen errors with friendly messages
    switch (error.code) {
      case 'EACCES':
        console.error(bind + ' requires elevated privileges');
        process.exit(1);
        break;
      case 'EADDRINUSE':
        console.error(bind + ' is already in use');
        process.exit(1);
        break;
      default:
        throw error;
    }
  }
  
  /**
   * Event listener for HTTP server "listening" event.
   */
  
  function onListening() {
    let addr = server.address();
    let bind = typeof addr === 'string'
      ? 'pipe ' + addr
      : 'port ' + addr?.port;
      console.log(addr);
    console.log('Listening on ' + bind);
    console.debug('Listening on ' + bind);
  }
  