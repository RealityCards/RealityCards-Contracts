import { drizzleConnect } from "drizzle-react";
import React, { Component, Fragment } from "react";
import PropTypes from "prop-types";
import team0 from "./manu.svg";
import team1 from "./liverpool.jpg";
import PriceSection from "./PriceSection";
import DaiBalanceSection from "./DaiBalanceSection";

var url_string = window.location.href;
var url = new URL(url_string);
var urlId = url.searchParams.get("id");

if (urlId == 0)
{
  var teamToDisplay = team0;
}
else 
{
  var teamToDisplay = team1;
}



class ArtAndPriceSection extends Component {
    render() {
      return (
        <Fragment>
        <img src={teamToDisplay} style={{maxWidth: "100%", maxHeight: "100%"}} alt="A R T" />
        <DaiBalanceSection />
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
