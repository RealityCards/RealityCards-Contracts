#!/bin/bash

###################
#### Setup ########
###################
EVENT_NAME="What will happen tomorrow?"
SRC_NAME="tomorrow"
CATEGORY="other"
SLUG="test1"
NUMBER_OF_CARDS="2"
CARD0="nothing"
CARD1="everything"
CARD2="Potato"
CARD3=""
CARD4=""
CDN="https://cdn.realitycards.io/"
IMAGES="images/"
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
    eventJSON=$eventJSON'\n      "image": "'$CDN$IMAGES${!card}'.png",'
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
cardJSON=$cardJSON'\n  "image": "'$CDN$IMAGES${!card}'.png",'
cardJSON=$cardJSON'\n  "affiliation": "Reality Cards"'
cardJSON=$cardJSON'\n}'

echo -e "$cardJSON" > events/$SRC_NAME/token$i.json
done
