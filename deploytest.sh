#!/bin/bash
echo Starting deployment, please be patient..
stage1=`truffle migrate --network teststage1 --reset`
temp=${stage1##*xDaiProxyAddress}
xDaiProxyAddress=${temp:1:42}
temp=${stage1##*RCTreasuryAddress}
RCTreasuryAddress=${temp:1:42}
temp=${stage1##*RCFactoryAddress}
RCFactoryAddress=${temp:1:42}
temp=${stage1##*RCMarketAddress}
RCMarketAddress=${temp:1:42}
temp=${stage1##*NFTHubXDAIAddress}
NFTHubXDAIAddress=${temp:1:42}

echo Completed stage 1, Starting stage 2
stage2=`truffle migrate --network teststage2 --reset ${xDaiProxyAddress}`
temp2=${stage2##*TheMainnetProxyAddress}
mainnetProxyAddress=${temp2:1:42}
temp2=${stage2##*TheNFTHubMainnetAddress}
NFTHubMainnetAddress=${temp2:1:42}
echo Completed stage 2, Starting stage 3
stage3=`truffle migrate --network teststage3 --reset ${xDaiProxyAddress} ${mainnetProxyAddress}`


#Print out the xDai/sokol contract addresses
echo xDai Contracts
echo -----------------------------------
echo Treasury - $RCTreasuryAddress
echo Factory  - $RCFactoryAddress
echo Market   - $RCMarketAddress
echo xDaiProxy- $xDaiProxyAddress
echo NFT Hub  - $NFTHubXDAIAddress

#Print out the mainnet/kovan contract addresses
echo
echo Mainnet/Kovan Contracts
echo -----------------------------------
echo Mainnet Proxy  - $mainnetProxyAddress
echo NFT Hub mainnet- $NFTHubMainnetAddress

#Append it to the deployed contracts file
echo  >> DeployedContracts.txt
echo $(date +%d-%m-%Y-%H:%M:%S)                             >> DeployedContracts.txt
echo ------------------------------------------------------ >> DeployedContracts.txt
echo xDai Contracts                                         >> DeployedContracts.txt
echo ------------------------------------------------------ >> DeployedContracts.txt
echo Treasury  - $RCTreasuryAddress                         >> DeployedContracts.txt
echo Factory   - $RCFactoryAddress                          >> DeployedContracts.txt
echo Market    - $RCMarketAddress                           >> DeployedContracts.txt
echo xDaiProxy - $xDaiProxyAddress                          >> DeployedContracts.txt
echo NFT Hub   - $NFTHubXDAIAddress                         >> DeployedContracts.txt
echo ------------------------------------------------------ >> DeployedContracts.txt
echo Mainnet/Kovan Contracts                                >> DeployedContracts.txt
echo ------------------------------------------------------ >> DeployedContracts.txt
echo Mainnet Proxy   - $mainnetProxyAddress                 >> DeployedContracts.txt
echo NFT Hub Mainnet - $NFTHubMainnetAddress                >> DeployedContracts.txt


# keep the window open for a bit
echo "Press 'q' to exit"
count=0
while : ; do
read -n 1 k <&1
if [[ $k = q ]] ; then
echo "\nQuitting from the program\n"
break
else
((count=$count+1))
echo "\nIterate for $count times\n"
echo "Press 'q' to exit"
fi
done