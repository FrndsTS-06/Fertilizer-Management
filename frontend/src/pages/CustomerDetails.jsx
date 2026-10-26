import React, { useState, useEffect, useCallback } from 'react';
import { customerService } from '../services/customerService';

/**
 * Page 4: Customer Details
 * FTS Navy Blue + Electric Blue Design System
 * Palette: #0B1F3A, #2563EB, #FFFFFF, #F1F5F9, #1E293B, #06B6D4
 * Structure:
 * 1. Heading: “Customer Details”, Subtitle: “Manage customer records, purchases, and outstanding payments”
 * 2. 4 Summary cards: Total Customers, Customers with Dues, Total Customer Outstanding, Payments Received
 * 3. Search (name or phone), Filters for village & outstanding balance status
 * 4. Customer table with 7 columns: Name, Phone Number, Village, Total Purchases, Total Paid, Outstanding Due, Actions
 * 5. Add Customer & Edit Customer forms open separately
 * 6. Customer profile view with Overview, Purchase History, Payment History, and Outstanding Dues
 * 7. Record Payment & Print Customer Statement actions
 */

// ----------------------------------------------------------------------
// SUBCOMPONENT 1: Summary Cards
// ----------------------------------------------------------------------
function CustomerSummaryCards({ summary, activeDuesFilter, onSelectFilter }) {
  const totalCustomers = summary?.totalCustomers ?? 0;
  const customersWithDues = summary?.customersWithDues ?? 0;
  const totalOutstandingDues = summary?.totalOutstandingDues ?? 0;
  const paymentsReceived = summary?.totalPaymentsReceived ?? 0;

  const cards = [
    {
      id: 'total',
      filterValue: 'all',
      title: 'Total Customers',
      value: totalCustomers.toLocaleString('en-IN'),
      unit: 'Registered Accounts',
      icon: '👥',
      accentColor: '#2563EB',
      badgeBg: 'rgba(37, 99, 235, 0.08)',
      highlightBorder: '#2563EB',
    },
    {
      id: 'customers-dues',
      filterValue: 'has-dues',
      title: 'Customers with Dues',
      value: customersWithDues.toLocaleString('en-IN'),
      unit: 'Active Khata Dues',
      icon: '⏳',
      accentColor: '#D97706',
      badgeBg: '#FFFBEB',
      highlightBorder: '#F59E0B',
      isWarning: customersWithDues > 0,
    },
    {
      id: 'total-outstanding',
      filterValue: 'has-dues',
      title: 'Total Customer Outstanding',
      value: `₹${totalOutstandingDues.toLocaleString('en-IN')}`,
      unit: 'Uncollected Balance',
      icon: '🌾',
      accentColor: '#DC2626',
      badgeBg: '#FEF2F2',
      highlightBorder: '#EF4444',
      isDanger: totalOutstandingDues > 0,
    },
    {
      id: 'payments-received',
      filterValue: 'all',
      title: 'Payments Received',
      value: `₹${paymentsReceived.toLocaleString('en-IN')}`,
      unit: 'Collected Revenue',
      icon: '💵',
      accentColor: '#06B6D4',
      badgeBg: 'rgba(6, 182, 212, 0.1)',
      highlightBorder: '#06B6D4',
      isCyan: true,
    },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '1.25rem',
      marginBottom: '1.75rem',
    }}>
      {cards.map((card) => {
        const isSelected = activeDuesFilter === card.filterValue && card.filterValue !== 'all';

        return (
          <div
            key={card.id}
            onClick={() => onSelectFilter && onSelectFilter(card.filterValue)}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '1.25rem 1.4rem',
              border: isSelected
                ? `2px solid ${card.highlightBorder}`
                : '1px solid #E2E8F0',
              boxShadow: isSelected
                ? `0 6px 16px rgba(37, 99, 235, 0.12), 0 0 0 1px ${card.highlightBorder}`
                : '0 1px 3px rgba(11, 31, 58, 0.04)',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              backgroundColor: isSelected ? card.accentColor : 'transparent',
              transition: 'background-color 0.2s ease',
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{
                  fontSize: '0.775rem',
                  fontWeight: '700',
                  color: '#1E293B',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {card.title}
                </span>
                <div style={{
                  fontSize: '1.95rem',
                  fontWeight: '800',
                  color: card.isDanger ? '#DC2626' : card.isWarning ? '#D97706' : card.isCyan ? '#0891B2' : '#0B1F3A',
                  lineHeight: '1.15',
                  marginTop: '0.4rem',
                  letterSpacing: '-0.025em',
                }}>
                  {card.value}
                </div>
              </div>

              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: card.badgeBg,
                color: card.accentColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                border: `1px solid ${card.accentColor}25`,
              }}>
                {card.icon}
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '1rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid #F1F5F9',
            }}>
              <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '500' }}>
                {card.unit}
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: card.accentColor }}>
                {isSelected ? 'Active Filter ✕' : 'Filter records →'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ----------------------------------------------------------------------
// SUBCOMPONENT 2: Filters
// ----------------------------------------------------------------------
function CustomerFilters({
  searchQuery,
  onSearchChange,
  duesFilter,
  onDuesFilterChange,
  selectedVillage,
  onVillageChange,
  viewMode,
  onViewModeChange,
  onResetFilters,
  villages = ['All'],
  totalFound = 0,
}) {
  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: '12px',
      border: '1px solid #E2E8F0',
      padding: '1.25rem 1.5rem',
      marginBottom: '1.5rem',
      boxShadow: '0 1px 3px rgba(11, 31, 58, 0.04)',
    }}>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
      }}>
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '440px' }}>
          <span style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#64748B',
            fontSize: '0.95rem',
          }}>
            🔍
          </span>
          <input
            type="text"
            placeholder="Search customers by name or phone number..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.625rem 2.2rem 0.625rem 2.4rem',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '0.875rem',
              outline: 'none',
              backgroundColor: '#F8FAFC',
              color: '#0B1F3A',
              fontWeight: '500',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#2563EB';
              e.target.style.backgroundColor = '#FFFFFF';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#CBD5E1';
              e.target.style.backgroundColor = '#F8FAFC';
            }}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: '#64748B',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1E293B', textTransform: 'uppercase' }}>
              Balance:
            </span>
            <select
              value={duesFilter}
              onChange={(e) => onDuesFilterChange(e.target.value)}
              style={{
                padding: '0.55rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                fontSize: '0.85rem',
                fontWeight: '600',
                color: '#0B1F3A',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Balances</option>
              <option value="has-dues">Has Outstanding Balance ⚠️</option>
              <option value="cleared">Cleared (Zero Dues) ✓</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1E293B', textTransform: 'uppercase' }}>
              Village:
            </span>
            <select
              value={selectedVillage}
              onChange={(e) => onVillageChange(e.target.value)}
              style={{
                padding: '0.55rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                fontSize: '0.85rem',
                fontWeight: '600',
                color: '#0B1F3A',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {villages.map((v) => (
                <option key={v} value={v}>
                  {v === 'All' ? 'All Villages' : v}
                </option>
              ))}
            </select>
          </div>

          {/* View mode */}
          <div style={{
            display: 'flex',
            backgroundColor: '#F1F5F9',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
          }}>
            <button
              onClick={() => onViewModeChange('table')}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: viewMode === 'table' ? '#2563EB' : 'transparent',
                color: viewMode === 'table' ? '#FFFFFF' : '#1E293B',
                fontWeight: '700',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              📋 Table
            </button>
            <button
              onClick={() => onViewModeChange('cards')}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: viewMode === 'cards' ? '#2563EB' : 'transparent',
                color: viewMode === 'cards' ? '#FFFFFF' : '#1E293B',
                fontWeight: '700',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              🎴 Cards
            </button>
          </div>

          {(searchQuery || duesFilter !== 'all' || selectedVillage !== 'All') && (
            <button
              onClick={onResetFilters}
              style={{
                padding: '0.5rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#1E293B',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div style={{
        marginTop: '0.85rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid #F1F5F9',
        fontSize: '0.825rem',
        color: '#64748B',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}>
        <span>Showing</span>
        <span style={{
          backgroundColor: 'rgba(6, 182, 212, 0.12)',
          color: '#0891B2',
          padding: '2px 8px',
          borderRadius: '999px',
          fontWeight: '700',
          fontSize: '0.775rem',
          border: '1px solid rgba(6, 182, 212, 0.25)',
        }}>
          {totalFound} customers
        </span>
        {duesFilter === 'has-dues' && <span style={{ color: '#D97706', fontWeight: '600' }}>• With pending dues</span>}
        {duesFilter === 'cleared' && <span style={{ color: '#16A34A', fontWeight: '600' }}>• With zero balance</span>}
        {selectedVillage !== 'All' && <span style={{ color: '#0B1F3A', fontWeight: '600' }}>• In {selectedVillage}</span>}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SUBCOMPONENT 3: Customer Table (7 Columns)
// ----------------------------------------------------------------------
function CustomerTable({
  customers = [],
  viewMode = 'table',
  onViewProfile,
  onReceivePayment,
  onEditCustomer,
}) {
  if (customers.length === 0) {
    return (
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '3.5rem 2rem',
        textAlign: 'center',
        boxShadow: '0 1px 3px rgba(11, 31, 58, 0.04)',
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '12px',
          backgroundColor: '#F1F5F9',
          color: '#2563EB',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.75rem',
          marginBottom: '1rem',
          border: '1px solid #E2E8F0',
        }}>
          👥
        </div>
        <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0B1F3A', margin: '0 0 0.5rem 0' }}>
          No customer records found
        </h3>
        <p style={{ color: '#64748B', fontSize: '0.875rem', margin: '0 auto', maxWidth: '380px' }}>
          Try clearing your search query or adjust your village and outstanding balance status filters.
        </p>
      </div>
    );
  }

  const renderStatusBadge = (outstandingDues, totalPurchases) => {
    const due = Number(outstandingDues || 0);
    const purchases = Number(totalPurchases || 0);

    if (due <= 0) {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 8px',
          borderRadius: '999px',
          backgroundColor: '#DCFCE7',
          color: '#15803D',
          fontWeight: '700',
          fontSize: '0.75rem',
          border: '1px solid rgba(22, 163, 74, 0.2)',
        }}>
          <span>●</span> Paid (₹0 Due)
        </span>
      );
    }

    if (purchases > due) {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 8px',
          borderRadius: '999px',
          backgroundColor: '#FEF3C7',
          color: '#B45309',
          fontWeight: '700',
          fontSize: '0.75rem',
          border: '1px solid rgba(217, 119, 6, 0.2)',
        }}>
          <span>●</span> Partially Paid
        </span>
      );
    }

    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 8px',
        borderRadius: '999px',
        backgroundColor: '#FEE2E2',
        color: '#B91C1C',
        fontWeight: '700',
        fontSize: '0.75rem',
        border: '1px solid rgba(220, 38, 38, 0.2)',
      }}>
        <span>●</span> Overdue
      </span>
    );
  };

  if (viewMode === 'table') {
    return (
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(11, 31, 58, 0.04)',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '880px' }}>
            <thead>
              <tr style={{
                backgroundColor: '#F8FAFC',
                borderBottom: '2px solid #E2E8F0',
                color: '#0B1F3A',
                fontSize: '0.775rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: '800',
              }}>
                <th style={{ padding: '1rem 1.25rem' }}>Customer Name</th>
                <th style={{ padding: '1rem' }}>Phone Number</th>
                <th style={{ padding: '1rem' }}>Village</th>
                <th style={{ padding: '1rem' }}>Total Purchases</th>
                <th style={{ padding: '1rem' }}>Total Paid</th>
                <th style={{ padding: '1rem' }}>Outstanding Due</th>
                <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '0.875rem' }}>
              {customers.map((c, idx) => {
                const totalPurchases = Number(c.totalPurchases || 0);
                const outstandingDue = Number(c.outstandingDues || 0);
                const totalPaid = c.totalPaid !== undefined
                  ? Number(c.totalPaid)
                  : Math.max(0, totalPurchases - outstandingDue);
                const hasDues = outstandingDue > 0;

                return (
                  <tr
                    key={c.id}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFCFF',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#FFFFFF' : '#FAFCFF')}
                  >
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          backgroundColor: '#0B1F3A',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '800',
                          fontSize: '0.85rem',
                          flexShrink: 0,
                        }}>
                          {c.name ? c.name.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div>
                          <div
                            onClick={() => onViewProfile && onViewProfile(c)}
                            style={{
                              fontWeight: '700',
                              color: '#0B1F3A',
                              fontSize: '0.9rem',
                              cursor: 'pointer',
                              display: 'inline-block',
                            }}
                            onMouseEnter={(e) => (e.target.style.color = '#2563EB')}
                            onMouseLeave={(e) => (e.target.style.color = '#0B1F3A')}
                          >
                            {c.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '2px' }}>
                            <span style={{
                              fontFamily: 'monospace',
                              fontSize: '0.7rem',
                              color: '#0891B2',
                              backgroundColor: 'rgba(6, 182, 212, 0.1)',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              fontWeight: '700',
                            }}>
                              {c.id}
                            </span>
                            {c.createdAt && (
                              <span style={{ fontSize: '0.725rem', color: '#64748B' }}>
                                Reg: {new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '1rem', color: '#1E293B', fontWeight: '500', whiteSpace: 'nowrap' }}>
                      {c.phone ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: '#64748B', fontSize: '0.8rem' }}>📞</span>
                          <span>{c.phone}</span>
                        </span>
                      ) : (
                        <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>—</span>
                      )}
                    </td>

                    <td style={{ padding: '1rem', color: '#1E293B' }}>
                      <span style={{
                        backgroundColor: '#F1F5F9',
                        color: '#0B1F3A',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        border: '1px solid #E2E8F0',
                      }}>
                        {c.village || 'N/A'}
                      </span>
                    </td>

                    <td style={{ padding: '1rem', fontWeight: '700', color: '#0B1F3A' }}>
                      ₹{totalPurchases.toLocaleString('en-IN')}
                    </td>

                    <td style={{ padding: '1rem', fontWeight: '700', color: '#15803D' }}>
                      ₹{totalPaid.toLocaleString('en-IN')}
                    </td>

                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                        <span style={{
                          fontWeight: '800',
                          fontSize: '0.925rem',
                          color: hasDues ? '#B91C1C' : '#15803D',
                        }}>
                          ₹{outstandingDue.toLocaleString('en-IN')}
                        </span>
                        {renderStatusBadge(outstandingDue, totalPurchases)}
                      </div>
                    </td>

                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                        {hasDues && (
                          <button
                            onClick={() => onReceivePayment && onReceivePayment(c)}
                            style={{
                              backgroundColor: '#2563EB',
                              color: '#FFFFFF',
                              border: 'none',
                              padding: '0.4rem 0.75rem',
                              borderRadius: '6px',
                              fontSize: '0.775rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 1px 3px rgba(37, 99, 235, 0.25)',
                            }}
                          >
                            <span>💳</span> Record Payment
                          </button>
                        )}

                        <button
                          onClick={() => onViewProfile && onViewProfile(c)}
                          style={{
                            background: 'transparent',
                            border: '1px solid #CBD5E1',
                            color: '#0B1F3A',
                            padding: '0.4rem 0.65rem',
                            borderRadius: '6px',
                            fontSize: '0.775rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                          }}
                        >
                          Profile →
                        </button>

                        <button
                          onClick={() => onEditCustomer && onEditCustomer(c)}
                          style={{
                            backgroundColor: '#F1F5F9',
                            border: '1px solid #E2E8F0',
                            color: '#1E293B',
                            padding: '0.4rem 0.6rem',
                            borderRadius: '6px',
                            fontSize: '0.775rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Cards mode
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
      gap: '1.25rem',
    }}>
      {customers.map((c) => {
        const totalPurchases = Number(c.totalPurchases || 0);
        const outstandingDue = Number(c.outstandingDues || 0);
        const totalPaid = c.totalPaid !== undefined
          ? Number(c.totalPaid)
          : Math.max(0, totalPurchases - outstandingDue);
        const hasDues = outstandingDue > 0;

        return (
          <div
            key={c.id}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: hasDues ? '1px solid #FCD34D' : '1px solid #E2E8F0',
              padding: '1.35rem',
              boxShadow: '0 1px 3px rgba(11, 31, 58, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0B1F3A', margin: 0 }}>
                    {c.name}
                  </h3>
                  <div style={{ fontSize: '0.825rem', color: '#64748B', fontWeight: '500', marginTop: '2px' }}>
                    Village: <b style={{ color: '#0B1F3A' }}>{c.village || 'N/A'}</b>
                  </div>
                </div>

                <span style={{
                  fontFamily: 'monospace',
                  fontSize: '0.725rem',
                  fontWeight: '700',
                  backgroundColor: 'rgba(6, 182, 212, 0.1)',
                  color: '#0891B2',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}>
                  {c.id}
                </span>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem',
                color: '#1E293B',
                marginBottom: '1rem',
                padding: '0.45rem 0.65rem',
                backgroundColor: '#F8FAFC',
                borderRadius: '6px',
              }}>
                <span style={{ color: '#64748B' }}>📞 Phone:</span>
                <b style={{ color: '#0B1F3A' }}>{c.phone || 'No phone recorded'}</b>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.5rem',
                marginBottom: '1rem',
              }}>
                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.55rem 0.65rem' }}>
                  <span style={{ fontSize: '0.675rem', color: '#64748B', textTransform: 'uppercase', fontWeight: '700', display: 'block' }}>
                    Purchases
                  </span>
                  <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0B1F3A', marginTop: '2px' }}>
                    ₹{totalPurchases.toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '0.55rem 0.65rem' }}>
                  <span style={{ fontSize: '0.675rem', color: '#15803D', textTransform: 'uppercase', fontWeight: '700', display: 'block' }}>
                    Paid
                  </span>
                  <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#15803D', marginTop: '2px' }}>
                    ₹{totalPaid.toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={{
                  backgroundColor: hasDues ? '#FEF2F2' : '#F0FDF4',
                  border: hasDues ? '1px solid #FECACA' : '1px solid #BBF7D0',
                  borderRadius: '8px',
                  padding: '0.55rem 0.65rem',
                }}>
                  <span style={{
                    fontSize: '0.675rem',
                    color: hasDues ? '#B91C1C' : '#15803D',
                    textTransform: 'uppercase',
                    fontWeight: '700',
                    display: 'block',
                  }}>
                    Due
                  </span>
                  <div style={{
                    fontSize: '0.95rem',
                    fontWeight: '800',
                    color: hasDues ? '#B91C1C' : '#15803D',
                    marginTop: '2px',
                  }}>
                    ₹{outstandingDue.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                {renderStatusBadge(outstandingDue, totalPurchases)}
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '0.85rem',
              borderTop: '1px solid #F1F5F9',
            }}>
              <button
                onClick={() => onViewProfile && onViewProfile(c)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563EB',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                View Profile →
              </button>

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {hasDues && (
                  <button
                    onClick={() => onReceivePayment && onReceivePayment(c)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      backgroundColor: '#2563EB',
                      border: 'none',
                      color: '#FFFFFF',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    Record Payment
                  </button>
                )}
                <button
                  onClick={() => onEditCustomer && onEditCustomer(c)}
                  style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: '6px',
                    backgroundColor: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    color: '#1E293B',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ----------------------------------------------------------------------
// SUBCOMPONENT 4: Customer Profile Drawer with 4 Tabs
// ----------------------------------------------------------------------
function CustomerProfile({
  isOpen,
  customer,
  onClose,
  onOpenReceivePayment,
  onEditCustomer,
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [sales, setSales] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customer && isOpen) {
      loadCustomerData(customer.id);
    }
  }, [customer, isOpen]);

  const loadCustomerData = async (customerId) => {
    setLoading(true);
    try {
      const [sData, pData] = await Promise.all([
        customerService.getCustomerSales(customerId),
        customerService.getCustomerPayments(customerId),
      ]);
      setSales(sData || []);
      setPayments(pData || []);
    } catch (e) {
      console.error('Failed to load customer profile details:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !customer) return null;

  const totalPurchases = Number(customer.totalPurchases || 0);
  const outstandingDues = Number(customer.outstandingDues || 0);
  const totalPaid = customer.totalPaid !== undefined
    ? Number(customer.totalPaid)
    : Math.max(0, totalPurchases - outstandingDues);
  const hasDues = outstandingDues > 0;
  const unpaidSales = sales.filter((s) => s.dueAmount > 0);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(11, 31, 58, 0.65)',
      backdropFilter: 'blur(4px)',
      zIndex: 100,
      display: 'flex',
      justifyContent: 'flex-end',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '760px',
        height: '100%',
        backgroundColor: '#FFFFFF',
        boxShadow: '-4px 0 25px rgba(11, 31, 58, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                fontSize: '0.725rem',
                fontWeight: '700',
                color: '#0891B2',
                backgroundColor: 'rgba(6, 182, 212, 0.1)',
                padding: '2px 7px',
                borderRadius: '4px',
                textTransform: 'uppercase',
              }}>
                Customer Ledger
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#64748B' }}>
                ID: {customer.id}
              </span>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0B1F3A', margin: '4px 0 0 0' }}>
              {customer.name}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              onClick={() => window.print()}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#0B1F3A',
                fontSize: '0.8rem',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              <span>🖨️</span> Print Statement
            </button>

            {hasDues && (
              <button
                onClick={() => onOpenReceivePayment && onOpenReceivePayment(customer, null, unpaidSales)}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                <span>💳</span> Record Payment
              </button>
            )}

            <button
              onClick={onClose}
              style={{
                background: '#F1F5F9',
                border: '1px solid #E2E8F0',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                color: '#1E293B',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* 4 Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #E2E8F0',
          padding: '0 1.75rem',
          backgroundColor: '#FFFFFF',
          position: 'sticky',
          top: '68px',
          zIndex: 9,
          overflowX: 'auto',
        }}>
          {[
            { id: 'overview', label: 'Overview', icon: '👤' },
            { id: 'purchases', label: `Purchase History (${sales.length})`, icon: '🛒' },
            { id: 'payments', label: `Payment History (${payments.length})`, icon: '💵' },
            { id: 'dues', label: `Outstanding Dues (${unpaidSales.length})`, icon: '⚠️', alert: hasDues },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.85rem 1.1rem',
                  border: 'none',
                  borderBottom: isActive ? '3px solid #2563EB' : '3px solid transparent',
                  backgroundColor: 'transparent',
                  color: isActive ? '#2563EB' : '#64748B',
                  fontWeight: isActive ? '800' : '600',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div style={{ padding: '1.75rem', flex: 1, backgroundColor: '#FFFFFF' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
              <p>Loading ledger records...</p>
            </div>
          ) : (
            <>
              {/* Tab 1: Overview */}
              {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                    <div style={{ backgroundColor: '#FFFFFF', padding: '1rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                      <span style={{ fontSize: '0.725rem', color: '#64748B', textTransform: 'uppercase', fontWeight: '700' }}>
                        Total Purchases
                      </span>
                      <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0B1F3A', marginTop: '4px' }}>
                        ₹{totalPurchases.toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#FFFFFF', padding: '1rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                      <span style={{ fontSize: '0.725rem', color: '#15803D', textTransform: 'uppercase', fontWeight: '700' }}>
                        Total Paid
                      </span>
                      <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#15803D', marginTop: '4px' }}>
                        ₹{totalPaid.toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div style={{
                      backgroundColor: hasDues ? '#FEF2F2' : '#F0FDF4',
                      padding: '1rem',
                      borderRadius: '10px',
                      border: hasDues ? '1px solid #FECACA' : '1px solid #BBF7D0',
                    }}>
                      <span style={{ fontSize: '0.725rem', color: hasDues ? '#B91C1C' : '#15803D', textTransform: 'uppercase', fontWeight: '700' }}>
                        Outstanding Due
                      </span>
                      <div style={{ fontSize: '1.35rem', fontWeight: '800', color: hasDues ? '#B91C1C' : '#15803D', marginTop: '4px' }}>
                        ₹{outstandingDues.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  {/* Contact details */}
                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.25rem 1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0B1F3A', textTransform: 'uppercase', margin: 0 }}>
                        Customer Contact & Farm Profile
                      </h4>
                      <button
                        onClick={() => onEditCustomer && onEditCustomer(customer)}
                        style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}
                      >
                        Edit Details ✏️
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem', fontSize: '0.875rem' }}>
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>Primary Phone</span>
                        <strong style={{ color: '#0B1F3A' }}>{customer.phone || 'Not recorded'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>Village</span>
                        <strong style={{ color: '#0B1F3A' }}>{customer.village || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>Registration Date</span>
                        <strong style={{ color: '#0B1F3A' }}>
                          {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </strong>
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', fontWeight: '600' }}>Address</span>
                        <span style={{ color: '#1E293B' }}>{customer.address || 'Standard local customer'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Purchase History */}
              {activeTab === 'purchases' && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#0B1F3A', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '0.75rem 1rem' }}>Invoice</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Amount</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: '0.85rem' }}>
                      {sales.map(s => (
                        <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: '700', color: '#0B1F3A' }}>{s.invoiceNumber || s.id}</td>
                          <td style={{ padding: '0.75rem 1rem', color: '#64748B' }}>{new Date(s.date).toLocaleDateString('en-IN')}</td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: '800', color: '#0B1F3A' }}>₹{Number(s.totalAmount).toLocaleString('en-IN')}</td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '999px',
                              fontSize: '0.725rem',
                              fontWeight: '700',
                              backgroundColor: s.status === 'PAID' ? '#DCFCE7' : s.status === 'PARTIAL' ? '#FEF3C7' : '#FEE2E2',
                              color: s.status === 'PAID' ? '#15803D' : s.status === 'PARTIAL' ? '#B45309' : '#B91C1C',
                            }}>
                              ● {s.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 3: Payment History */}
              {activeTab === 'payments' && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#0B1F3A', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '0.75rem 1rem' }}>Receipt</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Amount</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Method</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: '0.85rem' }}>
                      {payments.map(p => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: '700', color: '#0B1F3A' }}>{p.receiptNumber || p.id}</td>
                          <td style={{ padding: '0.75rem 1rem', color: '#64748B' }}>{new Date(p.date).toLocaleDateString('en-IN')}</td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: '800', color: '#15803D' }}>₹{Number(p.amount).toLocaleString('en-IN')}</td>
                          <td style={{ padding: '0.75rem 1rem', color: '#1E293B', fontWeight: '600' }}>{p.method}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 4: Outstanding Dues */}
              {activeTab === 'dues' && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#0B1F3A', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '0.75rem 1rem' }}>Invoice</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Total</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Paid</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Due</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: '0.85rem' }}>
                      {unpaidSales.map(s => (
                        <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: '700', color: '#0B1F3A' }}>{s.invoiceNumber || s.id}</td>
                          <td style={{ padding: '0.75rem 1rem', color: '#1E293B' }}>₹{Number(s.totalAmount).toLocaleString('en-IN')}</td>
                          <td style={{ padding: '0.75rem 1rem', color: '#15803D', fontWeight: '600' }}>₹{Number(s.paidAmount || 0).toLocaleString('en-IN')}</td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: '800', color: '#B91C1C' }}>₹{Number(s.dueAmount).toLocaleString('en-IN')}</td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                            <button
                              onClick={() => onOpenReceivePayment && onOpenReceivePayment(customer, s, unpaidSales)}
                              style={{
                                backgroundColor: '#2563EB',
                                color: '#FFFFFF',
                                border: 'none',
                                padding: '0.35rem 0.75rem',
                                borderRadius: '6px',
                                fontSize: '0.775rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                              }}
                            >
                              Pay Invoice
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SUBCOMPONENT 5: Customer Add & Edit Modal
// ----------------------------------------------------------------------
// Helper function to get today's date formatted as YYYY-MM-DD from the local device
const getDeviceTodayDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function CustomerForm({ isOpen, customer = null, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    village: '',
    address: '',
    date: getDeviceTodayDate(),
    totalPayment: '',
    paidAmount: '',
    duePayment: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isEdit = Boolean(customer && customer.id);

  useEffect(() => {
    if (customer) {
      const total = customer.totalPurchases !== undefined ? String(customer.totalPurchases) : '0';
      const paid = customer.totalPaid !== undefined
        ? String(customer.totalPaid)
        : String(Math.max(0, (customer.totalPurchases || 0) - (customer.outstandingDues || 0)));
      const due = customer.outstandingDues !== undefined ? String(customer.outstandingDues) : '0';
      const custDate = customer.createdAt
        ? new Date(customer.createdAt).toISOString().split('T')[0]
        : getDeviceTodayDate();

      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        village: customer.village || '',
        address: customer.address || '',
        date: custDate,
        totalPayment: total,
        paidAmount: paid,
        duePayment: due,
        notes: customer.notes || '',
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        village: '',
        address: '',
        date: getDeviceTodayDate(),
        totalPayment: '',
        paidAmount: '',
        duePayment: '',
        notes: '',
      });
    }
    setError('');
  }, [customer, isOpen]);

  // Reactive payment calculations
  const handleTotalPaymentChange = (val) => {
    setFormData(prev => {
      const total = Number(val) || 0;
      const paid = Number(prev.paidAmount) || 0;
      const due = Math.max(0, total - paid);
      return {
        ...prev,
        totalPayment: val,
        duePayment: val === '' && prev.paidAmount === '' ? '' : String(due),
      };
    });
  };

  const handlePaidAmountChange = (val) => {
    setFormData(prev => {
      const total = Number(prev.totalPayment) || 0;
      const paid = Number(val) || 0;
      const due = Math.max(0, total - paid);
      return {
        ...prev,
        paidAmount: val,
        duePayment: val === '' && prev.totalPayment === '' ? '' : String(due),
      };
    });
  };

  const handleDuePaymentChange = (val) => {
    setFormData(prev => {
      const total = Number(prev.totalPayment) || 0;
      const due = Number(val) || 0;
      const paid = Math.max(0, total - due);
      return {
        ...prev,
        duePayment: val,
        paidAmount: val === '' && prev.totalPayment === '' ? '' : String(paid),
      };
    });
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Customer name is required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSave(formData, customer?.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save customer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(11, 31, 58, 0.65)',
      backdropFilter: 'blur(4px)',
      zIndex: 110,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(11, 31, 58, 0.25)',
        overflow: 'hidden',
        border: '1px solid #E2E8F0',
      }}>
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <span style={{
              fontSize: '0.725rem',
              fontWeight: '700',
              color: isEdit ? '#D97706' : '#2563EB',
              backgroundColor: isEdit ? '#FFFBEB' : 'rgba(37, 99, 235, 0.08)',
              padding: '2px 6px',
              borderRadius: '4px',
              textTransform: 'uppercase',
            }}>
              {isEdit ? 'Update Record' : 'New Registration'}
            </span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0B1F3A', margin: '4px 0 0 0' }}>
              {isEdit ? 'Edit Customer Details' : 'Add New Customer'}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#F1F5F9',
              border: '1px solid #E2E8F0',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              color: '#1E293B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem 1.75rem', overflowY: 'auto' }}>
          {error && (
            <div style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: '600' }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
            {/* Customer Name */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0B1F3A', display: 'block', marginBottom: '0.35rem' }}>
                Customer Name *
              </label>
              <input
                type="text"
                required
                placeholder="Enter customer / farmer name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid #CBD5E1', outline: 'none' }}
                onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
              />
            </div>

            {/* Phone Number */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0B1F3A', display: 'block', marginBottom: '0.35rem' }}>
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="Mobile number"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid #CBD5E1', outline: 'none' }}
                onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
              />
            </div>

            {/* Village */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0B1F3A', display: 'block', marginBottom: '0.35rem' }}>
                Village
              </label>
              <input
                type="text"
                placeholder="Village / Town"
                value={formData.village}
                onChange={(e) => setFormData(prev => ({ ...prev, village: e.target.value }))}
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid #CBD5E1', outline: 'none' }}
                onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
              />
            </div>

            {/* 4. Default Date (automatically taken from device) */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0B1F3A', display: 'block', marginBottom: '0.35rem' }}>
                Registration Date * <span style={{ fontSize: '0.72rem', fontWeight: '500', color: '#64748B' }}>(Auto-filled from device)</span>
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  fontWeight: '600',
                  color: '#0B1F3A',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
              />
            </div>

            {/* Financial Details: Total Payment, Paid Amount, Due Payment */}
            <div style={{
              gridColumn: 'span 2',
              backgroundColor: '#F8FAFC',
              borderRadius: '10px',
              padding: '1rem',
              border: '1.5px solid #E2E8F0',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                {/* 1. Total Payment Option */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#0B1F3A', display: 'block', marginBottom: '0.35rem' }}>
                    1. Total Payment (₹)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="0.00"
                    value={formData.totalPayment}
                    onChange={(e) => handleTotalPaymentChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontWeight: '700',
                      fontSize: '0.875rem',
                      color: '#0B1F3A',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                    onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                  />
                </div>

                {/* 2. Paid Amount */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#15803D', display: 'block', marginBottom: '0.35rem' }}>
                    2. Paid Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="0.00"
                    value={formData.paidAmount}
                    onChange={(e) => handlePaidAmountChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      border: '1.5px solid #86EFAC',
                      backgroundColor: '#F0FDF4',
                      fontWeight: '700',
                      fontSize: '0.875rem',
                      color: '#15803D',
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#16A34A')}
                    onBlur={(e) => (e.target.style.borderColor = '#86EFAC')}
                  />
                </div>

                {/* 3. Due Payment */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#B91C1C', display: 'block', marginBottom: '0.35rem' }}>
                    3. Due Payment (₹)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="0.00"
                    value={formData.duePayment}
                    onChange={(e) => handleDuePaymentChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      border: '1.5px solid #FECACA',
                      backgroundColor: '#FEF2F2',
                      fontWeight: '700',
                      fontSize: '0.875rem',
                      color: '#B91C1C',
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#DC2626')}
                    onBlur={(e) => (e.target.style.borderColor = '#FECACA')}
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0B1F3A', display: 'block', marginBottom: '0.35rem' }}>
                Address
              </label>
              <textarea
                rows="2"
                placeholder="Customer full address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid #CBD5E1', outline: 'none' }}
                onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', cursor: 'pointer', fontWeight: '600', color: '#475569' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '0.65rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              {submitting ? 'Saving...' : isEdit ? 'Save Changes' : '+ Register Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SUBCOMPONENT 6: Record Payment Modal
// ----------------------------------------------------------------------
function ReceivePaymentForm({
  isOpen,
  customer = null,
  sale = null,
  unpaidSales = [],
  onClose,
  onSubmitPayment,
}) {
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (sale) {
      setSelectedSaleId(sale.id);
      setAmount(String(sale.dueAmount || ''));
    } else if (unpaidSales.length > 0) {
      setSelectedSaleId(unpaidSales[0].id);
      setAmount(String(unpaidSales[0].dueAmount || ''));
    } else {
      setSelectedSaleId('');
      setAmount('');
    }
    setError('');
  }, [sale, unpaidSales, isOpen]);

  if (!isOpen) return null;

  const currentSale = unpaidSales.find(s => s.id === selectedSaleId) || sale;
  const maxDue = currentSale ? Number(currentSale.dueAmount || 0) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSaleId) {
      setError('Please select an invoice to record payment against.');
      return;
    }
    const payNum = Number(amount);
    if (!payNum || payNum <= 0) {
      setError('Please enter a valid payment amount greater than ₹0.');
      return;
    }
    if (payNum > maxDue) {
      setError(`Payment amount cannot exceed current invoice due of ₹${maxDue.toLocaleString('en-IN')}.`);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await onSubmitPayment(selectedSaleId, {
        amount: payNum,
        method,
        reference: reference.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Payment processing failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(11, 31, 58, 0.65)',
      backdropFilter: 'blur(4px)',
      zIndex: 120,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '540px',
        boxShadow: '0 20px 25px -5px rgba(11, 31, 58, 0.25)',
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0B1F3A', margin: 0 }}>
              Record Payment Against Invoice
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '2px 0 0 0' }}>
              Customer: <b>{customer?.name || 'Selected Customer'}</b>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#F1F5F9',
              border: '1px solid #E2E8F0',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem 1.75rem' }}>
          {error && (
            <div style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.825rem', fontWeight: '700', color: '#0B1F3A', display: 'block', marginBottom: '0.4rem' }}>
              Target Unpaid Invoice *
            </label>
            {unpaidSales.length > 0 ? (
              <select
                value={selectedSaleId}
                onChange={(e) => {
                  setSelectedSaleId(e.target.value);
                  const chosen = unpaidSales.find(s => s.id === e.target.value);
                  if (chosen) setAmount(String(chosen.dueAmount || ''));
                }}
                style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontWeight: '600' }}
              >
                {unpaidSales.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.invoiceNumber || s.id} — Due: ₹{s.dueAmount.toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            ) : (
              <div style={{ padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
                Invoice {currentSale?.invoiceNumber || currentSale?.id} — Due: ₹{maxDue.toLocaleString('en-IN')}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.825rem', fontWeight: '700', color: '#0B1F3A', display: 'block', marginBottom: '0.4rem' }}>
              Payment Amount (₹) *
            </label>
            <input
              type="number"
              required
              min="1"
              max={maxDue}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '1.25rem', fontWeight: '800', color: '#0B1F3A' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0B1F3A', display: 'block', marginBottom: '0.35rem' }}>
                Method
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #CBD5E1' }}
              >
                <option value="CASH">💵 Cash</option>
                <option value="UPI">📱 UPI / QR</option>
                <option value="BANK_TRANSFER">🏦 Bank</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0B1F3A', display: 'block', marginBottom: '0.35rem' }}>
                Reference / UTR
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Transaction ID"
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #CBD5E1' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedSaleId || !amount}
              style={{
                padding: '0.65rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              {submitting ? 'Recording...' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// MAIN EXPORT: CustomerDetails Page
// ----------------------------------------------------------------------
export default function CustomerDetails({ subItem = 'all-customers', onNavigate }) {
  const [mainTab, setMainTab] = useState(subItem === 'retail-details' ? 'retail-details' : 'customer-details');
  const [customers, setCustomers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Retail sales state
  const [retailSales, setRetailSales] = useState([]);
  const [retailLoading, setRetailLoading] = useState(false);
  const [retailSearch, setRetailSearch] = useState('');
  const [retailPaymentFilter, setRetailPaymentFilter] = useState('ALL');
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [duesFilter, setDuesFilter] = useState('all');
  const [selectedVillage, setSelectedVillage] = useState('All');
  const [viewMode, setViewMode] = useState('table');

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isReceivePaymentOpen, setIsReceivePaymentOpen] = useState(false);
  const [paymentTargetCustomer, setPaymentTargetCustomer] = useState(null);
  const [paymentTargetSale, setPaymentTargetSale] = useState(null);
  const [unpaidInvoicesForPayment, setUnpaidInvoicesForPayment] = useState([]);

  useEffect(() => {
    if (subItem === 'retail-details') {
      setMainTab('retail-details');
    } else if (subItem === 'outstanding-dues') {
      setMainTab('customer-details');
      setDuesFilter('has-dues');
    } else if (subItem === 'add-customer') {
      setMainTab('customer-details');
      setEditingCustomer(null);
      setIsCustomerFormOpen(true);
    } else if (subItem === 'receive-payment') {
      setMainTab('customer-details');
      const custWithDues = customers.find((c) => (c.outstandingDues || 0) > 0) || customers[0] || null;
      if (custWithDues) {
        handleOpenReceivePayment(custWithDues);
      }
    } else {
      setDuesFilter('all');
    }
  }, [subItem]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await customerService.getCustomers({
        search: searchQuery,
        duesOnly: duesFilter,
        village: selectedVillage,
      });
      setCustomers(res.data || []);
      setSummary(res.summary || null);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, duesFilter, selectedVillage]);

  const loadRetailSales = useCallback(async () => {
    setRetailLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/sales');
      if (res.ok) {
        const json = await res.json();
        setRetailSales(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching retail sales:', err);
    } finally {
      setRetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadRetailSales();
  }, [loadData, loadRetailSales]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setDuesFilter('all');
    setSelectedVillage('All');
  };

  const handleOpenAddCustomer = () => {
    setEditingCustomer(null);
    setIsCustomerFormOpen(true);
  };

  const handleOpenEditCustomer = (c) => {
    setEditingCustomer(c);
    setIsCustomerFormOpen(true);
  };

  const handleSaveCustomer = async (formData, id) => {
    if (id) {
      await customerService.updateCustomer(id, formData);
    } else {
      await customerService.createCustomer(formData);
    }
    await loadData();
    if (selectedCustomer && selectedCustomer.id === id) {
      const updated = await customerService.getCustomerById(id);
      setSelectedCustomer(updated);
    }
  };

  const handleOpenReceivePayment = async (customer, specificSale = null, unpaidList = null) => {
    setPaymentTargetCustomer(customer);
    setPaymentTargetSale(specificSale);
    if (unpaidList) {
      setUnpaidInvoicesForPayment(unpaidList);
    } else {
      try {
        const balance = await customerService.getCustomerBalance(customer.id);
        setUnpaidInvoicesForPayment(balance?.unpaidInvoices || []);
      } catch (e) {
        setUnpaidInvoicesForPayment([]);
      }
    }
    setIsReceivePaymentOpen(true);
  };

  const handleSubmitPayment = async (saleId, payData) => {
    await customerService.recordInvoicePayment(saleId, payData);
    await loadData();
    if (selectedCustomer) {
      const updated = await customerService.getCustomerById(selectedCustomer.id);
      setSelectedCustomer(updated);
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* 1. Page Header & Actions */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '1.25rem',
      }}>
        <div>
          <h1 style={{
            fontSize: '1.85rem',
            fontWeight: '900',
            color: '#0B1F3A',
            letterSpacing: '-0.025em',
            margin: 0,
            lineHeight: '1.2',
          }}>
            {mainTab === 'customer-details' ? 'Customer Details' : 'Retail Details'}
          </h1>
          <p style={{
            color: '#64748B',
            fontSize: '0.925rem',
            marginTop: '0.35rem',
            marginBottom: 0,
            fontWeight: '500',
          }}>
            {mainTab === 'customer-details'
              ? 'Manage customer records, credit accounts, and outstanding payments'
              : 'Direct counter sales, walk-in farmer billing, and cash/digital settlement records'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {mainTab === 'customer-details' ? (
            <>
              <button
                onClick={() => {
                  const custWithDues = customers.find((c) => (c.outstandingDues || 0) > 0) || customers[0];
                  if (custWithDues) handleOpenReceivePayment(custWithDues);
                }}
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#0B1F3A',
                  border: '1px solid #CBD5E1',
                  padding: '0.65rem 1.15rem',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <span>💳</span> Record Payment
              </button>

              <button
                onClick={handleOpenAddCustomer}
                style={{
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '0.65rem 1.35rem',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 3px 10px rgba(37, 99, 235, 0.3)',
                }}
              >
                <span>+</span> Add Customer
              </button>
            </>
          ) : (
            <>
              <button
                onClick={loadRetailSales}
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#0B1F3A',
                  border: '1px solid #CBD5E1',
                  padding: '0.65rem 1.15rem',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}
              >
                <span>🔄</span> Refresh Bills
              </button>

              <button
                onClick={() => onNavigate && onNavigate('purchase-sales', 'create-sale')}
                style={{
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '0.65rem 1.35rem',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 3px 10px rgba(5, 150, 105, 0.3)',
                }}
              >
                <span>🧾</span> + New Retail Bill
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. Top Button Option Tabs: Customer Details & Retail Details */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        borderBottom: '2px solid #E2E8F0',
        paddingBottom: '0.85rem',
        marginBottom: '1.75rem',
      }}>
        <button
          type="button"
          onClick={() => setMainTab('customer-details')}
          style={{
            padding: '0.65rem 1.4rem',
            borderRadius: '8px',
            border: mainTab === 'customer-details' ? '2px solid #0B1F3A' : '1px solid #CBD5E1',
            backgroundColor: mainTab === 'customer-details' ? '#0B1F3A' : '#FFFFFF',
            color: mainTab === 'customer-details' ? '#FFFFFF' : '#475569',
            fontSize: '0.925rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.55rem',
            boxShadow: mainTab === 'customer-details' ? '0 4px 12px rgba(11, 31, 58, 0.18)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>👥</span> Customer Details
        </button>

        <button
          type="button"
          onClick={() => setMainTab('retail-details')}
          style={{
            padding: '0.65rem 1.4rem',
            borderRadius: '8px',
            border: mainTab === 'retail-details' ? '2px solid #0B1F3A' : '1px solid #CBD5E1',
            backgroundColor: mainTab === 'retail-details' ? '#0B1F3A' : '#FFFFFF',
            color: mainTab === 'retail-details' ? '#FFFFFF' : '#475569',
            fontSize: '0.925rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.55rem',
            boxShadow: mainTab === 'retail-details' ? '0 4px 12px rgba(11, 31, 58, 0.18)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>🛒</span> Retail Details
        </button>
      </div>

      {mainTab === 'customer-details' ? (
        <>
          {/* Customer Details View: Summary Cards, Filters & Table */}
          <CustomerSummaryCards
            summary={summary}
            activeDuesFilter={duesFilter}
            onSelectFilter={setDuesFilter}
          />

          <CustomerFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            duesFilter={duesFilter}
            onDuesFilterChange={setDuesFilter}
            selectedVillage={selectedVillage}
            onVillageChange={setSelectedVillage}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onResetFilters={handleResetFilters}
            villages={['All', ...Array.from(new Set(customers.map(c => c.village).filter(Boolean)))]}
            totalFound={customers.length}
          />

          {loading ? (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '4rem 2rem',
              textAlign: 'center',
            }}>
              <p style={{ color: '#64748B', fontWeight: '600' }}>Loading Customer Records...</p>
            </div>
          ) : (
            <CustomerTable
              customers={customers}
              viewMode={viewMode}
              onViewProfile={(c) => {
                setSelectedCustomer(c);
                setIsProfileOpen(true);
              }}
              onReceivePayment={handleOpenReceivePayment}
              onEditCustomer={handleOpenEditCustomer}
            />
          )}
        </>
      ) : (
        /* Retail Details View: Walk-in counter billing, POS receipts & cash turnover */
        <div>
          {/* Retail Metric Cards */}
          {(() => {
            const totalRetailBills = retailSales.length;
            const totalRetailRevenue = retailSales.reduce((acc, s) => acc + Number(s.totalAmount || 0), 0);
            const totalCashAndDigital = retailSales.reduce((acc, s) => acc + Number(s.paidAmount || 0), 0);
            const todayStr = new Date().toDateString();
            const todayRetailTurnover = retailSales
              .filter(s => new Date(s.date || s.createdAt).toDateString() === todayStr)
              .reduce((acc, s) => acc + Number(s.totalAmount || 0), 0);

            return (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                gap: '1.25rem',
                marginBottom: '1.75rem',
              }}>
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '1.25rem 1.4rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(11, 31, 58, 0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Retail Bills</span>
                    <span style={{ fontSize: '1.35rem' }}>🧾</span>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0B1F3A', marginTop: '0.35rem' }}>
                    {totalRetailBills.toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>Counter & Walk-in Invoices</div>
                </div>

                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '1.25rem 1.4rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(11, 31, 58, 0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Retail Sales Turnover</span>
                    <span style={{ fontSize: '1.35rem' }}>🌾</span>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#059669', marginTop: '0.35rem' }}>
                    ₹{totalRetailRevenue.toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>Total Gross Retail Invoiced</div>
                </div>

                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '1.25rem 1.4rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(11, 31, 58, 0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cash & Instant Paid</span>
                    <span style={{ fontSize: '1.35rem' }}>💵</span>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#2563EB', marginTop: '0.35rem' }}>
                    ₹{totalCashAndDigital.toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>Settled Collections</div>
                </div>

                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '1.25rem 1.4rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(11, 31, 58, 0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Today's Retail Sales</span>
                    <span style={{ fontSize: '1.35rem' }}>⚡</span>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#D97706', marginTop: '0.35rem' }}>
                    ₹{todayRetailTurnover.toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>Same-day Retail Counter Revenue</div>
                </div>
              </div>
            );
          })()}

          {/* Retail Search, Filters & Action Bar */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 1px 3px rgba(11, 31, 58, 0.04)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
              <div style={{ position: 'relative', minWidth: '260px', flex: '1 1 300px' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>🔍</span>
                <input
                  type="text"
                  placeholder="Search retail bill #, customer name, mobile, item..."
                  value={retailSearch}
                  onChange={(e) => setRetailSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem 0.6rem 2.4rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.875rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Payment Filter Pills */}
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {[
                  { id: 'ALL', label: 'All Modes' },
                  { id: 'CASH', label: '💵 Cash' },
                  { id: 'UPI', label: '📱 UPI' },
                  { id: 'CREDIT', label: '🌾 Credit (Khata)' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setRetailPaymentFilter(f.id)}
                    style={{
                      padding: '0.45rem 0.85rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      border: retailPaymentFilter === f.id ? '1px solid #0B1F3A' : '1px solid #E2E8F0',
                      backgroundColor: retailPaymentFilter === f.id ? '#0B1F3A' : '#F8FAFC',
                      color: retailPaymentFilter === f.id ? '#FFFFFF' : '#475569',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('purchase-sales', 'create-sale')}
                style={{
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '0.6rem 1.15rem',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <span>🧾</span> + New Retail Bill
              </button>
            </div>
          </div>

          {/* Retail Bills Table */}
          {retailLoading ? (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '4rem 2rem',
              textAlign: 'center',
            }}>
              <p style={{ color: '#64748B', fontWeight: '600' }}>Loading Retail Transactions...</p>
            </div>
          ) : (() => {
            const filteredRetailSales = retailSales.filter((sale) => {
              if (retailPaymentFilter !== 'ALL') {
                const mode = (sale.paymentMethod || 'CASH').toUpperCase();
                if (!mode.includes(retailPaymentFilter)) return false;
              }
              if (retailSearch.trim()) {
                const q = retailSearch.toLowerCase().trim();
                const matchInv = (sale.invoiceNumber || sale.id || '').toLowerCase().includes(q);
                const matchCust = (sale.customerName || '').toLowerCase().includes(q);
                const matchPhone = (sale.customerPhone || '').toLowerCase().includes(q);
                const matchVillage = (sale.customerVillage || '').toLowerCase().includes(q);
                const matchItems = (sale.items || []).some(it => (it.name || it.productName || '').toLowerCase().includes(q));
                return matchInv || matchCust || matchPhone || matchVillage || matchItems;
              }
              return true;
            });

            if (filteredRetailSales.length === 0) {
              return (
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '3.5rem 2rem',
                  textAlign: 'center',
                  boxShadow: '0 1px 3px rgba(11, 31, 58, 0.04)',
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🛒</div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0B1F3A', margin: '0 0 0.5rem 0' }}>
                    No Retail Invoices Found
                  </h3>
                  <p style={{ color: '#64748B', fontSize: '0.875rem', maxWidth: '420px', margin: '0 auto 1.5rem auto' }}>
                    {retailSales.length === 0
                      ? 'No retail transactions recorded yet. Start issuing instant bills to walk-in farmers and counter customers.'
                      : 'No retail bills match your current search or payment filter.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate('purchase-sales', 'create-sale')}
                    style={{
                      backgroundColor: '#059669',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '0.65rem 1.4rem',
                      borderRadius: '8px',
                      fontWeight: '700',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                    }}
                  >
                    + Create Retail Bill Now
                  </button>
                </div>
              );
            }

            return (
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(11, 31, 58, 0.04)',
                overflow: 'hidden',
              }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{
                        backgroundColor: '#F8FAFC',
                        borderBottom: '2px solid #E2E8F0',
                        color: '#475569',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}>
                        <th style={{ padding: '0.9rem 1.15rem' }}>Receipt / Bill #</th>
                        <th style={{ padding: '0.9rem 1.15rem' }}>Date & Time</th>
                        <th style={{ padding: '0.9rem 1.15rem' }}>Customer / Farmer</th>
                        <th style={{ padding: '0.9rem 1.15rem' }}>Items Sold</th>
                        <th style={{ padding: '0.9rem 1.15rem' }}>Payment Mode</th>
                        <th style={{ padding: '0.9rem 1.15rem' }}>Total Amount</th>
                        <th style={{ padding: '0.9rem 1.15rem' }}>Status</th>
                        <th style={{ padding: '0.9rem 1.15rem', textAlign: 'center' }}>Receipt Action</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: '0.875rem' }}>
                      {filteredRetailSales.map((sale) => {
                        const isPaid = sale.status === 'PAID';
                        const isCredit = sale.paymentMethod === 'CREDIT (KHATA)';
                        const formattedDate = (() => {
                          const raw = sale.date || sale.createdAt;
                          if (!raw) return '—';
                          const d = new Date(raw);
                          if (isNaN(d.getTime())) return '—';
                          return d.toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          });
                        })();

                        return (
                          <tr key={sale.id || sale.invoiceNumber} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.15s' }}>
                            <td style={{ padding: '0.9rem 1.15rem', fontFamily: 'monospace', fontWeight: '700', color: '#0B1F3A' }}>
                              {sale.invoiceNumber || sale.id}
                            </td>

                            <td style={{ padding: '0.9rem 1.15rem', color: '#475569', whiteSpace: 'nowrap' }}>
                              <div>{formattedDate}</div>
                              <div style={{ fontSize: '0.725rem', color: '#94A3B8' }}>Device Timestamp</div>
                            </td>

                            <td style={{ padding: '0.9rem 1.15rem', fontWeight: '600', color: '#0B1F3A' }}>
                              <div>{sale.customerName || 'Direct Counter Sale'}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', gap: '0.5rem', marginTop: '2px' }}>
                                {sale.customerPhone && <span>📞 {sale.customerPhone}</span>}
                                {sale.customerVillage && <span>📍 {sale.customerVillage}</span>}
                              </div>
                            </td>

                            <td style={{ padding: '0.9rem 1.15rem' }}>
                              {sale.items && sale.items.length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                  {sale.items.map((it, idx) => (
                                    <span key={idx} style={{
                                      backgroundColor: '#F1F5F9',
                                      color: '#1E293B',
                                      padding: '2px 7px',
                                      borderRadius: '4px',
                                      fontSize: '0.75rem',
                                      fontWeight: '600',
                                    }}>
                                      {it.name || it.productName}: <b>{it.quantity || it.qty}</b>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>—</span>
                              )}
                            </td>

                            <td style={{ padding: '0.9rem 1.15rem' }}>
                              <span style={{
                                backgroundColor: isCredit ? '#FFFBEB' : '#EFF6FF',
                                color: isCredit ? '#B45309' : '#1D4ED8',
                                border: `1px solid ${isCredit ? '#FDE68A' : '#BFDBFE'}`,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                              }}>
                                {sale.paymentMethod || 'CASH'}
                              </span>
                            </td>

                            <td style={{ padding: '0.9rem 1.15rem', fontWeight: '800', color: '#0B1F3A', fontSize: '0.95rem' }}>
                              ₹{Number(sale.totalAmount || 0).toLocaleString('en-IN')}
                            </td>

                            <td style={{ padding: '0.9rem 1.15rem' }}>
                              <span style={{
                                backgroundColor: isPaid ? '#DCFCE7' : '#FEE2E2',
                                color: isPaid ? '#15803D' : '#B91C1C',
                                border: `1px solid ${isPaid ? '#BBF7D0' : '#FCA5A5'}`,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                              }}>
                                {sale.status || (isCredit ? 'UNPAID' : 'PAID')}
                              </span>
                            </td>

                            <td style={{ padding: '0.9rem 1.15rem', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedReceipt(sale);
                                  setIsReceiptModalOpen(true);
                                }}
                                style={{
                                  backgroundColor: '#FFFFFF',
                                  color: '#0B1F3A',
                                  border: '1px solid #CBD5E1',
                                  padding: '0.45rem 0.85rem',
                                  borderRadius: '6px',
                                  fontSize: '0.8rem',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <span>🖨️</span> View Receipt
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 5. Customer Profile Drawer */}
      <CustomerProfile
        isOpen={isProfileOpen}
        customer={selectedCustomer}
        onClose={() => setIsProfileOpen(false)}
        onOpenReceivePayment={handleOpenReceivePayment}
        onEditCustomer={handleOpenEditCustomer}
      />

      {/* 6. Add/Edit Customer Form */}
      <CustomerForm
        isOpen={isCustomerFormOpen}
        customer={editingCustomer}
        onClose={() => setIsCustomerFormOpen(false)}
        onSave={handleSaveCustomer}
      />

      {/* 7. Record Payment Modal */}
      <ReceivePaymentForm
        isOpen={isReceivePaymentOpen}
        customer={paymentTargetCustomer}
        sale={paymentTargetSale}
        unpaidSales={unpaidInvoicesForPayment}
        onClose={() => setIsReceivePaymentOpen(false)}
        onSubmitPayment={handleSubmitPayment}
      />

      {/* 8. Retail Receipt Modal */}
      {isReceiptModalOpen && selectedReceipt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(11, 31, 58, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden',
          }}>
            {/* Receipt Header */}
            <div style={{
              backgroundColor: '#0B1F3A',
              color: '#FFFFFF',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: '800' }}>Fertilizer Shop Management</div>
                <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Official Retail Cash / Sales Receipt</div>
              </div>
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {/* Receipt Body */}
            <div style={{ padding: '1.5rem', fontSize: '0.875rem', color: '#1E293B' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontWeight: '700', color: '#0B1F3A' }}>Bill No: {selectedReceipt.invoiceNumber || selectedReceipt.id}</div>
                  <div style={{ fontSize: '0.775rem', color: '#64748B', marginTop: '2px' }}>
                    Date: {new Date(selectedReceipt.date || selectedReceipt.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '700', color: '#0B1F3A' }}>Buyer: {selectedReceipt.customerName || 'Direct Counter Sale'}</div>
                  {selectedReceipt.customerPhone && (
                    <div style={{ fontSize: '0.775rem', color: '#64748B' }}>Phone: {selectedReceipt.customerPhone}</div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.25rem', textAlign: 'left', fontSize: '0.825rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#475569' }}>
                    <th style={{ padding: '0.5rem 0' }}>Item</th>
                    <th style={{ padding: '0.5rem 0', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '0.5rem 0', textAlign: 'right' }}>Rate (₹)</th>
                    <th style={{ padding: '0.5rem 0', textAlign: 'right' }}>Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedReceipt.items || []).map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '0.55rem 0', fontWeight: '600' }}>{it.name || it.productName}</td>
                      <td style={{ padding: '0.55rem 0', textAlign: 'center' }}>{it.quantity || it.qty}</td>
                      <td style={{ padding: '0.55rem 0', textAlign: 'right' }}>₹{Number(it.price || 0).toFixed(2)}</td>
                      <td style={{ padding: '0.55rem 0', textAlign: 'right', fontWeight: '700' }}>₹{Number((it.price || 0) * (it.quantity || it.qty || 1)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Bill Totals */}
              <div style={{ borderTop: '2px dashed #CBD5E1', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                  <span>Subtotal:</span>
                  <span>₹{Number(selectedReceipt.subtotal || selectedReceipt.totalAmount || 0).toFixed(2)}</span>
                </div>
                {selectedReceipt.gstAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                    <span>GST ({selectedReceipt.gstRate || 18}%):</span>
                    <span>₹{Number(selectedReceipt.gstAmount).toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '1.1rem', color: '#059669', borderTop: '1px solid #E2E8F0', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                  <span>Net Total:</span>
                  <span>₹{Number(selectedReceipt.totalAmount || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#475569', marginTop: '0.35rem' }}>
                  <span>Payment Mode: <b>{selectedReceipt.paymentMethod || 'CASH'}</b></span>
                  <span>Status: <b style={{ color: selectedReceipt.status === 'PAID' ? '#059669' : '#DC2626' }}>{selectedReceipt.status || 'PAID'}</b></span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{
              backgroundColor: '#F8FAFC',
              padding: '1rem 1.5rem',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              borderTop: '1px solid #E2E8F0',
            }}>
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                style={{
                  padding: '0.55rem 1.25rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  fontWeight: '600',
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  padding: '0.55rem 1.35rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#0B1F3A',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <span>🖨️</span> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
