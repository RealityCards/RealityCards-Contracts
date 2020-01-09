import React, { Component } from "react";

import IntroSection from "./IntroSection";
import ActionSection from "./ActionSection";

// import cc from "cryptocompare";  //TODO

class BaseComponent extends Component {


  render() {
    return (
      <div className="App">
        <IntroSection />
        <ActionSection />
      </div>
    );
  }
}

export default BaseComponent
