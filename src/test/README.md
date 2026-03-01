# Testing Setup

This project uses Vitest as the testing framework along with React Testing Library for component testing.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Test Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Writing Tests

### Unit Tests

Create test files alongside your code with `.test.ts` or `.spec.ts` extension:

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from './myFunction';

describe('myFunction', () => {
  it('should do something', () => {
    expect(myFunction()).toBe(expectedValue);
  });
});
```

### Component Tests

Use React Testing Library for component testing:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## Configuration

- **vitest.config.ts**: Main Vitest configuration
- **src/test/setup.ts**: Global test setup and browser API mocks
- Test files are automatically discovered in `src/**/*.{test,spec}.{ts,tsx}`

## Coverage

Coverage reports are generated in the `coverage` directory. Open `coverage/index.html` to view the detailed coverage report.

## Mocking

### Module Mocking

```typescript
import { vi } from 'vitest';

vi.mock('@/hooks/useMyHook', () => ({
  useMyHook: vi.fn(() => ({ data: mockData }))
}));
```

### Function Mocking

```typescript
const mockFn = vi.fn();
mockFn.mockReturnValue('mocked value');
```

## Best Practices

1. Keep tests close to the code they test
2. Use descriptive test names
3. Test behavior, not implementation
4. Mock external dependencies
5. Aim for high coverage but focus on meaningful tests
6. Use Testing Library queries in order of preference: getByRole, getByLabelText, getByText, etc.
