import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});


import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

test('renders login form and validates input', () => {
  render(<App />);
  const usernameInput = screen.getByLabelText(/username/i);
  const passwordInput = screen.getByLabelText(/password/i);
  const button = screen.getByRole('button', { name: /login/i });

  expect(usernameInput).toBeInTheDocument();
  expect(passwordInput).toBeInTheDocument();
  expect(button).toBeInTheDocument();

  fireEvent.change(usernameInput, { target: { value: 'user123' } });
  fireEvent.change(passwordInput, { target: { value: 'password123' } });
  fireEvent.click(button);

  // Since axios is not mocked here, we just check form elements presence
  expect(usernameInput.value).toBe('user123');
  expect(passwordInput.value).toBe('password123');
});
