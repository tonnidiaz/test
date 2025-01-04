import { ILog } from "./interfaces";
import { parseDate, clearTerminal, msToMin } from "./functions";
import { TuLog } from "@cmn/models";
import { DEV } from "./constants";

let logs : ILog[] = [];
const logsFilename = "logs.json"
const MIN_LOGS = 1000, SAVE_INTERVAL = DEV ? 1 : 5;
let lastSaved = 0;

const saveToDb = async (logs: ILog[], appName: string) =>{
    try {
        console.log(`Saving logs for [${appName}] to database....`);
        // writeFileSync(logsFilename, JSON.stringify({logs}));
        for (let log of logs){
            const _log = new TuLog({...log})
            _log.app_name = appName;
            await _log.save()
        }
    } catch (err) {
        console.log("Failed to write logs to db", err);
    }
}
export const captureLogs =  ({appName} : {appName: string})=>{
    if (1)
        return
    clearTerminal()
    console.log("\n[CAPTURE LOGS]\n");

    // Open writable streams for logs
// const logFile = fs.createWriteStream('terminal-logs.json', { flags: 'a' });
// const errorFile = fs.createWriteStream('terminal-errors.json', { flags: 'a' });

// Backup the original methods
const originalStdoutWrite = process.stdout.write;  
const originalStderrWrite = process.stderr.write;

const outWrite: any = (chunk: Uint8Array | string, encoding?: BufferEncoding, cb?: (err?: Error) => void) => {
    const gap = msToMin(Date.now() - lastSaved)
    if (!chunk.length) return;
    if (gap >= SAVE_INTERVAL || lastSaved == 0){
        lastSaved = Date.now()
        // Write logs to database
        saveToDb(logs, appName)
        // Clear logs array
        logs = []
    }
    const timestamp = parseDate(new Date())
    const log:ILog = {log: chunk, ts: timestamp, type: 'out'}
    logs.push(log)
    const message = `[STDOUT] [${timestamp}] ${chunk}`;
    // logFile.write(''); // Clear old logs // Write to file
    // logFile.write(JSON.stringify({logs})); // Write to file
    
    return originalStdoutWrite.call(process.stdout, chunk, encoding, cb); // Output to terminal
  }; 
// Override process.stdout.write
process.stdout.write = outWrite
const errWrite: any = (chunk: Uint8Array | string, encoding?: BufferEncoding, cb?: (err?: Error) => void,) => {
    const gap = msToMin(Date.now() - lastSaved)
    if (gap >= SAVE_INTERVAL || lastSaved == 0){
        lastSaved = Date.now()
        // Write logs to database
        saveToDb(logs, appName)
        // Clear logs array
        logs = []
    }
    const timestamp = parseDate(new Date())
    const log: ILog = {log: chunk, ts: timestamp, type: 'err'}
    logs.push(log)
    const message = `[STDERR] [${timestamp}] ${chunk}`;
    // errorFile.write(''); // Clear old logs // Write to error file
    // errorFile.write(JSON.stringify({logs})); // Write to error file
    return originalStderrWrite.call(process.stderr, chunk, encoding, cb); // Output to terminal
  
  };
// Override process.stderr.write
process.stderr.write = errWrite
 

// Example logs
// console.log('This is a log message');
// console.error('This is an error message');
// process.stdout.write('Direct STDOUT message\n');
// process.stderr.write('Direct STDERR message\n');
}


