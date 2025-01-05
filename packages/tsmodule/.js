const dependencies = {
    "axios": "^1.7.7",
    "bignumber.js": "*",
    "binance": "^2.13.5",
    "binance-api-node": "^0.12.9",
    "bitget-api": "^2.0.11",
    "bybit-api": "^3.10.19",
    "cors": "*",
    "dotenv": "*",
    "fs": "^0.0.1-security",
    "gate-api": "^5.60.1",
    "indicatorts": "^2.2.1",
    "jsonwebtoken": "^9.0.2",
    "kucoin-api": "^1.0.20",
    "mexc-api-sdk": "^1.0.3",
    "mongoose": "^8.7.2",
    "node-mexc-apis": "^1.0.4",
    "node-schedule": "^2.1.1",
    "nodemailer": "^6.9.16",
    "okx-api": "^1.4.6",
    "socket.io": "*"
  }
  const devDependencies= {
    "rimraf": "*",
    "vite": "^5.4.11"
  }


for (let dep of Object.keys(dependencies)){
    console.log(`import ${dep.replaceAll("-", "_").replaceAll(".", "_")} from "${dep}"`);
}