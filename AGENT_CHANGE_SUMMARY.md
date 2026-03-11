# Agent Change Summary

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        project: [server, client]

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        working-directory: ${{ matrix.project }}
        run: npm ci

      - name: Run tests with coverage
        working-directory: ${{ matrix.project }}
        run: npm test -- --coverage --coverageReporters=text-summary

      - name: Upload coverage report
        if: matrix.project == 'server'
        uses: actions/upload-artifact@v3
        with:
          name: server-coverage-report
          path: server/coverage

      - name: Upload coverage report
        if: matrix.project == 'client'
        uses: actions/upload-artifact@v3
        with:
          name: client-coverage-report
          path: client/coverage
```

```json
// server/package.json
{
  "name": "server",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "test": "jest --coverage",
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "jest": "^29.5.0",
    "supertest": "^6.3.3"
  },
  "jest": {
    "testEnvironment": "node",
    "collectCoverageFrom": [
      "index.js",
      "routes/**/*.js",
      "!**/node_modules/**"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

```json
// client/package.json
{
  "name": "client",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test --env=jsdom --coverage --watchAll=false",
    "eject": "react-scripts eject"
  },
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0"
  },
  "jest": {
    "collectCoverageFrom": [
      "src/**/*.{js,jsx}",
      "!src/index.js",
      "!src/reportWebVitals.js"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

```javascript
// server/index.test.js
const request = require('supertest');
const express = require('express');
const app = require('./index'); // assuming index.js exports the express app

describe('Server API Endpoints', () => {
  it('GET / should respond with 200 and welcome message', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toMatch(/welcome/i);
  });

  // Add more tests for other endpoints here
});
```

```javascript
// client/src/App.test.js
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders main heading', () => {
  render(<App />);
  const heading = screen.getByRole('heading', { level: 1 });
  expect(heading).toBeInTheDocument();
});
```

```javascript
// client/src/components/LocationManager.test.js
import { render, screen, fireEvent } from '@testing-library/react';
import LocationManager from './LocationManager';

describe('LocationManager Component', () => {
  test('renders without crashing', () => {
    render(<LocationManager />);
    expect(screen.getByText(/location/i)).toBeInTheDocument();
  });

  test('allows adding a new location', () => {
    render(<LocationManager />);
    const input = screen.getByPlaceholderText(/add location/i);
    const addButton = screen.getByRole('button', { name: /add/i });

    fireEvent.change(input, { target: { value: 'New York' } });
    fireEvent.click(addButton);

    expect(screen.getByText('New York')).toBeInTheDocument();
  });

  // Add more tests for edge cases and interactions
});
```

```gitignore
# server/.gitignore
coverage/
node_modules/
```

```gitignore
# client/.gitignore
coverage/
node_modules/
```

```markdown
# README.md

## Testing and Coverage

This project uses Jest for testing both backend and frontend code.

- To run backend tests with coverage:
  ```bash
  cd server
  npm test
  ```

- To run frontend tests with coverage:
  ```bash
  cd client
  npm test
  ```

Coverage reports are generated in the `coverage/` directory for each project.

Continuous Integration is configured to run tests and enforce minimum coverage thresholds on every push and pull request to the main branch.
```
