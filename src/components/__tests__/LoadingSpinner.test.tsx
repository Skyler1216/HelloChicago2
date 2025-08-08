/// <reference types="vitest/globals" />
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });

  it('renders with custom text', () => {
    render(<LoadingSpinner text="Loading..." />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<LoadingSpinner size="sm" />);
    let spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('w-4', 'h-4');

    rerender(<LoadingSpinner size="lg" />);
    spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('w-8', 'h-8');
  });

  it('renders with different colors', () => {
    const { rerender } = render(<LoadingSpinner color="white" />);
    let spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('text-white');

    rerender(<LoadingSpinner color="gray" />);
    spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('text-gray-500');
  });
});
