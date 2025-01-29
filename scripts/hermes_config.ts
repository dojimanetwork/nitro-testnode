export interface HermesConfig {
    nodes: number;
    net: string;
    seed: string;
    hermesBlockTime: string;
    hardforkBlockHeight?: string;
    newGenesisTime?: string;
    tssP2pPort: number;
    p2pIdPort: number;
    peer?: string;
    pprofEnabled: boolean;
    arAddress: string;
    dotAddress: string;
    signerName: string;
    signerPasswd: string;
    solPubkey: string;
    solProgram: string;
    keyPassphrase: string;
    signerSeedPhrase: string;
    sprintDuration: number;
    chainHomeFolder: string;
    chainId: string;
    chainRpc: string;
    confPath: string;
}

export interface EthConfig {
    ethHost: string;
    ethInboundStateSender: string;
    ethRouterContract: string;
    ethAccPass: string;
}

export interface DojimaConfig {
    dojHost: string; // TODO: remove this from narada.sh first
    dojimaChainId: number;
    dojimaGrpcUrl: string;
    dojimaRpcUrl: string;
    dojimaSpanEnable: boolean;
    dojimaSpanPollInterval: string;
}

export interface NaradaConfig {
    chainApi: string;
    chainRpc: string;
    eddsaHost: string;
    blockScannerBackoff: string;
    httpAuthHost: string;
    httpAuthPort: string;
    includeEthChain: boolean;
    includeDojChain: boolean;
    includeAvaxChain: boolean;
    includeBinanceChain: boolean;
    includeBtcChain: boolean;
    includeArChain: boolean;
    includeDotChain: boolean;
    includeSolChain: boolean;
    includeGaiaChain: boolean;
    includeArtheraChain: boolean;
    preparam: string;
}