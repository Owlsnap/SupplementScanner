import { useState } from "react";
import { Bot, RotateCcw, Plus, DollarSign, Weight, FlaskConical, Link, Trophy, Trash2 } from "lucide-react";
import CookieBanner from './CookieBanner';

export default function PricePerUnitCalculator() {
  const [products, setProducts] = useState([
    {
      id: 1,
      name: "",
      price: "",
      quantity: "",
      unit: "_",
      pricePerUnit: null,
      url: "",
    },
  ]);
  const [nextId, setNextId] = useState(2);
  const [toasts, setToasts] = useState([]);
  const [extractingProducts, setExtractingProducts] = useState(new Set());

  // Toast functions
  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 4000);
  };

  const addProduct = () => {
    setProducts([
      ...products,
      {
        id: nextId,
        name: "",
        price: "",
        quantity: "",
        unit: "_",
        pricePerUnit: null,
        url: "",
      },
    ]);
    setNextId(nextId + 1);
  };

  const extractProductInfo = async (productId, url) => {
    if (!url.trim()) return;

    setExtractingProducts(prev => new Set([...prev, productId]));
    try {
      // Call backend API (local dev or production)
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const response = await fetch(
        `${apiUrl}/api/extract-product`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        }
      );

      const data = await response.json();

      if (data.success) {
        // Update all fields at once to avoid React state batching issues
        setProducts(
          products.map((product) => {
            if (product.id === productId) {
              const updatedProduct = {
                ...product,
                name: data.name || "",
                price: data.price || "",
                quantity: data.quantity || "",
                unit: data.unit || "_",
              };

              // Recalculate price per unit
              const price = parseFloat(updatedProduct.price) || 0;
              const quantity = parseFloat(updatedProduct.quantity) || 0;

              if (price > 0 && quantity > 0) {
                updatedProduct.pricePerUnit = price / quantity;
              } else {
                updatedProduct.pricePerUnit = null;
              }

              return updatedProduct;
            }
            return product;
          })
        );
        showToast(`✅ Product info extracted successfully! Found ${data.name}`, 'success');
      } else {
        showToast(`❌ Could not extract product info: ${data.error}`, 'error');
      }
    } catch (error) {
      showToast('❌ Error: Make sure the backend server is running! Run: node server.js', 'error');
    } finally {
      setExtractingProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  const removeProduct = (id) => {
    setProducts(products.filter((p) => p.id !== id));
  };

  const updateProduct = (id, field, value) => {
    setProducts(
      products.map((product) => {
        if (product.id === id) {
          const updatedProduct = { ...product, [field]: value };

          // Recalculate price per unit
          const price = parseFloat(updatedProduct.price) || 0;
          const quantity = parseFloat(updatedProduct.quantity) || 0;

          if (price > 0 && quantity > 0) {
            updatedProduct.pricePerUnit = price / quantity;
          } else {
            updatedProduct.pricePerUnit = null;
          }

          return updatedProduct;
        }
        return product;
      })
    );
  };

  // Find the best value
  const validProducts = products.filter((p) => p.pricePerUnit !== null);
  const bestValue =
    validProducts.length > 1
      ? validProducts.reduce((best, current) =>
          current.pricePerUnit < best.pricePerUnit ? current : best
        )
      : null;

  return (
    <>
      {/* Modern Navbar */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: 'rgba(13, 17, 28, 0.8)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(56, 243, 171, 0.1)',
          padding: '1rem 2rem'
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div 
              style={{
                background: 'linear-gradient(135deg, #38f3ab 0%, #1dd1a1 50%, #0891b2 100%)',
                borderRadius: '12px',
                padding: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px'
              }}
            >
              <Bot size={24} color="#0f172a" />
            </div>
            <div>
              <h1 style={{ 
                margin: 0, 
                fontSize: '1.5rem', 
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #38f3ab 0%, #1dd1a1 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                SupplementScanner
              </h1>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>
                AI-Powered Price Analytics
              </p>
            </div>
          </div>
          {window.innerWidth >= 768 && (
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                border: 'none',
                borderRadius: '12px',
                padding: '0.75rem 1.5rem',
                color: '#ffffff',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '0.875rem',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 20px rgba(168, 85, 247, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          minHeight: 'calc(100vh + 100px)', // Account for mobile browser bars
          padding: '1rem',
          paddingTop: '120px',
          paddingBottom: '120px', // Much more bottom padding for mobile
          position: 'relative'
        }}
      >
        {/* Animated Background Elements */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 50%, rgba(56, 243, 171, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(8, 145, 178, 0.1) 0%, transparent 50%)',
          pointerEvents: 'none'
        }} />
        
        <div style={{ 
          position: 'relative', 
          zIndex: 1, 
          maxWidth: '1200px', 
          margin: '0 auto',
          width: '100%',
          padding: window.innerWidth < 768 ? '0 1rem' : '0 2rem',
          boxSizing: 'border-box'
        }}>
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(20px)',
            borderRadius: window.innerWidth < 768 ? '1rem' : '1.5rem',
            padding: window.innerWidth < 768 ? '1rem' : '2rem',
            border: '1px solid rgba(56, 243, 171, 0.1)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
          }}
        >
          <div
            className="mb-8 flex-1"
            style={{
              display: "grid",
              gridTemplateColumns: window.innerWidth < 768 ? "1fr" : "repeat(auto-fit, minmax(350px, 1fr))",
              gap: "1.5rem"
            }}
          >
            {products.map((product) => {
              const isBestValue = bestValue && product.id === bestValue.id;

              return (
                <div
                  key={product.id}
                  style={{
                    background: isBestValue 
                      ? 'linear-gradient(135deg, rgba(56, 243, 171, 0.2) 0%, rgba(29, 209, 161, 0.2) 100%)'
                      : 'rgba(30, 41, 59, 0.6)',
                    backdropFilter: 'blur(16px)',
                    borderRadius: '20px',
                    padding: '1.5rem',
                    border: isBestValue 
                      ? '2px solid rgba(56, 243, 171, 0.4)'
                      : '1px solid rgba(148, 163, 184, 0.1)',
                    boxShadow: isBestValue
                      ? '0 10px 40px rgba(56, 243, 171, 0.2)'
                      : '0 8px 32px rgba(0, 0, 0, 0.3)',
                    transition: 'all 0.3s ease',
                    position: 'relative'
                  }}
                >
                  {/* Product Header */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    marginBottom: '1.5rem' 
                  }}>
                    <div
                      style={{
                        padding: "0.75rem 1.5rem",
                        borderRadius: "50px",
                        background: 'rgba(102, 126, 234, 0.2)',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid rgba(118, 75, 162, 0.3)',
                        color: '#e0e7ff',
                        fontWeight: '600',
                        fontSize: '0.875rem',
                        boxShadow: '0 8px 32px rgba(102, 126, 234, 0.2)',
                        textShadow: '0 0 10px rgba(118, 75, 162, 0.5)'
                      }}
                    >
                      Product {product.id}
                    </div>
                  </div>

                  {/* AI URL Extraction - Prominent */}
                  <div style={{ 
                    marginBottom: '2rem',
                    background: 'linear-gradient(135deg, rgba(56, 243, 171, 0.1) 0%, rgba(29, 209, 161, 0.1) 100%)',
                    border: '2px solid rgba(56, 243, 171, 0.3)',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Glow effect */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'radial-gradient(circle at 50% 0%, rgba(56, 243, 171, 0.1) 0%, transparent 70%)',
                      pointerEvents: 'none'
                    }} />
                    
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '1rem',
                        fontWeight: '700',
                        color: '#38f3ab',
                        marginBottom: '0.75rem',
                        textShadow: '0 0 10px rgba(56, 243, 171, 0.5)'
                      }}>
                        <Bot size={20} style={{ marginRight: '0.5rem' }} />
                        🚀 AI Auto-Extract: Paste Product URL
                      </label>
                      <p style={{
                        fontSize: '0.875rem',
                        color: '#94a3b8',
                        marginBottom: '1rem',
                        lineHeight: '1.4'
                      }}>
                        Paste any Swedish supplement store URL and let AI extract price, quantity, and units (g, capsules, tablets, ml, etc.) automatically!
                      </p>
                      {/* Url input */}
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'end' }}>
                        <div style={{ flex: 1 }}>
                          <input
                            type="url"
                            placeholder="https://www.proteinbolaget.se/shop/product-name... (try it!)"
                            value={product.url}
                            onChange={(e) =>
                              updateProduct(product.id, "url", e.target.value)
                            }
                            style={{
                              width: '95%',
                              padding: '0.875rem',
                              background: 'rgba(15, 23, 42, 0.9)',
                              border: '2px solid rgba(56, 243, 171, 0.3)',
                              borderRadius: '12px',
                              color: '#f1f5f9',
                              fontSize: '1rem',
                              outline: 'none',
                              transition: 'all 0.3s ease',
                              boxShadow: '0 4px 20px rgba(56, 243, 171, 0.1)'
                            }}
                            onFocus={(e) => {
                              e.target.style.border = '2px solid rgba(56, 243, 171, 0.6)';
                              e.target.style.boxShadow = '0 8px 32px rgba(56, 243, 171, 0.2)';
                            }}
                            onBlur={(e) => {
                              e.target.style.border = '2px solid rgba(56, 243, 171, 0.3)';
                              e.target.style.boxShadow = '0 4px 20px rgba(56, 243, 171, 0.1)';
                            }}
                          />
                        </div>
                        <button
                          onClick={() =>
                            extractProductInfo(product.id, product.url)
                          }
                          disabled={!product.url.trim() || extractingProducts.has(product.id)}
                          style={{
                            padding: "1rem 0.5rem",
                            background: extractingProducts.has(product.id)
                              ? "rgba(156, 163, 175, 0.8)"
                              : "linear-gradient(135deg, #38f3ab 0%, #1dd1a1 100%)",
                            borderRadius: "12px",
                            border: "none",
                            color: extractingProducts.has(product.id) ? "#6b7280" : "#0f172a",
                            cursor: extractingProducts.has(product.id) ? "not-allowed" : "pointer",
                            fontSize: "0.875rem",
                            fontWeight: "600",
                            display: 'flex',
                            flexDirection: 'reverse-column',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 4px 20px rgba(56, 243, 171, 0.3)',
                            whiteSpace: 'nowrap',
                            marginLeft: '1.5rem'
                          }}
                          onMouseEnter={(e) => {
                            if (!extractingProducts.has(product.id)) {
                              e.target.style.transform = "translateY(-2px)";
                              e.target.style.boxShadow = "0 8px 32px rgba(56, 243, 171, 0.4)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = "translateY(0)";
                            e.target.style.boxShadow = "0 4px 20px rgba(56, 243, 171, 0.3)";
                          }}
                        >
                          {extractingProducts.has(product.id) ? (
                            <>⏳ Extracting...</>
                          ) : (
                            <>
                              <Bot size={18} />
                              Extract
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Product Name Input */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#94a3b8',
                      marginBottom: '0.5rem'
                    }}>
                      Product Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter product name (optional - auto-filled by AI)"
                      value={product.name}
                      onChange={(e) =>
                        updateProduct(product.id, "name", e.target.value)
                      }
                      style={{
                        width: '95%',
                        padding: '0.75rem',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: '12px',
                        color: '#f1f5f9',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'all 0.3s ease'
                      }}
                      onFocus={(e) => e.target.style.border = '1px solid rgba(56, 243, 171, 0.5)'}
                      onBlur={(e) => e.target.style.border = '1px solid rgba(148, 163, 184, 0.2)'}
                    />
                  </div>
                  {/* Price Input */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#94a3b8',
                        marginBottom: '0.5rem'
                      }}>
                        <DollarSign size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                        Price (kr)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={product.price}
                        onChange={(e) =>
                          updateProduct(product.id, "price", e.target.value)
                        }
                        style={{
                          width: '95%',
                          padding: '0.75rem',
                          background: 'rgba(15, 23, 42, 0.8)',
                          border: '1px solid rgba(148, 163, 184, 0.2)',
                          borderRadius: '12px',
                          color: '#f1f5f9',
                          fontSize: '1rem',
                          outline: 'none',
                          transition: 'all 0.3s ease'
                        }}
                        onFocus={(e) => e.target.style.border = '1px solid rgba(56, 243, 171, 0.5)'}
                        onBlur={(e) => e.target.style.border = '1px solid rgba(148, 163, 184, 0.2)'}
                      />
                    </div>
                    {/* Quantity Input */}
                    <div style={{ marginTop: '1.5rem' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#94a3b8',
                        marginBottom: '0.5rem'
                      }}>
                        <Weight size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                        Quantity
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        value={product.quantity}
                        onChange={(e) =>
                          updateProduct(product.id, "quantity", e.target.value)
                        }
                        style={{
                          width: '95%',
                          padding: '0.75rem',
                          background: 'rgba(15, 23, 42, 0.8)',
                          border: '1px solid rgba(148, 163, 184, 0.2)',
                          borderRadius: '12px',
                          color: '#f1f5f9',
                          fontSize: '1rem',
                          outline: 'none',
                          transition: 'all 0.3s ease'
                        }}
                        onFocus={(e) => e.target.style.border = '1px solid rgba(56, 243, 171, 0.5)'}
                        onBlur={(e) => e.target.style.border = '1px solid rgba(148, 163, 184, 0.2)'}
                      />
                    </div>

                    {/* Unit Input - Auto-detected */}
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: "1rem"}}>
                      <label style={{
                        display: 'flex',
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: '#94a3b8',
                        alignItems: 'center', 
                        justifyContent: 'center',
                        textAlign: 'center'
                      }}>
                        <FlaskConical size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                        Unit
                      </label>
                      <div
                        style={{
                          width: 'fit-content',
                          borderRadius: '12px',
                          background: 'transparent',
                          border: 'none',
                          textAlign: 'center',
                          // Style the unit text here:
                        }}
                      >
                        <span style={{
                          fontSize: '1.2rem',
                          fontWeight: '600',
                          color: '#38f3ab', // Neon green color
                          textShadow: '0 0 10px rgba(56, 243, 171, 0.5)' // Glow effect
                        }}>{product.unit}</span> <span style={{fontSize: '0.875rem', color: '#94a3b8'}}>(auto-detected)</span>
                      </div>
                    </div>
                  </div>
                  {/* Price Per Unit Display */}
                  <div className="bg-gray-50 p-4 rounded-xl text-center">
                    {product.pricePerUnit !== null ? (
                      <>
                        <div className="text-3xl font-bold text-gray-800">
                          {product.pricePerUnit.toFixed(4)} kr per{" "}
                          {product.unit}
                        </div>
                        {isBestValue && (
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '1rem', 
                            marginTop: '1rem',
                            flexWrap: 'wrap'
                          }}> 
                          {/* Best value display */}
                            <div className="inline-block px-4 py-2 bg-green-500 text-white rounded-full text-sm font-bold animate-pulse">
                              <Trophy size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                              <span style={{color: 'gold'}}>Best value!</span>
                            </div>
                            {/* Product Affiliate URL Button / Buy button */}
                            {product.url && (
                              <button
                                onClick={() => window.open(product.url, '_blank')}
                                style={{
                                  padding: '0.75rem',
                                  background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '25px',
                                  fontSize: '0.875rem',                
                                  fontWeight: '400',
                                  cursor: 'pointer',
                                  transition: 'all 0.3s ease',
                                  boxShadow: '0 4px 20px rgba(56, 243, 171, 0.4)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  letterSpacing: '0.05em'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.transform = 'translateY(-2px) scale(1.05)';
                                  e.target.style.boxShadow = '0 8px 32px rgba(56, 243, 171, 0.6)';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.transform = 'translateY(0) scale(1)';
                                  e.target.style.boxShadow = '0 4px 20px rgba(56, 243, 171, 0.4)';
                                }}
                              >
                                🛒 Buy
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-2xl font-bold text-gray-800">
                        Paste URL of product page to auto-fill or enter price and quantity
                      </div>
                    )}
                  </div>
                  {/* Remove Product Button */}
                  {products.length > 1 && (
                    <div className="flex justify-center">
                      <button
                        onClick={() => removeProduct(product.id)}
                        style={{
                          padding: "0.75rem 1.5rem",
                          background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "12px",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          boxShadow: "0 4px 20px rgba(239, 68, 68, 0.3)",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginTop: "1rem"
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = "translateY(-1px)";
                          e.target.style.boxShadow = "0 6px 24px rgba(239, 68, 68, 0.4)";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = "translateY(0)";
                          e.target.style.boxShadow = "0 4px 20px rgba(239, 68, 68, 0.3)";
                        }}
                      >
                        <Trash2 size={16} />
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Add Product Button */}
          <div className="text-center">
            <button
              onClick={addProduct}
              style={{
                padding: "1rem 2rem",
                background: "linear-gradient(135deg, #38f3ab 0%, #1dd1a1 100%)",
                color: "#0f172a",
                border: "none",
                borderRadius: "16px",
                fontSize: "1rem",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "all 0.3s ease",
                boxShadow: "0 8px 32px rgba(56, 243, 171, 0.3)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                margin: "0.875rem auto",
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 12px 40px rgba(56, 243, 171, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 8px 32px rgba(56, 243, 171, 0.3)";
              }}
            >
              <Plus size={20} style={{ marginRight: '0.5rem' }} />
              Add Product
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <div
        style={{
          position: 'fixed',
          top: window.innerWidth < 768 ? '80px' : '100px',
          right: window.innerWidth < 768 ? '10px' : '20px',
          left: window.innerWidth < 768 ? '10px' : 'auto',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{
              background: toast.type === 'success' 
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: 'white',
              padding: '12px 16px',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              maxWidth: '350px',
              fontSize: '0.875rem',
              fontWeight: '500',
              animation: 'slideIn 0.3s ease-out',
              cursor: 'pointer'
            }}
            onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Toast Animation Styles */}
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>

      {/* Cookie Consent Banner */}
      <CookieBanner />
    </>
  );
}
