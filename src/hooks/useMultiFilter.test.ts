import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useMultiFilter } from "./useMultiFilter";

const mockItems = [
  { id: "1", status: "active", type: "residential", projects: { name: "Project A" } },
  { id: "2", status: "paused", type: "commercial", projects: { name: "Project B" } },
  { id: "3", status: "active", type: "commercial", projects: { name: "Project A" } },
];

describe("useMultiFilter", () => {
  it("returns all items when filters are empty", () => {
    const { result } = renderHook(() => useMultiFilter(mockItems, {}));
    expect(result.current).toHaveLength(3);
  });

  it("filters by a single property (OR logic within category)", () => {
    const { result } = renderHook(() => 
      useMultiFilter(mockItems, { status: ["active"] })
    );
    expect(result.current).toHaveLength(2);
    expect(result.current.map(i => i.id)).toEqual(["1", "3"]);

    const { result: result2 } = renderHook(() => 
      useMultiFilter(mockItems, { status: ["active", "paused"] })
    );
    expect(result2.current).toHaveLength(3);
  });

  it("filters by multiple properties (AND logic between categories)", () => {
    const { result } = renderHook(() => 
      useMultiFilter(mockItems, { status: ["active"], type: ["residential"] })
    );
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe("1");
  });

  it("handles nested properties with dot or colon notation", () => {
    const { result } = renderHook(() => 
      useMultiFilter(mockItems, { "projects.name": ["Project A"] })
    );
    expect(result.current).toHaveLength(2);
    expect(result.current.map(i => i.id)).toEqual(["1", "3"]);

    const { result: resultColon } = renderHook(() => 
      useMultiFilter(mockItems, { "projects:name": ["Project A"] })
    );
    expect(resultColon.current).toHaveLength(2);
    expect(resultColon.current.map(i => i.id)).toEqual(["1", "3"]);
  });

  it("returns empty when no items match AND logic", () => {
    const { result } = renderHook(() => 
      useMultiFilter(mockItems, { status: ["paused"], type: ["residential"] })
    );
    expect(result.current).toHaveLength(0);
  });

  it("handles null/undefined items gracefully", () => {
    const { result } = renderHook(() => useMultiFilter(null, {}));
    expect(result.current).toEqual([]);
  });
});
