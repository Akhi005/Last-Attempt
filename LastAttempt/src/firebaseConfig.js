import { initializeApp } from "firebase/app";
import { getFirestore} from "firebase/firestore"; 

const firebaseConfig = {
  apiKey: "AIzaSyDLeGY6tDp3dUWgigslZz88X0B8mz0dtPY",
  authDomain: "lastattempt-c86cf.firebaseapp.com",
  databaseURL: "https://lastattempt-c86cf-default-rtdb.firebaseio.com",
  projectId: "lastattempt-c86cf",
  storageBucket: "lastattempt-c86cf.firebasestorage.app",
  messagingSenderId: "765070352392",
  appId: "1:765070352392:web:f2830e36ec86a98810f1bd"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
export default db;