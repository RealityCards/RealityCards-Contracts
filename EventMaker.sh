#!/bin/bash

###################
#### Setup ########
###################
EVENT_NAME="Which horse will win the Cheltenham Gold Cup?"
SRC_NAME="horse"
CATEGORY="Sports"
SLUG="hse1"
NUMBER_OF_CARDS="12"
CARD0="Al Boum Photo"
CARD1="A Plus Tard"
CARD2="Champ"
CARD3="Royale Pagaille"
CARD4="Santini"
CARD5="Native River"
CARD6="Frodon"
CARD7="Kemboy"
CARD8="Minella Indo"
CARD9="Lostintranslation"
CARD10="Aso"
CARD11="Black Op"
CARD12=""
CARD13=""
CARD14=""
CARD15=""
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
