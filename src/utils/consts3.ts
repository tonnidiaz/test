import { IObj, TPlatName } from "./interfaces";

export const platList = [
    "binance",
    "bitget",
    "bybit",
    "kucoin",
    "okx",
    "mexc",
    "gateio",
] as const;
export const coinFees: { [key: string]: number } = {
    BDX: 1,
    ALEX: 1.5, //MEXC
    XETA: 50,
    KMA: 1,
    HAI: 1,
    AA: 2,
    CWS: 2,
    KARATE: 0.1,
    USDT: 0.3, //OP-OKX//0.5 - BITGET,
    OAS: 1, // MEXC
    LAT: 1, // MEXC
    TAMA: 30,
    CAS: 200,
    OKT: 0.1,
    RIO: 1,
    FIDA: 6,
    BABYDOGE: 801207481,
    PEPE2: 300000000,
};

export const crossCoinFees: { [key: string]: { [key: string]: number } } = {
    bitget: {
        JUV: 0.002,
        ENJ: 3.61,
        CUSD: 0.1,
        BTG: 0.01,
        USDT: 0.5,
        SYS: 5,
        PEPE2: 300000000,
        ALEX: 25,
        OVR: 37,
        REEF: 480,
        XETA: 50,
        HALO: 150,
        VRTX: 10,
        POLYX: 2.3,
        SCPT: 70,
        PIP: 35,
        GRAPE: 500,
        MV: 50,
        SIN: 160,
        ZKF: 10000,
        DAO: 38,
        SCLP: 3,
        MOBILE: 900,
    },
    mexc: {
        LAT: 1, // LAT: MED
        OAS: 1,
        ALEX: 1.5,
        BDX: 11, // HIGH
        COMBO: 5,
        CAS: 67, // BEP20
        IDEA: 50,
        CANDY: 3, // MATIC: GOOD
        KMA: 1,
        EOSC: 0.1,
        ALT: 1, // APT: 1.5% GOOD
        CWAR: 350, // SOL: HIGH,
        IZI: 352, // ERC20: HIGH
        HAI: 1, // VeChain(VET): GOOD
        AA: 2, // ARB: HIGH
        FEAR: 15, // ERC20: HIGH
        LIKE: 70, // SOL: HIGH
        DPR: 1360, // ERC20: HIGH
        INSP: 59, // ERC20: HIGH
        INFRA: 10, // ERC20: HIGH
        AIEPK: 400, // ERC20: HIGH
        CWS: 2, // BEP20: HIGH
        KARATE: 0.1, // Hedera(HBAR): GOOD
        GRAIL: 0.0005, // ARB: HIGH
        EVER: 10, // EVERSCALE: HIGH
        FIDA: 4, // SOL: HIGH
        GST: 90, // SOL: HIGH
        KICKS: 1523, // BEP20: HIGH
        IRON: 0.1, // IRON: GOOD
        BLOK: 30, // MATIC: GOOD
        HYDRA: 1, // HYDRA: HIGH
        CAL: 3652, // BEP20: HIGH
        CSIX: 10, // BEP20: HIGH
        BABYDOGE: 801207481, // BEP20: 1.5% @5m GOOD
        CVTX: 10, // PLYGON[MATIC]: HIGH
        OKT: 0.1, // OKT: HIGH
        SC: 10, // SC: OK
        RDNT: 2, // ARB: BAD
        ABBC: 0.1, // ABBC: 1.5% @ 5m GOOD,
        AITECH: 2, // BEP20: WORKS
        GFT: 13, // BEP20: FUCKED
        ARTY: 1, // BEP20: VERY FUCKED
    },
    kucoin: {
        USDT: 0.5,
    },
    okx: {
        USDT: 0.3, // OP
    },
};

/**
 * Pairs to get and store orderbook data for
 */
export const pairsOfInterest: {
    [key: string]: { A: string; B?: string; C: string[] }[];
} = {
    // binance: [
    //     { A: "USDT", B: "USDC", C: ["JUP", "FET", "CKB", "YGG", "PEOPLE"] },
    //     { A: "USDT", B: "BTC", C: ["PEOPLE", "ONE", "NULS", "DATA", "FIDA"] },
    // ],
    bitget: [
        { A: "USDT", B: "USDC", C: ["BGB"] },
        { A: "USDT", B: "BTC", C: ["BGB"] },
        { A: "EUR", B: "USDT", C: ["PEPE", "BGB"] },
        { A: "USDT", C: ["HAI", "LAT", "OAS", "BABYDOGE", "ABBC"] },
    ],
    kucoin: [
        { A: "USDT", B: "USDC", C: ["FLOKI", "GMT", "APE", "NEAR"] },
        { A: "USDT", C: ["CAS", "BLOK", "IRON", "HAI", "KARATE"] },
    ],
    okx: [
        { A: "USDT", B: "USDC", C: ["KLAY", "1INCH", "SUSHI", "MKR", "ALGO"] },
        { A: "USDT", C: ["LAT", "SC"] },
    ],
    mexc: [
        { A: "USDT", C: ["HAI", "LAT", "OAS", "BABYDOGE", "ABBC"] }, // -bitget
        { A: "USDT", C: ["LAT", "SC"] }, // -okx
        { A: "USDT", C: ["CAS", "BLOK", "IRON", "HAI", "KARATE"] }, // -kucoin
    ],
};

const K = 1000,
    M = 1000000;

export const coinVols = [
    {
        kucoin: {
            IRON: 154 * K,
            HAI: 123 * K,
            BLOK: 89 * K,
            CAS: 56 * K,
            KARATE: 12 * K,
        },
        bitget: {
            LAT: 2.56 * M,
            BABYDOGE: 1.45 * M,
            ABBC: 25 * K,
            OAS: 38 * K,
        },
        okx: {
            SC: 354 * K,
            LAT: 75 * K,
        },
        mexc: {
            LAT: 11 * K,
            BABYDOGE: 1.24 * M,
            ABBC: 27 * K,
            OAS: 20 * K,
            SC: 41 * K,
        },
    },
];
