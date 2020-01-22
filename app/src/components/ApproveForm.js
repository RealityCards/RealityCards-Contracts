import { drizzleConnect } from "drizzle-react";
import React, { Component } from "react";
import PropTypes from "prop-types";
import Input from '@material-ui/core/Input';
import InputAdornment from '@material-ui/core/InputAdornment';
import Button from '@material-ui/core/Button';

class ContractForm extends Component {
  constructor(props, context) {
    super(props);

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
          initialState[this.inputs[j].name] = "";
        }

        break;
      }
    }

    this.state = initialState;
  }

  handleSubmit(event) {
    event.preventDefault();
    let args = this.props.sendArgs;
    const convertedInputs = this.inputs.map((input, index) => {
      // console.log(this.state[input.name]);
      if (input.name == "_spender")
      {
        return this.contracts.Harber.address;
      }
      if (input.name == "_amount")
      {
        var stfu = toString(new this.utils.BN(100));
        return 100000000000000000000;
      }
      else if (input.type === 'bytes32') {
        return this.utils.toHex(this.state[input.name])
      } else if (input.type === 'uint256') {
        return this.utils.toWei(this.state[input.name], 'ether'); // all number fields are ETH  fields.
      }
      return this.state[input.name];
    });

    if (this.state.value) {
      args.value = this.utils.toWei(this.state.value, 'ether');
    }
    if (args) {
      return this.contracts[this.props.contract].methods[
        this.props.method
      ].cacheSend(...convertedInputs, args);
    }

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
    return (
      <form className="pure-form pure-form-stacked" onSubmit={this.handleSubmit}>

        {this.inputs.map((input, index) => {
          var inputType = this.translateType(input.type);
          var inputLabel = this.props.labels
            ? this.props.labels[index]
            : input.name;
          // check if input type is struct and if so loop out struct fields as well
          
          if (input.name != "_spender" && input.name != "_amount")
          {
            // console.log(input.name);
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

        })}
        <Button
          variant="contained"
          key="submit"
          className="pure-button"
          type="button"
          onClick={this.handleSubmit}
        >
          {this.props.buttonText}
        </Button>
        <br />
        <br />
      </form>
    );
  }
}

ContractForm.contextTypes = {
  drizzle: PropTypes.object,
};

ContractForm.propTypes = {
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

export default drizzleConnect(ContractForm, mapStateToProps);
