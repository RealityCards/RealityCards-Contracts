import { drizzleConnect } from "drizzle-react";
import React, { Component, Fragment } from "react";
import PropTypes from "prop-types";
import ContractData from "./ContractData";
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
import Token0 from "./tokens/Token0";
import Token1 from "./tokens/Token1";
import Token2 from "./tokens/Token2";
import Token3 from "./tokens/Token3";
import Token4 from "./tokens/Token4";


class ArtAndPriceSection extends Component {
    render() {
      return (
        <Fragment>
        <h1>Harber.io</h1>
        <h3>Harber is a unique gambling platform, built on top of Augur, where instead of betting on a team, you <i>own</i> the team. See <a href = "https://github.com/mcplums/Harber/blob/master/README.md">here</a> for more information. It is still in development and currently hosted on Kovan.</h3>
        <h4><i>I am looking for someone to help me build a decent front end prior to mainnet deployment, if you are interested please get in touch, andrew@stanger.co.uk</i></h4>
        <h4>All prices are in DAI.</h4>
        <h4>Total rent collected and sent to Augur: $<ContractData contract="Harber" method="totalCollected" methodArgs={[]} toEth /></h4>
        <a href="/token?id=0"><img src={team0} style={{maxWidth: "10%", maxHeight: "10%"}} alt="A R T" /><br />Manchester United</a>
        <Token0 />   
        <a href="/token?id=1"><img src={team1} style={{maxWidth: "10%", maxHeight: "10%"}} alt="A R T" /><br />Liverpool</a>
        <Token1 /> 
        <a href="/token?id=2"><img src={team2} style={{maxWidth: "10%", maxHeight: "10%"}} alt="A R T" /><br />Manchester City</a>
        <Token2 />
        <a href="/token?id=3"><img src={team3} style={{maxWidth: "10%", maxHeight: "10%"}} alt="A R T" /><br />Chelsea</a>
        <Token3 />
        <a href="/token?id=4"><img src={team4} style={{maxWidth: "10%", maxHeight: "10%"}} alt="A R T" /><br />Tottenham Hotspur</a>
        <Token4 />
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
