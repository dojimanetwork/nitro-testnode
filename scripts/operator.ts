import { DOJ_DECIMAL, HermesInit } from "@dojima-wallet/connection";
import { Network } from "@dojima-wallet/types";
import { AssetDOJNative, baseToAsset, assetToBase, assetAmount } from "@dojima-wallet/utils";
import * as consts from "./consts";

async function createOperator(hermesClient: HermesInit, serverUrl: string, stakeAmount: number) {
    const hermesAddress = hermesClient.h4sConnect.getAddress();
    console.log("H4S address :: ", hermesAddress);
    const bal = await hermesClient.h4sConnect.getBalance(hermesAddress, [AssetDOJNative]);
    console.log("H4S Asset :: ", bal[0].asset);
    const h4sBalance = baseToAsset(bal[0].amount).amount().toNumber();
    console.log("H4S Balance :: ", h4sBalance);

    if (h4sBalance < stakeAmount) {
        throw new Error("Stake amount is greater than H4S balance");
    }

    let stakeAmountBase = assetToBase(assetAmount(stakeAmount, DOJ_DECIMAL));
    const operatorTxHash = await hermesClient.h4sConnect.createOperator({
        serverAddress: serverUrl,
        stakeAmount: stakeAmountBase,
    });
    console.log("Operator tx hash :: ", operatorTxHash);
}

export const createOperatorCommand = {
    command: "create-operator",
    describe: "Create a new operator",
    builder: {
        serverUrl: {
            demandOption: true,
            describe: "Operator server URL",
            string: true,
        },
        stakeAmount: {
            demandOption: true,
            describe: "Operator stake amount",
            number: true,
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

        await createOperator(hermesClient, argv.serverUrl, argv.stakeAmount);
    },
};
