#!/bin/bash

###################
#### Setup ########
###################
START_TIME=""
END_TIME=""
SPONSORSHIP="0"
ARTIST_NAME=""
ARTIST_ADDRESS=""
ARTIST_LINK=""
EVENT_NAME=""
ORACLE_QUESTION=""
DESCRIPTION=''
SRC_NAME=""
SLUG=""
CATEGORY="Other"
US_ALLOWED="true"
IMAGE_FORMAT=".png"
NUMBER_OF_CARDS=""
CARD0=""
CARD1=""
CARD2=""
CARD3=""
CARD4=""
CARD5=""
CARD6=""
GIVEAWAY_TYPE=""
GIVEAWAY_TEXT=""
AFFILIATE=""
CARD_AFFILIATE0=""
CARD_AFFILIATE1=""
CARD_AFFILIATE2=""
CARD_AFFILIATE3=""
CARD_AFFILIATE4=""
CDN="https://cdn.realitycards.io/"
IMAGES="V1/"
NFT="V1/"
ZERO_ADDRESS="0x0000000000000000000000000000000000000000"
##################

# remove quotation marks (replace with apostophies)
DESCRIPTION=${DESCRIPTION//\"/\'}
# remove newlines
DESCRIPTION=${DESCRIPTION//$'\n'/}

mkdir -p events/$SRC_NAME
eventJSON='{\n  "name": "'$EVENT_NAME'",'
eventJSON=$eventJSON'\n  "slug": "'$SLUG'",'
if [ "$ARTIST_LINK" == "" ];then
    echo WARNING: ARTIST LINK NOT SET
else
    eventJSON=$eventJSON'\n  "artistLink": "'$ARTIST_LINK'",'
fi
if [ "$ARTIST_NAME" == "" ];then
    echo WARNING: ARTIST NAME NOT SET
else
    eventJSON=$eventJSON'\n  "artistName": "'$ARTIST_NAME'",'
fi
eventJSON=$eventJSON'\n  "category": "'$CATEGORY'",'
eventJSON=$eventJSON'\n  "US_allowed": "'$US_ALLOWED'",'
eventJSON=$eventJSON'\n  "description": "'$DESCRIPTION'",'
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
if [ "$GIVEAWAY_TEXT" == "" ];then
    if [ "$GIVEAWAY_TYPE" == "" ];then
        echo NO GIVEAWAY TYPE SET
eventJSON=$eventJSON'\n  }'
    fi
else
eventJSON=$eventJSON'\n  },'
    eventJSON=$eventJSON'\n  "giveaway": {'
    eventJSON=$eventJSON'\n  "type": "'$GIVEAWAY_TYPE'",'
    eventJSON=$eventJSON'\n  "text": "'$GIVEAWAY_TEXT'"'
    eventJSON=$eventJSON'\n  }'
fi
eventJSON=$eventJSON'\n}'

echo -e "$eventJSON" > events/$SRC_NAME/event.json

## now make the token.json files ##
TOKEN_URIS='['

for ((j=0;j<5;j++))
do

case "$j" in
0) cardType="OG-Neutral" ;;
1) cardType="OG-Winner" ;;
2) cardType="OG-Loser" ;;
3) cardType="Print-Winner" ;;
4) cardType="Print-Loser" ;;
esac


    for ((i=0;i<$NUMBER_OF_CARDS;i++))
    do
    card='CARD'$i
    cardJSON='{\n  "name": "'${!card}'",'
    cardJSON=$cardJSON'\n  "description": "This token represents a stake in the outcome '"'"$EVENT_NAME"'"
    cardJSON=$cardJSON' at Reality Cards, the planet'"'"'s first NFT-based prediction market",'
    cardJSON=$cardJSON'\n  "image": "'$CDN$IMAGES$SRC_NAME'/'${!card// /-}$IMAGE_FORMAT'",'
    cardJSON=$cardJSON'\n  "affiliation": "Reality Cards",'
    cardJSON=$cardJSON'\n  "cardType": "'$cardType'",'
    cardJSON=$cardJSON'\n  "attributes": [ '
    cardJSON=$cardJSON'\n    {'
    cardJSON=$cardJSON'\n      "display_type": "date",'
    cardJSON=$cardJSON'\n      "trait_type": "Event Start",'
    cardJSON=$cardJSON'\n      "value": '$START_TIME
    cardJSON=$cardJSON'\n    },'
    cardJSON=$cardJSON'\n    {'
    cardJSON=$cardJSON'\n      "display_type": "date",'
    cardJSON=$cardJSON'\n      "trait_type": "Event End",'
    cardJSON=$cardJSON'\n      "value": '$END_TIME
    cardJSON=$cardJSON'\n    }'
    cardJSON=$cardJSON'\n  ],'
    cardJSON=$cardJSON'\n  "external_url": "https://beta.realitycards.io/cards/'$SLUG'/'$i'"'
    cardJSON=$cardJSON'\n}'

    # save locally 
    echo -e "$cardJSON" > events/$SRC_NAME/token$i-$cardType.json
    done

    # save to IPFS
    for ((i=0;i<$NUMBER_OF_CARDS;i++))
    do

        ipfscommand=$(curl -s -F file=@events/$SRC_NAME/token$i-$cardType.json "https://api.thegraph.com/ipfs/api/v0/add")
        temp=${ipfscommand##*Hash}
        ipfs_hash=${temp:3:46}

        TOKEN_URIS=$TOKEN_URIS'"ipfs://'$ipfs_hash'"'
        if [ $j -lt 4 ]
        then
            TOKEN_URIS=$TOKEN_URIS','
        else
            if [ $i -lt "$(($NUMBER_OF_CARDS-1))" ]
                then
                    TOKEN_URIS=$TOKEN_URIS','
                else
                    TOKEN_URIS=$TOKEN_URIS']'
            fi
        fi
    done
done

### BUILD THE CONFIG JSON ###

# get the ipfs hash
ipfscommand=$(curl -s -F file=@events/$SRC_NAME/event.json "https://api.thegraph.com/ipfs/api/v0/add")
temp=${ipfscommand##*Hash}
ipfs_hash=${temp:3:46}

# check for zero addresses
if [ "$ARTIST_ADDRESS" == "" ];then
    ARTIST_ADDRESS=$ZERO_ADDRESS
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
    AFILLIATE_ARRAY='[]'
    echo WARNING: AFFILIATE ARRAY EMPTY
    break
fi
if [ $i -lt "$(($NUMBER_OF_CARDS-1))" ];then
        AFILLIATE_ARRAY=$AFILLIATE_ARRAY','
    else
        AFILLIATE_ARRAY=$AFILLIATE_ARRAY']'
    fi
done

#build oracle question 
ORACLE_QUESTION=$ORACLE_QUESTION'␟'
for ((i=0;i<$NUMBER_OF_CARDS;i++))
do
card='CARD'$i
ORACLE_QUESTION=$ORACLE_QUESTION'\"'${!card}'\"'
if [ $i -lt "$(($NUMBER_OF_CARDS-1))" ]
    then
        ORACLE_QUESTION=$ORACLE_QUESTION','
    else
        ORACLE_QUESTION=$ORACLE_QUESTION'␟'
    fi
done
ORACLE_QUESTION=$ORACLE_QUESTION${CATEGORY}'␟en_US'

EPOCH=$(TZ=UTC date "+%s")
START_DATE=$(TZ=UTC date --date "Jan 1, 1970 00:00:00 +0000 + ${START_TIME} seconds")
END_DATE=$(TZ=UTC date --date "Jan 1, 1970 00:00:00 +0000 + ${END_TIME} seconds")
if [ $END_TIME -lt $START_TIME ];then
    echo WARNING: ENDING BEFORE STARTING
fi
if [ $START_TIME -lt $EPOCH ]; then
    echo WARNING: START TIME BEFORE NOW
else
    OFFSET=$((START_TIME - EPOCH))
    if [ $OFFSET -lt 120 ];then
        echo STARTING IN $OFFSET SECONDS on ${START_DATE} UTC
    else
        OFFSET=$(( OFFSET / 60 ))
        if [ $OFFSET -lt 120 ];then
            echo STARTING IN $OFFSET MINUTES on ${START_DATE} UTC
        else
            OFFSET=$(( OFFSET / 60 ))
            echo STARTING IN $OFFSET HOURS on ${START_DATE} UTC
        fi
    fi
fi
if [ $END_TIME -lt $EPOCH ]; then
    echo WARNING: END TIME BEFORE NOW
else
    OFFSET=$((END_TIME - EPOCH))
    if [ $OFFSET -lt 120 ];then
        echo ENDING IN $OFFSET SECONDS on ${END_DATE} UTC
    else
        OFFSET=$(( OFFSET / 60 ))
        if [ $OFFSET -lt 120 ];then
            echo ENDING IN $OFFSET MINUTES on ${END_DATE} UTC
        else
            OFFSET=$(( OFFSET / 60 ))
            echo ENDING IN $OFFSET HOURS on ${END_DATE} UTC
        fi
    fi
fi

CONFIG='{\n  "start": "'${START_TIME}'",'
CONFIG=$CONFIG'\n  "end": "'${END_TIME}'",'
CONFIG=$CONFIG'\n  "slug": "'$SLUG'",'
CONFIG=$CONFIG'\n  "oracle": "'${ORACLE_QUESTION}'",'
CONFIG=$CONFIG'\n  "ipfs": "'${ipfs_hash}'",'
CONFIG=$CONFIG'\n  "artist": "'${ARTIST_ADDRESS}'",'
CONFIG=$CONFIG'\n  "sponsorship": "'${SPONSORSHIP}'",'
CONFIG=$CONFIG'\n  "tokenURIs": '${TOKEN_URIS}','
CONFIG=$CONFIG'\n  "affiliate": "'${AFILLIATE}'",'
CONFIG=$CONFIG'\n  "cardAffiliates": '${AFILLIATE_ARRAY}','
CONFIG=$CONFIG'\n  "cards": "'${NUMBER_OF_CARDS}'",'
CONFIG=$CONFIG'\n  "dateCreated": "'${NOW}'"'
CONFIG=$CONFIG'\n}'

echo -e "$CONFIG" > events/$SRC_NAME/config.json