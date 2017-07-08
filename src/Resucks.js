/**
 * Because Redux is too good to be used to connect React.
 * Yet another dirty module to push reactive states through React Containers.
 */

import React, { Component } from 'react';

class Resucks {

  constructor() {

    // Maybe more tricks like immutable or IndexedDb
    this._app = {};
  }

  /**
   * Setup some HOC things.
   */
  contract(host, router) {
    const res = this;
    const hostName = host.name;
    return class extends Component {
      constructor(pros) {
        super(props);
        this.state = {};
      }

      componentDidMount() {
        res._register(hostName, router);
      }

      componentWillUmount() {
        res._unregister(hostName, router);
      }

      render() {
        return <component state={ this.state.state } {...this.props }/>
      }
    }
  }

  emit(signal) {
    const {name, host, payload} = signal;
    if (!this._app[host.name]) { this._app[host.name] = {}; }

    // React handles difference. Resucks just update data every time.
    this._app[host.name][name] = {...payload };
    
    // Then we notify all registerd routers.
    const hostRouters = this._registry[host.name]
    if (!hostRouters) { return; }  // No one registered router for this signal yet.

    // Can accept multiple routers out-of-order for their transformers.
    Object.keys(hostRouters).forEach(async (routerId) => {
      const router = hostRouters[routerId];
      const { _queries, _transformer, _dispatcher } = router;

      const queried = this._query(_queries, this._app);
      const transformed = await this._transform(_transformer, queried);
      const { nextSignal, component } = this._dispatch(_dispatcher, transformed);
      
      // Update the UI, then issue the signal if it has.
      component.setState(transformed, () => {
        if (nextSignal) { this.emit(nextSignal); }
      });
    });
  }

  _register(hostName, router) {
    if (!this._registry[hostName]) { this._registry[hostName] = {}; }
    this._registry[hostName][routerId] = router;
  }

  _unregister(hostName, router) {
    if (!this._registry[hostName]{routerId}) { return; }
    delete this._registry[hostName]{routerId};
  }
}

Resucks.instance = () => {
  if (!Resucks._instance) {
    Resucks._instance = new Resucks();
  }
  return Resucks._instance;
}

Resucks.route = (signal) => {
  return new RouterBuilder(signal);
}

class RouterBuilder {

  constructor(signal) {
    this._building = {
      id: `${RouterBuilder._updateId()}${Date.now()}`
    };
    this._building._signal = signal;
  }

  render(component) {
    this._building._component = component;
    return this._building;
  }
}

RouterBuilder._updateId = () => {
  if (RouterBuilder._id) { RouterBuilder._id = 0 };
  RouterBuilder._id += 1;
  return RouterBuilder._id;
}

export default Resucks;
