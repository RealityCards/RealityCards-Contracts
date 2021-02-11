#!/bin/bash
stage1=`truffle migrate --network teststage1 --reset`
temp=${stage1##*xDaiProxyAddress}
xDaiProxyAddress=${temp:1:42}
temp=${stage1##*RCTreasuryAddress}
RCTreasuryAddress=${temp:1:42}
temp=${stage1##*RCFactoryAddress}
RCFactoryAddress=${temp:1:42}

echo Here is the xDai Proxy address:
echo $xDaiProxyAddress
stage2=`truffle migrate --network teststage2 --reset ${xDaiProxyAddress}`
temp=${stage2##*MainnetProxyAddress}
mainnetProxyAddress=${temp:1:42}
echo $mainnetProxyAddress
stage3=`truffle migrate --network teststage3 --reset ${xDaiProxyAddress} ${mainnetProxyAddress}`

#Print out the xDai/sokol contract addresses
echo xDai Contracts
echo -----------------------------------
echo Treasury Address
echo $RCTreasuryAddress
echo Factory Address
echo $RCFactoryAddress

#Print out the mainnet/kovan contract addresses
echo
echo Mainnet/Kovan Contracts
echo -----------------------------------
echo Mainnet Proxy Address
echo $mainnetProxyAddress

# keep the window open for a bit
echo "Press 'q' to exit"
count=0
while : ; do
read -n 1 k <&1
if [[ $k = q ]] ; then
printf "\nQuitting from the program\n"
break
else
((count=$count+1))
printf "\nIterate for $count times\n"
echo "Press 'q' to exit"
fi
done