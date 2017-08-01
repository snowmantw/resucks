import React, { Component } from 'react';
import logo from './logo.svg';
import LoginContainer from './LoginContainer.js';
import GeolocationService from './service/Geolocation.js';
import './App.css';

class App extends Component {
  render() {
    return (
      <div className="App">
        <div className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h2>Welcome to React</h2>
        </div>
        <GeolocationService>
          <LoginContainer />
          <p className="App-intro">
            To get started, edit <code>src/App.js</code> and save to reload.
          </p>
       </GeolocationService>
      </div>
    );
  }
}

export default App;
