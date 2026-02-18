const crypto = require("crypto");

const { privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: {
    type: "pkcs8",
    format: "pem",
  },
});

// This formats the key specifically for a .env file
const envFormat = privateKey.replace(/\n/g, "\\n");
console.log("\n--- COPY EVERYTHING BETWEEN THE QUOTES ---\n");
console.log(`PRIVATE_KEY="${envFormat}"`);
console.log("\n-------------------------------------------\n");
