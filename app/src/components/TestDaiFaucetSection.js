import { drizzleConnect } from "drizzle-react";
import React, { Component, Fragment } from "react";
import PropTypes from "prop-types";
import moment from "moment"

import ContractForm from "./ContractForm";
import ApproveForm from "./ApproveForm";

var url_string = window.location.href;
var url = new URL(url_string);
var urlId = url.searchParams.get("id");

class TestDaiFaucetSection extends Component {
  constructor(props, context) {
    super();
    this.utils = context.drizzle.web3.utils;
    this.contracts = context.drizzle.contracts;
    this.state = {
      artworkPriceKey: context.drizzle.contracts.Harber.methods.price.cacheCall(urlId),
      rentOwedKey: context.drizzle.contracts.Harber.methods.rentOwed.cacheCall(urlId),
      totalCollectedKey: context.drizzle.contracts.Harber.methods.totalCollected.cacheCall(),
      rentOwed: -1,
      combinedCollected: -1,
      foreclosureTime: "N/A"
    };
  }

  render() {
    return (
    <div className="section" style={{margin: '0px'}}>
        {window.ethereum !== undefined ? (
          <Fragment>
          {/* <ContractForm buttonText="Get $100 test DAI" contract="Harber" method="getTestDai" /> */}
          {/* <ContractForm buttonText="Get $100 test DAI" contract="Cash" method="faucet"  labels={["Faucet request"]} /> */}
          <ContractForm buttonText="Get $100 test DAI" contract="Cash" method="faucet" />
          <ApproveForm buttonText="Approve" contract="Cash" method="approve" />
          </Fragment>
        ) : (
          <Fragment>
          In order to interact with the artwork you need to have a web3/Ethereum-enabled browser. Please download
          the <a href="https://metamask.io">MetaMask Chrome extension</a> or open in an Ethereum mobile browser.
          </Fragment>
        )}
    </div>
    )
  }
}

TestDaiFaucetSection.contextTypes = {
  drizzle: PropTypes.object,
};

TestDaiFaucetSection.propTypes = {
};

/*
 * Export connected component.
 */

const mapStateToProps = state => {
  return {
    contracts: state.contracts,
  };
};

export default drizzleConnect(TestDaiFaucetSection, mapStateToProps);