# Authentication & Authorization Architecture — Fertilizer Management System

## 1. Security Architecture Overview

This document specifies the authentication, authorization, and session security strategy implemented for the Fertilizer Management System (Phase 07) and outlines integration requirements for the React frontend.

### 1.1 Security Principles Enforced
* **Zero Plaintext Credentials**: All user passwords are encrypted using `bcryptjs` with 10 salt rounds before storage. Plaintext passwords never enter persistence logs, caches, or diagnostics.
* **OWASP User Enumeration Prevention**: Authentication failures return a standardized, generic error message (`"Invalid email or password"`) for both unknown emails and incorrect passwords. In addition, when an unknown email is supplied, a constant dummy bcrypt comparison (`DUMMY_HASH`) is executed to ensure constant response latency, mitigating side-channel timing attacks.
* **Account Status Enforcement**: Disabled or deactivated accounts (`is_active = FALSE`) are immediately rejected with HTTP `403 Forbidden` at both login and token verification stages.
* **Token-Based Stateless Authorization**: Authentication uses cryptographic JSON Web Tokens (JWT) signed with HMAC-SHA256 (`HS256`). Tokens carry user identity (`id`, `email`, `role`, `fullName`) and an explicit expiration lifetime (`24h` by default).
* **Role-Based Access Control (RBAC)**: Backend endpoints enforce granular permissions via middleware against database-backed roles (`ADMIN`, `STAFF`).
* **Brute-Force Attack Mitigation**: A sliding-window rate limiter restricts failed login attempts to a maximum of 5 requests per 15 minutes per IP address, issuing standard HTTP `429 Too Many Requests` responses with a dynamic `Retry-After` header.
* **Logging Sanitization**: The Express request logger redacts `password`, `token`, `authorization`, and other sensitive fields from both request bodies and headers.

---

## 2. Backend Authentication API Specification

All authentication routes are accessible under `/api/auth` (and the versioned alias `/api/v1/auth`).

### 2.1 POST `/api/auth/login`
Authenticates user credentials and issues a signed JWT.

* **Rate Limit**: 5 attempts per 15-minute sliding window per IP.
* **Request Headers**: `Content-Type: application/json`
* **Request Body**:
  ```json
  {
    "email": "admin@fertilizershop.local",
    "password": "Password@123"
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Login successful",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "80daf063-ed13-4a82-b411-3c7eadcc5a81",
        "email": "admin@fertilizershop.local",
        "fullName": "System Administrator",
        "role": "ADMIN"
      }
    },
    "timestamp": "2026-10-27T15:40:00.000Z"
  }
  ```
* **Error Responses**:
  * `400 Bad Request`: Missing or malformed email / password.
  * `401 Unauthorized`: `"Invalid email or password"` (generic error).
  * `403 Forbidden`: `"Account has been deactivated. Please contact your store administrator."`
  * `429 Too Many Requests`: `"Too many login attempts from this address. Please try again in X minutes."`

---

### 2.2 GET `/api/auth/me`
Retrieves current authenticated user profile and verifies active token status.

* **Security**: Protected — Requires valid `Authorization: Bearer <token>` header.
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "user": {
        "id": "80daf063-ed13-4a82-b411-3c7eadcc5a81",
        "email": "admin@fertilizershop.local",
        "full_name": "System Administrator",
        "role": "ADMIN",
        "is_active": true,
        "created_at": "2026-10-27T00:00:00.000Z",
        "updated_at": "2026-10-27T00:00:00.000Z"
      }
    },
    "timestamp": "2026-10-27T15:40:00.000Z"
  }
  ```
* **Error Responses**:
  * `401 Unauthorized`: Token missing, malformed, invalid, or expired.
  * `403 Forbidden`: User account has been deactivated.

---

### 2.3 POST `/api/auth/logout`
Acknowledges client-side session termination.

* **Security**: Protected — Requires valid `Authorization: Bearer <token>` header.
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Logged out successfully"
  }
  ```

---

### 2.4 Diagnostic Protected Endpoints
* `GET /api/auth/admin-only`: Accessible only by users with role `ADMIN`. Returns `403 Forbidden` for `STAFF`.
* `GET /api/auth/staff-only`: Accessible by users with role `ADMIN` or `STAFF`.

---

## 3. Role-Based Access Control (RBAC) Matrix

| Resource / Action | ADMIN | STAFF | Notes |
| :--- | :---: | :---: | :--- |
| **Login / Profile (`/auth/me`)** | Allowed | Allowed | Standard access for all active accounts |
| **Stock & Products View** | Allowed | Allowed | Everyday counter operation |
| **Sales Billing & Invoicing** | Allowed | Allowed | Cashiers/staff can record farmer purchases |
| **Purchase Entry / GRN** | Allowed | Restricted | Only Admin can record wholesale stock purchases |
| **Price & Tax Adjustments** | Allowed | Denied | Selling price & GST config restricted to Admin |
| **User & Staff Management** | Allowed | Denied | Admin creates, updates, and disables staff accounts |
| **Financial P&L Reports** | Allowed | Denied | High-level profit & margins visible to Admin only |

---

## 4. React Frontend Integration Guide

### 4.1 Token Storage & Lifecycle Strategy
1. **In-Memory + Secure Storage**:
   * Store the active JWT in React state or context memory for fast access.
   * Persist the token to `localStorage` (or `sessionStorage`) so session state survives page refreshes.
   * On application bootstrap, the client checks storage, loads the token, and calls `GET /api/auth/me` to validate token freshness and fetch user details.
2. **Handling Token Expiration**:
   * If any API request returns `401 Unauthorized` with an error message indicating token expiration, the React HTTP client automatically clears local storage and redirects the user to `/login`.

---

### 4.2 React Authentication Context Implementation (`AuthContext.jsx`)

Create `frontend/src/context/AuthContext.jsx`:

```jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('fertilizer_jwt'));
  const [loading, setLoading] = useState(true);

  // Validate existing token on mount
  useEffect(() => {
    async function verifyExistingSession() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const body = await res.json();
          setUser(body.data.user);
        } else {
          // Token expired or invalid
          logout();
        }
      } catch (err) {
        console.error('Session verification error:', err);
      } finally {
        setLoading(false);
      }
    }

    verifyExistingSession();
  }, [token]);

  const login = async (email, password) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const body = await res.json();

    if (!res.ok) {
      throw new Error(body.message || 'Login failed');
    }

    const { token: receivedToken, user: receivedUser } = body.data;
    localStorage.setItem('fertilizer_jwt', receivedToken);
    setToken(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null);
      }
    } finally {
      localStorage.removeItem('fertilizer_jwt');
      setToken(null);
      setUser(null);
    }
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN',
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

---

### 4.3 Centralized API Client with Auth Header (`apiClient.js`)

Create `frontend/src/services/apiClient.js`:

```javascript
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('fertilizer_jwt');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Evict expired credentials
    localStorage.removeItem('fertilizer_jwt');
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }

  return response;
}
```

---

### 4.4 Route Guarding Pattern in React

```jsx
import React from 'react';
import { useAuth } from '../context/AuthContext';
import LoginForm from '../components/LoginForm';

export function RequireAuth({ children, requiredRole }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <div className="spinner">Loading user credentials...</div>;
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#b91c1c' }}>
        <h2>403 Forbidden</h2>
        <p>Your account ({user.role}) does not have permission to access this module.</p>
      </div>
    );
  }

  return children;
}
```
