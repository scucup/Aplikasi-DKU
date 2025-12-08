/**
 * Basic test to verify React Testing Library setup
 */

import { render, screen } from '@testing-library/react';

describe('Frontend Test Infrastructure Setup', () => {
  describe('React Testing Library', () => {
    it('should render a simple component', () => {
      const TestComponent = () => <div>Hello Test</div>;
      render(<TestComponent />);
      expect(screen.getByText('Hello Test')).toBeInTheDocument();
    });

    it('should handle props', () => {
      const TestComponent = ({ name }: { name: string }) => <div>Hello {name}</div>;
      render(<TestComponent name="World" />);
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });
  });

  describe('Jest DOM Matchers', () => {
    it('should support toBeInTheDocument', () => {
      render(<div data-testid="test-element">Content</div>);
      expect(screen.getByTestId('test-element')).toBeInTheDocument();
    });

    it('should support toHaveTextContent', () => {
      render(<div>Test Content</div>);
      expect(screen.getByText('Test Content')).toHaveTextContent('Test Content');
    });
  });

  describe('TypeScript Support', () => {
    it('should support TypeScript in components', () => {
      interface Props {
        title: string;
        count: number;
      }

      const TestComponent = ({ title, count }: Props) => (
        <div>
          <h1>{title}</h1>
          <span>{count}</span>
        </div>
      );

      render(<TestComponent title="Test" count={42} />);
      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });
});
