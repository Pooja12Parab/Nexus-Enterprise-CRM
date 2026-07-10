import { describe, it, expect, beforeEach } from "vitest";
import { useSelection } from "@/stores/selection";

describe("useSelection store", () => {
  beforeEach(() => {
    useSelection.getState().clearSelection();
  });

  it("toggleId adds id to set", () => {
    useSelection.getState().toggleId("emp-1");
    expect(useSelection.getState().selectedIds.has("emp-1")).toBe(true);
  });

  it("toggleId removes id if already present", () => {
    useSelection.getState().toggleId("emp-1");
    useSelection.getState().toggleId("emp-1");
    expect(useSelection.getState().selectedIds.size).toBe(0);
  });

  it("selectAll sets all ids", () => {
    useSelection.getState().selectAll(["emp-1", "emp-2", "emp-3"]);
    expect(useSelection.getState().selectedIds.size).toBe(3);
    expect(useSelection.getState().selectedIds.has("emp-1")).toBe(true);
    expect(useSelection.getState().selectedIds.has("emp-2")).toBe(true);
    expect(useSelection.getState().selectedIds.has("emp-3")).toBe(true);
  });

  it("clearSelection empties the set", () => {
    useSelection.getState().selectAll(["emp-1", "emp-2"]);
    expect(useSelection.getState().selectedIds.size).toBe(2);
    useSelection.getState().clearSelection();
    expect(useSelection.getState().selectedIds.size).toBe(0);
  });

  it("isSelected returns true for selected id", () => {
    useSelection.getState().toggleId("emp-1");
    expect(useSelection.getState().isSelected("emp-1")).toBe(true);
    expect(useSelection.getState().isSelected("emp-2")).toBe(false);
  });
});