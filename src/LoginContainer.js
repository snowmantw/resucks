import Resucks from './Resucks.js';
import Login from './Login.js'
import 


/**
 * Container works as a router from Signal + AppState to Component.
 * Every registered Signal will be matched to different logic to chose different Component.
 *
 * So Container will register itself to Resucks, and get
 * Signal payload and AppState when the specific Signals triggered.
 *
 * Every single router in one Container will specify:
 *
 * 1.  What signal it will deal with (Resucks.route)
 * 2.  What data it should gather from AppState (query)
 * 3.  What operations it will perform for transforming the data (transform)
 * 4.  How to dispatch to different logic (dispatch)
 * 5.1 If the dispatch to rendering, call for Component (render)
 * 5.2 If the dispatch to render nothing, it works as state machine firing another signal (signal)
 *
 * Signals will perform CRUD to the AppStore, according to its payload and host (Signal schema)
 * Some signals come without payload, Resucks update dummy counter for them (may equal to noop).
 *
 * Query is made by Host + Signal + Payload Name, since AppState is
 * strictly made from every single trace of signal.
 *
 * For simple container & components they don't need to register for Signal.
 *
 * If the container just need to read some AppState, them have a router without the signal
 * parameter of the `route` call.
 *
 * This is equal to register a signal for being notified when the component get mounted.
 */
const LoginContainer() => {
  const res = Resucks.instance();
  const router = Resucks.route().render(Login)
  res.contract(LoginContainer, router);
}

Signals = {
  SingUp: { name: 'sign-up', host: LoginContainer, payload: { uid: PropTypes.string } }
  SignIn: { name: 'sign-in', host: LoginContainer }
}

export default LoginContainer;
export { Signals };
