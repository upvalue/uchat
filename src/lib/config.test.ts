import { describe, it, expect, beforeEach } from "vitest";
import { getConfig, setConfig, clearConfig } from "./config";

describe("config", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when no config is stored", () => {
    expect(getConfig()).toBeNull();
  });

  it("round-trips a config through set and get", () => {
    const cfg = { serverUrl: "http://localhost:6767", username: "alice" };
    setConfig(cfg);
    expect(getConfig()).toEqual(cfg);
  });

  it("returns null for corrupt JSON", () => {
    localStorage.setItem("uchat-config", "not-json");
    expect(getConfig()).toBeNull();
  });

  it("clears the stored config", () => {
    setConfig({ serverUrl: "http://localhost:6767", username: "bob" });
    clearConfig();
    expect(getConfig()).toBeNull();
  });
});
