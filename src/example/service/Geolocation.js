import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Resucks from '../../Resucks.js';

class GeolocationService extends Component {
  
  componentWillMount() {
		this.watchID = navigator.geolocation.watchPosition((position) => {
			Resucks.instance().emit(this, Object.assign({}, Signals.Update,
					{ payload: {
							latitude: position.coords.latitude,
							longitude: position.coords.longitude }
					})
			)}, (err) => {
				Resucks.instance().emit(this, Object.assign({}, Signals.Error,
					{ payload: {
							message: err }
					})
			)}
		);
  }

  componentWillUnmount() {
		navigator.geolocation.clearWatch(this.watchID);
  }

	render() {
		return (<div className='service geolocation-service'>
							{ this.props.children }
						</div>);
	}
}

const Signals = {
  Update: { name: 'geolocation-service-update', host: GeolocationService,
            payload: { latitude: PropTypes.string, longitude: PropTypes.string }
          },
  Error: { name: 'geolocation-service-error', host: GeolocationService,
						payload: { message: PropTypes.string }
					}
};


export default GeolocationService;
export { Signals };
