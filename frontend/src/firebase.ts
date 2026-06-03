import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, OAuthProvider, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCCKIqR_EjBgPMx-O_x6EezVQGzbhWkprY",
  authDomain: "pfire-390df.firebaseapp.com",
  projectId: "pfire-390df",
  storageBucket: "pfire-390df.firebasestorage.app",
  messagingSenderId: "267766735341",
  appId: "1:267766735341:web:292af01d64f13561c087e4",
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Funções para login
const FirebaseLogin = async (providerName: "google" | "microsoft") => {
  let provider;

  switch (providerName.toLowerCase()) {
    case "google":
      provider = new GoogleAuthProvider();
      break;

    case "microsoft":
      provider = new OAuthProvider("microsoft.com");
      break;
    default:
      throw new Error("Provedor não suportado!");
  }

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Obtém o ID Token do Firebase
    const idToken = await user.getIdToken();

    return { user, idToken }; // Retorna o usuário e o token
  } catch (error) {
    throw error;
  }
};

const FirebaseLogout = async () => {
  return signOut(auth)
    .then(() => "Deslogado com sucesso")
    .catch((error) => {
      throw error;
    });
};

export { auth, FirebaseLogin, FirebaseLogout };
