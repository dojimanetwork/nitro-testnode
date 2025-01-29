import { ethers } from "ethers";
import * as consts from "./consts";
import * as fs from "fs";
import * as crypto from "crypto";
import { runStress } from "./stress";
import path from "path";

async function writeHermesAccounts() {
  const wallet = specialHermesAccount(0)
  let walletJSON = await wallet.encrypt(consts.hermes_account_password);
  let filePath = path.join(consts.dojima_keystore_path, wallet.address + ".key")
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(
        filePath,
        walletJSON
    );
  }
}

async function writeDojimaAccounts(argv: any) {
  await writeHermesAccounts();
  for (let i = 0; i < argv.count; i++) {
      const wallet = specialEthAccount(i)
      let walletJSON = await wallet.encrypt(consts.dojima_passphrase);
      // if the account is already created, we don't need to create it again
      let filePath = path.join(consts.dojima_keystore_path, wallet.address + ".key");
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(
            filePath,
            walletJSON
        );
      }
    }
  }

// we are using same HD path for GETH and DOJIMA accounts
async function writeGethAccounts(argv: any) {
  for (let i = 0; i < argv.count; i++) {
    const wallet = specialEthAccount(i)
    let walletJSON = await wallet.encrypt(consts.geth_passphrase);
    // if the account is already created, we don't need to create it again
    let filePath = path.join(consts.geth_keystore_path, wallet.address + ".key");
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(
        filePath,
        walletJSON
      );
    }
  }
}

function specialHermesAccount(index: number): ethers.Wallet {
  return ethers.Wallet.fromMnemonic(
    consts.hermes_mnemonic,
    "m/44'/184'/0'/0/" + index
  );
}

function specialEthAccount(index: number): ethers.Wallet {
  return ethers.Wallet.fromMnemonic(
    consts.geth__and_doj_mnemonic,
    "m/44'/60'/0'/0/" + index
  );
}

export function namedDojimaAccount(
  name: string,
  threadId?: number | undefined
): ethers.Wallet {
  if (name == "funnel") {
    return specialEthAccount(0);
  }
  if (name == "sequencer") {
    return specialEthAccount(1);
  }
  if (name == "validator") {
    return specialEthAccount(2);
  }
  if (name == "l3owner") {
    return specialEthAccount(3);
  }
  if (name == "l3sequencer") {
    return specialEthAccount(4);
  }
  if (name == "l2owner") {
    return specialEthAccount(5);
  }
  if (name == "espresso-sequencer")
    return specialEthAccount(6);
  if (name.startsWith("user_")) {
    return new ethers.Wallet(
      ethers.utils.sha256(ethers.utils.toUtf8Bytes(name))
    );
  }
  if (name.startsWith("threaduser_")) {
    if (threadId == undefined) {
      throw Error("threaduser_ account used but not supported here");
    }
    return new ethers.Wallet(
      ethers.utils.sha256(
        ethers.utils.toUtf8Bytes(
          name.substring(6) + "_thread_" + threadId.toString()
        )
      )
    );
  }
  if (name.startsWith("key_")) {
    return new ethers.Wallet(ethers.utils.hexlify(name.substring(4)));
  }
  throw Error("bad account name: [" + name + "] see general help");
}

export function namedAddress(
  name: string,
  threadId?: number | undefined
): string {
  if (name.startsWith("address_")) {
    return name.substring(8);
  }
  if (name == "random") {
    return "0x" + crypto.randomBytes(20).toString("hex");
  }
  return namedDojimaAccount(name, threadId).address;
}

export const namedAccountHelpString =
  "Valid account names:\n" +
  "  funnel | sequencer | validator | l2owner - known keys used by l2\n" +
  "  l3owner | l3sequencer                    - known keys used by l3\n" +
  "  user_[Alphanumeric]                      - key will be generated from username\n" +
  "  threaduser_[Alphanumeric]                - same as user_[Alphanumeric]_thread_[thread-id]\n" +
  "  key_0x[full private key]                 - user with specified private key\n" +
  "\n" +
  "Valid addresses: any account name, or\n" +
  "  address_0x[full eth address]\n" +
  "  random";

async function handlePrintAddress(argv: any, threadId: number) {
  console.log(namedAddress(argv.account, threadId));
}

async function handlePrintPrivateKey(argv: any, threadId: number) {
  console.log(namedDojimaAccount(argv.account, threadId).privateKey);
}

export const printAddressCommand = {
  command: "print-address",
  describe: "prints the requested address",
  builder: {
    account: {
      string: true,
      describe: "address (see general help)",
      default: "funnel",
    },
  },
  handler: async (argv: any) => {
    await runStress(argv, handlePrintAddress);
  },
};

export const printPrivateKeyCommand = {
  command: "print-private-key",
  describe: "prints the requested private key",
  builder: {
    account: {
      string: true,
      describe: "account (see general help)",
      default: "funnel",
    },
  },
  handler: async (argv: any) => {
    await runStress(argv, handlePrintPrivateKey);
  },
}

export const writeGethAccountsCommand = {
  command: "write-geth-accounts",
  describe: "writes wallet files",
  count: { number: true, default: 7 },
  handler: async (argv: any) => {
    await runStress(argv, writeGethAccounts);
  },
};

export const writeHermesAccountCommand = {
  command: "write-hermes-account",
  describe: "writes wallet files",
  handler: async (argv: any) => {
    await writeHermesAccounts();
  },
};

export const writeDojimaAccountsCommand  = {
  command: "write-dojima-accounts",
  describe: "write dojima chain accounts",
  builder: {
    count: { number: true, default: 7 },
  },
  handler: async (argv: any) => {
    await runStress(argv, writeDojimaAccounts);
  }
}
