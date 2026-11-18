import React from 'react';

export default function TermsAndConditions({ onNavigate }) {
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
          <span style={{ fontSize: '1.75rem' }}>📜</span>
          <span style={{
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontSize: '0.75rem',
            fontWeight: '700',
            color: '#38BDF8',
          }}>
            Terms of Service &amp; Usage Policy
          </span>
        </div>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '800',
          margin: '0 0 0.5rem',
          letterSpacing: '-0.02em',
        }}>
          Terms &amp; Conditions
        </h1>
        <p style={{
          fontSize: '0.95rem',
          color: '#CBD5E1',
          margin: 0,
          maxWidth: '680px',
        }}>
          Standard terms governing the operation and software usage of the Fertilizer Shop Management POS and Inventory Platform.
        </p>
      </div>

      {/* Content Sections */}
      <section style={{ marginBottom: '2.25rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: '700', color: '#0F172A', marginBottom: '0.75rem' }}>
          1. Agreement to Terms
        </h2>
        <p>
          By accessing or operating the Fertilizer Shop Management System, you confirm that you have read, understood, and agreed to be bound by these Terms and Conditions. These terms apply to all store owners, cashiers, inventory clerks, and administrators authorized to access the system.
        </p>
      </section>

      <section style={{ marginBottom: '2.25rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: '700', color: '#0F172A', marginBottom: '0.75rem' }}>
          2. Store Operator Account Responsibilities
        </h2>
        <p>
          Authorized operators must maintain the confidentiality of their login credentials. Any activity conducted under a user account—such as issuance of sales invoices, stock inward receipts, discount overrides, or Khata credit disbursements—is the legal responsibility of the registered credential holder.
        </p>
        <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
          <li>Do not share passwords across multiple cashiers.</li>
          <li>Store administrators must promptly revoke access for departed or reassigned staff.</li>
          <li>Immediately notify the technical support team upon suspecting unauthorized account access.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2.25rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: '700', color: '#0F172A', marginBottom: '0.75rem' }}>
          3. Fertilizer Control Order (FCO) &amp; Regulatory Compliance
        </h2>
        <p>
          Agricultural fertilizer, pesticide, and seed trading is subject to strict governmental regulations (including the Fertilizer Control Order, Insecticides Act, and Seeds Act). Retailers utilizing this system agree to:
        </p>
        <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
          <li>Maintain truthful and verifiable batch numbers, manufacturing dates, and expiration records in the Inventory module.</li>
          <li>Never sell expired chemical inputs or unverified formulations.</li>
          <li>Comply with Maximum Retail Price (MRP) guidelines and applicable direct subsidy regulations.</li>
          <li>Maintain accurate GST tax rates (typically 5% for chemical/bio fertilizers, 12% or 18% for specific agricultural chemicals).</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2.25rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: '700', color: '#0F172A', marginBottom: '0.75rem' }}>
          4. Farmer Khata &amp; Credit Ledger Terms
        </h2>
        <p>
          The Customer Khata module provides credit recording and interest tracking tools. All credit extensions, repayment schedules, and seasonal harvest payment settlements are direct civil contracts between the retailer and the respective farmer customer. The software serves solely as an accurate ledger and accounting aid.
        </p>
      </section>

      <section style={{ marginBottom: '2.25rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: '700', color: '#0F172A', marginBottom: '0.75rem' }}>
          5. Data Integrity &amp; Backup Maintenance
        </h2>
        <p>
          While the application employs automated database migrations and transactional atomicity via PostgreSQL, retailers are strongly advised to perform periodic database backups prior to major seasonal audits or system upgrades.
        </p>
      </section>

      <section style={{ marginBottom: '2.25rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: '700', color: '#0F172A', marginBottom: '0.75rem' }}>
          6. Limitation of Liability
        </h2>
        <p>
          Under no circumstances shall the software developers or licensors be held liable for indirect, incidental, or consequential damages resulting from hardware failures, network interruptions during point-of-sale operations, or inaccurate input data submitted by retail operators.
        </p>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: '700', color: '#0F172A', marginBottom: '0.75rem' }}>
          7. Modifications to Terms
        </h2>
        <p>
          We reserve the right to revise or update these terms at any time. Continued usage of the POS platform after notifications constitutes agreement to the amended policies.
        </p>
      </section>

      <div style={{ textAlign: 'center', paddingTop: '1.5rem', borderTop: '1px solid #E2E8F0' }}>
        <button
          onClick={() => onNavigate ? onNavigate('privacy-policy') : null}
          style={{
            background: 'none',
            border: 'none',
            color: '#2563EB',
            cursor: 'pointer',
            fontSize: '0.9rem',
            textDecoration: 'underline',
          }}
        >
          View Privacy Policy →
        </button>
      </div>
    </div>
  );
}
