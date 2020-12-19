const Distributor = artifacts.require('Distributor');
const InitialFrancDistributor = artifacts.require('InitialFrancDistributor');
const InitialShareDistributor = artifacts.require('InitialShareDistributor');

module.exports = async (deployer, network, accounts) => {
    const distributors = await Promise.all([InitialFrancDistributor, InitialShareDistributor].map((distributor) => distributor.deployed()));

    await deployer.deploy(
        Distributor,
        distributors.map((contract) => contract.address)
    );
    const distributor = await Distributor.deployed();

    console.log(`Distributor manager contract is ${distributor.address}`);
};
