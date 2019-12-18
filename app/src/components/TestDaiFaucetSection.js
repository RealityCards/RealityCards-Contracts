import { drizzleConnect } from "drizzle-react";
import React, { Component, Fragment } from "react";
import PropTypes from "prop-types";
import moment from "moment"

import FaucetForm from "./ContractForm";

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
      calculateRentOwedKey: context.drizzle.contracts.Harber.methods.calculateRentOwed.cacheCall(urlId),
      totalCollectedKey: context.drizzle.contracts.Harber.methods.totalCollectedAndSentToAugur.cacheCall(),
      calculateRentOwed: -1,
      combinedCollected: -1,
      foreclosureTime: "N/A"
    };
  }

  getTotalCollected(props) {
    return new this.utils.BN(props.contracts['Harber']['totalCollectedAndSentToAugur'][this.state.totalCollectedKey].value);
  }

  async updateCombineCollected(props) {
    const calculateRentOwed = this.getcalculateRentOwed(props);
    const totalCollected = this.getTotalCollected(props);
    const combinedCollected = this.utils.fromWei(totalCollected.add(calculateRentOwed), 'ether').toString();
    this.setState({
      calculateRentOwed,
      combinedCollected,
    });
  }

  getcalculateRentOwed(props) {
    return new this.utils.BN(props.contracts['Harber']['calculateRentOwed'][this.state.calculateRentOwedKey].value);
  }

  async componentWillReceiveProps(nextProps) {
    if(this.props.contracts['Harber']['price'][this.state.artworkPriceKey] !== nextProps.contracts['Harber']['price'][this.state.artworkPriceKey]) {
      if (nextProps.contracts['Harber']['price'][this.state.artworkPriceKey].value === '0') {
        this.setState({
          foreclosureTime: "N/A"
        });
      } else {
        const foreclosureTime = moment(parseInt(await this.contracts.Harber.methods.rentalExpiryTime(urlId).call())*1000).toString();
        this.setState({foreclosureTime});
      }
    }

    console.log(this.state.calculateRentOwedKey);
    console.log(this.props.contracts['Harber']['calculateRentOwed']);
    if (this.state.calculateRentOwedKey in this.props.contracts['Harber']['calculateRentOwed']
    && this.state.calculateRentOwedKey in nextProps.contracts['Harber']['calculateRentOwed']
    && this.state.totalCollectedKey in this.props.contracts['Harber']['totalCollected']
    && this.state.totalCollectedKey in nextProps.contracts['Harber']['totalCollected']) {
      if (!this.getcalculateRentOwed(this.props).eq(this.getcalculateRentOwed(nextProps)) || this.state.combinedCollected === -1) {
        this.updateCombineCollected(nextProps);
      }
    }
  }

  render() {
    return (
    <div className="section" style={{margin: '0px'}}>
        {window.ethereum !== undefined ? (
          <Fragment>
          <FaucetForm buttonText="Get $100 test DAI" contract="Harber" method="getTestDai" />
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
