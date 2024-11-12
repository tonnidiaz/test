import { ITuBook } from "@cmn/models/book.js";
import { Bot, TuBook } from "@cmn/models/index.js";
import { crossCoinFees } from "@cmn/utils/consts3.js";
import { parseKlines } from "@cmn/utils/funcs2.js";
import { connectMongo } from "@cmn/utils/funcs4.js";
import { ceil, clearTerminal } from "@cmn/utils/functions.js";

clearTerminal();

const AMT = 1;

async function runTri({ MIN_PERC }: { MIN_PERC: number }) {
    const plat = "binance";

    const A = "USDT",
        B = "BTC",
        C = "FIDA";

    console.log(`Running tri.`, plat, A, B, C, "\n");
    const pairA = [B, A],
        pairB = [C, B],
        pairC = [C, A];
    let bookA: ITuBook[] = await TuBook.find({
        plat,
        pair: pairA.join("-"),
    }).exec();
    let bookB: ITuBook[] = await TuBook.find({
        plat,
        pair: pairB.join("-"),
    }).exec();
    let bookC: ITuBook[] = await TuBook.find({
        plat,
        pair: pairC.join("-"),
    }).exec();

    if (!bookA.length) return console.log("BookA not found");
    if (!bookB.length) return console.log("BookB not found");
    if (!bookC.length) return console.log("BookC not found");

    console.log("Parsing bookA", bookA.length);
    bookA = parseBook(bookA);
    console.log("New bookA", bookA.length);

    console.log("Parsing bookB", bookB.length);
    bookB = parseBook(bookB);
    console.log("New bookB", bookB.length);

    console.log("Parsing bookC", bookC.length);
    bookC = parseBook(bookC);
    console.log("New bookC", bookC.length);

    let dfA = bookA.map((el) => el.book[0]);
    let dfB = bookB.map((el) => el.book[0]);
    let dfC = bookC.map((el) => el.book[0]);

    const iLen = Math.min(dfA.length, dfB.length, dfC.length);
    let bal = 50;
    const START_BAL = bal;

    const trades: { ts: string; perc: number; flipped: boolean }[] = [];

    const MAKER = 0.1 / 100,
        TAKER = 0.1 / 100;
    console.log("\nBegin...");
    for (let i = 0; i < iLen; i++) {
        const rowA = dfA[i];
        const rowB = dfB[i];
        const rowC = dfC[i];

        const askA = rowA.asks[0].px!;
        const askB = rowB.asks[0].px!;
        const askC = rowC.asks[0].px!;

        const bidA = rowA.bids[0].px!;
        const bidB = rowB.bids[0].px!;
        const bidC = rowC.bids[0].px!;

        const A2 = bidC / (askA * askB);
        const perc = ceil(((A2 - AMT) / AMT) * 100, 3);
        const fA2 = (bidB * bidA) / askC;
        const fperc = ceil(((fA2 - AMT) / AMT) * 100, 3);
        //if (!pos && perc < 0 && fperc < 0) continue;
        // console.log("\n", { perc: `${perc}%`, A2 });
        // console.log({ fperc: `${fperc}%`, fA2 });

        const _perc = Math.max(perc, fperc);
        const _flipped = fperc > perc;

        if (_perc >= MIN_PERC) {
            console.log({ _perc });
        }
    }
}
async function runCross({ MIN_PERC }: { MIN_PERC: number }) {
    const platA = "mexc",
        platB = "bitget";

    const A = "USDT",
        B = "ABBC";
    const pair = [B, A];
    console.log(`Running cross.`, { platA, platB, A, B }, "\n");
    let bookA: ITuBook[] = await TuBook.find({
        plat: platA,
        pair: pair.join("-"),
    }).exec();
    let bookB: ITuBook[] = await TuBook.find({
        plat: platB, 
        pair: pair.join("-"),
    }).exec();

    if (!bookA.length) return console.log("BookA not found");
    if (!bookB.length) return console.log("BookB not found");

    console.log("Parsing bookA", bookA.length);
    bookA = parseBook(bookA);
    console.log("New bookA", bookA.length);

    console.log("Parsing bookB", bookB.length);
    bookB = parseBook(bookB);
    console.log("New bookB", bookB.length);

    let dfA = bookA.map((el) => el.book[0]);
    let dfB = bookB.map((el) => el.book[0]);

    const iLen = Math.min(dfA.length, dfB.length);
    let bal = 50;
    const START_BAL = bal;

    const trades: { ts: string; perc: number; flipped: boolean }[] = [];

    const MAKER = 0.1 / 100,
        TAKER = 0.1 / 100;
    console.log("\nBegin...");
    for (let i = 0; i < iLen; i++) {
        const rowA = dfA[i];
        const rowB = dfB[i];
        const tsA = rowA.ts
        const tsB = rowB.ts
        
        const askA = rowA.asks[0].px!;
        const askB = rowB.asks[0].px!;

        const bidA = rowA.bids[0].px!;
        const bidB = rowB.bids[0].px!;

        const A2 = (AMT * bidB) / askA;
        const perc = ceil(((A2 - AMT) / AMT) * 100, 3);
        // const fA2 = bidA / askB;
        // const fperc = ceil(((fA2 - AMT) / AMT) * 100, 3);
        //if (!pos && perc < 0 && fperc < 0) continue;
        // console.log("\n", { perc: `${perc}%`, A2 });
        // console.log({ fperc: `${fperc}%`, fA2 });

        const _perc = Math.max(perc);
        if (_perc >= MIN_PERC) {
            console.log({tsA, tsB});
            console.log({ _perc });
        }
    }
}
async function main({ minPerc, cross }: { minPerc?: number; cross?: boolean }) {
    /* KUCOIN - NEAR-USDT */
    try {
        await connectMongo(true);
        const MIN_PERC = minPerc ?? 0.2;
        if (cross) runCross({ MIN_PERC });
        else runTri({ MIN_PERC });
    } catch (err) {
        console.log(err);
    }
}

main({ minPerc: 0.5, cross: true });

function parseBook(books: ITuBook[]) {
    const ts1 = books[0].book[0].ts;
    const ts2 = books[1].book[0].ts;
    const interval = Math.round((Date.parse(ts2) - Date.parse(ts1)) / 60000);
    console.log({ ts1, ts2, interval });
    let newBooks: typeof books = [];
    for (let i = 0; i < books.length; i++) {
        const curr = books[i];
        if (i > 0) {
            const prev = books[i - 1];
            const diff = Math.round(
                (Date.parse(curr.book[0].ts) - Date.parse(prev.book[0].ts)) /
                    60000
            );
            if (diff == 0) continue;
            if (diff != interval) {
                console.log(`Break at [${prev.book[0].ts}]`);
                break;
            }
        }
        newBooks.push(curr);
    }
    return newBooks;
}
