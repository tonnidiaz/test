import express from 'express';
import {sayHello} from '@_-nx-wp/shared-lib'
const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const app = express();
sayHello("Johnathan")
app.get('/', (req, res) => {
    
  res.send({ message: 'Hello API' });
});

app.listen(port, host, () => {
  console.log(`[ ready ] http://${host}:${port}`);
});
