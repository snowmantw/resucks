import React from 'react';

const Login = (props) => {
  if (props.uid) {
    return (
      <div>
        Hello, {props.uid}
      </div>
    );
  } else {
    return (
      <div>
        First login...
      </div>
    );
  }
}

export default Login;
