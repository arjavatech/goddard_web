# Testing Guide

This directory contains unit and integration tests for the Goddard School Enrollment Application.

## Test Structure

```
tests/
├── setup.ts                    # Test environment setup
├── test-utils.tsx             # Custom render and testing utilities
├── unit/                       # Unit tests
│   ├── utils.test.ts          # Utility function tests
│   └── validation.test.ts      # Validation logic tests
├── components/                 # Component unit tests
│   ├── Button.test.tsx        # Button component tests
│   └── Input.test.tsx         # Input component tests
└── integration/               # Integration tests
    ├── form-submission.test.tsx      # Form submission workflow
    ├── authentication.test.tsx       # Authentication workflow
    └── form-assignment.test.tsx      # Classroom form assignment workflow
```

## Setup

### Install Testing Dependencies

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

### Update package.json

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm test -- --watch
```

### Run tests with UI
```bash
npm run test:ui
```

### Run tests with coverage report
```bash
npm run test:coverage
```

### Run specific test file
```bash
npm test -- tests/unit/utils.test.ts
```

## Test Categories

### Unit Tests
- **utils.test.ts**: Tests for utility functions like `cn()` class merging
- **validation.test.ts**: Tests for email, phone, and other validation functions

### Component Tests
- **Button.test.tsx**: Tests for Button component variants, sizes, and interactions
- **Input.test.tsx**: Tests for Input component with different types and states

### Integration Tests
- **form-submission.test.tsx**: Tests complete form submission workflow
- **authentication.test.tsx**: Tests login flow with error handling and loading states
- **form-assignment.test.tsx**: Tests classroom form assignment with selection and validation

## Writing New Tests

### Basic Test Structure

```typescript
import { describe, it, expect } from 'vitest';

describe('Feature Name', () => {
  it('should do something', () => {
    expect(true).toBe(true);
  });
});
```

### Testing Components

```typescript
import { render, screen } from '@/tests/test-utils';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### Testing Async Operations

```typescript
import { waitFor } from '@/tests/test-utils';

it('should handle async operations', async () => {
  const mockFn = vi.fn().mockResolvedValue('data');
  
  await waitFor(() => {
    expect(mockFn).toHaveBeenCalled();
  });
});
```

## Best Practices

1. **Use descriptive test names**: Clearly describe what is being tested
2. **Follow AAA pattern**: Arrange, Act, Assert
3. **Mock external dependencies**: Use `vi.fn()` for mocks
4. **Test user interactions**: Focus on how users interact with components
5. **Keep tests isolated**: Each test should be independent
6. **Use data-testid sparingly**: Prefer semantic queries like `getByRole`

## Coverage Goals

- Aim for at least 80% code coverage
- Focus on critical paths and user workflows
- Test error states and edge cases
- Prioritize integration tests for complex features

## Debugging Tests

### Run single test
```bash
npm test -- tests/unit/utils.test.ts -t "should merge class names"
```

### Debug in browser
```bash
npm run test:ui
```

### View detailed output
```bash
npm test -- --reporter=verbose
```

## CI/CD Integration

Add to your CI pipeline:

```bash
npm test -- --run --coverage
```

This runs tests once and generates coverage reports for CI systems.
