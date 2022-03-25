import { BigNumber, utils, Signer } from "ethers";

const DECIMALS = BigNumber.from(10).pow(18);

export const parseBN = (value: string): BigNumber => {
  return utils.parseEther(value);
};

export const calculateAccountReward = (
  reward: BigNumber,
  deposit: BigNumber,
  totalDeposits: BigNumber
): BigNumber => {
  const poolShare = deposit.mul(DECIMALS).div(totalDeposits);
  return poolShare.mul(reward).div(DECIMALS);
};
