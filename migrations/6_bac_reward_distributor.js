const {bacPools, INITIAL_XHF_FOR_POOLS} = require('./pools');

// Pools
// deployed first
const Franc = artifacts.require('Franc');
const InitialFrancDistributor = artifacts.require('InitialFrancDistributor');

// ============ Main Migration ============

module.exports = async (deployer, network, accounts) => {
    const unit = web3.utils.toBN(10 ** 18);
    const initialFrancAmount = unit.muln(INITIAL_XHF_FOR_POOLS).toString();

    const franc = await Franc.deployed();
    const pools = bacPools.map(({contractName}) => artifacts.require(contractName));

    await deployer.deploy(
        InitialFrancDistributor,
        franc.address,
        pools.map((p) => p.address),
        initialFrancAmount
    );
    const distributor = await InitialFrancDistributor.deployed();

    console.log(`Setting distributor to InitialFrancDistributor (${distributor.address})`);
    for await (const poolInfo of pools) {
        const pool = await poolInfo.deployed();
        await pool.setRewardDistribution(distributor.address);
    }

    await franc.mint(distributor.address, initialFrancAmount);
    console.log(`Deposited ${INITIAL_XHF_FOR_POOLS} XHF to InitialFrancDistributor.`);

    await distributor.distribute();
};
