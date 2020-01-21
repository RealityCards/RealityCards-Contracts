import { drizzleConnect } from "drizzle-react";
import React, { Component, Fragment } from "react";
import PropTypes from "prop-types";
import moment from "moment";
import ContractData from "./ContractData";

var address;

class DaiBalanceSection extends Component {
    constructor(props, context) {
      // console.log(context.drizzle.web3);
      // console.log(props.contracts.Harber);
      address = context.drizzle.web3.givenProvider.selectedAddress;
      super();
      this.utils = context.drizzle.web3.utils;
      this.contracts = context.drizzle.contracts;
      this.state = {
        USD: -1,
        daiBalanceKey: context.drizzle.contracts.Cash.methods.balanceOf.cacheCall(address),
        daiBalance: -1,
        patron: null,
      };
    }

    async updateDaiBalance(props) {
      var daiBalance = this.getBalanceOf(props);
      this.setState({daiBalance});
    }

    getBalanceOf(props) {
      return props.contracts['Cash']['balanceOf'][this.state.daiBalanceKey].value;
    }

    async componentWillUpdate(nextProps, nextState) {
      if (this.state.daiBalanceKey in this.props.contracts['Cash']['balanceOf']
      && this.state.daiBalanceKey in nextProps.contracts['Cash']['balanceOf']) {
        if(this.getBalanceOf(this.props) !== this.getBalanceOf(nextProps) || this.state.daiBalance === null) {
          this.updateDaiBalance(nextProps);
        }
      }
    }

    render() {

      return (
        <Fragment>
        <h2>Your Dai Balance: $<ContractData contract="Cash" method="balanceOf" methodArgs={[address]} toEth />   </h2>
        {/* <h2>Your Dai Balance: {this.state.daiBalance}   </h2> */}
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
