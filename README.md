# Basis Franc

[![Twitter Follow](https://img.shields.io/twitter/follow/basisfranc?label=Follow)](https://twitter.com/basisfranc)
[![License](https://img.shields.io/github/license/Basis-franc/basisfrancprotocol)](https://github.com/BasisFranc/basisfranc-protocol/blob/master/LICENSE)
[![Coverage Status](https://coveralls.io/repos/github/Basis-Franc/basisfranc-protocol/badge.svg?branch=master)](https://coveralls.io/github/Basis-Franc/basisfranc-protocol?branch=master)

Basis Franc is a lightweight implementation of the [Basis Protocol](basis.io).

## Contract Addresses
| Contract  | Address |
| ------------- | ------------- |
| Basis Franc (XHF) | [0xxxx](https://etherscan.io/token/0xxx) |
| Basis Franc Share (XHFS) | [0xxxx](https://xxx) |
| Basis Franc Bond (XHFB) | [0xxxx](https://xxx) |
| Stables Farming Pool | [0xxxx](https://xxx#code) |
| Timelock 24h | [xxx](https://xxx#code) |

### DiffChecker
[Diff checker: BasisDollar and BasisFranc](https://www.diffchecker.com/XXX)

[Diff checker: MasterChef (Sushiswap) and StablesPool](https://www.diffchecker.com/XXX)


## History of Basis

Basis (basecoin) is an algorithmic stablecoin protocol where the money supply is dynamically adjusted to meet changes in money demand.  

- When demand is rising, the blockchain will create more Basis Franc. The expanded supply is designed to bring the Basis price back down.
- When demand is falling, the blockchain will buy back Basis Franc. The contracted supply is designed to restore Basis price.
- The Basis protocol is designed to expand and contract supply similarly to the way central banks buy and sell fiscal debt to stabilize purchasing power. For this reason, we refer to Basis Franc as having an algorithmic central bank.

Read the [Basis.io Whitepaper](http://basis.io/basis_whitepaper_en.pdf) for more details into the protocol.

Basis was shut down in 2018, due to regulatory concerns its Bond and Share tokens have security characteristics. The project team opted for compliance, and shut down operations, returned money to investors and discontinued development of the project.

## The Basis Franc Protocol

Basis Franc differs from the original Basis Project in several meaningful ways:

1. **Rationally simplified** - several core mechanisms of the Basis protocol has been simplified, especially around bond issuance and seigniorage distribution. We've thought deeply about the tradeoffs for these changes, and believe they allow significant gains in UX and contract simplicity, while preserving the intended behavior of the original monetary policy design.
2. **Censorship resistant** -.
3. **Fairly distributed** - both Basis Franc Shares and Basis Franc has no premine and no VC - community members can earn the initial supply of both assets by helping to contribute to bootstrap liquidity & adoption of Basis Franc.

### A Three-token System

There exists three types of assets in the Basis Franc system.

- **Basis Franc ($XHF)**: a stablecoin, which the protocol aims to keep value-pegged to 1 Swiss Franc.
- **Basis Franc Bonds ($XHFB)**: IOUs issued by the system to buy back Basis Franc when price($XHF) < $1. Bonds are sold at a meaningful discount to price($XHF), and redeemed at 1CHF when price($XHF) normalizes to 1CHF.
- **Basis Franc Shares ($XHFS)**: receives surplus seigniorage (seigniorage left remaining after all the bonds have been redeemed).

### Stability Mechanism

- **Contraction**: When the price($XHF) < (1CHF - epsilon), users can trade in $XHF for $XHFB at the XHFBXHF exchange rate of price($XHF). This allows bonds to be always sold at a discount to franc during a contraction.
- **Expansion**: When the price($XHF) > (1CHF + epsilon), users can trade in 1 $XHFB for 1 $XHF. This allows bonds to be redeemed always at a premium to the purchase price.
- **Seigniorage Allocation**: If there are no more bonds to be redeemed, (i.e. bond Supply is negligibly small), more $XHF is minted totalSupply($XHF) * (price($XHF) - 1), and placed in a pool for $XHFS holders to claim pro-rata in a 24 hour period.

Read  [Basis Dollar Documentation](docs.basisfranc.fi) for more details.

## How to Contribute

To chat with us & stay up to date, join our [Telegram](https://t.me/basisfranc).

Contribution guidelines are [here](./CONTRIBUTING.md)

For security concerns, please submit an issue [here](https://github.com/Basis-Franc/basisfranc-contracts/issues/new).

## Disclaimer

Use at your own risk. This product is 100% experimental.

There is a real possibility that a user could lose ALL of their crypto. Basis Franc team assumes no responsibility for loss of funds.

_© Copyright 2020, Basis Franc_
