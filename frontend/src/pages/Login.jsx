import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login({ onNavigate }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState({ email: false, password: false });

  // Email format validation helper (RFC 5322 compatible regex)
  const validateEmail = (val) => {
    const trimmed = (val || '').trim();
    if (!trimmed) {
      return 'Email address is required.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return 'Please enter a valid email address (e.g. name@fertilizershop.local).';
    }
    return '';
  };

  // Password validation helper (minimum 6 characters)
  const validatePassword = (val) => {
    if (!val) {
      return 'Password is required.';
    }
    if (val.length < 6) {
      return 'Password must be at least 6 characters long.';
    }
    return '';
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    setErrorMessage('');
    if (touched.email) {
      setFieldErrors((prev) => ({ ...prev, email: validateEmail(val) }));
    } else {
      setFieldErrors((prev) => ({ ...prev, email: '' }));
    }
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    setErrorMessage('');
    if (touched.password) {
      setFieldErrors((prev) => ({ ...prev, password: validatePassword(val) }));
    } else {
      setFieldErrors((prev) => ({ ...prev, password: '' }));
    }
  };

  const handleEmailBlur = () => {
    setTouched((prev) => ({ ...prev, email: true }));
    setFieldErrors((prev) => ({ ...prev, email: validateEmail(email) }));
  };

  const handlePasswordBlur = () => {
    setTouched((prev) => ({ ...prev, password: true }));
    setFieldErrors((prev) => ({ ...prev, password: validatePassword(password) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });

    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);

    if (emailErr || passErr) {
      setFieldErrors({ email: emailErr, password: passErr });
      setErrorMessage(emailErr || passErr);
      return;
    }

    setFieldErrors({ email: '', password: '' });
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await login(email.trim(), password);
    } catch (err) {
      console.error('Authentication error:', err);
      setErrorMessage(
        err.message || 'Authentication failed. Please verify your credentials and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0B1F3A',
      backgroundImage: 'radial-gradient(circle at 50% 20%, rgba(37, 99, 235, 0.18) 0%, rgba(11, 31, 58, 0.95) 100%)',
      padding: '1.5rem',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        overflow: 'hidden',
        border: '1px solid #E2E8F0',
      }}>
        {/* Header Branding */}
        <div style={{
          backgroundColor: '#0F172A',
          padding: '2rem 1.75rem 1.5rem',
          textAlign: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '68px',
            height: '68px',
            borderRadius: '16px',
            background: '#FFFFFF',
            padding: '6px',
            marginBottom: '0.75rem',
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.25)',
          }}>
            <img
              src="/logo.png"
              alt="Fertilizer Shop Management Logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <h2 style={{
            color: '#FFFFFF',
            fontSize: '1.35rem',
            fontWeight: '800',
            margin: '0 0 0.35rem',
            letterSpacing: '-0.01em',
          }}>
            Fertilizer Shop Management
          </h2>
          <p style={{
            color: '#94A3B8',
            fontSize: '0.825rem',
            margin: 0,
            letterSpacing: '0.02em',
          }}>
            Inventory, POS Billing & Farmer Khata
          </p>
        </div>

        {/* Form Body */}
        <div style={{ padding: '1.75rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem', fontWeight: '700', color: '#0F172A' }}>
              Sign In to Your Store
            </h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B' }}>
              Enter your credentials to access system features.
            </p>
          </div>

          {/* Error Alert Banner */}
          {errorMessage && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem',
              padding: '0.85rem 1rem',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '8px',
              color: '#991B1B',
              fontSize: '0.825rem',
              marginBottom: '1.25rem',
              lineHeight: 1.4,
            }}>
              <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>⚠️</span>
              <div>
                <strong style={{ fontWeight: '700' }}>Authentication Error: </strong>
                {errorMessage}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Email Field */}
            <div style={{ marginBottom: '1.15rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label
                  htmlFor="login-email"
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: fieldErrors.email ? '#DC2626' : '#334155',
                  }}
                >
                  Email Address *
                </label>
                {fieldErrors.email && (
                  <span style={{ fontSize: '0.725rem', color: '#DC2626', fontWeight: '600' }}>
                    Invalid format
                  </span>
                )}
              </div>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                placeholder="e.g. admin@fertilizershop.local"
                disabled={isSubmitting}
                aria-invalid={!!fieldErrors.email}
                aria-describedby="email-helper-text"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.875rem',
                  borderRadius: '8px',
                  border: fieldErrors.email ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
                  backgroundColor: isSubmitting ? '#F8FAFC' : fieldErrors.email ? '#FEF2F2' : '#FFFFFF',
                  outline: 'none',
                  transition: 'border-color 0.15s ease, background-color 0.15s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = fieldErrors.email ? '#DC2626' : '#2563EB')}
              />
              <div id="email-helper-text" style={{ minHeight: '1.25rem', marginTop: '0.3rem' }}>
                {fieldErrors.email ? (
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: '500' }}>
                    <span>⚠️</span> {fieldErrors.email}
                  </p>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.725rem', color: '#64748B' }}>
                    Enter the authorized email address associated with your store profile.
                  </p>
                )}
              </div>
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label
                  htmlFor="login-password"
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: fieldErrors.password ? '#DC2626' : '#334155',
                  }}
                >
                  Password *
                </label>
                <span style={{ fontSize: '0.725rem', color: fieldErrors.password ? '#DC2626' : '#64748B', fontWeight: fieldErrors.password ? '600' : '400' }}>
                  Min 6 characters
                </span>
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={handlePasswordBlur}
                  placeholder="••••••••••••"
                  disabled={isSubmitting}
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby="password-helper-text"
                  style={{
                    width: '100%',
                    padding: '0.65rem 2.5rem 0.65rem 0.85rem',
                    fontSize: '0.875rem',
                    borderRadius: '8px',
                    border: fieldErrors.password ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
                    backgroundColor: isSubmitting ? '#F8FAFC' : fieldErrors.password ? '#FEF2F2' : '#FFFFFF',
                    outline: 'none',
                    transition: 'border-color 0.15s ease, background-color 0.15s ease',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = fieldErrors.password ? '#DC2626' : '#2563EB')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    color: '#64748B',
                    padding: '4px 6px',
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              <div id="password-helper-text" style={{ minHeight: '1.25rem', marginTop: '0.3rem' }}>
                {fieldErrors.password ? (
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: '500' }}>
                    <span>⚠️</span> {fieldErrors.password}
                  </p>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.725rem', color: '#64748B' }}>
                    Ensure password is at least 6 characters. Confidential & securely hashed.
                  </p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: isSubmitting ? '#93C5FD' : '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '0.925rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              {isSubmitting ? (
                <>
                  <span style={{
                    display: 'inline-block',
                    width: '14px',
                    height: '14px',
                    border: '2px solid #FFFFFF',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite',
                  }} />
                  Authenticating...
                </>
              ) : (
                'Sign In to Dashboard'
              )}
            </button>
          </form>


        </div>

        {/* Card Footer */}
        <div style={{
          backgroundColor: '#F8FAFC',
          padding: '0.85rem 1.75rem',
          borderTop: '1px solid #E2E8F0',
          textAlign: 'center',
          fontSize: '0.725rem',
          color: '#64748B',
        }}>
          <div style={{ marginBottom: '0.45rem', color: '#94A3B8', fontSize: '0.7rem' }}>
            🔒 Secured with JWT, bcrypt password encryption, and HTTPS.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('privacy-policy')}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563EB',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '600',
                padding: '2px 4px',
                textDecoration: 'underline',
              }}
            >
              Privacy Policy
            </button>
            <span style={{ color: '#CBD5E1' }}>•</span>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('terms-and-conditions')}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563EB',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '600',
                padding: '2px 4px',
                textDecoration: 'underline',
              }}
            >
              Terms &amp; Conditions
            </button>
            <span style={{ color: '#CBD5E1' }}>•</span>
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#64748B',
                fontSize: '0.75rem',
                textDecoration: 'none',
              }}
            >
              Sitemap
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

