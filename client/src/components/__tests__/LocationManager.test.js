import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LocationManager from '../LocationManager';

describe('LocationManager Component', () => {
  const mockOnLocationChange = jest.fn();

  beforeEach(() => {
    mockOnLocationChange.mockClear();
  });

  test('renders LocationManager component', () => {
    render(<LocationManager onLocationChange={mockOnLocationChange} />);
    expect(screen.getByText(/location manager/i)).toBeInTheDocument();
  });

  test('calls onLocationChange when location is selected', () => {
    render(<LocationManager onLocationChange={mockOnLocationChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'New York' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(mockOnLocationChange).toHaveBeenCalledWith('New York');
  });

  test('matches snapshot', () => {
    const { asFragment } = render(<LocationManager onLocationChange={mockOnLocationChange} />);
    expect(asFragment()).toMatchSnapshot();
  });
});
