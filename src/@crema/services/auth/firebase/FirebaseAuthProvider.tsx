import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useDispatch } from "react-redux";
import {
  auth,
  facebookAuthProvider,
  githubAuthProvider,
  googleAuthProvider,
  twitterAuthProvider,
} from "./firebase";
import { AuthUser } from "../../../../types/models/AuthUser";
import {
  fetchError,
  fetchStart,
  fetchSuccess,
} from "../../../../redux/actions";
import axios from "axios";
import Alert from "@mui/material/Alert";

interface IUser {
  uid?: string;
  displayName?: string;
  email?: string;
}
interface FirebaseContextProps {
  user: AuthUser | null | undefined | IUser | string;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface SignUpProps {
  name: string;
  email: string;
  password: string;
}

interface SignInProps {
  email: string;
  password: string;
}

interface FirebaseActionsProps {
  createUserWithEmailAndPassword: (data: SignUpProps) => void;
  signInWithEmailAndPassword: (data: SignInProps) => void;
  signInWithPopup: (type: string) => void;
  logout: () => void;
}

const FirebaseContext = createContext<FirebaseContextProps>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
});
const FirebaseActionsContext = createContext<FirebaseActionsProps>({
  createUserWithEmailAndPassword: () => {},
  signInWithEmailAndPassword: () => {},
  signInWithPopup: () => {},
  logout: () => {},
});

export const useFirebase = () => useContext(FirebaseContext);

export const useFirebaseActions = () => useContext(FirebaseActionsContext);

interface FirebaseAuthProviderProps {
  children: ReactNode;
}

const FirebaseAuthProvider: React.FC<FirebaseAuthProviderProps> = ({
  children,
}) => {
  const [firebaseData, setFirebaseData] = useState<FirebaseContextProps>({
    user: undefined,
    isLoading: true,
    isAuthenticated: false,
  });
  const dispatch = useDispatch();
  console.log(firebaseData);

  useEffect(() => {
    const getAuthUser = auth.onAuthStateChanged(
      (user) => {
        setFirebaseData({
          user: user as AuthUser,
          isAuthenticated: Boolean(user),
          isLoading: false,
        });
      },
      () => {
        setFirebaseData({
          user: firebaseData.user,
          isLoading: false,
          isAuthenticated: false,
        });
      },
      () => {
        setFirebaseData({
          user: firebaseData.user,
          isLoading: false,
          isAuthenticated: true,
        });
      }
    );

    return () => {
      getAuthUser();
    };
  }, [firebaseData.user]);

  const getProvider = (providerName: string) => {
    switch (providerName) {
      case "google": {
        return googleAuthProvider;
      }
      case "facebook": {
        return facebookAuthProvider;
      }
      case "twitter": {
        return twitterAuthProvider;
      }
      case "github": {
        return githubAuthProvider;
      }
      default:
        return googleAuthProvider;
    }
  };

  const signInWithPopup = async (providerName: string) => {
    dispatch(fetchStart());
    try {
      const { user } = await auth.signInWithPopup(getProvider(providerName));
      setFirebaseData({
        user: user as AuthUser,
        isAuthenticated: true,
        isLoading: false,
      });
      dispatch(fetchSuccess());
    } catch ({ message }) {
      setFirebaseData({
        ...firebaseData,
        isAuthenticated: false,
        isLoading: false,
      });
      dispatch(fetchError(message as string));
    }
  };

  const signInWithEmailAndPassword = async ({
    email,
    password,
  }: SignInProps) => {
    if (localStorage.getItem('token')) {
      console.log('token true')
      setFirebaseData({
        user: null,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      console.log('token false')
      dispatch(fetchStart());
      try {
        const response = await axios.post("http://3.138.61.64/auth/login", {
          email,
          password,
        });
        localStorage.setItem("token", response?.data?.access_token);
        if (response?.data?.access_token) {
          try {
            // const { user } = await auth.signInWithEmailAndPassword(email, password);
            setFirebaseData({
              user: null,
              isAuthenticated: true,
              isLoading: false,
            });
            dispatch(fetchSuccess());
          } catch ({ message }) {
            setFirebaseData({
              ...firebaseData,
              isAuthenticated: false,
              isLoading: false,
            });
            dispatch(fetchError(message as string));
          }
        } else <Alert severity="error">'error'</Alert>;
      } catch (e) {
        <Alert severity="error">{e?.response?.data?.message}</Alert>;
      }
    }
  };
  const createUserWithEmailAndPassword = async ({
    name,
    email,
    password,
  }: SignUpProps) => {
    console.log("name, email, password", name, email, password);
    dispatch(fetchStart());
    try {
      const { user } = await auth.createUserWithEmailAndPassword(
        email,
        password
      );
      await auth!.currentUser!.sendEmailVerification({
        url: window.location.href,
        handleCodeInApp: true,
      });
      await auth!.currentUser!.updateProfile({
        displayName: name,
      });
      setFirebaseData({
        user: { ...user, displayName: name } as AuthUser,
        isAuthenticated: true,
        isLoading: false,
      });
      dispatch(fetchSuccess());
    } catch ({ message }) {
      setFirebaseData({
        ...firebaseData,
        isAuthenticated: false,
        isLoading: false,
      });
      dispatch(fetchError(message as string));
    }
  };

  const logout = async () => {
    localStorage.removeItem('token')
    setFirebaseData({ ...firebaseData, isLoading: true });
    try {
      await auth.signOut();
      setFirebaseData({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    } catch (error) {
      setFirebaseData({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  return (
    <FirebaseContext.Provider
      value={{
        ...firebaseData,
      }}
    >
      <FirebaseActionsContext.Provider
        value={{
          signInWithEmailAndPassword,
          createUserWithEmailAndPassword,
          signInWithPopup,
          logout,
        }}
      >
        {children}
      </FirebaseActionsContext.Provider>
    </FirebaseContext.Provider>
  );
};
export default FirebaseAuthProvider;
