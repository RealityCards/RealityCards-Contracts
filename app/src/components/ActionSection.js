import { drizzleConnect } from "drizzle-react";
import React, { Component, Fragment } from "react";
import PropTypes from "prop-types";
import moment from "moment"

import ContractForm from "./ContractForm";
import ContractData from "./ContractData";

var url_string = window.location.href;
var url = new URL(url_string);
var urlId = url.searchParams.get("id");

class ActionSection extends Component {
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
      rentalExpiryTime: "N/A"
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
          rentalExpiryTime: "N/A"
        });
      } else {
        const rentalExpiryTime = moment(parseInt(await this.contracts.Harber.methods.rentalExpiryTime(urlId).call())*1000).toString();
        this.setState({rentalExpiryTime});
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
    <div className="section">
      <h2>Current Owner Details:</h2>
        Address: <ContractData contract="ERC721Full" method="ownerOf" methodArgs={[urlId]}/><br />
        Token Deposit: <ContractData contract="Harber" method="liveDepositAbleToWithdraw" methodArgs={[urlId]} toEth /> DAI<br />
        Your Deposit: <ContractData contract="Harber" method="userDepositAbleToWithdraw" methodArgs={[urlId]} toEth /> DAI<br />
        Rental Expiry Time: {this.state.rentalExpiryTime}<br />
        {/* <p>The current deposit will cover the patronage until the time above. At this time, the smart contract steward takes ownership of the artwork and sets its price back to zero.</p> */}
        {/* <p>Once it crosses this time period, the patron can't top up their deposit anymore and is effectively foreclosed.</p> */}
      <h2>Actions:</h2>
        {window.ethereum !== undefined ? (
          <Fragment>
          <ContractForm buttonText="Change Price" contract="Harber" method="changePrice" labels={["New Price"]}/>
          <ContractForm buttonText="Top up Deposit" contract="Harber" method="depositDai" labels={["New Price"]}/>
          <ContractForm buttonText="Withdraw Deposit" contract="Harber" method="withdrawDeposit" labels={["Amount to withdraw"]} toEth />
          <ContractForm buttonText="Withdraw Whole Deposit And transfer token to previous  owner" contract="Harber" method="exit" />
          </Fragment>
        ) : (
          <Fragment>
          In order to interact with the artwork you need to have a web3/Ethereum-enabled browser. Please download
          the <a href="https://metamask.io">MetaMask Chrome extension</a> or open in an Ethereum mobile browser.
          </Fragment>
        )}

      {/* <h2>Other Artwork Stats:</h2>
        <p>Total Patronage Collected: {this.state.combinedCollected} DAI</p> */}
    </div>
    )
  }
}

ActionSection.contextTypes = {
  drizzle: PropTypes.object,
};

ActionSection.propTypes = {
};

/*
 * Export connected component.
 */

const mapStateToProps = state => {
  return {
    contracts: state.contracts,
  };
};

export default drizzleConnect(ActionSection, mapStateToProps);
