import { render, screen } from '@testing-library/react';
import { ReduxProvider } from './provider';

describe('ReduxProvider', () => {
  it('should render children within Redux Provider', () => {
    render(
      <ReduxProvider>
        <div data-testid="child">Test Child</div>
      </ReduxProvider>,
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });
});
