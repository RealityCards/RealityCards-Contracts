#!/bin/bash

###################
#### Setup ########
###################
START_TIME="1625598000"
END_TIME="1625630400"
SPONSORSHIP="0"
ARTIST="0x9d69B2E8036459c3be4601F842489BE231dfAD47"
EVENT_NAME="Who will win the Milwaukee Bucks vs. Phoenix Suns game?"
ORACLE_QUESTION="Who won the match between the Milwaukee Bucks and Phoenix Suns on July 6th?"
SRC_NAME="bucksun"
CATEGORY="Sports"
SLUG="bucksun"
IMAGE_FORMAT=".gif"
NUMBER_OF_CARDS="2"
CARD0="Milwaukee Bucks"
CARD1="Phoenix Suns"
CARD2="Draw/Tie"
CARD3="Italy"
CARD4="Czech Republic"
CARD5="Denmark"
CARD6="Ukraine"
CARD7="England"
CARD8="Tie/Draw"
AFFILIATE=""
CARD_AFFILIATE0=""
CARD_AFFILIATE1=""
CARD_AFFILIATE2=""
CARD_AFFILIATE3=""
CARD_AFFILIATE4=""
CDN="https://cdn.realitycards.io/"
IMAGES="images/"
NFT="nftmetadata/"
ZERO_ADDRESS="0x0000000000000000000000000000000000000000"
##################

mkdir -p events/$SRC_NAME
eventJSON='{\n  "name": "'$EVENT_NAME'",'
eventJSON=$eventJSON'\n  "slug": "'$SLUG'",'
eventJSON=$eventJSON'\n  "category": "'$CATEGORY'",'
eventJSON=$eventJSON'\n  "cards": {'
for ((i=0;i<$NUMBER_OF_CARDS;i++))
do
    card='CARD'$i
    eventJSON=$eventJSON'\n    "'$i'": {'
    eventJSON=$eventJSON'\n      "image": "'$CDN$IMAGES$SRC_NAME'/'${!card// /-}$IMAGE_FORMAT'",'
    eventJSON=$eventJSON'\n      "name": "'${!card}'"'
    if [ $i -lt "$(($NUMBER_OF_CARDS-1))" ]
    then
        eventJSON=$eventJSON'\n    },'
    else
        eventJSON=$eventJSON'\n    }'
    fi
done
eventJSON=$eventJSON'\n  }'
eventJSON=$eventJSON'\n}'

echo -e "$eventJSON" > events/$SRC_NAME/event.json

# now make the token.json files

for ((i=0;i<$NUMBER_OF_CARDS;i++))
do
card='CARD'$i
cardJSON='{\n  "name": "'${!card}'",'
cardJSON=$cardJSON'\n  "description": "This token represents a stake in the outcome '"'"$EVENT_NAME"'"
cardJSON=$cardJSON' at Reality Cards, the planet'"'"'s first NFT-based prediction market",'
cardJSON=$cardJSON'\n  "image": "'$CDN$IMAGES$SRC_NAME'/'${!card// /-}$IMAGE_FORMAT'",'
cardJSON=$cardJSON'\n  "affiliation": "Reality Cards"'
cardJSON=$cardJSON'\n}'

echo -e "$cardJSON" > events/$SRC_NAME/token$i.json
done

### BUILD THE CONFIG JSON ###

# get the ipfs hash
ipfscommand=$(curl -s -F file=@events/$SRC_NAME/event.json "https://api.thegraph.com/ipfs/api/v0/add")
temp=${ipfscommand##*Hash}
ipfs_hash=${temp:3:46}

# check for zero addresses
if [ "$ARTIST" == "" ];then
    ARTIST=$ZERO_ADDRESS
    echo WARNING: ARTIST ADDRESS NOT SET
fi
if [ "$AFILLIATE" == "" ];then
    AFILLIATE=$ZERO_ADDRESS
    echo WARNING: AFILLIATE ADDRESS NOT SET
fi

AFILLIATE_ARRAY='['
for ((i=0;i<$NUMBER_OF_CARDS;i++))
do
affiliate='CARD_AFFILIATE'$i
AFILLIATE_ARRAY=$AFILLIATE_ARRAY'"'${!affiliate}'"'
if [ "${!affiliate}" == "" ];then
    AFILLIATE_ARRAY='["'$ZERO_ADDRESS'"]'
    echo WARNING: AFFILIATE ARRAY EMPTY
    break
fi
if [ $i -lt "$(($NUMBER_OF_CARDS-1))" ];then
        AFILLIATE_ARRAY=$AFILLIATE_ARRAY','
    else
        AFILLIATE_ARRAY=$AFILLIATE_ARRAY']'
    fi
done

#build oracle question and token URIs (both based on card numbers)
ORACLE_QUESTION=$ORACLE_QUESTION'␟'
TOKEN_URIS='['
for ((i=0;i<$NUMBER_OF_CARDS;i++))
do
card='CARD'$i
ORACLE_QUESTION=$ORACLE_QUESTION'\"'${!card}'\"'
TOKEN_URIS=$TOKEN_URIS'"'$CDN$NFT$SRC_NAME'/token'$i'.json"'
if [ $i -lt "$(($NUMBER_OF_CARDS-1))" ]
    then
        ORACLE_QUESTION=$ORACLE_QUESTION','
        TOKEN_URIS=$TOKEN_URIS','
    else
        ORACLE_QUESTION=$ORACLE_QUESTION'␟'
        TOKEN_URIS=$TOKEN_URIS']'
    fi
done
ORACLE_QUESTION=$ORACLE_QUESTION${CATEGORY}'␟en_US'

NOW=$(date)
EPOCH=$(TZ=UTC date "+%s")
if [ $END_TIME -lt $START_TIME ];then
    echo WARNING: ENDING BEFORE STARTING
fi
if [ $START_TIME -lt $EPOCH ]; then
    echo WARNING: START TIME BEFORE NOW
else
    OFFSET=$((START_TIME - EPOCH))
    if [ $OFFSET -lt 120 ];then
        echo STARTING IN $OFFSET SECONDS 
    else
        OFFSET=$(( OFFSET / 60 ))
        if [ $OFFSET -lt 120 ];then
            echo STARTING IN $OFFSET MINUTES 
        else
            OFFSET=$(( OFFSET / 60 ))
            echo STARTING IN $OFFSET HOURS 
        fi
    fi
fi
if [ $END_TIME -lt $EPOCH ]; then
    echo WARNING: END TIME BEFORE NOW
else
    OFFSET=$((END_TIME - EPOCH))
    if [ $OFFSET -lt 120 ];then
        echo ENDING IN $OFFSET SECONDS 
    else
        OFFSET=$(( OFFSET / 60 ))
        if [ $OFFSET -lt 120 ];then
            echo ENDING IN $OFFSET MINUTES 
        else
            OFFSET=$(( OFFSET / 60 ))
            echo ENDING IN $OFFSET HOURS 
        fi
    fi
fi

CONFIG='{\n  "start": "'${START_TIME}'",'
CONFIG=$CONFIG'\n  "end": "'${END_TIME}'",'
CONFIG=$CONFIG'\n  "oracle": "'${ORACLE_QUESTION}'",'
CONFIG=$CONFIG'\n  "ipfs": "'${ipfs_hash}'",'
CONFIG=$CONFIG'\n  "artist": "'${ARTIST}'",'
CONFIG=$CONFIG'\n  "sponsorship": "'${SPONSORSHIP}'",'
CONFIG=$CONFIG'\n  "tokenURIs": '${TOKEN_URIS}','
CONFIG=$CONFIG'\n  "affiliate": "'${AFILLIATE}'",'
CONFIG=$CONFIG'\n  "cardAffiliates": '${AFILLIATE_ARRAY}','
CONFIG=$CONFIG'\n  "cards": "'${NUMBER_OF_CARDS}'",'
CONFIG=$CONFIG'\n  "dateCreated": "'${NOW}'"'
CONFIG=$CONFIG'\n}'

echo -e "$CONFIG" > events/$SRC_NAME/config.json