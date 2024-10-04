import * as path from "path";

import { Job } from "node-schedule";
export let jobs: { job: Job; id: string; active: boolean }[] = [];
import { config } from "dotenv";

config();

export const setJobs = (val: typeof jobs) => (jobs = val);

export let bookJobs: { job: Job; id: string; active: boolean }[] = [];
export const setBookJobs = (val: typeof bookJobs) => (bookJobs = val);

export const test = false;
export const botJobSpecs = (min: number) =>
    min == 60 ? "0 * * * *" : `*/${min} * * * *`; // = test ? "*/10 * * * * *" : "* * * * * *";
export const dfsDir = "src/data/dfs/binance",
    klinesDir = "src/data/klines/binance";
export const tuPath = (pth: string) => path.resolve(...pth.split("/"));
