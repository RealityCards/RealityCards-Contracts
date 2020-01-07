import React, { Component } from "react";

import FrontIntroSection from "./FrontIntroSection";

// import cc from "cryptocompare";  //TODO

class BaseComponent extends Component {

  render() {
    return (
      <div className="App">
        <FrontIntroSection />
      </div>
    );
  }
}

export default BaseComponent
