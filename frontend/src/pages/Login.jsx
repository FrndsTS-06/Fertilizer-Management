import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

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

  const handleQuickFill = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrorMessage('');
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
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            fontSize: '1.75rem',
            marginBottom: '0.75rem',
            boxShadow: '0 6px 16px rgba(5, 150, 105, 0.4)',
          }}>
            🌿
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

          <form onSubmit={handleSubmit}>
            {/* Email Field */}
            <div style={{ marginBottom: '1.15rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: '#334155',
                marginBottom: '0.4rem',
              }}>
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. admin@fertilizershop.local"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.875rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: isSubmitting ? '#F8FAFC' : '#FFFFFF',
                  outline: 'none',
                  transition: 'border-color 0.15s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
              />
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: '#334155',
                marginBottom: '0.4rem',
              }}>
                Password
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '0.65rem 2.5rem 0.65rem 0.85rem',
                    fontSize: '0.875rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: isSubmitting ? '#F8FAFC' : '#FFFFFF',
                    outline: 'none',
                    transition: 'border-color 0.15s ease',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                  onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
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
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
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

          {/* Quick Demo Credentials */}
          <div style={{
            marginTop: '1.5rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid #E2E8F0',
          }}>
            <p style={{
              fontSize: '0.725rem',
              fontWeight: '700',
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              margin: '0 0 0.65rem',
              textAlign: 'center',
            }}>
              Quick-Fill Test Accounts
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={() => handleQuickFill('admin@fertilizershop.local', 'Password@123')}
                disabled={isSubmitting}
                style={{
                  padding: '0.55rem',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#0B1F3A',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'background 0.15s ease',
                }}
              >
                🛡️ Store Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('cashier@fertilizershop.local', 'Password@123')}
                disabled={isSubmitting}
                style={{
                  padding: '0.55rem',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#065F46',
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'background 0.15s ease',
                }}
              >
                🧾 Cashier / Staff
              </button>
            </div>
          </div>
        </div>

        {/* Card Footer */}
        <div style={{
          backgroundColor: '#F8FAFC',
          padding: '0.75rem 1.75rem',
          borderTop: '1px solid #E2E8F0',
          textAlign: 'center',
          fontSize: '0.7rem',
          color: '#94A3B8',
        }}>
          🔒 Secured with JWT, bcrypt password encryption, and API rate limiting.
        </div>
      </div>
    </div>
  );
}

