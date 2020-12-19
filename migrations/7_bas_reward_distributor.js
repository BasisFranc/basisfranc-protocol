const {basPools, INITIAL_XHFS_FOR_DAI_XHF, INITIAL_XHFS_FOR_DAI_XHFS} = require('./pools');

// Pools
// deployed first
const Share = artifacts.require('Share');
const InitialShareDistributor = artifacts.require('InitialShareDistributor');

// ============ Main Migration ============

async function migration(deployer, network, accounts) {
    const unit = web3.utils.toBN(10 ** 18);
    const totalBalanceForDAIXHF = unit.muln(INITIAL_XHFS_FOR_DAI_XHF);
    const totalBalanceForDAIXHFS = unit.muln(INITIAL_XHFS_FOR_DAI_XHFS);
    const totalBalance = totalBalanceForDAIXHF.add(totalBalanceForDAIXHFS);

    const share = await Share.deployed();

    const lpPoolDAIXHF = artifacts.require(basPools.DAIXHF.contractName);
    const lpPoolDAIXHFS = artifacts.require(basPools.DAIXHFS.contractName);

    await deployer.deploy(
        InitialShareDistributor,
        share.address,
        lpPoolDAIXHF.address,
        totalBalanceForDAIXHF.toString(),
        lpPoolDAIXHFS.address,
        totalBalanceForDAIXHFS.toString()
    );
    const distributor = await InitialShareDistributor.deployed();

    await share.mint(distributor.address, totalBalance.toString());
    console.log(`Deposited ${INITIAL_XHFS_FOR_DAI_XHF} XHFS to InitialShareDistributor.`);

    console.log(`Setting distributor to InitialShareDistributor (${distributor.address})`);
    await lpPoolDAIXHF.deployed().then((pool) => pool.setRewardDistribution(distributor.address));
    await lpPoolDAIXHFS.deployed().then((pool) => pool.setRewardDistribution(distributor.address));

    await distributor.distribute();
}

module.exports = migration;
