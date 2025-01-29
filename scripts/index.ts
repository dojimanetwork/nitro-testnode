import { hideBin } from "yargs/helpers";
import Yargs from "yargs/yargs";
import { stressOptions } from "./stress";
import { redisReadCommand, redisInitCommand } from "./redis";
import { writeConfigCommand, writeGethGenesisCommand, writePrysmCommand, writeL2ChainConfigCommand, writeL3ChainConfigCommand, writeL2DASCommitteeConfigCommand, writeL2DASMirrorConfigCommand, writeL2DASKeysetConfigCommand, writeDojimaConfigCommand } from "./config";
import {
  printAddressCommand,
  namedAccountHelpString,
  writeHermesAccountCommand,
  writeDojimaAccountsCommand,
  printPrivateKeyCommand,
  writeGethAccountsCommand,
} from "./accounts";
import {
  bridgeFundsCommand,
  bridgeNativeTokenToL3Command,
  bridgeToL3Command,
  createERC20Command,
  transferERC20Command,
  sendL1Command,
  sendL2Command,
  sendL3Command,
  sendRPCCommand,
  setValidKeysetCommand,
  waitForSyncCommand,
  transferL3ChainOwnershipCommand,
} from "./ethcommands";
import {
  fundHermesSecondaryAccountCommand,
  getHermesBalanceCommand, writeEthEnvCommand,
  writeHermesEnvCommand,
  writeNaradaEnvCommand,
  writeDojimaEnvCommand
} from "./hermes";
import { createOperatorCommand } from "./operator";
import { createEndpointCommand, registerChainCommand, registerClientCommand } from "./chainlist";
import {createDOJPoolCommand, createETHPoolCommand} from "./pool";

async function main() {
  await Yargs(hideBin(process.argv))
    .options({
      redisUrl: { string: true, default: "redis://redis:6379" },
      gethWSUrl: { string: true, default: "ws://geth:9546" },
      gethRPCUrl: { string: true, default: "http://geth:9545" },
      l2url: { string: true, default: "ws://sequencer:8548" },
      l3url: { string: true, default: "ws://l3node:3348" },
      validationNodeUrl: { string: true, default: "ws://validation_node:8549" },
      dojimaUrl: { string: true, default: "ws://dojima-chain:8546" },
      dojimaRpcUrl: { string: true, default: "http://dojima-chain:8545" },
      hermesApiUrl: { string: true, default: "http://hermesnode:1317" },
      hermesRpcUrl: { string: true, default: "http://hermesnode:26657" },
      crawlerRPCUrl: { string: true, default: "http://localhost:8899" },
      crawlerWSUrl: { string: true, default: "ws://localhost:8900" },
      operatorServerAddr: { string: true, default: "host.docker.internal:8080" }, // doesn't require the http protocol
      l2owner: { string: true, default: "0x3f1Eae7D46d88F08fc2F8ed27FCb2AB183EB2d0E" },
      committeeMember: { string: true, default: "not_set" },
    })
    .options(stressOptions)
    .options({
      espresso: { boolean: true, description: 'use Espresso Sequencer for sequencing and DA', default: false },
      espressoUrl: { string: true, description: 'Espresso Sequencer url', default: 'http://espresso-dev-node:41000' },
      lightClientAddress: { string: true, description: 'address of the light client contract', default: '' },
      enableEspressoFinalityNode: { boolean: true, description: 'enable finality node', default: false },
      simpleWithValidator: { boolean: true, description: 'start a simple node that validates', default: false },
    })
    .command(bridgeFundsCommand)
    .command(bridgeToL3Command)
    .command(bridgeNativeTokenToL3Command)
    .command(createERC20Command)
    .command(transferERC20Command)
    .command(sendL1Command)
    .command(sendL2Command)
    .command(sendL3Command)
    .command(sendRPCCommand)
    .command(setValidKeysetCommand)
    .command(transferL3ChainOwnershipCommand)
    .command(writeConfigCommand)
    .command(writeGethGenesisCommand)
    .command(writeL2ChainConfigCommand)
    .command(writeL3ChainConfigCommand)
    .command(writeL2DASCommitteeConfigCommand)
    .command(writeL2DASMirrorConfigCommand)
    .command(writeL2DASKeysetConfigCommand)
    .command(writePrysmCommand)
    .command(printAddressCommand)
    .command(printPrivateKeyCommand)
    .command(redisReadCommand)
    .command(redisInitCommand)
    .command(waitForSyncCommand)
    .command(writeDojimaEnvCommand)
    .command(writeDojimaConfigCommand)
    .command(writeHermesAccountCommand)
    .command(writeGethAccountsCommand)
    .command(writeGethGenesisCommand)
    .command(writeHermesEnvCommand)
    .command(writeNaradaEnvCommand)
    .command(fundHermesSecondaryAccountCommand)
    .command(getHermesBalanceCommand)
    .command(writeEthEnvCommand)
    .command(createOperatorCommand)
    .command(createEndpointCommand)
    .command(registerChainCommand)
    .command(registerClientCommand)
    .command(writeDojimaAccountsCommand)
    .command(createETHPoolCommand)
    .command(createDOJPoolCommand)
    .strict()
    .demandCommand(1, "a command must be specified")
    .epilogue(namedAccountHelpString)
    .help().argv;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
