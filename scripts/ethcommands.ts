import { runStress } from "./stress";
import { ContractFactory, ethers, Wallet } from "ethers";
import * as consts from "./consts";
import { namedAccount, namedAddress } from "./accounts";
import * as ERC20PresetFixedSupplyArtifact from "@openzeppelin/contracts/build/contracts/ERC20PresetFixedSupply.json";
import * as ERC20 from "@openzeppelin/contracts/build/contracts/ERC20.json";
import * as fs from "fs";
const path = require("path");

async function sendTransaction(argv: any, threadId: number) {
    const account = namedAccount(argv.from, threadId).connect(argv.provider)
    const startNonce = await account.getTransactionCount("pending")
    for (let index = 0; index < argv.times; index++) {
        const response = await 
            account.sendTransaction({
                to: namedAddress(argv.to, threadId),
                value: ethers.utils.parseEther(argv.ethamount),
                data: argv.data,
                nonce: startNonce + index,
            })
        console.log(response)
        if (argv.wait) {
          const receipt = await response.wait()
          console.log(receipt)
        }
        if (argv.delay > 0) {
            await new Promise(f => setTimeout(f, argv.delay));
        }
    }
}

async function bridgeFunds(argv: any, parentChainUrl: string, chainUrl: string, inboxAddr: string) {
  argv.provider = new ethers.providers.WebSocketProvider(parentChainUrl);

  argv.to = "address_" + inboxAddr;
  argv.data =
    "0x0f4d14e9000000000000000000000000000000000000000000000000000082f79cd90000";

  await runStress(argv, sendTransaction);

  argv.provider.destroy();
  if (argv.wait) {
    const l2provider = new ethers.providers.WebSocketProvider(chainUrl);
    const account = namedAccount(argv.from, argv.threadId).connect(l2provider)
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    while (true) {
      const balance = await account.getBalance()
      if (balance.gte(ethers.utils.parseEther(argv.ethamount))) {
        return
      }
      await sleep(100)
    }
  }
}

async function bridgeNativeToken(argv: any, parentChainUrl: string, chainUrl: string, inboxAddr: string, token: string) {
  argv.provider = new ethers.providers.WebSocketProvider(parentChainUrl);

  argv.to = "address_" + inboxAddr;

  /// approve inbox to use fee token
  const bridgerParentChain = namedAccount(argv.from, argv.threadId).connect(argv.provider)
  const nativeTokenContract = new ethers.Contract(token, ERC20.abi, bridgerParentChain)
  await nativeTokenContract.approve(inboxAddr, ethers.utils.parseEther(argv.amount))

  /// deposit fee token
  const iface = new ethers.utils.Interface(["function depositERC20(uint256 amount)"])
  argv.data = iface.encodeFunctionData("depositERC20", [ethers.utils.parseEther(argv.amount)]);

  await runStress(argv, sendTransaction);

  argv.provider.destroy();
  if (argv.wait) {
    const childProvider = new ethers.providers.WebSocketProvider(chainUrl);
    const bridger = namedAccount(argv.from, argv.threadId).connect(childProvider)
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    while (true) {
      const balance = await bridger.getBalance()
      if (balance.gte(ethers.utils.parseEther(argv.amount))) {
        return
      }
      await sleep(100)
    }
  }
}


export const bridgeFundsCommand = {
  command: "bridge-funds",
  describe: "sends funds from l1 to l2",
  builder: {
    ethamount: {
      string: true,
      describe: "amount to transfer (in eth)",
      default: "10",
    },
    from: {
      string: true,
      describe: "account (see general help)",
      default: "funnel",
    },
    wait: {
      boolean: true,
      describe: "wait till l2 has balance of ethamount",
      default: false,
    },
  },
  handler: async (argv: any) => {
    const deploydata = JSON.parse(
      fs
        .readFileSync(path.join(consts.configpath, "deployment.json"))
        .toString()
    );
    const inboxAddr = ethers.utils.hexlify(deploydata.inbox);
  
    await bridgeFunds(argv, argv.l1url, argv.l2url, inboxAddr)
  },
};

export const bridgeToL3Command = {
  command: "bridge-to-l3",
  describe: "sends funds from l2 to l3",
  builder: {
    ethamount: {
      string: true,
      describe: "amount to transfer (in eth)",
      default: "10",
    },
    from: {
      string: true,
      describe: "account (see general help)",
      default: "funnel",
    },
    wait: {
      boolean: true,
      describe: "wait till l3 has balance of ethamount",
      default: false,
    },
  },
  handler: async (argv: any) => {
    const deploydata = JSON.parse(
      fs
        .readFileSync(path.join(consts.configpath, "l3deployment.json"))
        .toString()
    );
    const inboxAddr = ethers.utils.hexlify(deploydata.inbox);

    await bridgeFunds(argv, argv.l2url, argv.l3url, inboxAddr)
  },
};

export const bridgeNativeTokenToL3Command = {
  command: "bridge-native-token-to-l3",
  describe: "bridge native token from l2 to l3",
  builder: {
    amount: {
      string: true,
      describe: "amount to transfer",
      default: "10",
    },
    from: {
      string: true,
      describe: "account (see general help)",
      default: "funnel",
    },
    wait: {
      boolean: true,
      describe: "wait till l3 has balance of amount",
      default: false,
    },
  },
  handler: async (argv: any) => {
    const deploydata = JSON.parse(
      fs
        .readFileSync(path.join(consts.configpath, "l3deployment.json"))
        .toString()
    );
    const inboxAddr = ethers.utils.hexlify(deploydata.inbox);
    const nativeTokenAddr = ethers.utils.hexlify(deploydata["native-token"]);

    argv.ethamount = "0"
    await bridgeNativeToken(argv, argv.l2url, argv.l3url, inboxAddr, nativeTokenAddr)
  },
};

export const createERC20Command = {
  command: "create-erc20",
  describe: "creates simple ERC20 on L2",
  builder: {
    deployer: {
      string: true,
      describe: "account (see general help)",
      default: "user_l2user",
    },
    mintTo: {
      string: true,
      describe: "account (see general help)",
      default: "user_l2user",
    },
    decimals: {
      string: true,
      describe: "number of decimals for token",
      default: "18",
    },
  },
  handler: async (argv: any) => {
    console.log("create-erc20");

    argv.provider = new ethers.providers.WebSocketProvider(argv.l2url);
    const deployerWallet = new Wallet(
      ethers.utils.sha256(ethers.utils.toUtf8Bytes(argv.deployer)),
      argv.provider
    );

    //// Bytecode below is generated from this simple ERC20 token contract which uses custom number of decimals
    // contract TestToken is ERC20 {
    //     uint8 private immutable _decimals;
    //
    //     constructor(uint8 decimals_, address mintTo) ERC20("testnode", "TN") {
    //         _decimals = decimals_;
    //         _mint(mintTo, 1_000_000 * 10 ** uint256(decimals_));
    //     }
    //
    //     function decimals() public view virtual override returns (uint8) {
    //         return _decimals;
    //     }
    // }
    const erc20TokenBytecode = "0x60a06040523480156200001157600080fd5b5060405162000d4938038062000d49833981016040819052620000349162000198565b60405180604001604052806008815260200167746573746e6f646560c01b815250604051806040016040528060028152602001612a2760f11b81525081600390816200008191906200028b565b5060046200009082826200028b565b50505060ff82166080819052620000c5908290620000b090600a6200046c565b620000bf90620f424062000481565b620000cd565b5050620004b9565b6001600160a01b038216620001285760405162461bcd60e51b815260206004820152601f60248201527f45524332303a206d696e7420746f20746865207a65726f206164647265737300604482015260640160405180910390fd5b80600260008282546200013c9190620004a3565b90915550506001600160a01b038216600081815260208181526040808320805486019055518481527fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef910160405180910390a35050565b505050565b60008060408385031215620001ac57600080fd5b825160ff81168114620001be57600080fd5b60208401519092506001600160a01b0381168114620001dc57600080fd5b809150509250929050565b634e487b7160e01b600052604160045260246000fd5b600181811c908216806200021257607f821691505b6020821081036200023357634e487b7160e01b600052602260045260246000fd5b50919050565b601f8211156200019357600081815260208120601f850160051c81016020861015620002625750805b601f850160051c820191505b8181101562000283578281556001016200026e565b505050505050565b81516001600160401b03811115620002a757620002a7620001e7565b620002bf81620002b88454620001fd565b8462000239565b602080601f831160018114620002f75760008415620002de5750858301515b600019600386901b1c1916600185901b17855562000283565b600085815260208120601f198616915b82811015620003285788860151825594840194600190910190840162000307565b5085821015620003475787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b634e487b7160e01b600052601160045260246000fd5b600181815b80851115620003ae57816000190482111562000392576200039262000357565b80851615620003a057918102915b93841c939080029062000372565b509250929050565b600082620003c75750600162000466565b81620003d65750600062000466565b8160018114620003ef5760028114620003fa576200041a565b600191505062000466565b60ff8411156200040e576200040e62000357565b50506001821b62000466565b5060208310610133831016604e8410600b84101617156200043f575081810a62000466565b6200044b83836200036d565b806000190482111562000462576200046262000357565b0290505b92915050565b60006200047a8383620003b6565b9392505050565b60008160001904831182151516156200049e576200049e62000357565b500290565b8082018082111562000466576200046662000357565b608051610874620004d5600039600061011b01526108746000f3fe608060405234801561001057600080fd5b50600436106100a95760003560e01c80633950935111610071578063395093511461014557806370a082311461015857806395d89b4114610181578063a457c2d714610189578063a9059cbb1461019c578063dd62ed3e146101af57600080fd5b806306fdde03146100ae578063095ea7b3146100cc57806318160ddd146100ef57806323b872dd14610101578063313ce56714610114575b600080fd5b6100b66101c2565b6040516100c391906106be565b60405180910390f35b6100df6100da366004610728565b610254565b60405190151581526020016100c3565b6002545b6040519081526020016100c3565b6100df61010f366004610752565b61026e565b60405160ff7f00000000000000000000000000000000000000000000000000000000000000001681526020016100c3565b6100df610153366004610728565b610292565b6100f361016636600461078e565b6001600160a01b031660009081526020819052604090205490565b6100b66102b4565b6100df610197366004610728565b6102c3565b6100df6101aa366004610728565b610343565b6100f36101bd3660046107b0565b610351565b6060600380546101d1906107e3565b80601f01602080910402602001604051908101604052809291908181526020018280546101fd906107e3565b801561024a5780601f1061021f5761010080835404028352916020019161024a565b820191906000526020600020905b81548152906001019060200180831161022d57829003601f168201915b5050505050905090565b60003361026281858561037c565b60019150505b92915050565b60003361027c8582856104a0565b61028785858561051a565b506001949350505050565b6000336102628185856102a58383610351565b6102af919061081d565b61037c565b6060600480546101d1906107e3565b600033816102d18286610351565b9050838110156103365760405162461bcd60e51b815260206004820152602560248201527f45524332303a2064656372656173656420616c6c6f77616e63652062656c6f77604482015264207a65726f60d81b60648201526084015b60405180910390fd5b610287828686840361037c565b60003361026281858561051a565b6001600160a01b03918216600090815260016020908152604080832093909416825291909152205490565b6001600160a01b0383166103de5760405162461bcd60e51b8152602060048201526024808201527f45524332303a20617070726f76652066726f6d20746865207a65726f206164646044820152637265737360e01b606482015260840161032d565b6001600160a01b03821661043f5760405162461bcd60e51b815260206004820152602260248201527f45524332303a20617070726f766520746f20746865207a65726f206164647265604482015261737360f01b606482015260840161032d565b6001600160a01b0383811660008181526001602090815260408083209487168084529482529182902085905590518481527f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925910160405180910390a3505050565b60006104ac8484610351565b9050600019811461051457818110156105075760405162461bcd60e51b815260206004820152601d60248201527f45524332303a20696e73756666696369656e7420616c6c6f77616e6365000000604482015260640161032d565b610514848484840361037c565b50505050565b6001600160a01b03831661057e5760405162461bcd60e51b815260206004820152602560248201527f45524332303a207472616e736665722066726f6d20746865207a65726f206164604482015264647265737360d81b606482015260840161032d565b6001600160a01b0382166105e05760405162461bcd60e51b815260206004820152602360248201527f45524332303a207472616e7366657220746f20746865207a65726f206164647260448201526265737360e81b606482015260840161032d565b6001600160a01b038316600090815260208190526040902054818110156106585760405162461bcd60e51b815260206004820152602660248201527f45524332303a207472616e7366657220616d6f756e7420657863656564732062604482015265616c616e636560d01b606482015260840161032d565b6001600160a01b03848116600081815260208181526040808320878703905593871680835291849020805487019055925185815290927fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef910160405180910390a3610514565b600060208083528351808285015260005b818110156106eb578581018301518582016040015282016106cf565b506000604082860101526040601f19601f8301168501019250505092915050565b80356001600160a01b038116811461072357600080fd5b919050565b6000806040838503121561073b57600080fd5b6107448361070c565b946020939093013593505050565b60008060006060848603121561076757600080fd5b6107708461070c565b925061077e6020850161070c565b9150604084013590509250925092565b6000602082840312156107a057600080fd5b6107a98261070c565b9392505050565b600080604083850312156107c357600080fd5b6107cc8361070c565b91506107da6020840161070c565b90509250929050565b600181811c908216806107f757607f821691505b60208210810361081757634e487b7160e01b600052602260045260246000fd5b50919050565b8082018082111561026857634e487b7160e01b600052601160045260246000fdfea2646970667358221220c17385bf7b455298f3c99090105f4b3d07556cb9d4d4e4b5d0698f6fc8faf19264736f6c63430008100033";
    const abi = ["constructor(uint8 decimals_, address mintTo)"];
    const contractFactory = new ContractFactory(abi, erc20TokenBytecode, deployerWallet);
    const contract = await contractFactory.deploy(parseInt(argv.decimals), namedAccount(argv.mintTo).address);
    await contract.deployTransaction.wait();

    console.log("Contract deployed at address:", contract.address);

    argv.provider.destroy();
  },
};


export const sendL1Command = {
  command: "send-l1",
  describe: "sends funds between l1 accounts",
  builder: {
    ethamount: {
      string: true,
      describe: "amount to transfer (in eth)",
      default: "10",
    },
    from: {
      string: true,
      describe: "account (see general help)",
      default: "funnel",
    },
    to: {
      string: true,
      describe: "address (see general help)",
      default: "funnel",
    },
    wait: {
      boolean: true,
      describe: "wait for transaction to complete",
      default: false,
    },
    data: { string: true, describe: "data" },
  },
  handler: async (argv: any) => {
    argv.provider = new ethers.providers.WebSocketProvider(argv.l1url);

    await runStress(argv, sendTransaction);

    argv.provider.destroy();
  },
};

export const sendL2Command = {
  command: "send-l2",
  describe: "sends funds between l2 accounts",
  builder: {
    ethamount: {
      string: true,
      describe: "amount to transfer (in eth)",
      default: "10",
    },
    from: {
      string: true,
      describe: "account (see general help)",
      default: "funnel",
    },
    to: {
      string: true,
      describe: "address (see general help)",
      default: "funnel",
    },
    wait: {
      boolean: true,
      describe: "wait for transaction to complete",
      default: false,
    },
    data: { string: true, describe: "data" },
  },
  handler: async (argv: any) => {
    argv.provider = new ethers.providers.WebSocketProvider(argv.l2url);

    await runStress(argv, sendTransaction);

    argv.provider.destroy();
  },
};

export const sendL3Command = {
  command: "send-l3",
  describe: "sends funds between l3 accounts",
  builder: {
    ethamount: {
      string: true,
      describe: "amount to transfer (in eth)",
      default: "10",
    },
    from: {
      string: true,
      describe: "account (see general help)",
      default: "funnel",
    },
    to: {
      string: true,
      describe: "address (see general help)",
      default: "funnel",
    },
    wait: {
      boolean: true,
      describe: "wait for transaction to complete",
      default: false,
    },
    data: { string: true, describe: "data" },
  },
  handler: async (argv: any) => {
    argv.provider = new ethers.providers.WebSocketProvider(argv.l3url);

    await runStress(argv, sendTransaction);

    argv.provider.destroy();
  },
};

export const sendRPCCommand = {
    command: "send-rpc",
    describe: "sends rpc command",
    builder: {
        method: { string: true, describe: "rpc method to call", default: "eth_syncing" },
        url: { string: true, describe: "url to send rpc call", default: "http://sequencer:8547"},
        params: { array : true, describe: "array of parameter name/values" },
    },
    handler: async (argv: any) => {
        const rpcProvider = new ethers.providers.JsonRpcProvider(argv.url)

        await rpcProvider.send(argv.method, argv.params)
    }
}
