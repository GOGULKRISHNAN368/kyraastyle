import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submitRef = useRef(null);

  function revealSubmit() {
    if (window.matchMedia('(max-width: 47.999rem)').matches) {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.setTimeout(() => submitRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest' }), 250);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || !password) {
      setError('Enter a valid email and password.');
      return;
    }
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (reason) {
      setError(reason.message === 'Invalid email or password' ? reason.message : 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="login-screen">
    <section className="login-panel" aria-labelledby="login-heading">
      <img className="brand-logo" src="/kyraastyle-logo.svg" alt="Kryaa Style" />
      <p className="login-eyebrow">ADMIN PORTAL</p>
      <h1 id="login-heading">Welcome back</h1>
      <p className="login-intro">Sign in to manage your store.</p>
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="email">Email address</label>
        <input id="email" name="email" type="email" autoComplete="username" required value={email} onFocus={revealSubmit} onChange={(event) => setEmail(event.target.value)} />
        <label htmlFor="password">Password</label>
        <div className="password-wrap">
          <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onFocus={revealSubmit} onChange={(event) => setPassword(event.target.value)} />
          <button className="password-toggle" type="button" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button ref={submitRef} className="login-button" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </section>
    <p className="login-footer">© {new Date().getFullYear()} Kryaa Style</p>
  </main>;
}
