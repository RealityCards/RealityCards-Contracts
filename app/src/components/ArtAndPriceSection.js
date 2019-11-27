import { drizzleConnect } from "drizzle-react";
import React, { Component, Fragment } from "react";
import PropTypes from "prop-types";

import artwork from "./manu.svg";

import PriceSection from "./PriceSection";

class ArtAndPriceSection extends Component {
    render() {
      return (
        <Fragment>
        <img src={artwork} style={{maxWidth: "100%", maxHeight: "100%"}} alt="A R T" />
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
