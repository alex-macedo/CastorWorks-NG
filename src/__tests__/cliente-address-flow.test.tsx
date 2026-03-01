import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Cliente from "../pages/Cliente";

const invokeMock = vi.fn();

vi.mock("../hooks/useClients", () => ({
  useClients: () => ({
    createClient: { mutateAsync: vi.fn() },
    updateClient: { mutateAsync: vi.fn() },
  }),
}));

vi.mock("../contexts/LocalizationContext", () => ({
  useLocalization: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("../hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("../components/ui/select", async () => {
  const React = await vi.importActual<typeof import("react")>("react");
  const SelectContext = React.createContext({
    value: "",
    onValueChange: (_value: string) => {},
    triggerId: "",
    setTriggerId: (_id: string) => {},
  });

  const Select = ({
    value,
    onValueChange,
    children,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    children: React.ReactNode;
  }) => {
    const [triggerId, setTriggerId] = React.useState("");

    return (
      <SelectContext.Provider
        value={{
          value: value ?? "",
          onValueChange: onValueChange ?? (() => {}),
          triggerId,
          setTriggerId,
        }}
      >
        {children}
      </SelectContext.Provider>
    );
  };

  const SelectTrigger = ({
    id,
    children,
  }: {
    id?: string;
    children: React.ReactNode;
  }) => {
    const context = React.useContext(SelectContext);

    React.useEffect(() => {
      if (id) {
        context.setTriggerId(id);
      }
    }, [context, id]);

    return <div data-select-trigger>{children}</div>;
  };

  const SelectContent = ({ children }: { children: React.ReactNode }) => {
    const context = React.useContext(SelectContext);

    return (
      <select
        id={context.triggerId}
        value={context.value}
        onChange={(event) => context.onValueChange(event.target.value)}
      >
        {children}
      </select>
    );
  };

  const SelectItem = ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => <option value={value}>{children}</option>;

  const SelectValue = ({ children }: { children?: React.ReactNode }) => (
    <span>{children}</span>
  );

  return {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  };
});

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: null,
    isLoading: false,
  }),
}));

vi.mock("../integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => invokeMock(...args),
    },
  },
}));

beforeEach(() => {
  invokeMock.mockReset();
});

const renderCliente = () =>
  render(
    <MemoryRouter initialEntries={["/clientes/new"]}>
      <Routes>
        <Route path="/clientes/new" element={<Cliente />} />
      </Routes>
    </MemoryRouter>
  );

describe("Cliente address flows", () => {
  it("does not overwrite touched fields on BR lookup", async () => {
    invokeMock.mockResolvedValueOnce({
      data: {
        normalized: {
          line1: "Rua Teste",
          district: "Centro",
          city: "Sao Paulo",
          region: "SP",
          postal_code: "01001-000",
        },
      },
      error: null,
    });

    renderCliente();

    const line1Input = screen.getByLabelText("cliente.label.line1");
    const postalInput = screen.getByLabelText(
      "cliente.label.postalCodeBR"
    );

    await userEvent.type(line1Input, "Rua Manual 123");
    await userEvent.type(postalInput, "01001000");

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalled();
    });

    expect(line1Input).toHaveValue("Rua Manual 123");
  });

  it("applies USPS recommendation only after acceptance", async () => {
    invokeMock.mockResolvedValueOnce({
      data: {
        standardized: {
          line1: "1600 Pennsylvania Ave NW",
          city: "Washington",
          region: "DC",
          postal_code: "20500-0003",
        },
      },
      error: null,
    });

    renderCliente();

    await userEvent.selectOptions(
      screen.getByLabelText("cliente.label.country"),
      "US"
    );

    await userEvent.type(
      screen.getByLabelText("cliente.label.line1"),
      "1600 Pennsylvania Ave"
    );
    await userEvent.type(
      screen.getByLabelText("cliente.label.city"),
      "Washington"
    );
    await userEvent.type(
      screen.getByLabelText("cliente.label.region"),
      "DC"
    );

    await userEvent.click(screen.getByText("cliente.validateAddress"));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalled();
    });

    expect(
      screen.getByText("cliente.uspsRecommendationTitle")
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText("cliente.label.line1")
    ).toHaveValue("1600 Pennsylvania Ave");

    await userEvent.click(
      screen.getByText("cliente.acceptRecommendation")
    );

    expect(
      screen.getByLabelText("cliente.label.line1")
    ).toHaveValue("1600 Pennsylvania Ave NW");
  });
});
