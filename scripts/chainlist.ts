import { HermesInit, ComputeUnits, OperatorInit } from "@dojima-wallet/connection";
import { Network } from "@dojima-wallet/types";
import { Chain, ChainTicker, isEnabledChain, tickerToChain } from "@dojima-wallet/utils";
import * as consts from "./consts";
import { AddChainClientParam } from "@dojima-wallet/connection/dist/lib/operator-gateway/types";

async function registerChain(hermesClient: HermesInit, chainId: number, chainTicker: ChainTicker, blkUnits: number, txUnits: number) {
    if (!isEnabledChain(chainTicker)) {
        throw new Error("Invalid chain ticker");
    }

    const chainData = tickerToChain(chainTicker);
    const chain: Chain = {
        chainId: chainId.toString(),
        name: chainData.name,
        token: chainData.token,
        ticker: chainData.ticker,
    };

    console.log("Chain to register :: ", chain);

    const cmpUnits: ComputeUnits = {
        blockUnits: blkUnits,
        txnUnits: txUnits,
    };

    const txHash = await hermesClient.h4sConnect.registerChain({ chain, cmpUnits });
    console.log("Chain registered with tx hash :: ", txHash);
}

async function createEndpoint(hermesClient: HermesInit, chainId: number, chainTicker: ChainTicker, rpcUrl: string, wsUrl: string) {
    if (!isEnabledChain(chainTicker)) {
        throw new Error("Invalid chain ticker");
    }

    const chainData = tickerToChain(chainTicker);
    const chain: Chain = {
        chainId: chainId.toString(),
        name: chainData.name,
        token: chainData.token,
        ticker: chainData.ticker,
    };

    console.log("Creating endpoint for chain :: ", chain);

    const txHash = await hermesClient.h4sConnect.createEndpoint({ chain, rpcUrl, wsUrl });
    console.log("Endpoint created with tx hash :: ", txHash);
}

async function registerClient(operatorClient: OperatorInit, chainId: number, chainTicker: ChainTicker, rpcUrl: string, wsUrl: string) {
    if (!isEnabledChain(chainTicker)) {
        throw new Error("Invalid chain ticker");
    }

    const chainData = tickerToChain(chainTicker);
    const params: AddChainClientParam = {
        chain: {
            name: chainData.name,
            token: chainData.token,
            ticker: chainData.ticker,
            chainId: chainId.toString(),
        },
        rpcUrl,
        wsUrl,
    };

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    const MAX_RETRIES = 30;
    const RETRY_DELAY = 2000;
    let attempts = 0;

    while (attempts < MAX_RETRIES) {
        try {
            await new Promise((resolve, reject) => {
                operatorClient.client.addChainClient(params, (error: any, response: any) => {
                    if (error?.details === 'chainclient already exists') {
                        console.log("chainclient already exists");
                        resolve(true);
                    } else if (error) {
                        // Avoid logging the full error
                        reject(new Error(error.details || error.message));
                    } else {
                        console.log("Chain client added successfully");
                        resolve(true);
                    }
                });
            });
            return;
        } catch (error: any) {
            attempts++;
            if (attempts === MAX_RETRIES) {
                throw new Error(`Failed to register chain client after ${MAX_RETRIES} attempts`);
            }
            await sleep(RETRY_DELAY);
        }
    }
}

export const registerChainCommand = {
    command: "register-chain",
    describe: "Register a new chain",
    builder: {
        chainId: {
            demandOption: true,
            describe: "Chain ID",
            number: true,
        },
        chainTicker: {
            demandOption: true,
            describe: "Chain ticker is ticker of the chain to register (AVAX, ETH, BNB, etc.)",
            string: true,
        },
        blockUnits: {
            demandOption: true,
            describe: "Block units",
            number: true,
            default: 2,
        },
        txnUnits: {
            demandOption: true,
            describe: "Transaction units",
            number: true,
            default: 1,
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
            argv.hermesRpcUrl
        );

        await registerChain(hermesClient, argv.chainId, argv.chainTicker, argv.blockUnits, argv.txnUnits);
    },
};

export const createEndpointCommand = {
    command: "create-endpoint",
    describe: "Create an endpoint",
    builder: {
        chainId: {
            demandOption: true,
            describe: "Chain ID",
            number: true,
        },
        chainTicker: {
            demandOption: true,
            describe: "Chain ticker is ticker of the chain to register (AVAX, ETH, BNB, etc.)",
            string: true,
        },
        rpcUrl: {
            demandOption: true,
            describe: "RPC URL",
            string: true,
        },
        wsUrl: {
            demandOption: true,
            describe: "Websocket URL",
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
            argv.hermesRpcUrl
        );

        await createEndpoint(hermesClient, argv.chainId, argv.chainTicker, argv.rpcUrl, argv.wsUrl);
    },
};

export const registerClientCommand = {
    command: "register-client",
    describe: "Register a client",
    builder: {
        chainTicker: {
            demandOption: true,
            describe: "Chain ticker",
            string: true,
        },
        chainId: {
            demandOption: true,
            describe: "Chain ID",
            number: true,
        },
        rpcUrl: {
            demandOption: true,
            describe: "RPC URL",
            string: true,
        },
        wsUrl: {
            demandOption: true,
            describe: "Websocket URL",
            string: true,
        },
    },
    handler: async (argv: any) => {
        const operatorClient = new OperatorInit(argv.operatorServerAddr);
        await registerClient(operatorClient, argv.chainId, argv.chainTicker, argv.rpcUrl, argv.wsUrl);
    },
};
