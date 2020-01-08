import { drizzleConnect } from "drizzle-react";
import React, { Component, Fragment } from "react";
import PropTypes from "prop-types";
import team0 from "./logos/manu.svg";
import team1 from "./logos/liverpool.jpg";
import team2 from "./logos/Leicester.png";
import team3 from "./logos/Manchester_City.png";
import team4 from "./logos/Chelsea.png";
import team5 from "./logos/Tottenham_Hotspur.png";
import team6 from "./logos/Wolverhampton_Wanderers.png";
import team7 from "./logos/Sheffield_United.png";
import team8 from "./logos/Crystal_Palace.png";
import team9 from "./logos/Arsenal.png";
import team10 from "./logos/Everton.png";
import team11 from "./logos/Southampton.png";
import team12 from "./logos/Newcastle.png";
import team13 from "./logos/Brighton.png";
import team14 from "./logos/Burnley_F.C.png";
import team15 from "./logos/West_Ham.png";
import team16 from "./logos/Aston_Villa.png";
import team17 from "./logos/Bournemouth.png";
import team18 from "./logos/Watford.png";
import team19 from "./logos/Norwich_City.png";
import PriceSection from "./PriceSection";
import DaiBalanceSection from "./DaiBalanceSection";
import TestDaiFaucetSection from "./TestDaiFaucetSection";

var url_string = window.location.href;
var url = new URL(url_string);
var urlId = url.searchParams.get("id");

if (urlId == 0)
{ var teamToDisplay = team0; }
else if (urlId == 1)
{ var teamToDisplay = team1; }
else if (urlId == 2)
{ var teamToDisplay = team2; }
else if (urlId == 3)
{ var teamToDisplay = team3; }
else if (urlId == 4)
{ var teamToDisplay = team4; }
else if (urlId == 5)
{ var teamToDisplay = team5; }
else if (urlId == 6)
{ var teamToDisplay = team6; }
else if (urlId == 7)
{ var teamToDisplay = team7; }
else if (urlId == 8)
{ var teamToDisplay = team8; }
else if (urlId == 9)
{ var teamToDisplay = team9; }
else if (urlId == 10)
{ var teamToDisplay = team10; }
else if (urlId == 11)
{ var teamToDisplay = team11; }
else if (urlId == 12)
{ var teamToDisplay = team12; }
else if (urlId == 13)
{ var teamToDisplay = team13; }
else if (urlId == 14)
{ var teamToDisplay = team14; }
else if (urlId == 15)
{ var teamToDisplay = team15; }
else if (urlId == 16)
{ var teamToDisplay = team16; }
else if (urlId == 17)
{ var teamToDisplay = team17; }
else if (urlId == 18)
{ var teamToDisplay = team18; }
else if (urlId == 19)
{ var teamToDisplay = team19; }



class ArtAndPriceSection extends Component {
    render() {
      return (
        <Fragment>
        <img src={teamToDisplay} style={{maxWidth: "100%", maxHeight: "100%"}} alt="A R T" />
        <DaiBalanceSection />
        <TestDaiFaucetSection />
        <PriceSection />
        </Fragment>
      )
    }
}

ArtAndPriceSection.contextTypes = {
  drizzle: PropTypes.object,
};

ArtAndPriceSection.propTypes = {
};

/*
 * Export connected component.
 */

const mapStateToProps = state => {
  return {
    contracts: state.contracts,
    drizzleStatus: state.drizzleStatus,
    web3: state.web3,
  };
};

export default drizzleConnect(ArtAndPriceSection, mapStateToProps);
