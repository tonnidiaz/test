import ViteExpress from "vite-express";
import { app } from "./app";

const port = process.env.PORT ? Number(process.env.PORT) : 8000;

ViteExpress.listen(app, port, () =>
  console.log(`Server is listening on port ${port}...`),
);
