
import * as fs from "fs";
import { HermesInit, DOJ_DECIMAL } from "@dojima-wallet/connection";
import { Network } from "@dojima-wallet/types";

import * as consts from "./consts";
import { HermesConfig, EthConfig, DojimaConfig, NaradaConfig } from "./hermes_config";
import { assetToBase, assetAmount, AssetDOJNative, baseToAsset, Address } from "@dojima-wallet/utils";
import { TxParams } from "@dojima-wallet/connection/dist/lib/client";


// this function will take the flags and write the env file for the hermes node
async function writeHermesEnv(argv: any) {
    const config: HermesConfig = {
        nodes: argv.nodes,
        net: argv.net,
        seed: argv.seed,
        hermesBlockTime: argv.hermesBlockTime,
        hardforkBlockHeight: argv.hardforkHeight,
        newGenesisTime: argv.genesisTime,
        tssP2pPort: argv.tssP2pPort,
        p2pIdPort: argv.p2pIdPort,
        peer: argv.peer,
        pprofEnabled: true,
        arAddress: argv.arAddress,
        dotAddress: argv.dotAddress,
        signerName: consts.hermes_account_name,
        signerPasswd: consts.hermes_account_password,
        solPubkey: argv.solPubkey,
        solProgram: argv.solProgram,
        keyPassphrase: consts.hermes_account_password,
        signerSeedPhrase: consts.hermes_mnemonic,
        sprintDuration: argv.sprintDuration,
        chainHomeFolder: argv.chainHomeFolder,
        chainId: argv.chainId,
        chainRpc: argv.chainRpc,
        confPath: argv.confPath,
    };

    const hermesEnv = convertToEnv(config);
    if (fs.existsSync(consts.hermes_env)) {
        fs.appendFileSync(consts.hermes_env, '\n' + hermesEnv)
    } else {
        fs.writeFileSync(consts.hermes_env, hermesEnv)
    }
}

function writeEthConfig(argv: any) {
    const config: EthConfig = {
        ethHost: argv.host,
        ethInboundStateSender: argv.inboundStateSender,
        ethRouterContract: argv.routerContract,
        ethAccPass: consts.hermes_account_password,
    }

    const ethEnv = convertToEnv(config);
    // append to the existing file
    if (fs.existsSync(consts.hermes_env)) {
        fs.appendFileSync(consts.hermes_env, '\n' + ethEnv)
    } else {
        fs.writeFileSync(consts.hermes_env, ethEnv)
    }
}

function writeDojimaConfig(argv: any) {
    const config: DojimaConfig = {
        dojHost: argv.dojimaRpcUrl,
        dojimaChainId: argv.dojimaChainId,
        dojimaGrpcUrl: argv.dojimaGrpcUrl,
        dojimaRpcUrl: argv.dojimaRpcUrl,
        dojimaSpanEnable: argv.dojimaSpanEnable,
        dojimaSpanPollInterval: argv.dojimaSpanPollInterval,
    }

    const dojimaEnv = convertToEnv(config);
    // if hermes env file exists, append to it
    if (fs.existsSync(consts.hermes_env)) {
        fs.appendFileSync(consts.hermes_env, '\n' + dojimaEnv)
    } else {
        fs.writeFileSync(consts.hermes_env, dojimaEnv)
    }
}

function writeNaradaConfig(argv: any) {
    let preparam = "";
    if (argv.preparam === "") {
        preparam = fs.readFileSync(consts.preparam_path, 'utf8');
    }

    const config: NaradaConfig = {
        chainApi: argv.chainApi,
        chainRpc: argv.chainRpc,
        eddsaHost: argv.eddsaHost,
        blockScannerBackoff: argv.blockScannerBackoff,
        httpAuthHost: argv.httpAuthHost,
        httpAuthPort: argv.httpAuthPort,
        includeEthChain: argv.includeEthChain,
        includeDojChain: argv.includeDojChain,
        includeAvaxChain: argv.includeAvaxChain,
        includeBinanceChain: argv.includeBinanceChain,
        includeBtcChain: argv.includeBtcChain,
        includeArChain: argv.includeArChain,
        includeDotChain: argv.includeDotChain,
        includeSolChain: argv.includeSolChain,
        includeGaiaChain: argv.includeGaiaChain,
        includeArtheraChain: argv.includeArtheraChain,
        preparam: preparam,
    }

    const naradaEnv = convertToEnv(config);
    if (fs.existsSync(consts.hermes_env)) {
        fs.appendFileSync(consts.hermes_env, '\n' + naradaEnv);
    } else {
        fs.writeFileSync(consts.hermes_env, naradaEnv);
    }
}

async function fundHermesSecondaryAccount(hermesClient: HermesInit, amount: number, retryCount: number = 0): Promise<number> {
    const hermesSecondaryAddress = await hermesClient.h4sConnect.getAddress(0, 1); // 1 is the index of the secondary account
    console.log("Hermes secondary address: ", hermesSecondaryAddress);

    const txParams: TxParams = {
        amount: assetToBase(assetAmount(amount, DOJ_DECIMAL)),
        recipient: hermesSecondaryAddress,
    }
    const txHash = await hermesClient.h4sConnect.transfer(txParams);
    console.log("Hermes secondary account funded with tx hash: ", txHash);

    const balances = await hermesClient.h4sConnect.getBalance(hermesSecondaryAddress, [AssetDOJNative]);
    const balance = baseToAsset(balances[0].amount).amount().toNumber();
    console.log("Hermes secondary account balance: ", balance);

    return balance;
}

async function getHermesBalance(hermesClient: HermesInit, address: Address) {
    const balances = await hermesClient.h4sConnect.getBalance(address, [AssetDOJNative]);
    const balance = baseToAsset(balances[0].amount).amount().toNumber();
    console.log("Hermes account: ", address, " balance: ", balance);

    return balance;
}

export const writeHermesEnvCommand = {
    command: "write-hermes-env",
    describe: "writes hermes env file",
    builder: {
        nodes: { number: true, default: 1 },
        net: { string: true, default: "mocknet" },
        seed: { string: true, default: "hermesnode" },
        hermesBlockTime: { string: true, default: "5s" },
        hardforkHeight: { string: true, default: "0" },
        genesisTime: { string: true, default: "" },
        tssP2pPort: { number: true, default: 5040 },
        p2pIdPort: { number: true, default: 6040 },
        peer: { string: true, default: "" },
        arAddress: { string: true, default: "" },
        dotAddress: { string: true, default: "" },
        solPubkey: { string: true, default: "" },
        solProgram: { string: true, default: "" },
        sprintDuration: { number: true, default: 16 },
        chainHomeFolder: { string: true, default: "/root/.hermesnode" },
        chainId: { string: true, default: "hermeschain" },
        chainRpc: { string: true, default: "hermesnode:26657" },
        confPath: { string: true, default: "/scripts/" },
    },
    handler: async (argv: any) => {
        await writeHermesEnv(argv);
    },
};


export const writeEthEnvCommand = {
    command: "write-eth-env",
    describe: "writes eth env file",
    builder: {
        host: { string: true, default: "http://host.docker.internal:9545" },
        inboundStateSender: { string: true, default: "" },
        routerContract: { string: true, default: "" },
        ethAccPass: { string: true, default: consts.hermes_account_password },
    },
    handler: async (argv: any) => {
        writeEthConfig(argv);
    },
};

export const writeDojimaEnvCommand = {
    command: "write-dojima-env",
    describe: "sets dojima environment variable in hermes env file",
    builder: {
        dojimaChainId: { number: true, default: 184 },
        dojimaGrpcUrl: { string: true, default: "hermesnode:9090" },
        dojimaSpanEnable: { boolean: true, default: false },
        dojimaSpanPollInterval: { string: true, default: "1s" },
    },
    handler: async (argv: any) => {
        writeDojimaConfig(argv);
    },
};

export const writeNaradaEnvCommand = {
    command: "write-narada-env",
    describe: "set narada related environment variable in hermes env file",
    builder: {
        chainApi: { string: true, default: "hermesnode:1317" },
        chainRpc: { string: true, default: "hermesnode:26657" },
        eddsaHost: { string: true, default: "narada-eddsa:6049" },
        httpAuthHost: { string: true, default: "host.docker.internal" },
        httpAuthPort: { string: true, default: "1219" },
        blockScannerBackoff: { string: true, default: "5s" },
        includeEthChain: { boolean: true, default: false },
        includeDojChain: { boolean: true, default: false },
        includeAvaxChain: { boolean: true, default: false },
        includeBinanceChain: { boolean: true, default: false },
        includeBtcChain: { boolean: true, default: false },
        includeArChain: { boolean: true, default: false },
        includeDotChain: { boolean: true, default: false },
        includeSolChain: { boolean: true, default: false },
        includeGaiaChain: { boolean: true, default: false },
        includeArtheraChain: { boolean: true, default: false },
        preparam: { string: true, default: "" },
    },
    handler: async (argv: any) => {
        writeNaradaConfig(argv);
    },
};

function convertToEnv(config: any) {
    // Convert config object to env format
    const env = Object.entries(config)
        .map(([key, value]) => {
            // Convert camelCase to SCREAMING_SNAKE_CASE
            const envKey = key.replace(/[A-Z]/g, letter => `_${letter}`).toUpperCase();
            // Add quotes around string values if they don't already have them
            const envValue = typeof value === 'string' && !value.startsWith('"') ?
                `"${value}"` : value;
            return `${envKey}=${envValue}`;
        })
        .join('\n');

    return env;
}

export const fundHermesSecondaryAccountCommand = {
    command: "fund-hermes-secondary-account",
    describe: "fund hermes secondary account",
    builder: {
        amount: { number: true, default: 10 },
        hermesPhrase: {
            demandOption: true,
            describe: "Hermes phrase",
            string: true,
            default: consts.hermes_mnemonic,
        },
        network: {
            demandOption: true,
            describe: "Network",
            string: true,
            default: Network.Testnet,
        },
    },
    handler: async (argv: any) => {
        const hermesClient = new HermesInit(
            argv.hermesPhrase,
            argv.network,
            argv.hermesApiUrl,
            argv.hermesRpcUrl,
        );
        await fundHermesSecondaryAccount(hermesClient, argv.amount);
    },
};

export const getHermesBalanceCommand = {
    command: "get-hermes-balance",
    describe: "get hermes balance",
    builder: {
        address: {
            demandOption: true,
            describe: "Hermes address",
            string: true,
        },
        hermesPhrase: {
            demandOption: true,
            describe: "Hermes phrase",
            string: true,
            default: consts.hermes_mnemonic,
        },
        network: {
            demandOption: true,
            describe: "Network",
            string: true,
            default: Network.Testnet,
        },
    },
    handler: async (argv: any) => {
        const hermesClient = new HermesInit(
            argv.hermesPhrase,
            argv.network,
            argv.hermesApiUrl,
            argv.hermesRpcUrl,
        );
        await getHermesBalance(hermesClient, argv.address);
    },
};