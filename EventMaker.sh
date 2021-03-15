#!/bin/bash

###################
#### Setup ########
###################
# Tip: you can escape difficult characters in the string with a backslash \
EVENT_NAME="Will CZ/Binance be fined by CFTC for more than \$10m by May 1st?"
SRC_NAME="binance"
CATEGORY="Cryptocurrency"
SLUG="bin1"
NUMBER_OF_CARDS="2"
CARD0="Yes"
CARD1="No"
CARD2=""
CARD3=""
CARD4=""
CDN="https://cdn.realitycards.io/"
IMAGES="images/"
IMAGE_FORMAT=".jpg"
NFT="nftmetadata/"
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
    eventJSON=$eventJSON'\n      "image": "'$CDN$IMAGES${!card// /-}$IMAGE_FORMAT'",'
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
cardJSON=$cardJSON'\n  "image": "'$CDN$IMAGES${!card// /-}$IMAGE_FORMAT'",'
cardJSON=$cardJSON'\n  "affiliation": "Reality Cards"'
cardJSON=$cardJSON'\n}'

echo -e "$cardJSON" > events/$SRC_NAME/token$i.json
done
