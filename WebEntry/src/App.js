import { BrowserRouter as Router, Route, Switch  } from 'react-router-dom';
import React, { Component } from 'react';

import Header from './components/Header/Header'
//import EditScreen from './pages/EditScreen';
import CreatorMode from './pages/CreatorMode';
import IntroductionScreen from './pages/IntroductionScreen';
import PlayerMode from './pages/PlayerMode';
import ViewerMode from './pages/ViewerMode';

import './App.css'

//To make MaterialUI use the new variant of typography and avoid the deprecation warning
window.__MUI_USE_NEXT_TYPOGRAPHY_VARIANTS__ = true;

class App extends Component {
  render() {
    return (
        <Router>
        <div className="App">
          <Route component={Header} />
          <div className="MainContent">
            <Switch>
              <Route exact path="/" component={IntroductionScreen} />
              <Route path="/CreatorMode" component={CreatorMode} />
              <Route path="/PlayerMode" component={PlayerMode} />
              <Route path="/ViewerMode" component={ViewerMode} />
            </Switch>
          </div>
        </div>
        </Router>
    );
  }
}

export default App;
