import ViteExpress from "vite-express";
import { app } from "./app";
import io from "@cmn/utils/io";

const port = process.env.PORT ? Number(process.env.PORT) : 8000;

const server = ViteExpress.listen(app, port, () =>
    console.log(`Server is listening on port ${port}...`)
);

try {
    io.attach(server);
} catch (e) {
    console.log(e);
}
