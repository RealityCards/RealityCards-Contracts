var NftHubL2 = artifacts.require('./nfthubs/RCNftHubL2.sol');
var GloryPass = artifacts.require('./mockups/GloryPassMockup.sol');

module.exports = async (deployer, network, accounts) => {
  await deployer.deploy(GloryPass, 'GloryPass', 'GLP');
  gloryPass = await GloryPass.deployed();
  await deployer.deploy(
    NftHubL2,
    '0x3C4F1F18Afa3993BFD2Eee5AcD3a033Aee65D594',
    gloryPass.address
  );
  nftHubL2 = await NftHubL2.deployed();
  console.log(gloryPass.address, nftHubL2.address);
};
