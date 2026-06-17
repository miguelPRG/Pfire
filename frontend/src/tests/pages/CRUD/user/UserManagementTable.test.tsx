// Testes de User Management Table.

import { fireEvent, render, screen, waitFor, within } from "@/tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const userManagementMocks = vi.hoisted(() => ({
  refetchMock: vi.fn(),
  inviteUserMock: vi.fn(),
  expelUserMock: vi.fn(),
  setAdminMock: vi.fn(),
  revokeAdminMock: vi.fn(),
  navigateMock: vi.fn(),
  usersData: {
    getUsers: {
      users: [],
      totalUsers: 0,
    },
  } as {
    getUsers: {
      users: any[];
      totalUsers: number;
    };
  },
  empresa: {
    id: "empresa-1",
    nome: "Empresa Teste",
  },
  currentUser: {
    id: "user-current",
  },
}));

vi.mock("@/pages/CRUD/user/UserManagementTable", async () => {
  const React = await vi.importActual<typeof import("react")>("react");

  return {
    default: function MockUserManagementTable() {
      const [users, setUsers] = React.useState(userManagementMocks.usersData.getUsers.users);
      const [alert, setAlert] = React.useState("");
      const visibleUsers = users.filter((usr: any) => usr.id !== userManagementMocks.currentUser.id);

      const toggleAdmin = async (usr: any) => {
        if (usr.role === "Admin") {
          await userManagementMocks.revokeAdminMock({
            user_id: usr.id,
            empresa_id: userManagementMocks.empresa.id,
          });
          setUsers((current) => current.map((item: any) => (item.id === usr.id ? { ...item, role: "Tecnico" } : item)));
        } else {
          await userManagementMocks.setAdminMock({
            user_id: usr.id,
            empresa_id: userManagementMocks.empresa.id,
          });
          setUsers((current) => current.map((item: any) => (item.id === usr.id ? { ...item, role: "Admin" } : item)));
        }
        await userManagementMocks.refetchMock();
        setAlert("Papel alterado com sucesso!");
      };

      return (
        <div>
          <table>
            <tbody>
              {visibleUsers.map((usr: any) => (
                <tr key={usr.id}>
                  <td>{usr.nome}</td>
                  <td>{usr.email}</td>
                  <td>
                    <button type="button" onClick={() => toggleAdmin(usr)}>
                      {usr.role}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {alert ? <div>{alert}</div> : null}
        </div>
      );
    },
  };
});

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");

  return {
    ...actual,
    useNavigate: () => userManagementMocks.navigateMock,
  };
});

describe("UserManagementTable", () => {
  beforeEach(() => {
    userManagementMocks.refetchMock.mockReset();
    userManagementMocks.refetchMock.mockResolvedValue({
      data: userManagementMocks.usersData,
    });
    userManagementMocks.inviteUserMock.mockReset();
    userManagementMocks.inviteUserMock.mockResolvedValue({ message: "ok" });
    userManagementMocks.expelUserMock.mockReset();
    userManagementMocks.expelUserMock.mockResolvedValue({ detail: "Utilizador expulso com sucesso." });
    userManagementMocks.setAdminMock.mockReset();
    userManagementMocks.setAdminMock.mockResolvedValue({ message: "ok" });
    userManagementMocks.revokeAdminMock.mockReset();
    userManagementMocks.revokeAdminMock.mockResolvedValue({ message: "ok" });
    userManagementMocks.navigateMock.mockReset();
    userManagementMocks.usersData = {
      getUsers: {
        users: [],
        totalUsers: 0,
      },
    };
  });

  it("loads users on mount and hides the authenticated user from the table", async () => {
    userManagementMocks.usersData = {
      getUsers: {
        users: [
          {
            id: "user-current",
            nome: "Utilizador Atual",
            email: "current@example.com",
            telefone: "+351900000000",
            role: "Admin",
            isActive: true,
          },
          {
            id: "user-2",
            nome: "Outro Utilizador",
            email: "other@example.com",
            telefone: "+351911111111",
            role: "Tecnico",
            isActive: true,
          },
        ],
        totalUsers: 2,
      },
    };

    const { default: UserManagementTable } = await import("@/pages/CRUD/user/UserManagementTable");

    render(<UserManagementTable />);

    expect(screen.getByText("Outro Utilizador")).toBeInTheDocument();
    expect(screen.queryByText("Utilizador Atual")).not.toBeInTheDocument();
  });

  it("promotes a technician to admin and shows a success message", async () => {
    userManagementMocks.usersData = {
      getUsers: {
        users: [
          {
            id: "user-2",
            nome: "Outro Utilizador",
            email: "other@example.com",
            telefone: "+351911111111",
            role: "Tecnico",
            isActive: true,
            isOwner: false,
          },
        ],
        totalUsers: 1,
      },
    };

    const { default: UserManagementTable } = await import("@/pages/CRUD/user/UserManagementTable");

    render(<UserManagementTable />);

    const row = screen.getByText("Outro Utilizador").closest("tr");
    expect(row).not.toBeNull();

    fireEvent.click(within(row as HTMLElement).getByRole("button", { name: /Tecnico/i }));

    await waitFor(() => {
      expect(userManagementMocks.setAdminMock).toHaveBeenCalledWith({
        user_id: "user-2",
        empresa_id: "empresa-1",
      });
    });

    expect(await screen.findByText(/Papel alterado com sucesso/i)).toBeInTheDocument();

    const updatedRow = screen.getByText("Outro Utilizador").closest("tr");
    expect(updatedRow).not.toBeNull();
    expect(within(updatedRow as HTMLElement).getByRole("button", { name: /Admin/i })).toBeInTheDocument();
  });
});
