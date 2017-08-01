/**
 * Because Redux is too good to be used to connect React in some projects.
 * Yet another dirty module to push reactive states through React Containers.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import Immutable from 'immutable';

class Resucks {

  constructor() {
    // Maybe more tricks like immutable or IndexedDb
    this._app = Immutable.fromJS({});
    this._registry = {};
  }

  party(partyContainer) {
    const resucks = this;
    return {
      contract(routerBuilder) {
        const router = RouterBuilder._done(routerBuilder);
        return new ContractBuilder(partyContainer, router, resucks);
      }
    };
  }

  emit(container, emitSignal) {
    if (!container || !emitSignal) { throw new Error('Cannot emit undefined signal'); }

    const {name, host, payload} = emitSignal;

    // React handles difference. Resucks just update data every time.
    if (payload) {
      this._app = this._app.setIn([host.name, name], Immutable.fromJS(payload));
    } else {
      const counter = this._app.getIn([host.name, name]);
      if (!counter) {
        this._app = this._app.setIn([host.name, name], Immutable.fromJS({__invoked__: 0}));
      } else {
        this._app = this._app.setIn([host.name, name],
          Immutable.fromJS({__invoked__: counter.get('__invoked__') + 1})
        );
      }
    }

    // Then we notify all registerd routers.
    const hostRouters = this._registry[host.name]
    if (!hostRouters) { return; }  // No one registered router for this signal's host yet.

    // Can accept multiple routers out-of-order for their transformers.
    Object.keys(hostRouters).forEach(async (routerId) => {
      const router = hostRouters[routerId];
      const { _signalSpec, _queries, _transformer, _filter, _route, _containerInstance } = router;

      if (_signalSpec.name !== emitSignal.name) {
        return;
      }

      if (_signalSpec.payload &&
          !this._checkSignalPayload(emitSignal.payload, _signalSpec.payload)) {
        throw new Error(`Invalid signal payload failed to match the spec: ${_signalSpec.payload}`);
      }

      const queried = this._query(_queries, this._app);
      const transformed = await this._transform(_transformer, queried);
      const route = this._filter(_filter, _route, transformed);
    
      if (!route) { return; } // Cannot get expected filtered route.
      const { signal: nextSignal, component, effect } = route;

      // React renderer
      if (component) {
        // Update the UI, then issue the signal if it has.
        _containerInstance.setState({ component: component, propPayload: transformed }, () => {
          if (nextSignal) { this.emit(_containerInstance, nextSignal); }
        });
      } else if (effect) {
        // Effect renderer.
        const unwrappedResult = await effect(effect.renderer);
        nextSignal.payload = unwrappedResult;
        if (nextSignal) { this.emit(_containerInstance, nextSignal); }
      }
    });
  }
  
  /**
   * Can be extended for more tests.
   */
  _checkSignalPayload(signalName, payload, payloadSpec) {
    PropTypes.checkPropTypes(payloadSpec, payload, 'payload', signalName);
    return true;  // Need a true checker can return things without just printing warning...
  }

  _query(queries, store) {
    if (!queries) { return; }

    const queried = [];
    for (let { keyPath } of queries) {
      let rr = store.getIn(keyPath);
      queried.unshift(rr.toJS());
    }
    return queried;
  }

  async _transform(transformer, queried) {
    if (!queried) {
      return await transformer();
    } else {
      return await transformer(...queried);
    }
  }

  _filter(filter, route, transformed) {
    try {
      if (filter(transformed)) {
        return route;
      } else {
        console.error(`Cannot get matching result when filtering: ${route.description}`);
      }
    } catch(e) {
      throw new Error(`Error when filtering: ${route.description} ${e.message}`);
    }
  }

  _register(router) {
    if (!this._registry[router._signalSpec.hostname]) { this._registry[router._signalSpec.hostname] = {}; }
    this._registry[router._signalSpec.hostname][router._id] = router;
  }

  _unregister(router) {
    if (!this._registry[router._signalSpec.hostname][router._id]) { return; }
    delete this._registry[router._signalSpec.hostname][router._id];
  }
}

Resucks.instance = () => {
  if (!Resucks._instance) {
    Resucks._instance = new Resucks();
  }
  return Resucks._instance;
}

Resucks.route = (signal) => {
  if (!signal) { throw new Error('Cannot build route on empty signal'); }
  return new RouterBuilder(signal);
}

/**
 * An helper to create a dummy component (for complianting with React render,
 * which doesn't support multiple renderers at the same environment)
 *
 * The `renderer` is under Resucks. For example, Resucks.Renderers.IO.
 * The `eff` is a function as 'component' perform specific effect.
 *
 * When invoking the eff function, the renderer will be the first argument.
 * So the effect, as it is designed, should rely one the effect renderer to perform actions.
 */
Resucks.effect = (renderer, eff) => {
  eff.renderer = renderer;
  return eff;
}

class ContractBuilder {

  constructor(partyContainer, router, resucks) {
    this._party = partyContainer;
    this._routers = [];
    this._routers.push(router)
    this._resucks = resucks;
  }

  contract(routerBuilder) {
    const router = RouterBuilder._done(routerBuilder);
    this._routers.push(router)
    return this;
  }

  /**
   * To build the final contract component class to return.
   * This is our "container component generator" as other Re*x framework
   */
  done() {
    const builder = this;
    const resucks = this._resucks;
    const result = class extends Component {
      constructor(props) {
        super(props);
        this.state = {};
        this._routers = builder._routers;
      }

      componentWillMount() {
        for (let router of this._routers) {
          resucks._register(router);
          router._containerInstance = this;
          router._container = builder._party
        }
        
        // Emit to the first 'show' signal.
        // Since the routing code will only be executed when some signals triggered,
        // but React ask for the component to be determinated before that.
        resucks.emit(this, { name: 'mount', host: { name: 'Resucks' },
          payload: { container: this._routers[0]._container.name }});
      }

      componentWillUmount() {
        for (let router of this._routers) {
          resucks._unregister(router);
          delete router._containerInstance;
        }
      }

      render() {
        // The first render, must be with a default empty one.
        // This is because our 'emit' can only trigger rendering via setState,
        // which will only be called after the first rendering.
        if (!this.state.component) {
          return (<div></div>)
        }
        else {
          return (<div>{ new this.state.component(this.state.propPayload) }</div>);
        }
      }
    }
    return new result();
  }
}

class Router {
  constructor(_id, _signalSpec, _queries, _transformer, _filter, _route) {
    this._id = _id;
    this._signalSpec = _signalSpec;
    this._queries = _queries;
    this._transformer = _transformer;
    this._filter = _filter;
    this._route = _route;
  }
}

class RouterBuilder {

  constructor(signalSpec) {
    if (!signalSpec) { throw new Error('Cannot construct router on undefined signal spec'); }

    // The default blueprint will be changed after user build it.
    this._building = {
      _id: `${RouterBuilder._updateId()}${Date.now()}`,
      _signalSpec:  {
        name: signalSpec.name,
        hostname: signalSpec.host.name,
        payload: signalSpec.payload  // with PropTypes as spec.
      }, 
      _transformer: () => { return {}; },

      // Filter must be: TransformedData -> Boolean
      // If it is not Route, means an error.
      _filter: (transformed) => {
        return true;
      },

      // Route record: {signal (for next round), component}
      _route: {} 
    };
  }

  query(signalSpec) {
    if (!this._building._queries) {
      this._building._queries = [];
    }
    this._building._queries.unshift({keyPath: [signalSpec.host.name, signalSpec.name]});
    return this;
  }

  transformer(transformer) {
    this._building._transformer = transformer;
    return this;
  }

  /**
   * When receive the signal, and after trasformation and filtering, do render.
   *
   * Rendering component is React component for UI rendering.
   *
   * Signal is optional: if there is one, it will be emitted after the component has been rendered.
   *
   * After this function the building should be considered done and append no more actions.
   */
  render(component, signal) {
    this._building._route = { component, signal };  
    return this;
  }

  /**
   * After this function the building should be considered done and append no more actions.
   *
   * Notice: as 'render', effect will be asynchrnously invoked, and only signal can be guarenteed
   * to be scheduled after the effect rendering.
   */
  effect(renderer, effFunction, signal) {
    const wrappedEff = Resucks.effect(renderer, effFunction);
    this._building._route = { effect: wrappedEff, signal };  
    return this;
  }
}

/**
 * Saves the troube of calling this after every new route.
 * This will be called when one registers a router (actually a router builder before done).
 */ 
RouterBuilder._done = (builder) => {
  return new Router(
    builder._building._id,
    builder._building._signalSpec,
    builder._building._queries,
    builder._building._transformer,
    builder._building._filter,
    builder._building._route
  );
} 

RouterBuilder._updateId = () => {
  if (!RouterBuilder._id) { RouterBuilder._id = 0 };
  RouterBuilder._id += 1;
  return RouterBuilder._id;
}

const Renderers = {};
Renderers.IO = {
  fetch() {
    return self.fetch.apply(self, arguments); // eslint-disable-line no-restricted-globals
  }
};

const Signals = {
  Mount: { name: 'mount', host: { name: 'Resucks' }, payload: { container: PropTypes.string } }
}

export default Resucks;
export { Signals, Renderers };
