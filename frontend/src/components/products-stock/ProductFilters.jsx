import React from 'react';

/**
 * ProductFilters - Redesigned with FTS Navy & Electric Blue Theme
 * Palette: #0B1F3A, #2563EB, #FFFFFF, #F1F5F9, #1E293B, #06B6D4
 */
export default function ProductFilters({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedStatus,
  onStatusChange,
  onResetFilters,
  categories = ['All', 'Nitrogenous', 'Phosphatic', 'Potassic', 'Complex', 'Micronutrients', 'Bio-Fertilizers'],
  totalFound = 0,
}) {
  const isFiltered = searchQuery || selectedCategory !== 'All' || selectedStatus !== 'All';

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
        {/* Search Field: Name or Code support with Electric Blue focus */}
        <div style={{ position: 'relative', flex: '1 1 320px', maxWidth: '440px' }}>
          <span style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#64748B',
            fontSize: '0.95rem',
            pointerEvents: 'none',
          }}>
            🔍
          </span>
          <input
            type="text"
            placeholder="Search products by name or code (e.g. Urea, PRD001)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 1rem 0.65rem 2.6rem',
              borderRadius: '8px',
              border: '1.5px solid #CBD5E1',
              fontSize: '0.875rem',
              outline: 'none',
              backgroundColor: '#F8FAFC',
              color: '#0B1F3A',
              fontWeight: '500',
              transition: 'all 0.2s ease',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#2563EB'; // Electric Blue focus
              e.target.style.backgroundColor = '#FFFFFF';
              e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.15)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#CBD5E1';
              e.target.style.backgroundColor = '#F8FAFC';
              e.target.style.boxShadow = 'none';
            }}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 'bold',
              }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Dropdown Filters: Category & Stock Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
          {/* Category Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1E293B' }}>Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              style={{
                padding: '0.55rem 0.9rem',
                borderRadius: '8px',
                border: selectedCategory !== 'All' ? '1.5px solid #2563EB' : '1px solid #CBD5E1',
                backgroundColor: selectedCategory !== 'All' ? '#EFF6FF' : '#FFFFFF',
                color: selectedCategory !== 'All' ? '#2563EB' : '#0B1F3A',
                fontWeight: selectedCategory !== 'All' ? '700' : '500',
                fontSize: '0.85rem',
                outline: 'none',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1E293B' }}>Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => onStatusChange(e.target.value)}
              style={{
                padding: '0.55rem 0.9rem',
                borderRadius: '8px',
                border: selectedStatus !== 'All' ? '1.5px solid #2563EB' : '1px solid #CBD5E1',
                backgroundColor: selectedStatus !== 'All' ? '#EFF6FF' : '#FFFFFF',
                color: selectedStatus !== 'All' ? '#2563EB' : '#0B1F3A',
                fontWeight: selectedStatus !== 'All' ? '700' : '500',
                fontSize: '0.85rem',
                outline: 'none',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
            >
              <option value="All">All Statuses</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>

          {/* Reset Filters Action */}
          {isFiltered && (
            <button
              onClick={onResetFilters}
              style={{
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#64748B',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F1F5F9';
                e.currentTarget.style.color = '#0B1F3A';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.color = '#64748B';
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Result Indicator Banner with Cyan Highlights */}
      <div style={{
        marginTop: '0.85rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid #F1F5F9',
        fontSize: '0.8rem',
        color: '#64748B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>Showing</span>
          <span style={{
            backgroundColor: 'rgba(6, 182, 212, 0.15)', // Cyan highlight
            color: '#0891B2',
            padding: '2px 8px',
            borderRadius: '9999px',
            fontWeight: '800',
            fontSize: '0.75rem',
          }}>
            {totalFound} Products
          </span>
          {searchQuery && (
            <span>
              matching "<b>{searchQuery}</b>"
            </span>
          )}
          {selectedCategory !== 'All' && <span>in <b>{selectedCategory}</b></span>}
          {selectedStatus !== 'All' && <span>with status <b>{selectedStatus}</b></span>}
        </div>
      </div>
    </div>
  );
}
