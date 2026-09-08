import { useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { login } from '../api/auth';
import { ApiError } from '../api/client';
import buttons from '../styles/buttons.module.css';
import styles from './LoginPage.module.css';

/**
 * The simple login EPIC-15 asks for -- one demo account (see apps/api's userStore.ts), a
 * signed session cookie, no SSO/password-reset/MFA. Errors are shown inline (role="alert"),
 * never a native `alert()`, consistent with every other error state in this app
 * (docs/product-spec.md §8/§9's calm, non-blocking error language).
 */
export function LoginPage(): JSX.Element {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(username, password);
      // The session query is keyed ['auth', 'session'] (useAuthSession) -- invalidate rather
      // than assume its shape, so RequireAuth re-checks for real instead of being told to trust
      // a value this component constructed itself.
      await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
      navigate('/', { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? 'Invalid username or password.'
          : "We couldn't sign you in right now. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={(event) => void handleSubmit(event)}>
        <h1 className={styles.heading}>Settlement Reconciliation</h1>
        <p className={styles.subheading}>Sign in to see your reconciliation status.</p>

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <label className={styles.field} htmlFor="login-username">
          Email
          <input
            id="login-username"
            name="username"
            type="email"
            className={styles.input}
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </label>

        <label className={styles.field} htmlFor="login-password">
          Password
          <input
            id="login-password"
            name="password"
            type="password"
            className={styles.input}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        <button type="submit" className={buttons.primary} disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
