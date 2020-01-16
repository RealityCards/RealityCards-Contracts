import { drizzleConnect } from "drizzle-react";
import React, { Children, Component } from "react";
import PropTypes from "prop-types";

/*
 * Create component.
 */

class OfflineContainer extends Component {
  render() {
    if (this.props.drizzleStatus.initialized) {
      return Children.only(this.props.children);
    }
  
    if (this.props.web3.status === "") {
    // (this.props.web3.status === "initialized" && Object.keys(this.props.accounts).length === 0)) {
      // console.log(this.props);
      return (
        <div className="section">
        Please ensure you have metamask installed, logged in, and set to <strike>stun</strike> Kovan. If you do not have metamask please click <a href="offline/index.html">here</a> for an 'offline' version which cannot be interacted with.
        </div>
      )
    }

    return (
      <main className="container loading-screen">
        <div className="pure-g">
          <div className="pure-u-1-1">
            <h1>⚙️</h1>
            <p>Please ensure you have metamask installed, logged in, and set to <strike>stun</strike> Kovan. If you do not have metamask please click <a href="offline/index.html">here</a> for an 'offline' version which cannot be interacted with.</p>
          </div>
        </div>
      </main>
    );
  }
}

OfflineContainer.contextTypes = {
  drizzle: PropTypes.object,
};

OfflineContainer.propTypes = {
  children: PropTypes.node,
  // accounts: PropTypes.arrayOf(PropTypes.string).isRequired,
  drizzleStatus: PropTypes.object.isRequired,
  web3: PropTypes.object.isRequired,
  loadingComp: PropTypes.node,
  errorComp: PropTypes.node,
};

/*
 * Export connected component.
 */

const mapStateToProps = state => {
  return {
    accounts: state.accounts,
    drizzleStatus: state.drizzleStatus,
    web3: state.web3,
  };
};

export default drizzleConnect(OfflineContainer, mapStateToProps);
