import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

function EmailOperation() {
    const [userConfirmation, setUserConfirmation] = useState({ isConfirmed: false, message: "" });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { GLOBAL_ID, OPERATION } = useParams<{ GLOBAL_ID: string, OPERATION: string }>();

    useEffect(() => {
        if (OPERATION === "registo") {
            setLoading(true);
            fetch(`/backend/user/email/activate/${GLOBAL_ID}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
            })
                .then((response) => {
                    if (response.ok) {
                        setUserConfirmation({ isConfirmed: true, message: "Conta confirmada com sucesso!" });
                    } else {
                        setUserConfirmation({ isConfirmed: false, message: "Erro ao confirmar a conta. Provavelmte já foi ativada." });
                    }
                })
                .catch(() => {
                    setUserConfirmation({ isConfirmed: false, message: "Erro ao confirmar a conta. Provavelmte já foi ativada."});
                })
                .finally(() => {
                    setLoading(false);
                });
        }
    }, []);

    useEffect(() => {
        if (!loading && userConfirmation.message) {
            navigate("/login", { state: userConfirmation });
        }
    }, [loading,userConfirmation]);

    if (loading) {
        return <div>A confirmar a sua conta...</div>;
    }

    return null;
}

export default EmailOperation;