import { createContext, useState, useContext, ReactNode, useEffect } from "react";

interface User {
    name: string;
    email: string;
}

interface AuthContextType {
    user: User | null;
    login: (email: string | undefined, pwd: string | undefined) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        async function checkAuth() {
            try {
                const response = await fetch("backend/users/auth", {
                    method: "GET",
                    credentials: "include",
                });

                if (response.ok) {
                    const data = await response.json();
                    setUser({ name: data.name, email: data.email });
                }
            } catch (error) {
                console.error("Erro ao verificar autenticação:", error);
            }
        }

        checkAuth();
    }, []);

    async function login(email: string | undefined, password: string | undefined) {
        const response = await fetch("backend/users/login", { //backend = http://localhost:8000
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
            credentials: "include",
        });

        const data = await response.json();

        if (!response.ok) {
            setUser(null);
            throw data.message || Error("Erro desconhecido do backend");
        }

        setUser({ name: data.name, email: data.email });
    }

    async function logout() {
        await fetch("backend/users/logout", {
            method: "POST",
            credentials: "include",
        });

        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
