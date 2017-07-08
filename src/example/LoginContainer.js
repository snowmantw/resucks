import PropTypes from 'prop-types';
import Resucks, { Renderers, Signals as ResucksSignals } from '../Resucks.js';
import Login from './Login.js'


/**
 * Container works as a signal router and signal source:
 *
 * 1. Signal source issue a Signal
 * 2. Resucks dispatch that to the corresponding containers
 * 3. Container renders corresopnding effect after signal payload transformation and store querying
 * 4. The effect rendering may issue another signal
 *
 * Since container's lifecycle is binding on DOM rendering effect,
 * only those mounted containers should issue signals.
 *
 * Therefore, usually for those 'daemon' like signal emitter, like Geolocation watcher,
 * should be put in App (or similar) container as the most long-life container, and just simply
 * bridge the 'daemon' API by call Resucks.emit everytime it emitts a new signal.
 *
 * In this case it should be a full class container, in order to catch the lifecycle of
 * mounting and unmounting to bridge and un-bridge the signal.
 *
 * If this is too complicated, Resucks probide a builder for building these service containers.
 * In either way, a pure service container must be declared and have user containers nested.
 * This is also the way to build a multiple-effect stack in declarative programming:
 *
 * <App>
 * <Geolocation>
 *   <ShowGeolocation />
 * </Geolocation>
 * </App>
 *
 */
const LoginContainer = () => {
  const res = Resucks.instance();
  const routerDefault = Resucks.route(ResucksSignals.Mount).transformer(async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ uid: 'test-uid-test' });
      }, 200);
    });
  }).render(Login, Signals.GeolocationRequire);

  const routerTrialEffect = Resucks.route(Signals.GeolocationRequire)
    .effect(Renderers.IO, LoginContainerTrialEffect, Signals.GeolocationResponse);

  const routerTrialRender = Resucks.route(Signals.GeolocationResponse)
    .query(ResucksSignals.Mount)
    .query(Signals.GeolocationResponse)
    .transformer((f, g) => { console.debug('queried: ', f, ',', g); return {}; })
    .render(Login);  // TODO: make render also as an effect. And remove these trial routes

  // One container one render: render effect.
  // And maybe one or no signal. But no more than one.
  // Can define no React rendering target to render different effects than DOM.

  const result = res.party(LoginContainer)
    .contract(routerDefault)
    .contract(routerTrialEffect)
    .contract(routerTrialRender)
    .done();
  return result;
};

const LoginContainerTrialEffect = (io) => {
  // TODO: error.... handling
  //       devTool need to turn on sensor to make geolocation emulator works.
  // TODO: actually this is not a good way since geolocation should be a renderer.
  return new Promise((res) => {
    navigator.geolocation.getCurrentPosition(function(position) {
      res({latitude: position.coords.latitude, longitude: position.coords.longitude});
    });
  });
};

const Signals = {
  SingUp: { name: 'sign-up', host: LoginContainer, payload: { uid: PropTypes.string } },
  SignIn: { name: 'sign-in', host: LoginContainer },
  GeolocationRequire: { name: 'geolocation-require', host: LoginContainer },
  GeolocationResponse: { name: 'geolocation-response', host: LoginContainer,
    payload: { latitude: PropTypes.string, longitude: PropTypes.string }
  }
}

export default LoginContainer;
export { Signals };
