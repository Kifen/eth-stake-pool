import { task } from "hardhat/config";
import ContractAddresses from "../contract-addresses.json";
import { provider } from "./utils";

task(
  "get-ethpool-balance",
  "Query EthPool ETH balance",
  async (taskArgs, hre) => {
    const networkName = hre.network.name;
    const Provider = provider();

    const contractAddresses: any = ContractAddresses;
    const ethPoolAddress = contractAddresses[networkName]["EthPool"];

    const balanceInWei = await Provider.getBalance(ethPoolAddress);
    console.log(
      `EthPool ETH Balance: ${hre.ethers.utils.formatEther(balanceInWei)}`
    );
  }
);
