import React, { useState, useEffect, useRef } from 'react';

/**
 * ProductForm - Redesigned with FTS Navy & Electric Blue Theme
 * Dedicated form for creating & editing product details, prices, units, and minimum thresholds.
 * Palette: #0B1F3A, #2563EB, #FFFFFF, #F1F5F9, #1E293B, #06B6D4
 */
export default function ProductForm({
  isOpen,
  product = null, // null for Add, existing product object for Edit
  onClose,
  onSave,
}) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'Nitrogenous',
    brand: '',
    packageType: 'Bags',
    packageSize: '50kgs',
    customPackageSize: '',
    customUnit: '',
    costPrice: '',
    price: '',
    minThreshold: '10',
    photo: '',
    description: '',
    initialStock: '0',
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [priceWarning, setPriceWarning] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Camera & Image Upload States
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const isEdit = !!product;

  const PACKAGE_TYPES = ['Bags', 'Packets', 'Boxes', 'Bottles', 'Others'];

  const PACKAGE_SIZES = {
    Bags: ['25kgs', '50kgs', 'Custom Size'],
    Bottles: ['100ml', '250ml', '500ml', '1L', 'Custom Size'],
    Packets: ['100g', '250g', '500g', '1kg', '5kg', 'Custom Size'],
    Boxes: ['5kg', '10kg', '20kg', '10 Units', '20 Units', 'Custom Size'],
  };

  const parsePackageUnit = (unitStr) => {
    if (!unitStr) {
      return { packageType: 'Bags', packageSize: '50kgs', customPackageSize: '', customUnit: '' };
    }
    const cleanStr = unitStr.trim();
    for (const type of ['Bags', 'Bottles', 'Packets', 'Boxes']) {
      if (cleanStr.toLowerCase().startsWith(type.toLowerCase())) {
        const sizes = PACKAGE_SIZES[type] || [];
        const matched = sizes.find((s) => s !== 'Custom Size' && cleanStr.toLowerCase().includes(s.toLowerCase()));
        if (matched) {
          return { packageType: type, packageSize: matched, customPackageSize: '', customUnit: '' };
        }
        const parenMatch = cleanStr.match(/\((.*?)\)/);
        if (parenMatch) {
          const inside = parenMatch[1].replace(/e\.g\.?/gi, '').trim();
          return { packageType: type, packageSize: 'Custom Size', customPackageSize: inside, customUnit: '' };
        }
        return { packageType: type, packageSize: sizes[0] || '', customPackageSize: '', customUnit: '' };
      }
    }
    return { packageType: 'Others', packageSize: '', customPackageSize: '', customUnit: cleanStr };
  };

  const categories = [
    'Nitrogenous',
    'Phosphatic',
    'Potassic',
    'Complex',
    'Micronutrients',
    'Bio-Fertilizers',
    'Organic Fertilizers',
  ];

  // Stop camera stream safely
  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    setCameraError('');
  };

  useEffect(() => {
    if (product) {
      const parsedUnit = parsePackageUnit(product.unit);
      setFormData({
        name: product.name || '',
        category: product.category || 'Nitrogenous',
        brand: product.brand || '',
        packageType: parsedUnit.packageType,
        packageSize: parsedUnit.packageSize,
        customPackageSize: parsedUnit.customPackageSize,
        customUnit: parsedUnit.customUnit,
        costPrice: product.costPrice !== undefined ? String(product.costPrice) : '',
        price: product.price !== undefined ? String(product.price) : '',
        minThreshold: product.minThreshold !== undefined ? String(product.minThreshold) : '10',
        photo: product.photo || '',
        description: product.description || '',
        initialStock: product.stock !== undefined ? String(product.stock) : '0',
      });
    } else {
      setFormData({
        name: '',
        category: 'Nitrogenous',
        brand: '',
        packageType: 'Bags',
        packageSize: '50kgs',
        customPackageSize: '',
        customUnit: '',
        costPrice: '',
        price: '',
        minThreshold: '10',
        photo: '',
        description: '',
        initialStock: '0',
      });
    }
    setError('');
    setFieldErrors({});
    setPriceWarning('');
    stopCameraStream();
  }, [product, isOpen]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'costPrice' || name === 'price') {
        const c = Number(name === 'costPrice' ? value : next.costPrice);
        const p = Number(name === 'price' ? value : next.price);
        if (!isNaN(c) && !isNaN(p) && c >= 0 && p >= 0 && p < c && value !== '') {
          setPriceWarning(`⚠️ Selling Price (₹${p}) is lower than Purchase Cost (₹${c}). Loss: ₹${(c - p).toFixed(2)}/unit.`);
        } else {
          setPriceWarning('');
        }
      }
      return next;
    });

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setError('');
  };

  const handlePackageTypeChange = (e) => {
    const newType = e.target.value;
    setFormData((prev) => ({
      ...prev,
      packageType: newType,
      packageSize: PACKAGE_SIZES[newType] ? PACKAGE_SIZES[newType][0] : '',
      customPackageSize: '',
      customUnit: newType === 'Others' ? prev.customUnit : '',
    }));
    setFieldErrors((prev) => ({ ...prev, customUnit: '', customPackageSize: '' }));
  };

  // Handle Image File Upload (Browse from disk)
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData((prev) => ({ ...prev, photo: event.target.result }));
      setError('');
    };
    reader.onerror = () => {
      setError('Unable to read selected image file.');
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input to allow selecting same file again
  };

  // Start Live Webcam stream
  const handleStartCamera = async () => {
    setCameraError('');
    setError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        // Fallback to native mobile capture
        if (cameraInputRef.current) {
          cameraInputRef.current.click();
        }
        return;
      }

      setIsCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn('Webcam stream failed, falling back to direct capture input:', err);
      setIsCameraOpen(false);
      // Fallback to camera file input
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      } else {
        setCameraError('Camera access unavailable. Use "Upload Image" instead.');
      }
    }
  };

  // Snap photo from live video frame
  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setFormData((prev) => ({ ...prev, photo: dataUrl }));
    stopCameraStream();
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => ({ ...prev, photo: '' }));
  };

  const handleModalClose = () => {
    stopCameraStream();
    setError('');
    setFieldErrors({});
    setPriceWarning('');
    onClose();
  };

  const validateProductForm = () => {
    const errors = {};
    let warning = '';

    // 1. Product Name: non-empty
    if (!formData.name || !formData.name.trim()) {
      errors.name = 'Product name is required and cannot be empty.';
    }

    // 2. Purchase Cost Price: non-negative number (>= 0)
    if (formData.costPrice === '' || formData.costPrice === null || formData.costPrice === undefined) {
      errors.costPrice = 'Purchase Price (₹) is mandatory.';
    } else {
      const costNum = Number(formData.costPrice);
      if (isNaN(costNum)) {
        errors.costPrice = 'Purchase Price must be a valid numeric amount.';
      } else if (costNum < 0) {
        errors.costPrice = 'Purchase Price cannot be negative (must be ₹0 or greater).';
      }
    }

    // 3. Selling Price: non-negative number (>= 0)
    if (formData.price === '' || formData.price === null || formData.price === undefined) {
      errors.price = 'Selling Price (₹) is mandatory.';
    } else {
      const priceNum = Number(formData.price);
      if (isNaN(priceNum)) {
        errors.price = 'Selling Price must be a valid numeric amount.';
      } else if (priceNum < 0) {
        errors.price = 'Selling Price cannot be negative (must be ₹0 or greater).';
      }
    }

    // 4. Selling Price >= Purchase Cost Price warning and validation
    const costNum = Number(formData.costPrice);
    const priceNum = Number(formData.price);
    if (!isNaN(costNum) && !isNaN(priceNum) && costNum >= 0 && priceNum >= 0) {
      if (priceNum < costNum) {
        warning = `Pricing Warning: Selling Price (₹${priceNum}) is lower than Purchase Cost (₹${costNum}). Loss of ₹${(costNum - priceNum).toFixed(2)} per unit.`;
        errors.price = `Selling price (₹${priceNum}) cannot be less than purchase cost price (₹${costNum}).`;
      }
    }

    // 5. Min Stock Alert: non-negative integer (0, 1, 2...)
    if (formData.minThreshold === '' || formData.minThreshold === null || formData.minThreshold === undefined) {
      errors.minThreshold = 'Minimum stock alert threshold is mandatory.';
    } else {
      const minNum = Number(formData.minThreshold);
      if (isNaN(minNum) || !Number.isInteger(minNum) || minNum < 0) {
        errors.minThreshold = 'Minimum stock alert threshold must be a non-negative whole number (0, 1, 2...).';
      }
    }

    // 6. Product Initial Stock (for new products): non-negative number
    if (!isEdit) {
      if (formData.initialStock === '' || formData.initialStock === null || formData.initialStock === undefined) {
        errors.initialStock = 'Product count is mandatory.';
      } else {
        const stockNum = Number(formData.initialStock);
        if (isNaN(stockNum) || stockNum < 0) {
          errors.initialStock = 'Product count must be a non-negative number (0 or greater).';
        }
      }
    }

    // 7. Packaging Custom Size / Unit
    if (formData.packageType === 'Others') {
      if (!formData.customUnit || !formData.customUnit.trim()) {
        errors.customUnit = 'Please enter custom packaging unit.';
      }
    } else if (formData.packageSize === 'Custom Size') {
      if (!formData.customPackageSize || !formData.customPackageSize.trim()) {
        errors.customPackageSize = `Please specify custom size for ${formData.packageType}.`;
      }
    }

    return { errors, warning };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear validation errors before submit
    setError('');
    setFieldErrors({});
    setPriceWarning('');

    const { errors, warning } = validateProductForm();
    if (warning) {
      setPriceWarning(warning);
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(Object.values(errors)[0]);
      return;
    }

    let effectiveUnit = '';
    if (formData.packageType === 'Others') {
      effectiveUnit = formData.customUnit.trim();
    } else if (formData.packageSize === 'Custom Size') {
      effectiveUnit = `${formData.packageType} (${formData.customPackageSize.trim()})`;
    } else {
      effectiveUnit = `${formData.packageType} (${formData.packageSize})`;
    }

    if (!effectiveUnit) {
      setError('Packaging unit is required.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        brand: formData.brand.trim() || 'Standard',
        unit: effectiveUnit,
        costPrice: Number(formData.costPrice) || 0,
        price: Number(formData.price) || 0,
        minThreshold: Number(formData.minThreshold) || 10,
        photo: formData.photo || '',
        description: formData.description.trim(),
        initialStock: Number(formData.initialStock) || 0,
      };

      await onSave(payload, product?.id);
      handleModalClose();
    } catch (err) {
      setError(err.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(11, 31, 58, 0.65)',
      backdropFilter: 'blur(3px)',
      zIndex: 110,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '5.25rem 1rem 1.5rem 1rem', // Clear 72px top header
      overflowY: 'auto',
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '14px',
        width: '100%',
        maxWidth: '560px',
        maxHeight: 'calc(100vh - 105px)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 30px -5px rgba(0, 0, 0, 0.35)',
        overflow: 'hidden',
        border: '1px solid #CBD5E1',
        margin: 'auto',
      }}>
        {/* Header - Navy */}
        <div style={{
          padding: '0.85rem 1.25rem',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#0B1F3A',
          color: '#FFFFFF',
          flexShrink: 0,
        }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#FFFFFF', margin: 0 }}>
              {isEdit ? 'Edit Product Details & Pricing' : 'Add New Fertilizer Product'}
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#06B6D4', margin: '2px 0 0 0', fontWeight: '600' }}>
              {isEdit ? `Editing: ${product?.name}` : 'Catalog new inventory item with pricing, packaging unit and photo'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleModalClose}
            title="Close (Esc)"
            aria-label="Close dialog"
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              width: '34px',
              height: '34px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              color: '#FFFFFF',
              fontSize: '1.15rem',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#EF4444';
              e.currentTarget.style.borderColor = '#DC2626';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            }}
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} noValidate style={{ padding: '1.15rem 1.35rem', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{
              backgroundColor: '#FEF2F2',
              color: '#991B1B',
              border: '1px solid #FECACA',
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              fontSize: '0.85rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <span>⚠️</span>
              <div>{error}</div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
            {/* Product Name */}
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: fieldErrors.name ? '#DC2626' : '#1E293B' }}>
                  Product Name *
                </label>
                {fieldErrors.name && (
                  <span style={{ fontSize: '0.725rem', color: '#DC2626', fontWeight: '600' }}>
                    Required
                  </span>
                )}
              </div>
              <input
                type="text"
                name="name"
                placeholder="Urea (Neem Coated 46% N), DAP 18:46:0"
                value={formData.name}
                onChange={handleChange}
                required
                aria-invalid={!!fieldErrors.name}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  border: fieldErrors.name ? '1.5px solid #EF4444' : '1.5px solid #CBD5E1',
                  backgroundColor: fieldErrors.name ? '#FEF2F2' : '#FFFFFF',
                  fontSize: '0.875rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = fieldErrors.name ? '#DC2626' : '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = fieldErrors.name ? '#EF4444' : '#CBD5E1')}
              />
              {fieldErrors.name ? (
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.725rem', color: '#DC2626', fontWeight: '500' }}>
                  ⚠️ {fieldErrors.name}
                </p>
              ) : (
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.725rem', color: '#64748B' }}>
                  Specify the full chemical or trade name and nutrient grade.
                </p>
              )}
            </div>

            {/* Category */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.35rem' }}>
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '0.875rem',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.35rem' }}>
                Brand / Manufacturer
              </label>
              <input
                type="text"
                name="brand"
                placeholder="IFFCO, KRIBHCO, Mahadhan, Coromandel"
                value={formData.brand}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '0.875rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
              />
            </div>

            {/* Package Unit & Size Selector */}
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '0.85rem',
                backgroundColor: '#F8FAFC',
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                border: '1.5px solid #E2E8F0',
              }}>
                {/* 1. Main Package Unit Dropdown */}
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.35rem' }}>
                    Package Unit *
                  </label>
                  <select
                    name="packageType"
                    value={formData.packageType}
                    onChange={handlePackageTypeChange}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.875rem',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                      color: '#0B1F3A',
                      fontWeight: '600',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                    onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                  >
                    {PACKAGE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Sub-dropdown for Bags, Bottles, Packets, Boxes */}
                {formData.packageType !== 'Others' && (
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.35rem' }}>
                      {formData.packageType} Capacity / Size *
                    </label>
                    <select
                      name="packageSize"
                      value={formData.packageSize}
                      onChange={handleChange}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '8px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '0.875rem',
                        backgroundColor: '#FFFFFF',
                        outline: 'none',
                        color: '#0B1F3A',
                        fontWeight: '600',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                      onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                    >
                      {PACKAGE_SIZES[formData.packageType]?.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 3. Custom Unit Input when 'Others' selected */}
                {formData.packageType === 'Others' && (
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: fieldErrors.customUnit ? '#DC2626' : '#1E293B', display: 'block', marginBottom: '0.35rem' }}>
                      Custom Packaging Unit *
                    </label>
                    <input
                      type="text"
                      name="customUnit"
                      placeholder="Enter custom packaging unit (e.g. 50kg Drum)"
                      value={formData.customUnit}
                      onChange={handleChange}
                      required
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '8px',
                        border: fieldErrors.customUnit ? '1.5px solid #EF4444' : '1.5px solid #2563EB',
                        backgroundColor: fieldErrors.customUnit ? '#FEF2F2' : '#FFFFFF',
                        fontSize: '0.875rem',
                        outline: 'none',
                        color: '#0B1F3A',
                        fontWeight: '600',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                      onBlur={(e) => (e.target.style.borderColor = fieldErrors.customUnit ? '#EF4444' : '#CBD5E1')}
                    />
                    {fieldErrors.customUnit && (
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.725rem', color: '#DC2626', fontWeight: '500' }}>
                        ⚠️ {fieldErrors.customUnit}
                      </p>
                    )}
                  </div>
                )}

                {/* 4. Custom Size input when 'Custom Size' is selected */}
                {formData.packageType !== 'Others' && formData.packageSize === 'Custom Size' && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: fieldErrors.customPackageSize ? '#DC2626' : '#1E293B', display: 'block', marginBottom: '0.35rem' }}>
                      Specify Custom {formData.packageType} Size *
                    </label>
                    <input
                      type="text"
                      name="customPackageSize"
                      placeholder="Enter custom size (e.g. 45kgs, 750ml)"
                      value={formData.customPackageSize}
                      onChange={handleChange}
                      required
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '8px',
                        border: fieldErrors.customPackageSize ? '1.5px solid #EF4444' : '1.5px solid #2563EB',
                        backgroundColor: fieldErrors.customPackageSize ? '#FEF2F2' : '#FFFFFF',
                        fontSize: '0.875rem',
                        outline: 'none',
                        color: '#0B1F3A',
                        fontWeight: '600',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                      onBlur={(e) => (e.target.style.borderColor = fieldErrors.customPackageSize ? '#EF4444' : '#CBD5E1')}
                    />
                    {fieldErrors.customPackageSize && (
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.725rem', color: '#DC2626', fontWeight: '500' }}>
                        ⚠️ {fieldErrors.customPackageSize}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Purchase Price */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: fieldErrors.costPrice ? '#DC2626' : '#1E293B' }}>
                  Purchase Price (₹) *
                </label>
                {fieldErrors.costPrice && (
                  <span style={{ fontSize: '0.725rem', color: '#DC2626', fontWeight: '600' }}>
                    Invalid
                  </span>
                )}
              </div>
              <input
                type="number"
                name="costPrice"
                step="any"
                min="0"
                placeholder="0.00"
                value={formData.costPrice}
                onChange={handleChange}
                required
                aria-invalid={!!fieldErrors.costPrice}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  border: fieldErrors.costPrice ? '1.5px solid #EF4444' : '1.5px solid #CBD5E1',
                  backgroundColor: fieldErrors.costPrice ? '#FEF2F2' : '#FFFFFF',
                  fontSize: '0.875rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = fieldErrors.costPrice ? '#DC2626' : '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = fieldErrors.costPrice ? '#EF4444' : '#CBD5E1')}
              />
              {fieldErrors.costPrice ? (
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.725rem', color: '#DC2626', fontWeight: '500' }}>
                  ⚠️ {fieldErrors.costPrice}
                </p>
              ) : (
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.725rem', color: '#64748B' }}>
                  Non-negative dealer/supplier acquisition cost (₹).
                </p>
              )}
            </div>

            {/* Selling Price */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: fieldErrors.price ? '#DC2626' : '#1E293B' }}>
                  Selling Price (₹) *
                </label>
                {fieldErrors.price && (
                  <span style={{ fontSize: '0.725rem', color: '#DC2626', fontWeight: '600' }}>
                    Invalid
                  </span>
                )}
              </div>
              <input
                type="number"
                name="price"
                step="any"
                min="0"
                placeholder="0.00"
                value={formData.price}
                onChange={handleChange}
                required
                aria-invalid={!!fieldErrors.price}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  border: fieldErrors.price ? '1.5px solid #EF4444' : '1.5px solid #CBD5E1',
                  backgroundColor: fieldErrors.price ? '#FEF2F2' : '#FFFFFF',
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  color: fieldErrors.price ? '#DC2626' : '#2563EB',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = fieldErrors.price ? '#DC2626' : '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = fieldErrors.price ? '#EF4444' : '#CBD5E1')}
              />
              {fieldErrors.price ? (
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.725rem', color: '#DC2626', fontWeight: '500' }}>
                  ⚠️ {fieldErrors.price}
                </p>
              ) : (
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.725rem', color: '#64748B' }}>
                  Counter retail billing rate for farmers/buyers.
                </p>
              )}
            </div>

            {/* Pricing Warning Banner if Price < CostPrice */}
            {priceWarning && (
              <div style={{
                gridColumn: 'span 2',
                backgroundColor: '#FFFBEB',
                border: '1.5px solid #FCD34D',
                borderRadius: '8px',
                padding: '0.65rem 0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8rem',
                color: '#92400E',
                fontWeight: '600',
              }}>
                <span style={{ fontSize: '1.1rem' }}>⚠️</span>
                <div>{priceWarning}</div>
              </div>
            )}

            {/* Minimum-Stock Alert */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: fieldErrors.minThreshold ? '#DC2626' : '#1E293B' }}>
                  Min Stock Alert *
                </label>
                {fieldErrors.minThreshold && (
                  <span style={{ fontSize: '0.725rem', color: '#DC2626', fontWeight: '600' }}>
                    Whole number
                  </span>
                )}
              </div>
              <input
                type="number"
                name="minThreshold"
                step="1"
                min="0"
                placeholder="10"
                value={formData.minThreshold}
                onChange={handleChange}
                required
                aria-invalid={!!fieldErrors.minThreshold}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  border: fieldErrors.minThreshold ? '1.5px solid #EF4444' : '1.5px solid #CBD5E1',
                  backgroundColor: fieldErrors.minThreshold ? '#FEF2F2' : '#FFFFFF',
                  fontSize: '0.875rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = fieldErrors.minThreshold ? '#DC2626' : '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = fieldErrors.minThreshold ? '#EF4444' : '#CBD5E1')}
              />
              {fieldErrors.minThreshold ? (
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.725rem', color: '#DC2626', fontWeight: '500' }}>
                  ⚠️ {fieldErrors.minThreshold}
                </p>
              ) : (
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.725rem', color: '#64748B' }}>
                  Non-negative integer (e.g. 10). Triggers inventory alerts.
                </p>
              )}
            </div>

            {/* Product Count (Only for new product creation) */}
            {!isEdit && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', color: fieldErrors.initialStock ? '#DC2626' : '#1E293B' }}>
                    Product Count *
                  </label>
                  {fieldErrors.initialStock && (
                    <span style={{ fontSize: '0.725rem', color: '#DC2626', fontWeight: '600' }}>
                      Invalid
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  name="initialStock"
                  placeholder="0"
                  value={formData.initialStock}
                  onChange={handleChange}
                  required
                  min="0"
                  step="1"
                  aria-invalid={!!fieldErrors.initialStock}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '8px',
                    border: fieldErrors.initialStock ? '1.5px solid #EF4444' : '1.5px solid #CBD5E1',
                    backgroundColor: fieldErrors.initialStock ? '#FEF2F2' : '#FFFFFF',
                    fontSize: '0.875rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = fieldErrors.initialStock ? '#DC2626' : '#2563EB')}
                  onBlur={(e) => (e.target.style.borderColor = fieldErrors.initialStock ? '#EF4444' : '#CBD5E1')}
                />
                {fieldErrors.initialStock ? (
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.725rem', color: '#DC2626', fontWeight: '500' }}>
                    ⚠️ {fieldErrors.initialStock}
                  </p>
                ) : (
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.725rem', color: '#64748B' }}>
                    Opening warehouse quantity (must be 0 or more).
                  </p>
                )}
              </div>
            )}

            {/* Product Photo Upload & Camera Capture (Replaces URL field) */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1E293B', display: 'block', marginBottom: '0.4rem' }}>
                Product Photo (Upload Image / Capture Photo)
              </label>

              {/* Hidden file inputs for upload and direct camera capture */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                style={{ display: 'none' }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageFileChange}
                style={{ display: 'none' }}
              />

              <div style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '10px',
                border: '1.5px dashed #CBD5E1',
                padding: '1.1rem',
              }}>
                {cameraError && (
                  <div style={{ fontSize: '0.75rem', color: '#DC2626', marginBottom: '0.6rem', fontWeight: '600' }}>
                    ⚠️ {cameraError}
                  </div>
                )}

                {/* Live Camera View Finder */}
                {isCameraOpen ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.75rem',
                    backgroundColor: '#0B1F3A',
                    borderRadius: '8px',
                    padding: '0.85rem',
                  }}>
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      maxWidth: '360px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      backgroundColor: '#000000',
                    }}>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                      <button
                        type="button"
                        onClick={handleSnapPhoto}
                        style={{
                          backgroundColor: '#059669',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '0.5rem 1.25rem',
                          borderRadius: '6px',
                          fontWeight: '700',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)',
                        }}
                      >
                        📸 Snap Photo
                      </button>
                      <button
                        type="button"
                        onClick={stopCameraStream}
                        style={{
                          backgroundColor: '#334155',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          fontWeight: '600',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                        }}
                      >
                        ✕ Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* If Photo is already loaded (Uploaded or Captured) */}
                    {formData.photo ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{
                          width: '84px',
                          height: '84px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          overflow: 'hidden',
                          backgroundColor: '#FFFFFF',
                          flexShrink: 0,
                          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                        }}>
                          <img
                            src={formData.photo}
                            alt="Product Preview"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#166534', marginBottom: '0.2rem' }}>
                            ✓ Photo Attached Ready
                          </div>
                          <div style={{ fontSize: '0.725rem', color: '#64748B', marginBottom: '0.6rem' }}>
                            Image is stored and will appear on product catalog & invoice slips.
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              style={{
                                padding: '0.35rem 0.75rem',
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #CBD5E1',
                                borderRadius: '6px',
                                fontSize: '0.775rem',
                                fontWeight: '600',
                                color: '#1E293B',
                                cursor: 'pointer',
                              }}
                            >
                              📁 Upload Different
                            </button>
                            <button
                              type="button"
                              onClick={handleStartCamera}
                              style={{
                                padding: '0.35rem 0.75rem',
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #CBD5E1',
                                borderRadius: '6px',
                                fontSize: '0.775rem',
                                fontWeight: '600',
                                color: '#1E293B',
                                cursor: 'pointer',
                              }}
                            >
                              📷 Retake Camera
                            </button>
                            <button
                              type="button"
                              onClick={handleRemovePhoto}
                              style={{
                                padding: '0.35rem 0.75rem',
                                backgroundColor: '#FEE2E2',
                                border: '1px solid #FCA5A5',
                                borderRadius: '6px',
                                fontSize: '0.775rem',
                                fontWeight: '600',
                                color: '#991B1B',
                                cursor: 'pointer',
                              }}
                            >
                              ✕ Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Action Buttons to Choose Upload vs Camera */
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.75rem' }}>
                        <div style={{ fontSize: '1.75rem', color: '#64748B' }}>
                          📸
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '700', color: '#0F172A' }}>
                            Add Product Photo
                          </p>
                          <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748B' }}>
                            Upload an existing image from your computer or take a real-time photo with your camera.
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                              padding: '0.55rem 1.15rem',
                              backgroundColor: '#FFFFFF',
                              color: '#0B1F3A',
                              border: '1.5px solid #CBD5E1',
                              borderRadius: '8px',
                              fontWeight: '700',
                              fontSize: '0.825rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                            }}
                          >
                            <span>📁</span> Upload Image
                          </button>
                          <button
                            type="button"
                            onClick={handleStartCamera}
                            style={{
                              padding: '0.55rem 1.15rem',
                              backgroundColor: '#2563EB',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: '700',
                              fontSize: '0.825rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                            }}
                          >
                            <span>📷</span> Capture Photo
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            paddingTop: '1rem',
            borderTop: '1px solid #E2E8F0',
          }}>
            <button
              type="button"
              onClick={handleModalClose}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#64748B',
                fontWeight: '600',
                cursor: 'pointer',
              }}
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
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)',
              }}
            >
              {submitting ? 'Saving...' : isEdit ? 'Save Product Details' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
