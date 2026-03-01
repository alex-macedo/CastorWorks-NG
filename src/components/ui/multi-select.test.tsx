import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MultiSelect } from "@/components/ui/multi-select";
import "@testing-library/jest-dom";

// Mock the virtualizer to just render everything
vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: vi.fn().mockImplementation(({ count }) => ({
    getVirtualItems: () => Array.from({ length: count }, (_, i) => ({
      index: i,
      start: i * 35,
      size: 35,
      key: i,
    })),
    getTotalSize: () => count * 35,
    measureElement: () => {},
  })),
}));

const mockOptions = [
  { id: "1", name: "Option 1" },
  { id: "2", name: "Option 2" },
  { id: "3", name: "Option 3" },
];

describe("MultiSelect", () => {
  it("renders with placeholder", () => {
    render(
      <MultiSelect
        options={mockOptions}
        selected={[]}
        onChange={() => {}}
        placeholder="Test Placeholder"
      />
    );
    expect(screen.getByText("Test Placeholder")).toBeInTheDocument();
  });

  it("renders selected items as badges", () => {
    render(
      <MultiSelect
        options={mockOptions}
        selected={["1", "2"]}
        onChange={() => {}}
      />
    );
    expect(screen.getByText("Option 1")).toBeInTheDocument();
    expect(screen.getByText("Option 2")).toBeInTheDocument();
  });

  it("shows count when many items are selected", () => {
    render(
      <MultiSelect
        options={mockOptions}
        selected={["1", "2", "3"]}
        onChange={() => {}}
        maxDisplayed={2}
      />
    );
    expect(screen.getByText("3 selected")).toBeInTheDocument();
  });

  it("calls onChange when an option is toggled", () => {
    const onChange = vi.fn();
    render(
      <MultiSelect
        options={mockOptions}
        selected={[]}
        onChange={onChange}
      />
    );

    const trigger = screen.getByRole("combobox");
    fireEvent.click(trigger);

    const option1 = screen.getByText("Option 1");
    fireEvent.click(option1);

    expect(onChange).toHaveBeenCalledWith(["1"]);
  });

  it("filters options based on search input", () => {
    render(
      <MultiSelect
        options={mockOptions}
        selected={[]}
        onChange={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("combobox"));
    
    const searchInput = screen.getByPlaceholderText("Search...");
    fireEvent.change(searchInput, { target: { value: "Option 2" } });

    expect(screen.queryByText("Option 1")).not.toBeInTheDocument();
    expect(screen.getByText("Option 2")).toBeInTheDocument();
  });

  it("selects all visible options when Select All is clicked", () => {
    const onChange = vi.fn();
    render(
      <MultiSelect
        options={mockOptions}
        selected={[]}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole("combobox"));
    const selectAllBtn = screen.getByText("Select All");
    fireEvent.click(selectAllBtn);

    expect(onChange).toHaveBeenCalledWith(["1", "2", "3"]);
  });

  it("clears all options when Clear All is clicked", () => {
    const onChange = vi.fn();
    render(
      <MultiSelect
        options={mockOptions}
        selected={["1", "2"]}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole("combobox"));
    const clearAllBtn = screen.getByText("Clear All");
    fireEvent.click(clearAllBtn);

    expect(onChange).toHaveBeenCalledWith([]);
  });
});
