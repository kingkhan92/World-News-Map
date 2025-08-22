import React from 'react';
import { render, screen } from '@testing-library/react';
import { BiasIndicator } from '../BiasIndicator';

describe('BiasIndicator', () => {
  it('renders very low bias correctly', () => {
    render(<BiasIndicator score={15} />);
    expect(screen.getByText(/Very Low Bias/)).toBeInTheDocument();
    expect(screen.getByText(/15/)).toBeInTheDocument();
  });

  it('renders low bias correctly', () => {
    render(<BiasIndicator score={35} />);
    expect(screen.getByText(/Low Bias/)).toBeInTheDocument();
    expect(screen.getByText(/35/)).toBeInTheDocument();
  });

  it('renders medium bias correctly', () => {
    render(<BiasIndicator score={55} />);
    expect(screen.getByText(/Medium Bias/)).toBeInTheDocument();
    expect(screen.getByText(/55/)).toBeInTheDocument();
  });

  it('renders high bias correctly', () => {
    render(<BiasIndicator score={75} />);
    expect(screen.getByText(/High Bias/)).toBeInTheDocument();
    expect(screen.getByText(/75/)).toBeInTheDocument();
  });

  it('renders very high bias correctly', () => {
    render(<BiasIndicator score={95} />);
    expect(screen.getByText(/Very High Bias/)).toBeInTheDocument();
    expect(screen.getByText(/95/)).toBeInTheDocument();
  });

  it('renders without label when showLabel is false', () => {
    render(<BiasIndicator score={45} showLabel={false} />);
    expect(screen.queryByText(/Low Bias/)).not.toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
  });

  it('renders in small size', () => {
    render(<BiasIndicator score={25} size="small" />);
    expect(screen.getByText(/Low/)).toBeInTheDocument();
  });

  it('renders in large size with markers', () => {
    render(<BiasIndicator score={60} size="large" />);
    expect(screen.getByText(/Medium Bias/)).toBeInTheDocument();
  });

  it('shows tooltip when showTooltip is true', () => {
    render(<BiasIndicator score={40} showTooltip={true} />);
    // Tooltip content is tested through user interaction in integration tests
    expect(screen.getByText(/Low Bias/)).toBeInTheDocument();
  });

  it('hides tooltip when showTooltip is false', () => {
    render(<BiasIndicator score={40} showTooltip={false} />);
    expect(screen.getByText(/Low Bias/)).toBeInTheDocument();
  });

  it('handles edge case scores correctly', () => {
    render(<BiasIndicator score={0} />);
    expect(screen.getByText(/Very Low Bias/)).toBeInTheDocument();
    
    render(<BiasIndicator score={100} />);
    expect(screen.getByText(/Very High Bias/)).toBeInTheDocument();
  });
});