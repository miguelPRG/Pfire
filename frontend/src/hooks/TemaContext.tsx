import { createContext, useState, useContext, ReactNode, lazy, Suspense } from "react";

const LightTheme = lazy(() => import("../assets/lightTheme"));
const DarkTheme = lazy(() => import("../assets/darkTheme"));

interface TemaContextProps {
    darkMode: boolean;
    toggleTheme: () => void;
}

const TemaContext = createContext<TemaContextProps | undefined>(undefined);

export const useTema = () => {
    const context = useContext(TemaContext);
    if (!context) {
        throw new Error("useTheme must be used within a TemaProviderCustom");
    }
    return context;
};

export function TemaProvider({ children }: {children: ReactNode}) {
    const [darkMode, setDarkMode] = useState(false);

    const toggleTheme = () => {
        setDarkMode((prevMode) => !prevMode);
    };

    return (
        <TemaContext.Provider value={{ darkMode, toggleTheme }}>
            <Suspense>
                {darkMode ? 
                <DarkTheme >{children}</DarkTheme> : 
                <LightTheme >{children}</LightTheme>
                }
            </Suspense>
        </TemaContext.Provider>
    );
}