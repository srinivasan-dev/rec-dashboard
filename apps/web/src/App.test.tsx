import { screen, waitFor } from '@testing-library/react';

import { App } from './App';
import { fetchSession } from './api/auth';
import { fetchSummary } from './api/reconciliation';
import { renderWithProviders } from './test/renderWithProviders';

jest.mock('./api/reconciliation');
jest.mock('./api/auth');

describe('App', () => {
  it('renders the page heading regardless of data-fetch state, once the session check passes', async () => {
    jest.mocked(fetchSession).mockResolvedValue({ merchantId: 'M-104' });
    jest.mocked(fetchSummary).mockReturnValue(new Promise(() => {})); // never resolves -- loading state

    renderWithProviders(<App />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /settlement reconciliation/i }),
      ).toBeInTheDocument();
    });
  });

  it('redirects to the login page when there is no valid session', async () => {
    jest.mocked(fetchSession).mockRejectedValue(new Error('401'));

    renderWithProviders(<App />);

    expect(await screen.findByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
});
