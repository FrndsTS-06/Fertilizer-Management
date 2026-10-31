import React, { useState, useEffect, useCallback, useRef } from 'react';
import { customerService } from '../services/customerService';

export const formatMoney = (val) => {
  const num = Number(val || 0);
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

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
      value: `₹${formatMoney(totalOutstandingDues)}`,
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
      value: `₹${formatMoney(paymentsReceived)}`,
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
  dateFilter = 'all',
  onDateFilterChange,
  sortBy = 'created_at',
  onSortByChange,
  viewMode,
  onViewModeChange,
  onResetFilters,
  villages = ['All'],
  totalFound = 0,
}) {
  const isFiltered = searchQuery || duesFilter !== 'all' || selectedVillage !== 'All' || dateFilter !== 'all' || sortBy !== 'created_at';

  const dayFilterOptions = [
    { id: 'all', label: 'All Days', icon: '📅' },
    { id: 'today', label: 'Today', icon: '📅' },
    { id: 'yesterday', label: 'Yesterday', icon: '🕒' },
    { id: 'week', label: 'Last 7 Days', icon: '🗓️' },
    { id: 'month', label: 'This Month', icon: '📆' },
  ];

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: '12px',
      border: '1px solid #E2E8F0',
      padding: '1.25rem 1.5rem',
      marginBottom: '1.5rem',
      boxShadow: '0 1px 3px rgba(11, 31, 58, 0.04)',
    }}>
      {/* 1. Top Row: Search + View Mode + Reset */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '1rem',
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
            placeholder="Search customers by name, phone, code or village..."
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

        {/* View Mode Toggle + Reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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

          {isFiltered && (
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
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 2. Middle Row: Day-by-Day Quick Filters + Dropdowns */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.85rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid #F1F5F9',
      }}>
        {/* Day-by-Day Quick Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginRight: '0.25rem' }}>
            Day:
          </span>
          {dayFilterOptions.map((opt) => {
            const isActive = dateFilter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onDateFilterChange && onDateFilterChange(opt.id)}
                style={{
                  padding: '0.35rem 0.7rem',
                  borderRadius: '6px',
                  border: isActive ? '1px solid #0B1F3A' : '1px solid #CBD5E1',
                  backgroundColor: isActive ? '#0B1F3A' : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : '#334155',
                  fontSize: '0.775rem',
                  fontWeight: isActive ? '700' : '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 1px 3px rgba(11, 31, 58, 0.2)' : 'none',
                }}
              >
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Filters Group: Balance + Village + Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
              Balance:
            </span>
            <select
              value={duesFilter}
              onChange={(e) => onDuesFilterChange(e.target.value)}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: '#0B1F3A',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Balances</option>
              <option value="has-dues">Has Dues ⚠️</option>
              <option value="cleared">Cleared ✓</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
              Village:
            </span>
            <select
              value={selectedVillage}
              onChange={(e) => onVillageChange(e.target.value)}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                fontSize: '0.8rem',
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
              Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => onSortByChange && onSortByChange(e.target.value)}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '6px',
                border: '1.5px solid #2563EB',
                backgroundColor: '#EFF6FF',
                fontSize: '0.8rem',
                fontWeight: '700',
                color: '#1D4ED8',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="created_at">📅 Date Registered: Newest First (Default)</option>
              <option value="latest_activity">⚡ Recent Activity First</option>
              <option value="outstanding_dues">💰 Highest Dues First</option>
              <option value="name">🔤 Customer Name (A - Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Bottom Status Bar */}
      <div style={{
        marginTop: '0.85rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid #F1F5F9',
        fontSize: '0.825rem',
        color: '#64748B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
          {dateFilter === 'today' && <span style={{ color: '#16A34A', fontWeight: '700' }}>• Today's newly registered customers</span>}
          {dateFilter === 'yesterday' && <span style={{ color: '#475569', fontWeight: '600' }}>• Yesterday's data</span>}
          {dateFilter === 'week' && <span style={{ color: '#2563EB', fontWeight: '600' }}>• Last 7 days</span>}
          {dateFilter === 'month' && <span style={{ color: '#2563EB', fontWeight: '600' }}>• This month</span>}
          {duesFilter === 'has-dues' && <span style={{ color: '#D97706', fontWeight: '600' }}>• With pending dues</span>}
          {duesFilter === 'cleared' && <span style={{ color: '#16A34A', fontWeight: '600' }}>• With zero balance</span>}
          {selectedVillage !== 'All' && <span style={{ color: '#0B1F3A', fontWeight: '600' }}>• In {selectedVillage}</span>}
        </div>

        <div style={{ fontSize: '0.775rem', color: '#059669', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>✓</span> Date-wise chronological view • Newest on top
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SUBCOMPONENT 3: Customer Table (7 Columns with Day-by-Day Grouping)
// ----------------------------------------------------------------------
function getDayGroups(customers) {
  const groups = [];
  const map = new Map();
  const now = new Date();
  const todayStr = now.toDateString();
  const yDate = new Date();
  yDate.setDate(now.getDate() - 1);
  const yesterdayStr = yDate.toDateString();

  customers.forEach((c) => {
    // Group by customer date (createdAt, or updatedAt if newer)
    const rawDate = c.createdAt || c.updatedAt;
    let key = 'earlier';
    let label = 'Earlier Records';
    let isToday = false;
    let isYesterday = false;

    if (rawDate) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        const dStr = d.toDateString();
        if (dStr === todayStr) {
          key = 'today';
          label = `Today (${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })})`;
          isToday = true;
        } else if (dStr === yesterdayStr) {
          key = 'yesterday';
          label = `Yesterday (${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })})`;
          isYesterday = true;
        } else {
          key = dStr;
          label = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        }
      }
    }

    if (!map.has(key)) {
      const grp = { key, label, isToday, isYesterday, items: [] };
      map.set(key, grp);
      groups.push(grp);
    }
    map.get(key).items.push(c);
  });

  return groups;
}

function CustomerTable({
  customers = [],
  viewMode = 'table',
  sortBy = 'created_at',
  onViewProfile,
  onReceivePayment,
  onEditCustomer,
  onDeleteCustomer,
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
          Try clearing your search query or adjust your village, balance, or date filters.
        </p>
      </div>
    );
  }

  const renderStatusBadge = (outstandingDues, totalPurchases) => {
    const duePaise = Math.round(Number(outstandingDues || 0) * 100);
    const purchasesPaise = Math.round(Number(totalPurchases || 0) * 100);

    if (duePaise <= 0) {
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
          <span>●</span> Paid (₹0.00 Due)
        </span>
      );
    }

    if (purchasesPaise > duePaise) {
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

  const dayGroups = getDayGroups(customers);

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
                <th style={{ padding: '1rem' }}>Remaining Due</th>
                <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '0.875rem' }}>
              {dayGroups.map((group) => (
                <React.Fragment key={`group-${group.key}`}>
                  {/* Day Header Divider Row */}
                  <tr style={{
                    backgroundColor: '#F8FAFC',
                    borderTop: '2px solid #E2E8F0',
                    borderBottom: '1px solid #E2E8F0',
                  }}>
                    <td colSpan={7} style={{ padding: '0.65rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{
                            fontSize: '0.825rem',
                            fontWeight: '800',
                            color: '#0B1F3A',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                          }}>
                            <span>📅</span> {group.label}
                          </span>
                        </div>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          color: '#64748B',
                          backgroundColor: '#E2E8F0',
                          padding: '2px 8px',
                          borderRadius: '999px',
                        }}>
                          {group.items.length} {group.items.length === 1 ? 'Customer' : 'Customers'}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Customer Rows for this day */}
                  {group.items.map((c, idx) => {
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
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span
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
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '3px', flexWrap: 'wrap' }}>
                                <span style={{
                                  fontFamily: 'monospace',
                                  fontSize: '0.7rem',
                                  color: '#0891B2',
                                  backgroundColor: 'rgba(6, 182, 212, 0.1)',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  fontWeight: '700',
                                }}>
                                  {c.customerCode || c.id}
                                </span>
                                {c.createdAt && (
                                  <span style={{ fontSize: '0.725rem', color: '#64748B', fontWeight: '500' }}>
                                    {c.updatedAt && new Date(c.updatedAt).toDateString() !== new Date(c.createdAt).toDateString()
                                      ? `Updated: ${new Date(c.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
                                      : `Date: ${new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`}
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
                          ₹{formatMoney(totalPurchases)}
                        </td>

                        <td style={{ padding: '1rem', fontWeight: '700', color: '#15803D' }}>
                          ₹{formatMoney(totalPaid)}
                        </td>

                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                            <span style={{
                              fontWeight: '800',
                              fontSize: '0.925rem',
                              color: hasDues ? '#B91C1C' : '#15803D',
                            }}>
                              ₹{formatMoney(outstandingDue)}
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
                                backgroundColor: '#F8FAFC',
                                border: '1px solid #CBD5E1',
                                color: '#0B1F3A',
                                padding: '0.4rem 0.75rem',
                                borderRadius: '6px',
                                fontSize: '0.775rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#EFF6FF';
                                e.currentTarget.style.borderColor = '#93C5FD';
                                e.currentTarget.style.color = '#1D4ED8';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#F8FAFC';
                                e.currentTarget.style.borderColor = '#CBD5E1';
                                e.currentTarget.style.color = '#0B1F3A';
                              }}
                            >
                              <span>👁️</span> View Details
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteCustomer && onDeleteCustomer(c);
                              }}
                              title="Delete customer"
                              style={{
                                backgroundColor: '#FEF2F2',
                                border: '1px solid #FECACA',
                                color: '#DC2626',
                                padding: '0.4rem 0.65rem',
                                borderRadius: '6px',
                                fontSize: '0.775rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#FEE2E2';
                                e.currentTarget.style.borderColor = '#FCA5A5';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#FEF2F2';
                                e.currentTarget.style.borderColor = '#FECACA';
                              }}
                            >
                              <span>🗑️</span> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Cards mode with day-by-day groupings
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {dayGroups.map((group) => (
        <div key={`card-group-${group.key}`}>
          {/* Day Header Divider */}
          <div style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '0.65rem 1.15rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '800', fontSize: '0.875rem', color: '#0B1F3A' }}>
              <span>📅</span> {group.label}
            </div>
            <span style={{ fontSize: '0.775rem', fontWeight: '700', color: '#64748B' }}>
              {group.items.length} {group.items.length === 1 ? 'Customer' : 'Customers'}
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
            gap: '1.25rem',
          }}>
            {group.items.map((c) => {
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0B1F3A', margin: 0 }}>
                            {c.name}
                          </h3>
                        </div>
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
                        {c.customerCode || c.id}
                      </span>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.85rem',
                      color: '#1E293B',
                      marginBottom: '0.75rem',
                      padding: '0.45rem 0.65rem',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '6px',
                    }}>
                      <span style={{ color: '#64748B' }}>📞 Phone:</span>
                      <b style={{ color: '#0B1F3A' }}>{c.phone || 'No phone recorded'}</b>
                    </div>

                    {c.createdAt && (
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#64748B',
                        fontWeight: '500',
                        marginBottom: '0.85rem',
                      }}>
                        {c.updatedAt && new Date(c.updatedAt).toDateString() !== new Date(c.createdAt).toDateString()
                          ? `Updated: ${new Date(c.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
                          : `Date: ${new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                      </div>
                    )}

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
                          ₹{formatMoney(totalPurchases)}
                        </div>
                      </div>

                      <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '0.55rem 0.65rem' }}>
                        <span style={{ fontSize: '0.675rem', color: '#15803D', textTransform: 'uppercase', fontWeight: '700', display: 'block' }}>
                          Paid
                        </span>
                        <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#15803D', marginTop: '2px' }}>
                          ₹{formatMoney(totalPaid)}
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
                          ₹{formatMoney(outstandingDue)}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button
                        onClick={() => onViewProfile && onViewProfile(c)}
                        style={{
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #CBD5E1',
                          color: '#0B1F3A',
                          padding: '0.4rem 0.85rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>👁️</span> View Details
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCustomer && onDeleteCustomer(c);
                        }}
                        title="Delete customer"
                        style={{
                          backgroundColor: '#FEF2F2',
                          border: '1px solid #FECACA',
                          color: '#DC2626',
                          padding: '0.4rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <span>🗑️</span>
                      </button>
                    </div>

                    {hasDues && (
                      <button
                        onClick={() => onReceivePayment && onReceivePayment(c)}
                        style={{
                          padding: '0.4rem 0.75rem',
                          borderRadius: '6px',
                          backgroundColor: '#2563EB',
                          border: 'none',
                          color: '#FFFFFF',
                          fontSize: '0.775rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>💳</span> Record Payment
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
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
  onDeleteCustomer,
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [sales, setSales] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    if (customer && isOpen) {
      loadCustomerData(customer.id);
      setActiveTab('overview');
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
    }
  }, [customer, isOpen]);

  // Support ESC key to go back
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose && onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
  const unpaidSales = sales.filter((s) => Number(s.dueAmount || 0) > 0);
  const customerCode = customer.customerCode || customer.customer_code || customer.id;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose && onClose();
      }}
      style={{
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
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '960px',
          height: '100%',
          backgroundColor: '#F8FAFC',
          boxShadow: '-4px 0 30px rgba(11, 31, 58, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ============================================================== */}
        {/* 1. PERMANENT TOP HEADER BAR (NEVER SCROLLS, ALWAYS 100% VISIBLE)*/}
        {/* ============================================================== */}
        <div style={{ flexShrink: 0, backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', zIndex: 10 }}>
          {/* Main Customer Identity Header with Prominent Back Button & Actions */}
          <div style={{
            padding: '1rem 1.5rem',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.85rem',
          }}>
            {/* Left: Back Arrow Button + Avatar Circle + Customer Name & Details */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
              {/* Back Navigation Button with Arrow */}
              <button
                onClick={onClose}
                title="Back to Customers List"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#EFF6FF',
                  border: '1.5px solid #BFDBFE',
                  color: '#1D4ED8',
                  padding: '0.5rem 0.95rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(29, 78, 216, 0.08)',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#DBEAFE';
                  e.currentTarget.style.borderColor = '#93C5FD';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#EFF6FF';
                  e.currentTarget.style.borderColor = '#BFDBFE';
                }}
              >
                <span style={{ fontSize: '1.25rem', lineHeight: '1' }}>←</span>
                <span>Back</span>
              </button>

              {/* Avatar Initial Circle */}
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '10px',
                backgroundColor: '#0B1F3A',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '900',
                fontSize: '1.3rem',
                boxShadow: '0 2px 6px rgba(11, 31, 58, 0.15)',
                flexShrink: 0,
              }}>
                {customer.name ? customer.name.charAt(0).toUpperCase() : 'C'}
              </div>

              {/* Customer Name, Code, Outstanding Badge & Subline */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: '900', color: '#0B1F3A', margin: 0, letterSpacing: '-0.02em' }}>
                    {customer.name}
                  </h2>
                  <span style={{
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    fontWeight: '800',
                    color: '#0891B2',
                    backgroundColor: 'rgba(6, 182, 212, 0.1)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    padding: '2px 7px',
                    borderRadius: '5px',
                  }}>
                    {customerCode}
                  </span>

                  {hasDues ? (
                    <span style={{
                      backgroundColor: '#FEF2F2',
                      color: '#B91C1C',
                      border: '1px solid #FECACA',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      fontSize: '0.725rem',
                      fontWeight: '800',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      <span>●</span> Outstanding Dues: ₹{formatMoney(outstandingDues)}
                    </span>
                  ) : (
                    <span style={{
                      backgroundColor: '#F0FDF4',
                      color: '#15803D',
                      border: '1px solid #BBF7D0',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      fontSize: '0.725rem',
                      fontWeight: '800',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      <span>●</span> Account Cleared (₹0 Due)
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '4px', flexWrap: 'wrap', fontSize: '0.8rem', color: '#64748B' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span>📞</span> <b style={{ color: '#0B1F3A' }}>{customer.phone || 'No phone recorded'}</b>
                  </span>
                  <span>•</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span>📍</span> <b style={{ color: '#0B1F3A' }}>{customer.village || 'N/A'}</b>
                  </span>
                  <span>•</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span>📅</span> Reg: {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Quick Action Buttons (Edit, Delete, Print, Close) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
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
                    fontWeight: '800',
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
                onClick={() => onEditCustomer && onEditCustomer(customer)}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #CBD5E1',
                  color: '#0B1F3A',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                  e.currentTarget.style.borderColor = '#94A3B8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#CBD5E1';
                }}
              >
                <span>✏️</span> Edit Profile
              </button>

              {/* Delete Customer Button */}
              <button
                onClick={() => onDeleteCustomer && onDeleteCustomer(customer)}
                title="Delete this customer"
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '6px',
                  backgroundColor: '#FEF2F2',
                  border: '1.5px solid #FECACA',
                  color: '#DC2626',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#FEE2E2';
                  e.currentTarget.style.borderColor = '#FCA5A5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FEF2F2';
                  e.currentTarget.style.borderColor = '#FECACA';
                }}
              >
                <span>🗑️</span> Delete Customer
              </button>

              <button
                onClick={() => window.print()}
                title="Print Statement"
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#0B1F3A',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>🖨️</span> Print
              </button>

              <button
                onClick={onClose}
                title="Close Profile (ESC)"
                style={{
                  background: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '0.9rem',
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Row 2: Pinned Navigation Tabs */}
          <div style={{
            display: 'flex',
            padding: '0 1.5rem',
            backgroundColor: '#FFFFFF',
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
                    padding: '0.75rem 1rem',
                    border: 'none',
                    borderBottom: isActive ? '3px solid #2563EB' : '3px solid transparent',
                    backgroundColor: 'transparent',
                    color: isActive ? '#2563EB' : '#64748B',
                    fontWeight: isActive ? '800' : '600',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.alert && (
                    <span style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: '#DC2626',
                      display: 'inline-block',
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. DEDICATED SCROLLABLE BODY (ONLY THIS CONTENT SCROLLS)       */}
        {/* ============================================================== */}
        <div
          ref={contentRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem 1.75rem',
          }}
        >
          {loading ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748B' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>⏳</div>
              <p style={{ fontWeight: '700', fontSize: '0.95rem', margin: 0 }}>Loading customer ledger and records...</p>
            </div>
          ) : (
            <>
              {/* ============================================================== */}
              {/* TAB 1: OVERVIEW — PROPER ERP STRUCTURE                         */}
              {/* ============================================================== */}
              {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* 3 Financial Stat Cards (Credit Facility Removed as Requested) */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <div style={{
                      backgroundColor: '#FFFFFF',
                      padding: '1.15rem',
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 1px 3px rgba(11, 31, 58, 0.03)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.725rem', color: '#64748B', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.04em' }}>
                          Total Purchases
                        </span>
                        <span style={{ fontSize: '1rem' }}>🛒</span>
                      </div>
                      <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#0B1F3A' }}>
                        ₹{formatMoney(totalPurchases)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px', fontWeight: '600' }}>
                        {sales.length} Bills / Invoices
                      </div>
                    </div>

                    <div style={{
                      backgroundColor: '#FFFFFF',
                      padding: '1.15rem',
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 1px 3px rgba(11, 31, 58, 0.03)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.725rem', color: '#15803D', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.04em' }}>
                          Total Paid
                        </span>
                        <span style={{ fontSize: '1rem' }}>💵</span>
                      </div>
                      <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#15803D' }}>
                        ₹{formatMoney(totalPaid)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#16A34A', marginTop: '4px', fontWeight: '600' }}>
                        {payments.length} Payments Recorded
                      </div>
                    </div>

                    <div style={{
                      backgroundColor: hasDues ? '#FEF2F2' : '#F0FDF4',
                      padding: '1.15rem',
                      borderRadius: '10px',
                      border: hasDues ? '1px solid #FECACA' : '1px solid #BBF7D0',
                      boxShadow: '0 1px 3px rgba(11, 31, 58, 0.03)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.725rem', color: hasDues ? '#B91C1C' : '#15803D', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.04em' }}>
                          Outstanding Due
                        </span>
                        <span style={{ fontSize: '1rem' }}>{hasDues ? '⚠️' : '✓'}</span>
                      </div>
                      <div style={{ fontSize: '1.45rem', fontWeight: '900', color: hasDues ? '#B91C1C' : '#15803D' }}>
                        ₹{formatMoney(outstandingDues)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: hasDues ? '#DC2626' : '#15803D', marginTop: '4px', fontWeight: '700' }}>
                        {hasDues ? `${unpaidSales.length} Unpaid / Partial Bills` : 'Account Settled (₹0.00 Due)'}
                      </div>
                    </div>
                  </div>

                  {/* Dues Action Notice if outstanding dues exist */}
                  {hasDues && (
                    <div style={{
                      backgroundColor: '#FFFBEB',
                      border: '1px solid #FCD34D',
                      borderRadius: '10px',
                      padding: '0.85rem 1.15rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#92400E' }}>
                            Customer has an outstanding balance of ₹{formatMoney(outstandingDues)}
                          </div>
                          <div style={{ fontSize: '0.775rem', color: '#B45309' }}>
                            Unsettled across {unpaidSales.length} invoice{unpaidSales.length > 1 ? 's' : ''}. You can collect payment directly against these invoices.
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => onOpenReceivePayment && onOpenReceivePayment(customer, null, unpaidSales)}
                        style={{
                          backgroundColor: '#2563EB',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '0.45rem 0.95rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: '0 1px 3px rgba(37, 99, 235, 0.25)',
                        }}
                      >
                        <span>💳</span> Record Payment Now
                      </button>
                    </div>
                  )}

                  {/* Customer Contact & Farm Profile Structured Card */}
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    padding: '1.25rem 1.5rem',
                    boxShadow: '0 1px 3px rgba(11, 31, 58, 0.03)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0B1F3A', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>👤</span> Customer Contact & Farm Profile
                      </h4>
                      <button
                        onClick={() => onEditCustomer && onEditCustomer(customer)}
                        style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                      >
                        Edit Details ✏️
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', fontSize: '0.875rem' }}>
                      <div style={{ backgroundColor: '#F8FAFC', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #F1F5F9' }}>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.725rem', fontWeight: '700', textTransform: 'uppercase' }}>Primary Phone</span>
                        <strong style={{ color: '#0B1F3A', fontSize: '0.925rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <span>📞</span> {customer.phone || 'Not recorded'}
                        </strong>
                      </div>

                      <div style={{ backgroundColor: '#F8FAFC', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #F1F5F9' }}>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.725rem', fontWeight: '700', textTransform: 'uppercase' }}>Village / Location</span>
                        <strong style={{ color: '#0B1F3A', fontSize: '0.925rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <span>📍</span> {customer.village || 'N/A'}
                        </strong>
                      </div>

                      <div style={{ backgroundColor: '#F8FAFC', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #F1F5F9' }}>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.725rem', fontWeight: '700', textTransform: 'uppercase' }}>Registration Date</span>
                        <strong style={{ color: '#0B1F3A', fontSize: '0.925rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <span>📅</span> {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </strong>
                      </div>

                      <div style={{ backgroundColor: '#F8FAFC', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #F1F5F9' }}>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.725rem', fontWeight: '700', textTransform: 'uppercase' }}>Opening Balance</span>
                        <strong style={{ color: '#0B1F3A', fontSize: '0.925rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <span>💰</span> ₹{Number(customer.openingBalance || 0).toLocaleString('en-IN')}
                        </strong>
                      </div>

                      <div style={{ backgroundColor: '#F8FAFC', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #F1F5F9', gridColumn: 'span 2' }}>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.725rem', fontWeight: '700', textTransform: 'uppercase' }}>Full Address</span>
                        <span style={{ color: '#1E293B', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <span>🏠</span> {customer.address || 'Standard local customer'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Recent Invoices Preview Table */}
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(11, 31, 58, 0.03)',
                  }}>
                    <div style={{
                      padding: '0.9rem 1.25rem',
                      borderBottom: '1px solid #E2E8F0',
                      backgroundColor: '#F8FAFC',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '800', color: '#0B1F3A', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🛒</span> Recent Purchase Invoices ({Math.min(4, sales.length)} of {sales.length})
                      </h4>
                      {sales.length > 0 && (
                        <button
                          onClick={() => setActiveTab('purchases')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#2563EB',
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                          }}
                        >
                          View Full Purchase History →
                        </button>
                      )}
                    </div>

                    {sales.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
                        No purchase invoices recorded yet for this customer.
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: '700', fontSize: '0.725rem', textTransform: 'uppercase' }}>
                              <th style={{ padding: '0.65rem 1rem' }}>Bill #</th>
                              <th style={{ padding: '0.65rem 1rem' }}>Date</th>
                              <th style={{ padding: '0.65rem 1rem' }}>Total Amount</th>
                              <th style={{ padding: '0.65rem 1rem' }}>Paid Amount</th>
                              <th style={{ padding: '0.65rem 1rem' }}>Due Amount</th>
                              <th style={{ padding: '0.65rem 1rem' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sales.slice(0, 4).map((s) => (
                              <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', fontWeight: '700', color: '#0B1F3A' }}>
                                  {s.invoiceNumber || s.id}
                                </td>
                                <td style={{ padding: '0.65rem 1rem', color: '#64748B', whiteSpace: 'nowrap' }}>
                                  {new Date(s.date || s.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>
                                <td style={{ padding: '0.65rem 1rem', fontWeight: '800', color: '#0B1F3A' }}>
                                  ₹{formatMoney(s.totalAmount)}
                                </td>
                                <td style={{ padding: '0.65rem 1rem', fontWeight: '700', color: '#15803D' }}>
                                  ₹{formatMoney(s.paidAmount)}
                                </td>
                                <td style={{ padding: '0.65rem 1rem', fontWeight: '800', color: Number(s.dueAmount || 0) > 0 ? '#B91C1C' : '#15803D' }}>
                                  ₹{formatMoney(s.dueAmount)}
                                </td>
                                <td style={{ padding: '0.65rem 1rem' }}>
                                  <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                    fontSize: '0.7rem',
                                    fontWeight: '800',
                                    backgroundColor: s.status === 'PAID' ? '#DCFCE7' : s.status === 'PARTIAL' ? '#FEF3C7' : '#FEE2E2',
                                    color: s.status === 'PAID' ? '#15803D' : s.status === 'PARTIAL' ? '#B45309' : '#B91C1C',
                                  }}>
                                    ● {s.status || 'PAID'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Recent Payments Preview Table */}
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(11, 31, 58, 0.03)',
                  }}>
                    <div style={{
                      padding: '0.9rem 1.25rem',
                      borderBottom: '1px solid #E2E8F0',
                      backgroundColor: '#F8FAFC',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '800', color: '#0B1F3A', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>💵</span> Recent Payment Receipts ({Math.min(4, payments.length)} of {payments.length})
                      </h4>
                      {payments.length > 0 && (
                        <button
                          onClick={() => setActiveTab('payments')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#2563EB',
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                          }}
                        >
                          View Full Payment History →
                        </button>
                      )}
                    </div>

                    {payments.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
                        No payments recorded yet for this customer.
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: '700', fontSize: '0.725rem', textTransform: 'uppercase' }}>
                              <th style={{ padding: '0.65rem 1rem' }}>Receipt #</th>
                              <th style={{ padding: '0.65rem 1rem' }}>Payment Date</th>
                              <th style={{ padding: '0.65rem 1rem' }}>Linked Invoice</th>
                              <th style={{ padding: '0.65rem 1rem' }}>Amount Paid</th>
                              <th style={{ padding: '0.65rem 1rem' }}>Payment Mode</th>
                            </tr>
                          </thead>
                          <tbody>
                            {payments.slice(0, 4).map((p) => (
                              <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', fontWeight: '700', color: '#0B1F3A' }}>
                                  {p.receiptNumber || p.id}
                                </td>
                                <td style={{ padding: '0.65rem 1rem', color: '#64748B', whiteSpace: 'nowrap' }}>
                                  {new Date(p.date || p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>
                                <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', color: '#64748B' }}>
                                  {p.invoiceNumber || 'Account Credit'}
                                </td>
                                <td style={{ padding: '0.65rem 1rem', fontWeight: '800', color: '#15803D' }}>
                                  ₹{formatMoney(p.amount)}
                                </td>
                                <td style={{ padding: '0.65rem 1rem' }}>
                                  <span style={{
                                    backgroundColor: '#EFF6FF',
                                    color: '#1D4ED8',
                                    padding: '2px 7px',
                                    borderRadius: '4px',
                                    fontSize: '0.725rem',
                                    fontWeight: '700',
                                  }}>
                                    {p.method || 'CASH'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* TAB 2: FULL PURCHASE HISTORY */}
              {/* ============================================================== */}
              {activeTab === 'purchases' && (
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                  <div style={{ padding: '1rem 1.25rem', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: '800', color: '#0B1F3A', fontSize: '0.9rem' }}>
                      All Sales & Purchase Invoices ({sales.length})
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: '600' }}>
                      Total Billing: <b style={{ color: '#0B1F3A' }}>₹{formatMoney(totalPurchases)}</b>
                    </span>
                  </div>

                  {sales.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                      No purchase invoices on record.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#0B1F3A', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '800' }}>
                            <th style={{ padding: '0.85rem 1rem' }}>Invoice #</th>
                            <th style={{ padding: '0.85rem 1rem' }}>Date</th>
                            <th style={{ padding: '0.85rem 1rem' }}>Items Sold</th>
                            <th style={{ padding: '0.85rem 1rem' }}>Total Amount</th>
                            <th style={{ padding: '0.85rem 1rem' }}>Paid Amount</th>
                            <th style={{ padding: '0.85rem 1rem' }}>Due Amount</th>
                            <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sales.map((s) => (
                            <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: '800', color: '#0B1F3A' }}>
                                {s.invoiceNumber || s.id}
                              </td>
                              <td style={{ padding: '0.85rem 1rem', color: '#64748B', whiteSpace: 'nowrap' }}>
                                {new Date(s.date || s.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </td>
                              <td style={{ padding: '0.85rem 1rem', color: '#1E293B', fontSize: '0.8rem', maxWidth: '240px' }}>
                                {Array.isArray(s.items) && s.items.length > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    {s.items.map((it, i) => (
                                      <span key={i} style={{ color: '#0B1F3A', fontWeight: '500' }}>
                                        • {it.productName} <b>(x{it.quantity})</b>
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Items recorded</span>
                                )}
                              </td>
                              <td style={{ padding: '0.85rem 1rem', fontWeight: '800', color: '#0B1F3A' }}>
                                ₹{formatMoney(s.totalAmount)}
                              </td>
                              <td style={{ padding: '0.85rem 1rem', fontWeight: '700', color: '#15803D' }}>
                                ₹{formatMoney(s.paidAmount)}
                              </td>
                              <td style={{ padding: '0.85rem 1rem', fontWeight: '800', color: Number(s.dueAmount || 0) > 0 ? '#B91C1C' : '#15803D' }}>
                                ₹{formatMoney(s.dueAmount)}
                              </td>
                              <td style={{ padding: '0.85rem 1rem' }}>
                                <span style={{
                                  padding: '3px 9px',
                                  borderRadius: '999px',
                                  fontSize: '0.725rem',
                                  fontWeight: '800',
                                  backgroundColor: s.status === 'PAID' ? '#DCFCE7' : s.status === 'PARTIAL' ? '#FEF3C7' : '#FEE2E2',
                                  color: s.status === 'PAID' ? '#15803D' : s.status === 'PARTIAL' ? '#B45309' : '#B91C1C',
                                }}>
                                  ● {s.status || 'PAID'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================== */}
              {/* TAB 3: FULL PAYMENT RECEIPTS HISTORY */}
              {/* ============================================================== */}
              {activeTab === 'payments' && (
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                  <div style={{ padding: '1rem 1.25rem', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: '800', color: '#0B1F3A', fontSize: '0.9rem' }}>
                      All Payment Receipts ({payments.length})
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#15803D', fontWeight: '700' }}>
                      Total Collected: <b>₹{formatMoney(totalPaid)}</b>
                    </span>
                  </div>

                  {payments.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                      No payment receipts on record for this customer.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#0B1F3A', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '800' }}>
                            <th style={{ padding: '0.85rem 1rem' }}>Receipt #</th>
                            <th style={{ padding: '0.85rem 1rem' }}>Payment Date</th>
                            <th style={{ padding: '0.85rem 1rem' }}>Linked Invoice</th>
                            <th style={{ padding: '0.85rem 1rem' }}>Amount Paid</th>
                            <th style={{ padding: '0.85rem 1rem' }}>Payment Mode</th>
                            <th style={{ padding: '0.85rem 1rem' }}>Reference / Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((p) => (
                            <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: '800', color: '#0B1F3A' }}>
                                {p.receiptNumber || p.id}
                              </td>
                              <td style={{ padding: '0.85rem 1rem', color: '#64748B', whiteSpace: 'nowrap' }}>
                                {new Date(p.date || p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </td>
                              <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', color: '#64748B' }}>
                                {p.invoiceNumber || 'Customer Account Credit'}
                              </td>
                              <td style={{ padding: '0.85rem 1rem', fontWeight: '800', color: '#15803D', fontSize: '0.95rem' }}>
                                ₹{formatMoney(p.amount)}
                              </td>
                              <td style={{ padding: '0.85rem 1rem' }}>
                                <span style={{
                                  backgroundColor: '#EFF6FF',
                                  color: '#1D4ED8',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: '800',
                                }}>
                                  {p.method || 'CASH'}
                                </span>
                              </td>
                              <td style={{ padding: '0.85rem 1rem', color: '#64748B', fontSize: '0.8rem' }}>
                                {p.reference || p.notes || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================== */}
              {/* TAB 4: OUTSTANDING DUES BREAKDOWN */}
              {/* ============================================================== */}
              {activeTab === 'dues' && (
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                  <div style={{
                    padding: '1.15rem 1.35rem',
                    backgroundColor: hasDues ? '#FEF2F2' : '#F0FDF4',
                    borderBottom: hasDues ? '1px solid #FECACA' : '1px solid #BBF7D0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}>
                    <div>
                      <div style={{ fontWeight: '800', color: hasDues ? '#991B1B' : '#166534', fontSize: '0.95rem' }}>
                        {hasDues ? `Pending Outstanding Bills (${unpaidSales.length})` : 'All Accounts Settled'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: hasDues ? '#B91C1C' : '#15803D' }}>
                        {hasDues
                          ? `Total remaining dues to be collected: ₹${formatMoney(outstandingDues)}`
                          : 'This customer has zero outstanding balance.'}
                      </div>
                    </div>

                    {hasDues && (
                      <button
                        onClick={() => onOpenReceivePayment && onOpenReceivePayment(customer, null, unpaidSales)}
                        style={{
                          backgroundColor: '#2563EB',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          boxShadow: '0 1px 3px rgba(37, 99, 235, 0.25)',
                        }}
                      >
                        <span>💳</span> Record Payment for All Dues
                      </button>
                    )}
                  </div>

                  {unpaidSales.length === 0 ? (
                    <div style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎉</div>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#15803D', margin: '0 0 0.35rem 0' }}>
                        Account is completely clear!
                      </h4>
                      <p style={{ color: '#64748B', fontSize: '0.875rem', margin: 0 }}>
                        All previous invoices have been settled in full.
                      </p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#0B1F3A', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '800' }}>
                            <th style={{ padding: '0.85rem 1rem' }}>Invoice #</th>
                            <th style={{ padding: '0.85rem 1rem' }}>Date</th>
                            <th style={{ padding: '0.85rem 1rem' }}>Total Bill</th>
                            <th style={{ padding: '0.85rem 1rem' }}>Paid So Far</th>
                            <th style={{ padding: '0.85rem 1rem' }}>Pending Due</th>
                            <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {unpaidSales.map((s) => (
                            <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: '800', color: '#0B1F3A' }}>
                                {s.invoiceNumber || s.id}
                              </td>
                              <td style={{ padding: '0.85rem 1rem', color: '#64748B', whiteSpace: 'nowrap' }}>
                                {new Date(s.date || s.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </td>
                              <td style={{ padding: '0.85rem 1rem', color: '#1E293B', fontWeight: '600' }}>
                                ₹{formatMoney(s.totalAmount)}
                              </td>
                              <td style={{ padding: '0.85rem 1rem', color: '#15803D', fontWeight: '700' }}>
                                ₹{formatMoney(s.paidAmount)}
                              </td>
                              <td style={{ padding: '0.85rem 1rem', fontWeight: '900', color: '#B91C1C', fontSize: '0.95rem' }}>
                                ₹{formatMoney(s.dueAmount)}
                              </td>
                              <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                                <button
                                  onClick={() => onOpenReceivePayment && onOpenReceivePayment(customer, s, unpaidSales)}
                                  style={{
                                    backgroundColor: '#2563EB',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    padding: '0.4rem 0.85rem',
                                    borderRadius: '6px',
                                    fontSize: '0.775rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <span>💳</span> Pay Invoice
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
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

function CustomerForm({ isOpen, customer = null, onClose, onSave, onDelete }) {
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
      const custDate = getDeviceTodayDate();

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
    const decParts = val.split('.');
    if (decParts[1] && decParts[1].length > 2) return;

    setFormData(prev => {
      const totalPaise = Math.round((Number(val) || 0) * 100);
      const paidPaise = Math.round((Number(prev.paidAmount) || 0) * 100);
      const duePaise = Math.max(0, totalPaise - paidPaise);
      const dueVal = (duePaise / 100).toFixed(2);
      return {
        ...prev,
        totalPayment: val,
        duePayment: val === '' && prev.paidAmount === '' ? '' : (val === '' ? '' : dueVal),
      };
    });
  };

  const handlePaidAmountChange = (val) => {
    const decParts = val.split('.');
    if (decParts[1] && decParts[1].length > 2) return;

    setFormData(prev => {
      const totalPaise = Math.round((Number(prev.totalPayment) || 0) * 100);
      const paidPaise = Math.round((Number(val) || 0) * 100);
      const duePaise = Math.max(0, totalPaise - paidPaise);
      const dueVal = (duePaise / 100).toFixed(2);
      return {
        ...prev,
        paidAmount: val,
        duePayment: val === '' && prev.totalPayment === '' ? '' : (prev.totalPayment === '' ? '' : dueVal),
      };
    });
  };

  const handleDuePaymentChange = (val) => {
    const decParts = val.split('.');
    if (decParts[1] && decParts[1].length > 2) return;

    setFormData(prev => {
      const totalPaise = Math.round((Number(prev.totalPayment) || 0) * 100);
      const duePaise = Math.round((Number(val) || 0) * 100);
      const paidPaise = Math.max(0, totalPaise - duePaise);
      const paidVal = (paidPaise / 100).toFixed(2);
      return {
        ...prev,
        duePayment: val,
        paidAmount: val === '' && prev.totalPayment === '' ? '' : (prev.totalPayment === '' ? '' : paidVal),
      };
    });
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 1. Mandatory Customer Name
    const trimmedName = (formData.name || '').trim();
    if (!trimmedName) {
      setError('Customer Name is mandatory. Please enter farmer / customer name.');
      return;
    }
    if (trimmedName.length < 2) {
      setError('Customer Name must be at least 2 characters long.');
      return;
    }

    // 2. Mandatory Phone Number
    const rawPhone = (formData.phone || '').trim();
    if (!rawPhone) {
      setError('Phone Number is mandatory. Please enter a 10-digit mobile number.');
      return;
    }
    const cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile phone number (e.g. 9822012345).');
      return;
    }

    // 3. Mandatory Village / Town
    const trimmedVillage = (formData.village || '').trim();
    if (!trimmedVillage) {
      setError('Village / Town is mandatory. Please enter customer village or location.');
      return;
    }

    // 4. Mandatory Date
    if (!formData.date) {
      setError('Registration Date is mandatory.');
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        ...formData,
        name: trimmedName,
        phone: cleanPhone,
        village: trimmedVillage,
      }, customer?.id);
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
            <div style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
            {/* Customer Name */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0B1F3A', display: 'block', marginBottom: '0.35rem' }}>
                Customer Name <span style={{ color: '#DC2626', fontWeight: '800' }}>* (Mandatory)</span>
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
                Phone Number <span style={{ color: '#DC2626', fontWeight: '800' }}>* (Mandatory)</span>
              </label>
              <input
                type="tel"
                required
                maxLength={10}
                placeholder="10-digit mobile number"
                value={formData.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setFormData(prev => ({ ...prev, phone: val }));
                }}
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid #CBD5E1', outline: 'none' }}
                onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
              />
            </div>

            {/* Village */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0B1F3A', display: 'block', marginBottom: '0.35rem' }}>
                Village / Town <span style={{ color: '#DC2626', fontWeight: '800' }}>* (Mandatory)</span>
              </label>
              <input
                type="text"
                required
                placeholder="Village / Town name"
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
                {isEdit ? 'Date / Updated Date' : 'Registration Date'} <span style={{ color: '#DC2626', fontWeight: '800' }}>* (Mandatory)</span> <span style={{ fontSize: '0.72rem', fontWeight: '500', color: '#64748B' }}>({isEdit ? 'Defaults to Today on update' : 'Auto-filled from device'})</span>
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
                    step="0.01"
                    min="0"
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
                    step="0.01"
                    min="0"
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
                    step="0.01"
                    min="0"
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

          <div style={{ display: 'flex', justifyContent: isEdit && onDelete ? 'space-between' : 'flex-end', alignItems: 'center', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0' }}>
            {isEdit && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(customer)}
                style={{
                  padding: '0.65rem 1.15rem',
                  borderRadius: '8px',
                  border: '1.5px solid #FECACA',
                  backgroundColor: '#FEF2F2',
                  color: '#DC2626',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '0.825rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#FEE2E2';
                  e.currentTarget.style.borderColor = '#FCA5A5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FEF2F2';
                  e.currentTarget.style.borderColor = '#FECACA';
                }}
              >
                <span>🗑️</span> Delete Customer
              </button>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
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
      setAmount(sale.dueAmount !== undefined && sale.dueAmount !== null ? Number(sale.dueAmount).toFixed(2) : '');
    } else if (unpaidSales.length > 0) {
      setSelectedSaleId(unpaidSales[0].id);
      setAmount(unpaidSales[0].dueAmount !== undefined && unpaidSales[0].dueAmount !== null ? Number(unpaidSales[0].dueAmount).toFixed(2) : '');
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
    if (isNaN(payNum) || payNum <= 0) {
      setError('Please enter a valid payment amount greater than ₹0.00.');
      return;
    }
    const parts = String(amount).trim().split('.');
    if (parts.length > 2 || (parts[1] && parts[1].length > 2)) {
      setError('Payment amount cannot have more than 2 decimal places.');
      return;
    }
    const payPaise = Math.round(payNum * 100);
    const maxDuePaise = Math.round(maxDue * 100);
    if (payPaise > maxDuePaise) {
      setError(`Payment amount cannot exceed current invoice due of ₹${formatMoney(maxDue)}.`);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await onSubmitPayment(selectedSaleId, {
        amount: Number((payPaise / 100).toFixed(2)),
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
                  if (chosen) setAmount(Number(chosen.dueAmount || 0).toFixed(2));
                }}
                style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontWeight: '600' }}
              >
                {unpaidSales.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.invoiceNumber || s.id} — Due: ₹{formatMoney(s.dueAmount)}
                  </option>
                ))}
              </select>
            ) : (
              <div style={{ padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
                Invoice {currentSale?.invoiceNumber || currentSale?.id} — Due: ₹{formatMoney(maxDue)}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.825rem', fontWeight: '700', color: '#0B1F3A', margin: 0 }}>
                Payment Amount (₹) *
              </label>
              {maxDue > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(Number(maxDue).toFixed(2))}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563EB',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                  }}
                >
                  Pay Full Due (₹{formatMoney(maxDue)})
                </button>
              )}
            </div>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={Number(Number(maxDue).toFixed(2))}
              required
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                const val = e.target.value;
                const decParts = val.split('.');
                if (decParts[1] && decParts[1].length > 2) return;
                setAmount(val);
              }}
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
export default function CustomerDetails({ subItem = 'all-customers', onNavigate, searchQueryProp = '' }) {
  const [mainTab, setMainTab] = useState(subItem === 'retail-details' ? 'retail-details' : 'customer-details');
  const [customers, setCustomers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Retail sales state
  const [retailSales, setRetailSales] = useState([]);
  const [retailLoading, setRetailLoading] = useState(false);
  const [retailSearch, setRetailSearch] = useState('');
  const [retailPaymentFilter, setRetailPaymentFilter] = useState('ALL');
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState(searchQueryProp || '');
  const [duesFilter, setDuesFilter] = useState('all');
  const [selectedVillage, setSelectedVillage] = useState('All');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [viewMode, setViewMode] = useState('table');

  // Synchronize with global top search
  useEffect(() => {
    if (searchQueryProp !== undefined && searchQueryProp !== '') {
      setSearchQuery(searchQueryProp);
    }
  }, [searchQueryProp]);

  useEffect(() => {
    const handleGlobalSearch = (e) => {
      if (typeof e.detail === 'string') {
        setSearchQuery(e.detail);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('fts:global-search', handleGlobalSearch);
      return () => window.removeEventListener('fts:global-search', handleGlobalSearch);
    }
  }, []);

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
    loadData();
    loadRetailSales();
  }, [subItem]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await customerService.getCustomers({
        search: searchQuery,
        duesOnly: duesFilter,
        village: selectedVillage,
        dateFilter,
        sortBy,
        sortOrder,
      });
      setCustomers(res.data || []);
      setSummary(res.summary || null);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setFetchError(err.message || 'Failed to fetch customer records.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, duesFilter, selectedVillage, dateFilter, sortBy, sortOrder]);

  const loadRetailSales = useCallback(async () => {
    setRetailLoading(true);
    try {
      const sales = await customerService.getAllSales({ billingType: 'RETAIL' });
      // Strict filter guarantee: only retail bills
      const retailOnly = (sales || []).filter((s) => {
        const type = (s.billingType || s.billing_type || '').toUpperCase();
        if (type === 'RETAIL') return true;
        if (type === 'CUSTOMER') return false;
        return !s.customerId && !s.customer_id;
      });
      setRetailSales(retailOnly);
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
    setDateFilter('all');
    setSortBy('created_at');
    setSortOrder('DESC');
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

  const handleDeleteCustomer = async (cust) => {
    if (!cust || !cust.id) return;
    const confirmMsg = `Are you sure you want to delete customer "${cust.name}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await customerService.deleteCustomer(cust.id);
      setIsProfileOpen(false);
      setSelectedCustomer(null);
      await loadData();
    } catch (err) {
      console.error('Failed to delete customer:', err);
      alert(err.message || 'Failed to delete customer.');
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
                onClick={() => onNavigate && onNavigate('purchase-sales', 'create-sale-retail')}
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
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            sortBy={sortBy}
            onSortByChange={setSortBy}
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
          ) : fetchError ? (
            <div style={{
              backgroundColor: '#FEF2F2',
              borderRadius: '12px',
              border: '1.5px solid #FECACA',
              padding: '3rem 2rem',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#B91C1C', margin: '0 0 0.5rem 0' }}>
                Unable to load customer records
              </h3>
              <p style={{ color: '#7F1D1D', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                {fetchError}
              </p>
              <button
                type="button"
                onClick={loadData}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                🔄 Retry Loading
              </button>
            </div>
          ) : (
            <CustomerTable
              customers={customers}
              viewMode={viewMode}
              sortBy={sortBy}
              onViewProfile={(c) => {
                setSelectedCustomer(c);
                setIsProfileOpen(true);
              }}
              onReceivePayment={handleOpenReceivePayment}
              onEditCustomer={handleOpenEditCustomer}
              onDeleteCustomer={handleDeleteCustomer}
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
                onClick={() => onNavigate && onNavigate('purchase-sales', 'create-sale-retail')}
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
                    onClick={() => onNavigate && onNavigate('purchase-sales', 'create-sale-retail')}
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
                        <th style={{ padding: '0.9rem 1.15rem' }}>Product Name</th>
                        <th style={{ padding: '0.9rem 1.15rem' }}>Qty</th>
                        <th style={{ padding: '0.9rem 1.15rem' }}>Single Amount</th>
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

                            {/* Product Name */}
                            <td style={{ padding: '0.9rem 1.15rem', color: '#0B1F3A', fontWeight: '700' }}>
                              {sale.items && sale.items.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  {sale.items.map((it, idx) => (
                                    <div key={idx}>
                                      <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#0F172A' }}>
                                        {it.productName || it.name || 'Counter Product'}
                                      </div>
                                      {it.unit && (
                                        <div style={{ fontSize: '0.725rem', color: '#64748B', fontWeight: '500' }}>
                                          {it.unit}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  {sale.customerName && !/walk-?in|farmer|direct/i.test(sale.customerName) && (
                                    <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: '600', marginTop: '2px' }}>
                                      Company: {sale.customerName}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#0F172A' }}>
                                    {sale.customerName && !/walk-?in|farmer|direct/i.test(sale.customerName) ? sale.customerName : 'Counter Fertilizer Product'}
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Qty */}
                            <td style={{ padding: '0.9rem 1.15rem' }}>
                              {sale.items && sale.items.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  {sale.items.map((it, idx) => (
                                    <span key={idx} style={{
                                      fontWeight: '800',
                                      fontSize: '0.875rem',
                                      color: '#0B1F3A',
                                      backgroundColor: '#F1F5F9',
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                      display: 'inline-block',
                                      width: 'fit-content',
                                    }}>
                                      {Number(it.quantity !== undefined ? it.quantity : (it.qty !== undefined ? it.qty : 1))}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span style={{
                                  fontWeight: '800',
                                  fontSize: '0.875rem',
                                  color: '#0B1F3A',
                                  backgroundColor: '#F1F5F9',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  display: 'inline-block',
                                }}>
                                  1
                                </span>
                              )}
                            </td>

                            {/* Single Amount */}
                            <td style={{ padding: '0.9rem 1.15rem' }}>
                              {sale.items && sale.items.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  {sale.items.map((it, idx) => {
                                    const singleAmt = Number(it.unitPrice !== undefined ? it.unitPrice : (it.unit_price !== undefined ? it.unit_price : (it.price || 0)));
                                    return (
                                      <span key={idx} style={{ fontWeight: '700', color: '#059669', fontSize: '0.9rem' }}>
                                        ₹{singleAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span style={{ fontWeight: '700', color: '#059669', fontSize: '0.9rem' }}>
                                  ₹{Number(sale.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              )}
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
        onDeleteCustomer={handleDeleteCustomer}
      />

      {/* 6. Add/Edit Customer Form */}
      <CustomerForm
        isOpen={isCustomerFormOpen}
        customer={editingCustomer}
        onClose={() => setIsCustomerFormOpen(false)}
        onSave={handleSaveCustomer}
        onDelete={(cust) => {
          setIsCustomerFormOpen(false);
          handleDeleteCustomer(cust);
        }}
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
                  {(selectedReceipt.items || []).map((it, idx) => {
                    const unitPrice = Number(it.unitPrice !== undefined ? it.unitPrice : (it.unit_price !== undefined ? it.unit_price : (it.price || 0)));
                    const qty = Number(it.quantity !== undefined ? it.quantity : (it.qty !== undefined ? it.qty : 1));
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '0.55rem 0', fontWeight: '600' }}>{it.productName || it.name || 'Counter Product'}</td>
                        <td style={{ padding: '0.55rem 0', textAlign: 'center' }}>{qty}</td>
                        <td style={{ padding: '0.55rem 0', textAlign: 'right' }}>₹{unitPrice.toFixed(2)}</td>
                        <td style={{ padding: '0.55rem 0', textAlign: 'right', fontWeight: '700' }}>₹{(unitPrice * qty).toFixed(2)}</td>
                      </tr>
                    );
                  })}
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
