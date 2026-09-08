import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';

import { fetchSession } from '../api/auth';
import { renderWithProviders } from '../test/renderWithProviders';
import { RequireAuth } from './RequireAuth';

jest.mock('../api/auth');

function renderProtectedRoute(): void {
  renderWithProviders(
    <Routes>
      <Route path="/login" element={<div>Login page</div>} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <div>Protected dashboard content</div>
          </RequireAuth>
        }
      />
    </Routes>,
    ['/'],
  );
}

describe('RequireAuth', () => {
  it('renders its children once the session check succeeds', async () => {
    jest.mocked(fetchSession).mockResolvedValue({ merchantId: 'M-104' });

    renderProtectedRoute();

    expect(await screen.findByText('Protected dashboard content')).toBeInTheDocument();
  });

  it('redirects to /login when the session check fails', async () => {
    jest.mocked(fetchSession).mockRejectedValue(new Error('401'));

    renderProtectedRoute();

    expect(await screen.findByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Protected dashboard content')).not.toBeInTheDocument();
  });
});
