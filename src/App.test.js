import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the login screen at the index route', () => {
  render(<App />);
  const heading = screen.getByRole('heading', { name: /legal x suits/i });
  expect(heading).toBeInTheDocument();
});
