import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { login } from '../api/auth';
import { ApiError } from '../api/client';
import { renderWithProviders } from '../test/renderWithProviders';
import { LoginPage } from './LoginPage';

jest.mock('../api/auth');

describe('LoginPage', () => {
  it('submits the entered credentials and navigates away on success', async () => {
    const user = userEvent.setup();
    jest.mocked(login).mockResolvedValue({ merchantId: 'M-104' });

    renderWithProviders(<LoginPage />, ['/login']);

    await user.type(screen.getByLabelText(/email/i), 'm104@rapyd.com');
    await user.type(screen.getByLabelText(/password/i), 'rapyd@2026');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('m104@rapyd.com', 'rapyd@2026');
    });
  });

  it('shows a calm, specific error message for wrong credentials, without blocking retry', async () => {
    const user = userEvent.setup();
    jest.mocked(login).mockRejectedValue(new ApiError('Invalid username or password.', 401));

    renderWithProviders(<LoginPage />, ['/login']);

    await user.type(screen.getByLabelText(/email/i), 'm104@rapyd.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid username or password/i);
    expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled();
  });

  it('shows a generic error message for a non-auth failure (e.g. the API being unreachable)', async () => {
    const user = userEvent.setup();
    jest.mocked(login).mockRejectedValue(new Error('network error'));

    renderWithProviders(<LoginPage />, ['/login']);

    await user.type(screen.getByLabelText(/email/i), 'm104@rapyd.com');
    await user.type(screen.getByLabelText(/password/i), 'rapyd@2026');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't sign you in/i);
  });
});
