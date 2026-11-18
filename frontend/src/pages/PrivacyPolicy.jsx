import React from 'react';

export default function PrivacyPolicy({ onNavigate }) {
  const lastUpdated = 'November 16, 2026';

  return (
    <div style={{
      maxWidth: '960px',
      margin: '0 auto',
      padding: '2rem 1.25rem 4rem',
      color: '#1E293B',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      lineHeight: 1.7,
    }}>
      {/* Back Navigation Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '2rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid #E2E8F0',
      }}>
        <button
          onClick={() => onNavigate ? onNavigate('dashboard') : window.history.back()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#0B1F3A',
            backgroundColor: '#F1F5F9',
            border: '1px solid #CBD5E1',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E2E8F0')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
        >
          ← Back to Store
        </button>
        <span style={{ fontSize: '0.85rem', color: '#64748B' }}>
          Effective: {lastUpdated}
        </span>
      </div>

      {/* Header Banner */}
      <div style={{
        backgroundColor: '#0B1F3A',
        color: '#FFFFFF',
        padding: '2.5rem 2rem',
        borderRadius: '16px',
        marginBottom: '2.5rem',
        boxShadow: '0 10px 25px -5px rgba(11, 31, 58, 0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '1.75rem' }}>🛡️</span>
          <span style={{
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontSize: '0.75rem',
            fontWeight: '700',
            color: '#10B981',
          }}>
            Legal &amp; Compliance Documentation
          </span>
        </div>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '800',
          margin: '0 0 0.5rem',
          letterSpacing: '-0.02em',
        }}>
          Privacy Policy
        </h1>
        <p style={{
          fontSize: '0.95rem',
          color: '#CBD5E1',
          margin: 0,
          maxWidth: '680px',
        }}>
          How Fertilizer Shop Management System collects, protects, and handles retailer, farmer customer, and statutory transaction information.
        </p>
      </div>

      {/* Content Sections */}
      <section style={{ marginBottom: '2.25rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: '700', color: '#0F172A', marginBottom: '0.75rem' }}>
          1. Information We Collect
        </h2>
        <p>
          Fertilizer Shop Management operates as an enterprise Point of Sale (POS), inventory, and customer ledger software. To provide accurate statutory invoices, stock auditing, and credit balance management, the system processes:
        </p>
        <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
          <li><strong>Farmer &amp; Customer Information:</strong> Full name, mobile contact number, village/town location, credit limit, and voluntary Aadhaar/Kisan ID (where required by local agricultural fertilizer subsidy compliance).</li>
          <li><strong>Store Staff &amp; Operator Data:</strong> Email addresses, username credentials, cryptographic password hashes, and assigned role permissions (Admin, Cashier, Inventory Auditor).</li>
          <li><strong>Sales &amp; Financial Ledger Records:</strong> Transaction date, invoice numbers, items purchased, batch serial numbers, payment mode (Cash, UPI, Credit Khata), and remaining ledger balances.</li>
          <li><strong>Supplier &amp; Purchase Data:</strong> Wholesale distributor names, GSTIN, invoice identifiers, and payment reconciliation logs.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2.25rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: '700', color: '#0F172A', marginBottom: '0.75rem' }}>
          2. How We Use Collected Data
        </h2>
        <p>
          The information recorded in the application is utilized solely to power your store operations:
        </p>
        <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
          <li>Generating statutory GST-compliant invoices and retail billing receipts.</li>
          <li>Maintaining an accurate Khata (credit and debt ledger) for farmers and local agriculturalists.</li>
          <li>Tracking batch expiry dates, manufacturing lots, and quality inspection schedules for fertilizers and pesticides.</li>
          <li>Generating financial reporting, sales tax summaries, and stock valuation audits.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2.25rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: '700', color: '#0F172A', marginBottom: '0.75rem' }}>
          3. Data Security &amp; Encryption
        </h2>
        <p>
          We employ industry-standard security practices to safeguard all store assets:
        </p>
        <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
          <li><strong>HTTPS / TLS Encryption:</strong> All client-server communications are strictly forced over encrypted HTTPS transport.</li>
          <li><strong>Cryptographic Password Hashing:</strong> Operator passwords are never stored in plaintext and are hashed using bcrypt with salt rounds.</li>
          <li><strong>Role-Based Access Control:</strong> Cashiers cannot access administrative financial audits or alter master product pricing without managerial clearance.</li>
          <li><strong>Session Integrity:</strong> Authentication is handled via signed JSON Web Tokens (JWT) with strict expiration timeouts.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2.25rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: '700', color: '#0F172A', marginBottom: '0.75rem' }}>
          4. Data Sharing &amp; Third Parties
        </h2>
        <p>
          Your store data belongs strictly to you. We do not sell, rent, monetize, or trade farmer information or retail financial data to any third-party marketing brokers or advertisers. Data is only accessible to authorized system administrators and in accordance with applicable tax and agricultural department regulatory audits.
        </p>
      </section>

      <section style={{ marginBottom: '2.25rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: '700', color: '#0F172A', marginBottom: '0.75rem' }}>
          5. Farmer &amp; Customer Rights
        </h2>
        <p>
          Store owners and farmer patrons retain the right to:
        </p>
        <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
          <li>Request an on-demand printed copy or digital statement of their historical Khata ledger.</li>
          <li>Request correction of inaccurate contact or payment reconciliation records.</li>
          <li>Request full data export of customer records in CSV or standard formats.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: '700', color: '#0F172A', marginBottom: '0.75rem' }}>
          6. Contact &amp; Grievance
        </h2>
        <p>
          If you have questions regarding this Privacy Policy or require assistance regarding data governance, please reach out to:
        </p>
        <div style={{
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          padding: '1rem 1.25rem',
          fontSize: '0.9rem',
        }}>
          <p style={{ margin: '0 0 0.25rem', fontWeight: '700' }}>Fertilizer Shop System Compliance Office</p>
          <p style={{ margin: '0 0 0.25rem' }}>Email: compliance@fertilizershop.local</p>
          <p style={{ margin: 0 }}>Support Hours: Monday – Saturday, 8:00 AM – 7:00 PM IST</p>
        </div>
      </section>

      <div style={{ textAlign: 'center', paddingTop: '1.5rem', borderTop: '1px solid #E2E8F0' }}>
        <button
          onClick={() => onNavigate ? onNavigate('terms-and-conditions') : null}
          style={{
            background: 'none',
            border: 'none',
            color: '#2563EB',
            cursor: 'pointer',
            fontSize: '0.9rem',
            textDecoration: 'underline',
          }}
        >
          View Terms &amp; Conditions →
        </button>
      </div>
    </div>
  );
}
