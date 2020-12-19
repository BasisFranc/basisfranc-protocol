import chai, {expect} from 'chai';
import {ethers} from 'hardhat';
import {solidity} from 'ethereum-waffle';
import {Contract, ContractFactory, BigNumber, utils} from 'ethers';
import {Provider} from '@ethersproject/providers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';

import { advanceBlock, advanceTimeAndBlock } from './shared/utilities';

chai.use(solidity);

const DAY = 86400;
const ETH = utils.parseEther('1');
const ZERO = BigNumber.from(0);
const ZERO_ADDR = '0x0000000000000000000000000000000000000000';
const INITIAL_AMOUNT = utils.parseEther('1000');
const MAX_UINT256 = '0xffffffffffffffffffffffffffffffffffffffff';

async function latestBlocktime(provider: Provider): Promise<number> {
    const {timestamp} = await provider.getBlock('latest');
    return timestamp;
}

async function latestBlocknumber(provider: Provider): Promise<number> {
    return await provider.getBlockNumber();
}

describe('StablesPool', () => {
    const {provider} = ethers;

    let operator: SignerWithAddress;
    let bob: SignerWithAddress;
    let carol: SignerWithAddress;
    let david: SignerWithAddress;

    before('provider & accounts setting', async () => {
        [operator, bob, carol, david] = await ethers.getSigners();
    });

    // core
    let StablesPool: ContractFactory;
    let Franc: ContractFactory;
    let MockERC20: ContractFactory;

    before('fetch contract factories', async () => {
        StablesPool = await ethers.getContractFactory('StablesPool');
        Franc = await ethers.getContractFactory('Franc');
        MockERC20 = await ethers.getContractFactory('MockERC20');
    });

    let pool: Contract;
    let franc: Contract;
    let dai: Contract;
    let usdc: Contract;
    let usdt: Contract;
    let xchf: Contract;
    let bac: Contract;

    let startBlock: BigNumber;

    before('deploy contracts', async () => {
        franc = await Franc.connect(operator).deploy();
        dai = await MockERC20.connect(operator).deploy('Dai Stablecoin', 'DAI', 18);
        usdc = await MockERC20.connect(operator).deploy('USD Circle', 'USDC', 6);
        usdt = await MockERC20.connect(operator).deploy('Tether', 'USDT', 6);
        xchf = await MockERC20.connect(operator).deploy('CryptoFranc', 'XCHF', 18);
        bac = await MockERC20.connect(operator).deploy('Basis Cash', 'BAC', 18);

        startBlock = BigNumber.from(await latestBlocknumber(provider)).add(4);
        pool = await StablesPool.connect(operator).deploy(franc.address, startBlock, [xchf.address, usdc.address, usdt.address, xchf.address, bac.address]);

        await franc.connect(operator).distributeReward(pool.address);

        for await (const user of [bob, carol, david]) {
            await dai.connect(operator).mint(user.address, INITIAL_AMOUNT);
            await usdc.connect(operator).mint(user.address, '1000000000');
            await usdt.connect(operator).mint(user.address, '1000000000');
            await xchf.connect(operator).mint(user.address, INITIAL_AMOUNT);
            await bac.connect(operator).mint(user.address, INITIAL_AMOUNT);

            for await (const token of [dai, usdc, usdt, xchf, bac]) {
                await token.connect(user).approve(pool.address, MAX_UINT256);
            }
        }
    });

    describe('#constructor', () => {
        it('should works correctly', async () => {
            expect(String(await pool.startBlock())).to.eq('10');
            expect(String(await pool.epochEndBlocks(3))).to.eq('186010');
            expect(String(await pool.epochXhfPerBlock(0))).to.eq('4301075268817204301'); // 4.301075268817204301
            expect(String(await pool.epochXhfPerBlock(1))).to.eq('3225806451612903225'); // 3.225806451612903225
            expect(String(await pool.epochXhfPerBlock(2))).to.eq('2150537634408602150'); // 2.150537634408602150
            expect(String(await pool.epochXhfPerBlock(3))).to.eq('1075268817204301075'); // 1.075268817204301075
            expect(String(await pool.epochXhfPerBlock(4))).to.eq('0');
            expect(String(await pool.getGeneratedReward(10, 11))).to.eq('4301075268817204301');
            expect(String(await pool.getGeneratedReward(20, 30))).to.eq('43010752688172043010');
            expect(String(await pool.getGeneratedReward(186009, 186019))).to.eq('1075268817204301075');
        });
    });

    describe('#deposit/withdraw', () => {
        it('bob deposit 10 DAI', async () => {
            await expect(async () => {
                await pool.connect(bob).deposit(0, utils.parseEther('10'));
            }).to.changeTokenBalances(dai, [bob, pool], [utils.parseEther('-10'), utils.parseEther('10')]);
        });

        it('carol deposit 20 DAI and 10 USDT', async () => {
            let _beforeUSDT = await usdt.balanceOf(carol.address);
            await expect(async () => {
                await pool.connect(carol).deposit(0, utils.parseEther('20'));
                await pool.connect(carol).deposit(2, '10000000');
            }).to.changeTokenBalances(dai, [carol, pool], [utils.parseEther('-20'), utils.parseEther('20')]);
            let _afterUSDT = await usdt.balanceOf(carol.address);
            expect(_beforeUSDT.sub(_afterUSDT)).to.eq('10000000');
        });

        it('david deposit 10 DAI and 10 BAC', async () => {
            await expect(async () => {
                await pool.connect(david).deposit(0, utils.parseEther('10'));
                await pool.connect(david).deposit(4, utils.parseEther('10'));
            }).to.changeTokenBalances(bac, [david, pool], [utils.parseEther('-10'), utils.parseEther('10')]);
        });

        it('pendingBasisFranc()', async () => {
            await advanceBlock(provider);
            expect(await pool.pendingBasisFranc(0, bob.address)).to.eq(utils.parseEther('1.863799283154121860'));
            expect(await pool.pendingBasisFranc(2, bob.address)).to.eq(utils.parseEther('0'));
            expect(await pool.pendingBasisFranc(0, carol.address)).to.eq(utils.parseEther('2.007168458781362000'));
            expect(await pool.pendingBasisFranc(2, carol.address)).to.eq(utils.parseEther('2.580645161290322580'));
            expect(await pool.pendingBasisFranc(0, david.address)).to.eq(utils.parseEther('0.430107526881720430'));
            expect(await pool.pendingBasisFranc(2, david.address)).to.eq(utils.parseEther('0'));
            expect(await pool.pendingBasisFranc(4, david.address)).to.eq(utils.parseEther('0.860215053763440860'));
        });

        it('carol withdraw 20 DAI', async () => {
            await advanceBlock(provider);
            await expect(pool.connect(carol).withdraw(0, utils.parseEther('20.01'))).to.revertedWith('withdraw: not good');
            let _beforeDAI = await dai.balanceOf(carol.address);
            await expect(async () => {
                await pool.connect(carol).withdraw(0, utils.parseEther('20'));
            }).to.changeTokenBalances(franc, [carol, pool], [utils.parseEther('3.297491039426523280'), utils.parseEther('-3.297491039426523280')]);
            let _afterDAI = await dai.balanceOf(carol.address);
            expect(_afterDAI.sub(_beforeDAI)).to.eq(utils.parseEther('20'));
        });
    });
});
