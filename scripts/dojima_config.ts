export interface DojimaConfig {
    dojHost: string; // TODO: remove this from narada.sh first
    dojimaChainId: number;
    dojimaGrpcUrl: string;
    dojimaRpcUrl: string;
    dojimaSpanEnable: boolean;
    dojimaSpanPollInterval: string;
}
