import { drizzleConnect } from "drizzle-react";
import React, { Component, Fragment } from "react";
import PropTypes from "prop-types";
import moment from "moment";
import ContractData from "../ContractData";
import { getUSDValue } from "../../Actions";

var urlId = 18;

class PriceSection extends Component {
    constructor(props, context) {
      super();
      this.utils = context.drizzle.web3.utils;
      this.contracts = context.drizzle.contracts;
      this.state = {
        USD: -1,
        artworkPriceKey: context.drizzle.contracts.Harber.methods.price.cacheCall(urlId),
        patron: null,
        patronKey: context.drizzle.contracts.ERC721Full.methods.ownerOf.cacheCall(urlId),
        timeAcquiredKey: context.drizzle.contracts.Harber.methods.timeAcquired.cacheCall(urlId),
        timeHeldKey: null,
        currentTimeHeld: 0,
        currentTimeHeldHumanized: ""
      };
    }

    async updateUSDPrice(props) {
      const price = this.utils.fromWei(this.getArtworkPrice(props), 'ether');
      // console.log("price is",price);
      const USD = await getUSDValue(price);
      this.setState({USD});
    }

    async updateTimeHeld(props, timeHeldKey) {
      const date = new Date();
      let currentTimeHeld = parseInt(this.getTimeHeld(props, timeHeldKey)) + (parseInt(date.getTime()/1000) - parseInt(this.getTimeAcquired(props)));

      var currentTimeHeldHumanized = moment.duration(currentTimeHeld, 'seconds').humanize();

      if (props.contracts['ERC721Full']['ownerOf'][this.state.patronKey].value === this.contracts.Harber.address) {
        currentTimeHeldHumanized = "unowned";
      }

      this.setState({
        currentTimeHeld,
        currentTimeHeldHumanized,
      });
    }

    async updatePatron(props) {
      var patron = this.getPatron(props);
      if (patron === this.contracts.Harber.address) {
        patron = 'unowned';
      }
      // update timeHeldKey IF owner updated
      var timeHeldKey;
      if (patron != 'unowned') { 
        var timeHeldKey = this.contracts.Harber.methods.timeHeld.cacheCall(urlId,patron);
      }
      this.setState({
        currentTimeHeld: 0,
        timeHeldKey,
        patron
      });
    }

    getArtworkPrice(props) {
      // console.log(props.contracts);
      return new this.utils.BN(props.contracts['Harber']['price'][this.state.artworkPriceKey].value);
    }

    getPatron(props) {
      return props.contracts['ERC721Full']['ownerOf'][this.state.patronKey].value;
    }

    getTimeAcquired(props) {
      return props.contracts['Harber']['timeAcquired'][this.state.timeAcquiredKey].value;
    }

    getTimeHeld(props, timeHeldKey) {
      return props.contracts['Harber']['timeHeld'][timeHeldKey].value;
    }

    async componentWillUpdate(nextProps, nextState) {
      if (this.state.patronKey in this.props.contracts['ERC721Full']['ownerOf']
      && this.state.patronKey in nextProps.contracts['ERC721Full']['ownerOf']) {
        if(this.getPatron(this.props) !== this.getPatron(nextProps) || this.state.patron === null) {
          this.updatePatron(nextProps);
        }
      }

      /* todo: fetch new exchange rate? */
      if (this.state.artworkPriceKey in this.props.contracts['Harber']['price']
      && this.state.artworkPriceKey in nextProps.contracts['Harber']['price']) {
        if (!this.getArtworkPrice(this.props).eq(this.getArtworkPrice(nextProps)) || this.state.USD === -1) {
          await this.updateUSDPrice(nextProps);
        }
      }

      if(this.state.timeHeldKey in this.props.contracts['Harber']['timeHeld']
      && this.state.timeHeldKey in nextProps.contracts['Harber']['timeHeld']) {
        if(this.getTimeHeld(this.props, this.state.timeHeldKey) !== this.getTimeHeld(nextProps, this.state.timeHeldKey) || this.state.currentTimeHeld === 0) {
          this.updateTimeHeld(nextProps, this.state.timeHeldKey);
        }
      }
    }

    render() {
      return (
        <Fragment>
      <br /><b>
        Daily rental price: $<ContractData contract="Harber" method="price" methodArgs={[urlId]} toEth /></b><br />
        Current Owner: {this.state.patron} <br />
        Time Held: {this.state.currentTimeHeldHumanized} 
        <br/><br/>
        </Fragment>
      )
    }
}

PriceSection.contextTypes = {
  drizzle: PropTypes.object,
};

PriceSection.propTypes = {
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

export default drizzleConnect(PriceSection, mapStateToProps);
