import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NewsPin } from '../NewsPin';
import { MapPin } from '../../../types/map';

// Mock Leaflet components
jest.mock('react-leaflet', () => ({
  Marker: ({ children, eventHandlers }: { children: React.ReactNode; eventHandlers: any }) => (
    <div 
      data-testid="marker" 
      onClick={eventHandlers?.click}
    >
      {children}
    </div>
  ),
  Popup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popup">{children}</div>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip">{children}</div>
  ),
}));

jest.mock('../BiasIndicator', () => ({
  BiasIndicator: ({ score }: { score: number }) => (
    <div data-testid="bias-indicator">Bias: {score}</div>
  ),
}));

const mockPin: MapPin = {
  id: 1,
  latitude: 40.7128,
  longitude: -74.0060,
  article: {
    id: 1,
    title: 'Test Article Title',
    summary: 'This is a test article summary that provides context about the news event.',
    source: 'Test News Source',
    biasScore: 35,
  },
};

describe('NewsPin', () => {
  const mockOnClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders marker with tooltip and popup', () => {
    render(<NewsPin pin={mockPin} onClick={mockOnClick} />);

    expect(screen.getByTestId('marker')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    expect(screen.getByTestId('popup')).toBeInTheDocument();
  });

  it('displays article title in tooltip', () => {
    render(<NewsPin pin={mockPin} onClick={mockOnClick} />);

    expect(screen.getByText('Test Article Title')).toBeInTheDocument();
  });

  it('displays article source in tooltip', () => {
    render(<NewsPin pin={mockPin} onClick={mockOnClick} />);

    expect(screen.getByText('Test News Source')).toBeInTheDocument();
  });

  it('displays full article information in popup', () => {
    render(<NewsPin pin={mockPin} onClick={mockOnClick} />);

    // Check popup content
    expect(screen.getByText('Test Article Title')).toBeInTheDocument();
    expect(screen.getByText('Test News Source')).toBeInTheDocument();
    expect(screen.getByText(/This is a test article summary/)).toBeInTheDocument();
    expect(screen.getByTestId('bias-indicator')).toBeInTheDocument();
    expect(screen.getByText('Read Full Article')).toBeInTheDocument();
  });

  it('truncates long titles in tooltip', () => {
    const longTitlePin: MapPin = {
      ...mockPin,
      article: {
        ...mockPin.article,
        title: 'This is a very long article title that should be truncated when displayed in the tooltip',
      },
    };

    render(<NewsPin pin={longTitlePin} onClick={mockOnClick} />);

    expect(screen.getByText(/This is a very long article title that should be.../)).toBeInTheDocument();
  });

  it('truncates long summaries in popup', () => {
    const longSummaryPin: MapPin = {
      ...mockPin,
      article: {
        ...mockPin.article,
        summary: 'This is a very long article summary that should be truncated when displayed in the popup because it exceeds the maximum length limit that we have set for the summary display.',
      },
    };

    render(<NewsPin pin={longSummaryPin} onClick={mockOnClick} />);

    expect(screen.getByText(/This is a very long article summary that should be truncated when displayed in the popup because it exceeds the maximum length limit.../)).toBeInTheDocument();
  });

  it('calls onClick when marker is clicked', () => {
    render(<NewsPin pin={mockPin} onClick={mockOnClick} />);

    fireEvent.click(screen.getByTestId('marker'));
    expect(mockOnClick).toHaveBeenCalledWith(mockPin);
  });

  it('calls onClick when "Read Full Article" button is clicked', () => {
    render(<NewsPin pin={mockPin} onClick={mockOnClick} />);

    fireEvent.click(screen.getByText('Read Full Article'));
    expect(mockOnClick).toHaveBeenCalledWith(mockPin);
  });

  it('displays bias indicator with correct score', () => {
    render(<NewsPin pin={mockPin} onClick={mockOnClick} />);

    expect(screen.getByText('Bias: 35')).toBeInTheDocument();
  });
});