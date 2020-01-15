import React, { Component } from "react";
import { BrowserRouter as Router, Route } from "react-router-dom";
import { DrizzleProvider } from "drizzle-react";
import OfflineContainer from "./OfflineContainer"; // modified from drizzle-react-components

import "./App.css";

import drizzleOptions from "./drizzleOptions";
import BaseContainer from "./BaseContainer";
import FrontBaseContainer from "./FrontBaseContainer";

class App extends Component {
  render() {
    return (
      <DrizzleProvider options={drizzleOptions}>
        <OfflineContainer>
          <BaseContainer />
        </OfflineContainer>
      </DrizzleProvider>
    );
  }
}

class AppFront extends Component {
  render() {
    return (
      <DrizzleProvider options={drizzleOptions}>
        <OfflineContainer>
          <FrontBaseContainer />
        </OfflineContainer>
      </DrizzleProvider>
    );
  }
}

/* unused in contract, but keeping for now */
class Metadata extends Component {
  constructor() {
    super();
    this.data = {
      name: "Harber.io",
      description: "Harber.io",
      image: ""
    };
  }
  render() {
    return (
      <div>{JSON.stringify(this.data)}</div>
    )
  }
}

class AppRoutes extends Component {
  render() {
    return (
      <Router>
        <Route path='/token' exact component={App}/>
        <Route path='/' exact component={AppFront}/>
        <Route path='/metadata' exact component={Metadata}/>
      </Router>
    )
  }
}

export default AppRoutes;
