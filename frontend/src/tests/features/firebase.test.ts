// Testes de firebase.

import { beforeEach, describe, expect, it, vi } from "vitest";

const firebaseAuthMocks = vi.hoisted(() => ({
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  getIdToken: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  OAuthProvider: vi.fn(),
}));

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({ name: "test-app" })),
}));

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
  signInWithPopup: firebaseAuthMocks.signInWithPopup,
  signOut: firebaseAuthMocks.signOut,
  GoogleAuthProvider: firebaseAuthMocks.GoogleAuthProvider,
  OAuthProvider: firebaseAuthMocks.OAuthProvider,
}));

describe("firebase", () => {
  beforeEach(() => {

    firebaseAuthMocks.signInWithPopup.mockReset();
    firebaseAuthMocks.signOut.mockReset();
    firebaseAuthMocks.getIdToken.mockReset();
    firebaseAuthMocks.GoogleAuthProvider.mockReset();
    firebaseAuthMocks.OAuthProvider.mockReset();
  });

  it("returns user and id token after a successful Google login", async () => {
    firebaseAuthMocks.signInWithPopup.mockResolvedValue({
      user: { getIdToken: firebaseAuthMocks.getIdToken },
    });
    firebaseAuthMocks.getIdToken.mockResolvedValue("firebase-id-token");

    const { FirebaseLogin } = await import("@/firebase");

    await expect(FirebaseLogin("google")).resolves.toEqual({
      user: { getIdToken: firebaseAuthMocks.getIdToken },
      idToken: "firebase-id-token",
    });
    expect(firebaseAuthMocks.GoogleAuthProvider).toHaveBeenCalledTimes(1);
  });

  it("uses the Microsoft OAuth provider when requested", async () => {
    firebaseAuthMocks.signInWithPopup.mockResolvedValue({
      user: { getIdToken: firebaseAuthMocks.getIdToken },
    });
    firebaseAuthMocks.getIdToken.mockResolvedValue("ms-token");

    const { FirebaseLogin } = await import("@/firebase");

    await FirebaseLogin("microsoft");

    expect(firebaseAuthMocks.OAuthProvider).toHaveBeenCalledWith("microsoft.com");
  });

  it("rejects unsupported providers before opening the popup", async () => {
    const { FirebaseLogin } = await import("@/firebase");

    await expect(FirebaseLogin("facebook" as "google")).rejects.toThrow(/não suportado/i);
    expect(firebaseAuthMocks.signInWithPopup).not.toHaveBeenCalled();
  });

  it("logs out successfully through FirebaseLogout", async () => {
    firebaseAuthMocks.signOut.mockResolvedValue(undefined);

    const { FirebaseLogout } = await import("@/firebase");

    await expect(FirebaseLogout()).resolves.toBe("Deslogado com sucesso");
    expect(firebaseAuthMocks.signOut).toHaveBeenCalledTimes(1);
  });
});
