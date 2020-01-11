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
import Token5 from "./tokens/Token5";
import Token6 from "./tokens/Token6";
import Token7 from "./tokens/Token7";
import Token8 from "./tokens/Token8";
import Token9 from "./tokens/Token9";
import Token10 from "./tokens/Token10";
import Token11 from "./tokens/Token11";
import Token12 from "./tokens/Token12";
import Token13 from "./tokens/Token13";
import Token14 from "./tokens/Token14";
import Token15 from "./tokens/Token15";
import Token16 from "./tokens/Token16";
import Token17 from "./tokens/Token17";
import Token18 from "./tokens/Token18";
import Token19 from "./tokens/Token19";


class ArtAndPriceSection extends Component {
    render() {
      return (
        <Fragment>
        <h1>Harber.io</h1>
        <h3>Harber is a unique gambling platform, built on top of Augur, where instead of betting on a team, you <i>own</i> the team. See <a href = "https://github.com/mcplums/Harber/blob/master/README.md">here</a> for more information. </h3>
        <h4><i>I am looking for someone to help me build a decent front end prior to mainnet deployment, if you are interested please get in touch: telegram-mcplums, email-andrew@stanger.co.uk</i></h4>
        <h4>All prices are in DAI.</h4>
        <h4>This demo uses the 19/20 English Premier League. There is one Non Fungible Token per team. To rent a team, set a daily rental price (which must be higher than the current price) and deposit some Dai. The owners of the team that win will receive a split of all rental payments, in proportion to how long they have owned the team.</h4>
        <h4>You do not need Dai to interact with this demo, click on a team and you will be taken to a test Dai faucet. </h4>
        <h4>Total rent collected: $<ContractData contract="Harber" method="totalCollected" methodArgs={[]} toEth /></h4>
        <a href="/token?id=0"><img src={team0} style={{maxWidth: "10%", maxHeight: "10%"}} alt="A R T" /><br />Manchester United</a>
        <Token0 />   
        <a href="/token?id=1"><img src={team1} style={{maxWidth: "10%", maxHeight: "10%"}} alt="A R T" /><br />Liverpool</a>
        <Token1 /> 
        <a href="/token?id=2"><img src={team2} style={{maxWidth: "10%", maxHeight: "10%"}} alt="A R T" /><br />Leicester City</a>
        <Token2 />
        <a href="/token?id=3"><img src={team3} style={{maxWidth: "10%", maxHeight: "10%"}} alt="A R T" /><br />Manchester City</a>
        <Token3 />
        <a href="/token?id=4"><img src={team4} style={{maxWidth: "10%", maxHeight: "10%"}} alt="A R T" /><br />Chelsea</a>
        <Token4 />
        <a href="/token?id=5"><img src={team5} style={{maxWidth: "10%", maxHeight: "10%"}} alt="A R T" /><br />Tottenham Hotspur</a>
        <Token5 />
        <a href="/token?id=6"><img src={team6} style={{maxWidth: "10%", maxHeight: "10%"}} alt="A R T" /><br />Wolverhampton Wanderers</a>
        <Token6 />
        <a href="/token?id=7"><img src={team7} style={{maxWidth: "10%", maxHeight: "10%"}} alt="A R T" /><br />Sheffield United</a>
        <Token7 />
        <a href="/token?id=8"><img src={team8} style={{maxWidth: "10%", maxHeight: "10%"}} alt="A R T" /><br />Crystal Palace</a>
        <Token8 />
        <a href="/token?id=9"><img src={team9} style={{maxWidth: "10%", maxHeight: "10%"}} alt="A R T" /><br />Arsenal</a>
        <Token9 />
        <a href="/token?id=10"><img src={team10} style={{maxWidth: "10%", maxHeight: "10%"}} alt="A R T" /><br />Everton</a>
        <Token10 />   
        <a href="/token?id=11"><img src={team11} style={{maxWidth: "10%", maxHeight: "10%"}} alt="A R T" /><br />Southampton</a>
        <Token11 /> 
        <a href="/token?id=12"><img src={team12} style={{maxWidth: "10%", maxHeight: "10%"}} alt="A R T" /><br />Newcastle</a>
        <Token12 />
        <a href="/token?id=13"><img src={team13} style={{maxWidth: "10%", maxHeight: "10%"}} alt="A R T" /><br />Brighton</a>
        <Token13 />
        <a href="/token?id=14"><img src={team14} style={{maxWidth: "10%", maxHeight: "10%"}} alt="A R T" /><br />Burnley</a>
        <Token14 />
        <a href="/token?id=15"><img src={team15} style={{maxWidth: "10%", maxHeight: "10%"}} alt="A R T" /><br />West Ham United</a>
        <Token15 />
        <a href="/token?id=16"><img src={team16} style={{maxWidth: "10%", maxHeight: "10%"}} alt="A R T" /><br />Aston Villa</a>
        <Token16 />
        <a href="/token?id=17"><img src={team17} style={{maxWidth: "10%", maxHeight: "10%"}} alt="A R T" /><br />Bournemouth</a>
        <Token17 />
        <a href="/token?id=18"><img src={team18} style={{maxWidth: "10%", maxHeight: "10%"}} alt="A R T" /><br />Watford</a>
        <Token18 />
        <a href="/token?id=19"><img src={team19} style={{maxWidth: "10%", maxHeight: "10%"}} alt="A R T" /><br />Norwich City</a>
        <Token19 />
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
