const { BigNumber, utils } = require("ethers");
const fs = require("fs");
const path = require("path");

const addressFile = "contract-addresses.json";

function getSavedContractAddresses() {
  let json;
  try {
    json = fs.readFileSync(path.join(__dirname, `../${addressFile}`));
  } catch (err) {
    json = "{}";
  }
  const addrs = JSON.parse(json);
  return addrs;
}

export const saveContractAddress = (
  network: string,
  contract: string,
  address: string
) => {
  const addrs = getSavedContractAddresses();
  addrs[network] = addrs[network] || {};
  addrs[network][contract] = address;

  fs.writeFileSync(
    path.join(__dirname, `../${addressFile}`),
    JSON.stringify(addrs, null, "    ")
  );
};
