import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LocationManager from './LocationManager';

describe('LocationManager Component', () => {
  test('renders without crashing', () => {
    render(<LocationManager />);
    expect(screen.getByText(/location manager/i)).toBeInTheDocument();
  });

  test('adds a new location', () => {
    render(<LocationManager />);
    const input = screen.getByPlaceholderText(/enter location/i);
    const addButton = screen.getByText(/add location/i);

    fireEvent.change(input, { target: { value: 'New York' } });
    fireEvent.click(addButton);

    expect(screen.getByText('New York')).toBeInTheDocument();
  });
});
