import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaLock } from 'react-icons/fa'
import { useCart } from '../../CartContext/CartContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import OrderGraceOverlay from '../OrderGraceOverlay/OrderGraceOverlay'

const API = 'https://food-backend-s7t0.onrender.com'

/** Razorpay official checkout script (demo / production same URL) */
function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve()
      return
    }
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Razorpay script load failed')))
      return
    }
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Razorpay script load failed'))
    document.body.appendChild(s)
  })
}

const Checkout = () => {

  const { totalAmount, cartItems, clearCart } = useCart();
  const navigate = useNavigate();
  const validCartItems = cartItems.filter((ci) => ci?.item != null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    zipCode: '',
    paymentMethod: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  /** After COD / successful Razorpay, 5s grace overlay before leaving checkout */
  const [grace, setGrace] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [pricePreview, setPricePreview] = useState(null);

  // GRAB TOKEN
  const token = localStorage.getItem('authToken');
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const lineItemsPayload = () =>
    validCartItems.map(({ item, quantity }) => ({
      productId: item._id,
      name: item.name,
      price: item.price,
      quantity,
      imageUrl: item.imageUrl || '',
    }));

  const runPricingPreview = async () => {
    const { data } = await axios.post(
      `${API}/api/orders/preview-pricing`,
      { items: lineItemsPayload(), couponCode: couponCode.trim() },
      { headers: authHeaders },
    );
    setPricePreview(data);
    return data;
  };

  const handleInputChange = e => {
    const { name, value } = e.target;
    const normalizedValue =
      name === 'phone'
        ? value.replace(/\D/g, '').slice(0, 10)
        : name === 'zipCode'
          ? value.replace(/\D/g, '').slice(0, 6)
          : value;
    setFormData(prev => ({ ...prev, [name]: normalizedValue }))
  }


  const handleSubmit = async e => {
    e.preventDefault();
    if (validCartItems.length === 0) {
      setError('Your cart has no valid items. Go back to the cart or menu.');
      return;
    }
    if (!/^\d{10}$/.test(formData.phone || '')) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }
    if (!/^\d{6}$/.test(formData.zipCode || '')) {
      setError('PIN code must be exactly 6 digits (numbers only).');
      return;
    }
    setLoading(true);
    setError(null);

    let pricing;
    try {
      pricing = await runPricingPreview();
    } catch (prevErr) {
      console.error(prevErr);
      setError(prevErr.response?.data?.message || 'Could not validate cart or coupon.');
      setLoading(false);
      return;
    }

    const payload = {
      ...formData,
      subtotal: pricing.finalSubtotal,
      tax: pricing.finalTax,
      total: pricing.finalTotal,
      items: lineItemsPayload(),
      couponCode: couponCode.trim() || undefined,
      onlinePaymentMethod: 'upi',
    };

    try {
      if (formData.paymentMethod === 'online') {
        const { data } = await axios.post(
          `${API}/api/orders`,
          payload,
          { headers: { ...authHeaders, 'x-frontend-url': window.location.origin } }
        );

        if (data.useRazorpay && data.razorpayKeyId && data.razorpayOrderId) {
          await loadRazorpayScript()
          const options = {
            key: data.razorpayKeyId,
            amount: data.amount,
            currency: data.currency || 'INR',
            name: 'Foodie Frenzy',
            description: 'Order payment',
            order_id: data.razorpayOrderId,
            prefill: {
              name: data.customerName || '',
              email: data.customerEmail || '',
              contact: data.customerPhone || '',
            },
            theme: { color: '#d97706' },
            handler: async (response) => {
              try {
                const { data: paid } = await axios.post(
                  `${API}/api/orders/razorpay-verify`,
                  {
                    orderId: data.appOrderId,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                  },
                  { headers: authHeaders }
                )
                if (paid?.refundedDueToStock) {
                  toast(paid.message || 'Refund started — items were unavailable.', {
                    icon: 'ℹ️',
                    duration: 6000,
                  })
                  navigate('/myorder', { replace: true })
                  setLoading(false)
                  return
                }
                clearCart()
                const av = paid?.order?.adminVisibleAt
                if (paid?.order?._id && av) {
                  setGrace({ id: paid.order._id, adminVisibleAt: av })
                } else {
                  toast.error('Order confirmation timing is missing — check My orders.')
                  navigate('/myorder', { replace: true })
                }
              } catch (verErr) {
                console.error(verErr)
                setError(verErr.response?.data?.message || 'Payment verify failed')
                setLoading(false)
              }
            },
            modal: {
              ondismiss: () => setLoading(false),
            },
          }
          const rzp = new window.Razorpay(options)
          rzp.on('payment.failed', (resp) => {
            setError(resp.error?.description || 'Payment failed')
            setLoading(false)
          })
          setLoading(false)
          rzp.open()
          return
        }

        setError('Payment could not start. Try again.')
      } else {
        // COD
        const { data } = await axios.post(
          `${API}/api/orders`,
          payload,
          { headers: authHeaders }
        );

        clearCart();
        const av = data?.order?.adminVisibleAt;
        if (data?.order?._id && av) {
          setGrace({ id: data.order._id, adminVisibleAt: av });
        } else {
          navigate('/myorder', { replace: true });
        }
      }
    } catch (err) {
      console.error('Order submission error:', err)
      const u = err.response?.data?.unavailable
      const base = err.response?.data?.message || 'Failed to submit order'
      if (Array.isArray(u) && u.length > 0) {
        const detail = u.map((x) => `${x.name}: ${x.reason}`).join(' · ')
        setError(`${base} (${detail})`)
      } else {
        setError(base)
      }
    } finally {
      setLoading(false);
    }

  };



  return (
    <>
      {grace && (
        <>
          <OrderGraceOverlay
            orderId={grace.id}
            adminVisibleAt={grace.adminVisibleAt}
            authHeaders={authHeaders}
            onComplete={() => {
              setGrace(null);
              navigate('/myorder', { replace: true });
            }}
            onCancelled={() => {
              setGrace(null);
              navigate('/myorder', { replace: true });
            }}
          />
        </>
      )}
    <div className='min-h-screen bg-gradient-to-b from-[#1a1212] to-[#2a1e1e] text-white py-16 px-4'>
      <div className='mx-auto max-w-4xl'>

        <Link
          className='flex items-center gap-2 text-amber-400 mb-8'
          to='/cart'
        >
          <FaArrowLeft /> Back to Cart
        </Link>

        <h1 className='text-4xl font-bold text-center mb-8'>
          Checkout
        </h1>

        <form
          className='grid lg:grid-cols-2 gap-12'
          onSubmit={handleSubmit}
        >
          <div className='bg-[#4b3b3b]/80 p-6 rounded-3xl space-y-6'>
            <h2 className='text-2xl font-bold'>Delivery Details</h2>

            <Input label='First Name' name='firstName' value={formData.firstName} onChange={handleInputChange} />
            <Input label='Last Name' name='lastName' value={formData.lastName} onChange={handleInputChange} />
            <Input label='Phone' name='phone' value={formData.phone} onChange={handleInputChange} />
            <Input label='Email' name='email' type='email' value={formData.email} onChange={handleInputChange} />
            <Input label='Address' name='address' value={formData.address} onChange={handleInputChange} />
            <Input label='City' name='city' value={formData.city} onChange={handleInputChange} />
            <Input label='Zip Code' name='zipCode' value={formData.zipCode} onChange={handleInputChange} />
          </div>

          <div className='bg-[#4b3b3b]/80 p-6 rounded-3xl space-y-6'>
            <h2 className='text-2xl font-bold'>Payment Details</h2>

            <div className='space-y-4 mb-6'>
              <h3 className='text-lg font-semibold text-amber-100'>Your order items</h3>

              {validCartItems.length === 0 ? (
                <p className='text-amber-200/80 text-sm'>No line items (remove broken cart rows or add products from the menu).</p>
              ) : (
                validCartItems.map(({ _id, item, quantity }) => (
                  <div key={_id} className='flex justify-between items-center bg-[#3a2b2b] p-3 rounded-lg'>
                    <div className='flex-1'>
                      <span className='text-amber-100'>{item?.name}</span>
                      <span className='ml-2 text-amber-500/80 text-sm'>×{quantity}</span>
                    </div>
                    <span className='text-amber-300'>
                      ₹{((item?.price ?? 0) * quantity).toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="rounded-xl border border-amber-500/15 bg-[#2a211c]/50 p-4 space-y-3">
              <label className="block text-sm text-amber-200/90">Coupon code (optional)</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setPricePreview(null);
                  }}
                  placeholder="SAVE10"
                  className="flex-1 rounded-xl border border-amber-500/20 bg-[#1a1410]/80 px-3 py-2 text-amber-50 placeholder:text-amber-500/40"
                />
                <button
                  type="button"
                  disabled={loading || validCartItems.length === 0}
                  onClick={async () => {
                    setError(null);
                    try {
                      await runPricingPreview();
                      toast.success('Totals updated');
                    } catch (e) {
                      setError(e.response?.data?.message || 'Invalid coupon or cart');
                      setPricePreview(null);
                    }
                  }}
                  className="rounded-xl border border-amber-500/40 bg-amber-800/50 px-4 py-2 text-sm font-semibold text-amber-50 hover:bg-amber-700/60 disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
              <p className="text-xs text-amber-400/70">Totals refresh when you place the order; use Apply to preview.</p>
            </div>

            <PaymentSummary cartSubtotal={totalAmount} preview={pricePreview} />

            {/* PAYMENT METHOD */}
            <div>
              <label className='block mb-2'>Payment Method</label>
              <select
                name='paymentMethod'
                value={formData.paymentMethod}
                onChange={handleInputChange}
                required
                className='w-full bg-[#3a2b2b]/50 rounded-xl px-4 py-3'
              >
                <option value=''>Select Method</option>
                <option value='cod'>Cash on Delivery</option>
                <option value='online'>Online Payment</option>
              </select>
            </div>

            {formData.paymentMethod === 'online' && (
              <p className='text-xs text-amber-400/80 mt-2'>
                Online payment is powered by Razorpay (UPI / Cards / Wallet / Netbanking).
              </p>
            )}

            {error && <p className='text-red-400 mt-2'>{error}</p>}

            <button
              type='submit'
              disabled={loading || validCartItems.length === 0}
              className='w-full bg-gradient-to-r from-red-600 to-amber-600 py-4 rounded-xl font-bold flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <FaLock className='mr-2' />
              {loading ? 'Processing... ' : 'Complete Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  )
}

const Input = ({ label, name, type = 'text', value, onChange }) => (
  <div>
    <label className='block mb-1'>{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      required
      pattern={name === 'phone' ? '[0-9]{10}' : name === 'zipCode' ? '[0-9]{6}' : undefined}
      minLength={name === 'phone' ? 10 : name === 'zipCode' ? 6 : undefined}
      maxLength={name === 'phone' ? 10 : name === 'zipCode' ? 6 : undefined}
      inputMode={name === 'phone' || name === 'zipCode' ? 'numeric' : undefined}
      title={name === 'phone' ? '10 digits, numbers only' : name === 'zipCode' ? '6 digits, numbers only' : undefined}
      className='w-full bg-[#3a2b2b]/50 rounded-xl px-4 py-2'
    />
  </div>
)

const PaymentSummary = ({ cartSubtotal, preview }) => {
  const base = Number(cartSubtotal.toFixed(2));
  const subtotal = preview ? preview.finalSubtotal : base;
  const tax = preview ? preview.finalTax : Number((base * 0.05).toFixed(2));
  const total = preview ? preview.finalTotal : Number((base + tax).toFixed(2));
  const discount = preview?.couponDiscountAmount > 0 ? preview.couponDiscountAmount : 0;

  return (
    <div className='space-y-2'>
      {preview && (
        <div className="text-xs text-amber-400/80">
          Server subtotal before discount: ₹{Number(preview.serverSubtotal).toFixed(2)}
        </div>
      )}
      {discount > 0 && (
        <div className='flex justify-between text-emerald-300/90'>
          <span>Coupon ({preview.appliedCouponCode}):</span>
          <span>−₹{discount.toFixed(2)}</span>
        </div>
      )}
      <div className='flex justify-between'>
        <span>Subtotal:</span>
        <span>₹{subtotal.toFixed(2)}</span>
      </div>

      <div className='flex justify-between'>
        <span>Tax (5%):</span>
        <span>₹{tax.toFixed(2)}</span>
      </div>

      <div className='flex justify-between font-bold border-t pt-2'>
        <span>Total:</span>
        <span>₹{total.toFixed(2)}</span>
      </div>
    </div>
  );
};


export default Checkout
