import { useState, useEffect, createContext } from "react";
import { useQuery } from "@apollo/client";
import { GET_EMPRESAS } from "../graphql/empresasqueries";

interface Empresa{
    empresaId: string;
    nome: string;
    nif: string;
    telefone: string;
    postalCode: string;
    morada: string;
    localidade: string;
    logo: string | null;
    isAdmin: boolean | null;
    creadtedBy: string | null;
    createdAt: Date | null;
    updatedBy: string | null;
    updatedAt: Date | null;
}

/* id
      nome
      nif
      telefone
      morada
      localidade
      logo
      isAdmin
      codigoPostal
      createdBy
      createdAt
      updatedBy
      updatedAt*/

interface EmpresaContextType {
    empresa: Empresa;
    chooseCompany: (id: string) => void;
}

const EmpresaContext = createContext<EmpresaContextType | undefined>(undefined);

export const EmpresaProvider = ({ children }: { children: React.ReactNode }) => {
    const[empresa, SetEmpresa] = useState<Empresa | null>(null);

    useEffect(() => {

        const storedEmpresa = localStorage.getItem("empresa");
        if (storedEmpresa) {
            const parsedEmpresa = JSON.parse(storedEmpresa);
            SetEmpresa(parsedEmpresa);
        }

    }, []);

    const chooseCompany = (id: string) => {
        
        const selectedEmpresa = data?.empresas.find((empresa: Empresa) => empresa.id === id);
        if (selectedEmpresa) {
            SetEmpresa(selectedEmpresa);
            localStorage.setItem("empresa", JSON.stringify(selectedEmpresa));
        }
        
    };


   return;
};