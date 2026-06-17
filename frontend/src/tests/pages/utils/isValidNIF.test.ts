// Testes de is Valid NIF.

import { describe, expect, it } from "vitest";
import isValidNIF from "@/pages/utils/isValidNIF";

// Agrupa os testes de isValidNIF.
describe("isValidNIF", () => {
  // Verifica o cen?rio: accepts a valid nif passed as number or formatted string.
  it("accepts a valid nif passed as number or formatted string", () => {
    expect(isValidNIF(512345678)).toBe(true);
    expect(isValidNIF("512.345.678")).toBe(true);
  });

  // Verifica o cen?rio: rejects invalid values.
  it("rejects invalid values", () => {
    expect(isValidNIF(null)).toBe(false);
    expect(isValidNIF(undefined)).toBe(false);
    expect(isValidNIF("412345678")).toBe(false);
    expect(isValidNIF("512345679")).toBe(false);
    expect(isValidNIF("1234")).toBe(false);
  });
});
