import { BigNumber, utils, Signer } from "ethers";

export const parseBN = (value: string): BigNumber => {
  return utils.parseEther(value);
};

export type Account = {
  signer: Signer;
  address: string;
};
