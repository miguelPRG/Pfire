import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider, OAuthProvider, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDzDDGXjyNXOzCT62GVL2kEwMBIrBCUJEM",
  authDomain: "pfireteste-11849.firebaseapp.com",
  projectId: "pfireteste-11849",
  storageBucket: "pfireteste-11849.firebasestorage.app",
  messagingSenderId: "97973330673",
  appId: "1:97973330673:web:0893e5be3fdda19e42ff50",
  measurementId: "G-WSHC314NCX",
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Funções para login
const FirebaseLogin = async (providerName: "google" | "facebook" | "microsoft") => {
  let provider;
  
  switch (providerName.toLowerCase()) {
    case "google":
      provider = new GoogleAuthProvider();
      break;
    case "facebook":
      provider = new FacebookAuthProvider();
      break;
    case "microsoft":
      provider = new OAuthProvider("microsoft.com");
      break;
    default:
      throw new Error("Provedor não suportado!");
  }

  return signInWithPopup(auth, provider)
    .then((result) => result.user)
    .catch((error) => { throw error; });
  
  
};

const FirebaseLogout = async () => {
  return signOut(auth)
    .then(() => "Deslogado com sucesso")
    .catch((error) => { throw error; });
};

export { auth, FirebaseLogin, FirebaseLogout };
