

# Eth-Stake-Pool

Eth-Stake-Pool is an implementation of an Eth staking contract. Deployment addresses can be found at [contract-addresses.json](https://github.com/Kifen/eth-stake-pool/blob/main/contract-addresses.json) and code has been verified on [etherscan](https://rinkeby.etherscan.io/address/0xBc70c3039152dD83d2d4517996c0D7f2A74d70d8#code).


### Build and Run
```
$ git clone git@github.com:Kifen/eth-stake-pool.git
$ cd eth-stake-pool
$ npm install
```

Create file `.env` using below [template](https://github.com/Kifen/eth-stake-pool/blob/main/.env.example):

```
PRIVATE_KEY= 
RINKEBY_URL=
ETHERSCAN_API_KEY=
```

To run test, `npm run test`

### Query
- query contract Eth balance: `npx hardhat get-ethpool-balance --network <network>`

