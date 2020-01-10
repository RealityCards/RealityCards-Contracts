import { drizzleConnect } from "drizzle-react";
import React, { Component, Fragment } from "react";
import PropTypes from "prop-types";
import Input from '@material-ui/core/Input';
import InputAdornment from '@material-ui/core/InputAdornment';
import Button from '@material-ui/core/Button';
import { relativeTimeRounding } from "moment";

/*
Edited from drizzle react components, ContractFrom.
Overkill. Needs to be refactored to smaller scope.
*/

var url_string = window.location.href;
var url = new URL(url_string);
var urlId = url.searchParams.get("id");

class BuyForm extends Component {
  
  //the constructor is run when the page is loaded. NOT when the button is pressed
  constructor(props, context) {
    super(props);
    // props = the stuff sent on BuyArtworkSection- mainly, it is that contract is Harber and method is buy
    // console.log("props is", props);
    
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);

    this.contracts = context.drizzle.contracts;
    this.utils = context.drizzle.web3.utils;

    // Get the contract ABI
    const abi = this.contracts[this.props.contract].abi;

    this.inputs = [];
    var initialState = {};

    // Iterate over abi for correct function.
    for (var i = 0; i < abi.length; i++) {
      
      if (abi[i].name === this.props.method) {
        this.inputs = abi[i].inputs;

        for (var j = 0; j < this.inputs.length; j++) {
            // console.log(this.inputs[j].name);
            initialState[this.inputs[j].name] = "";
        }

        break;
      }
    }
    //the above function goes through the ABI for the 'buy' function and gets its inputs of _newPrice and _tokenId- that is what this.inputs is
    // console.log("this.inputs is", this.inputs);
    this.state = initialState;
    this.state.artworkPriceKey = context.drizzle.contracts.Harber.methods.price.cacheCall(urlId);
  }

  handleSubmit(event) {
    event.preventDefault();
    let args = this.props.sendArgs;
    //// args is the msg.value!!! It is NOT either of the two fields
    //// console.log("args is", args);
    //// we know what this.inputs is from above- it is the inputs newprice and tokenId from the abi

    //// the below function gets the relevant data that is required to interact with the function. So after this, we get convertedinputs[0] = newprice, and [1] = tokenId. Note that at this point we still havnt got the deposit amount. This is fine as we don't need it as an argument, however we do need it to form the value of the tx.

    // console.log("events is", event);
    // console.log("this.state is", this.state);
    const convertedInputs = this.inputs.map((input, index) => {
      if (input.name == "_tokenId")
      {
        return urlId;
      }
      else if (input.type === 'bytes32') 
      {
        //// this elseif is not used as thre are no bytes32 inputs
        return this.utils.toHex(this.state[input.name])
      } else if (input.type === 'uint256') 
      {
        // console.log("pls",this.state[input.name]);
        return this.utils.toWei(this.state[input.name], 'ether'); // all number fields are ETH  fields.
      }
      return this.state[input.name];
    });
    // console.log("convertedinputs is", convertedInputs);
  
    //// this.state.value = the deposit amount
    // console.log("state.value is ", this.state.value);
    if (this.state.value) {
      
      //// so the below gets the existing price, and then converts it to bignumber format
      // console.log("thingy is ",this.props.contracts[this.props.contract]['price'][this.state.artworkPriceKey].value);
      const artworkPrice = new this.utils.BN(this.props.contracts[this.props.contract]['price'][this.state.artworkPriceKey].value);
      // console.log("artwork price is", artworkPrice);

      ////originally, the amount payable was current price + deposit, this is now changed to just the deposit. 
      // args.value = new this.utils.BN(this.utils.toWei(this.state.value, 'ether')).add(artworkPrice);
      args.value = new this.utils.BN(this.utils.toWei(this.state.value, 'ether'));
      // console.log("args.value is" , args.value );
      // console.log("value thingy is", this.utils.toWei(this.state.value, 'ether'));

    }
    if (args) {
      // console.log("args is: ", args);
      
      ////so heres the thing. convertedinputs is the arguments to send to the function. Args = the amount payable. It does this bit if there is value being sent
      // console.log("convertedInputs is ", convertedInputs);
      return this.contracts[this.props.contract].methods[
        this.props.method
      ].cacheSend(...convertedInputs, args);
      
    }

    ////it does this if is no value being sent, so in reality this is not used. 
    return this.contracts[this.props.contract].methods[
      this.props.method
    ].cacheSend(...convertedInputs);
  }

  handleInputChange(event) {
    this.setState({ [event.target.name]: event.target.value });
  }

  translateType(type) {
    switch (true) {
      case /^uint/.test(type):
        return "number";
      case /^string/.test(type) || /^bytes/.test(type):
        return "text";
      case /^bool/.test(type):
        return "checkbox";
      default:
        return "text";
    }
  }

  render() {
    const valueLabel = this.props.valueLabel;
    return (
      <form className="pure-form pure-form-stacked" onSubmit={this.handleSubmit}>
        {this.inputs.map((input, index) => {
          var inputType = this.translateType(input.type);
          var inputLabel = this.props.labels
            ? this.props.labels[index]
            : input.name;
          // check if input type is struct and if so loop out struct fields as well
          // console.log(input);
          //this is another hack as Im not sure what is going on
          if (input.name == "_newPrice")
          {
            return (
            
              <Input
                key={input.name}
                type={inputType}
                name={input.name}
                value={this.state[input.name]}
                placeholder={inputLabel}
                onChange={this.handleInputChange}
                startAdornment={<InputAdornment position="start">DAI</InputAdornment>} 
              />
            );
          }

          // if (input.name == "_deposit")
          // {
          //   return (
            
          //     // <Input
          //       // key={input.name}
          //       // type={inputType}
          //       // name={input.name}
          //       // value={this.state[input.name]}
          //       // placeholder={inputLabel}
          //       // onChange={this.handleInputChange}
          //       // startAdornment={<InputAdornment position="start">ETH</InputAdornment>} 
          //     // />
          //   );
          // }

        })}
        {valueLabel &&
          <Fragment>
          <br />
          <Input 
          key={valueLabel} 
          type='number' 
          name='_deposit' 
          value={this.state[valueLabel]} 
          placeholder={valueLabel} 
          onChange={this.handleInputChange} 
          startAdornment={<InputAdornment position="start">DAI</InputAdornment>} />
          <br />
          <br />
          </Fragment>
        }
        <Button
          variant="contained"
          key="submit"
          className="pure-button"
          type="button"
          onClick={this.handleSubmit}
        >
          Rent Token
        </Button>
      </form>
    );
  }
}

BuyForm.contextTypes = {
  drizzle: PropTypes.object,
};

// todo: add value label
BuyForm.propTypes = {
  contract: PropTypes.string.isRequired,
  method: PropTypes.string.isRequired,
  sendArgs: PropTypes.object,
  labels: PropTypes.arrayOf(PropTypes.string),
};

/*
 * Export connected component.
 */

const mapStateToProps = state => {
  return {
    contracts: state.contracts,
  };
};

export default drizzleConnect(BuyForm, mapStateToProps);
