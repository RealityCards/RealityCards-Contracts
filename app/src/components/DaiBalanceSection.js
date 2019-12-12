import { drizzleConnect } from "drizzle-react";
import React, { Component, Fragment } from "react";
import PropTypes from "prop-types";
import moment from "moment";
import ContractData from "./ContractData";
import { getUSDValue } from "../Actions";

var url_string = window.location.href;
var url = new URL(url_string);
var urlId = url.searchParams.get("id");

class DaiBalanceSection extends Component {
    constructor(props, context) {
      super();
      this.utils = context.drizzle.web3.utils;
      this.contracts = context.drizzle.contracts;
      this.state = {
        USD: -1,
        testDaiBalanceKey: context.drizzle.contracts.Harber.methods.getTestDaiBalance.cacheCall(),
        // artworkPriceKey: context.drizzle.contracts.Harber.methods.price.cacheCall(urlId),
        patron: null,
        // patronKey: context.drizzle.contracts.ERC721Full.methods.ownerOf.cacheCall(urlId),
        // timeAcquiredKey: context.drizzle.contracts.Harber.methods.timeAcquired.cacheCall(urlId),
        timeHeldKey: null,
        currentTimeHeld: 0,
        currentTimeHeldHumanized: ""
      };
    }
    

    async updateTestDaiBalance(props) {
      const testDaiBalance = this.getTestDaiBalance(props);
      // update timeHeldKey IF owner updated
      const testDaiBalanceKey = this.contracts.Harber.methods.getTestDaiBalance.cacheCall();
      this.setState({
        // currentTimeHeld: 0,
        // timeHeldKey,
        // patron
      });
    }

    getTestDaiBalance(props) {
      return props.contracts['Harber']['timeAcqtestDaiBalancesuired'][this.state.testDaiBalanceKey].value;
    }

    async componentWillUpdate(nextProps, nextState) {
      if (this.state.testDaiBalanceKey in this.props.contracts['Harber']['testDaiBalances']
      && this.state.testDaiBalanceKey in nextProps.contracts['Harber']['testDaiBalances']) {
        if(this.getTestDaiBalance(this.props) !== this.getTestDaiBalance(nextProps) || this.state.patron === null) {
          this.updateTestDaiBalance(nextProps);
        }
      }
    }

    render() {

      return (
        <Fragment>
        <h2>Current TestDai Balance: $<ContractData contract="Harber" method="getTestDaiBalance" toEth />   </h2>
        </Fragment>
      )
    }
}

DaiBalanceSection.contextTypes = {
  drizzle: PropTypes.object,
};

DaiBalanceSection.propTypes = {
};

/*
 * Export connected component.
 */

const mapStateToProps = state => {
  return {
    accounts: state.accounts,
    contracts: state.contracts,
    drizzleStatus: state.drizzleStatus,
    web3: state.web3,
  };
};

export default drizzleConnect(DaiBalanceSection, mapStateToProps);
