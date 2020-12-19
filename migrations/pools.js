// https://docs.basisfranc.fi/mechanisms/yield-farming
const INITIAL_XHF_FOR_POOLS = 50000;
const INITIAL_XHFS_FOR_DAI_XHF = 750000;
const INITIAL_XHFS_FOR_DAI_XHFS = 250000;

const POOL_START_DATE = Date.parse('2020-11-30T00:00:00Z') / 1000;

const bacPools = [
    {contractName: 'XHFDAIPool', token: 'DAI'},
    {contractName: 'XHFSUSDPool', token: 'SUSD'},
    {contractName: 'XHFUSDCPool', token: 'USDC'},
    {contractName: 'XHFUSDTPool', token: 'USDT'},
    {contractName: 'XHFyCRVPool', token: 'yCRV'},
];

const basPools = {
    DAIXHF: {contractName: 'DAIXHFLPTokenSharePool', token: 'DAI_XHF-LPv2'},
    DAIXHFS: {contractName: 'DAIXHFSLPTokenSharePool', token: 'DAI_XHFS-LPv2'},
};

module.exports = {
    POOL_START_DATE,
    INITIAL_XHF_FOR_POOLS,
    INITIAL_XHFS_FOR_DAI_XHF,
    INITIAL_XHFS_FOR_DAI_XHFS,
    bacPools,
    basPools,
};
