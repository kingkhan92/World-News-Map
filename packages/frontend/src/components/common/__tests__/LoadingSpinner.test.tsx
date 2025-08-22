import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders loading spinner with default message', () => {
    render(<LoadingSpinner />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<LoadingSpinner message="Loading news articles..." />);
    
    expect(screen.getByText('Loading news articles...')).toBeInTheDocument();
  });

  it('renders with custom size', () => {
    render(<LoadingSpinner size="large" />);
    
    const spinner = screen.getByRole('progressbar');
    expect(spinner).toHaveClass('MuiCircularProgress-root');
  });

  it('renders without message when hideMessage is true', () => {
    render(<LoadingSpinner hideMessage />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<LoadingSpinner className="custom-spinner" />);
    
    const container = screen.getByRole('progressbar').parentElement;
    expect(container).toHaveClass('custom-spinner');
  });
});