import 'react-app-polyfill/ie11'
import 'react-app-polyfill/stable'
import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './components/App'
import registerServiceWorker from './registerServiceWorker'
import { Router } from 'react-router-dom'
import history from './history'
import PiwikReactRouter from 'piwik-react-router'
import { sendTrackingData, matomoUrl, matomoSiteId } from './config'
import Keycloak from 'keycloak-js'
import { KeycloakProvider } from 'react-keycloak'

const matomo = sendTrackingData ? PiwikReactRouter({
  url: matomoUrl,
  siteId: matomoSiteId
}) : null

const keycloak = Keycloak({
  url: 'http://localhost:8002/auth',
  realm: 'fairdi_nomad_test',
  clientId: 'nomad_gui_dev'
})

ReactDOM.render(
  <KeycloakProvider keycloak={keycloak} initConfig={{onLoad: 'check-sso'}} >
    <Router history={sendTrackingData ? matomo.connectToHistory(history) : history}>
      <App />
    </Router>
  </KeycloakProvider>, document.getElementById('root'))
registerServiceWorker()
