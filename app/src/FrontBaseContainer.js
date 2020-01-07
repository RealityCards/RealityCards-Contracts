import BaseComponent from "./components/FrontBaseComponent";
import { drizzleConnect } from "drizzle-react";

const mapStateToProps = state => {
  return {
    accounts: state.accounts,
    ERC721Full: state.contracts.ERC721Full,
    Harber: state.contracts.Harber,
    drizzleStatus: state.drizzleStatus,
  };
};

const BaseContainer = drizzleConnect(BaseComponent, mapStateToProps);

export default BaseContainer;
