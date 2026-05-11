import React, { useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { FiArrowRight, FiGlobe, FiMail, FiMapPin, FiMessageSquare, FiPhone } from "react-icons/fi";
import { contactFormFields } from '../../assets/dummydata'

const Contact = () => {

  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', address: '', topic: '', query: '',
  })
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const whatsappNumber = '919638979920';

  /** Gmail only: must end with @gmail.com, local part 6–64 chars, valid characters */
  const isValidGmail = (email) => {
    const s = String(email || '').trim().toLowerCase()
    if (!s.endsWith('@gmail.com')) return false
    const local = s.slice(0, -10)
    if (local.length < 6 || local.length > 64) return false
    return /^[a-z0-9]([a-z0-9._+-]*[a-z0-9])?$/.test(local)
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('')

    const trimmedPhone = String(formData.phone || '').replace(/\D/g, '')
    const trimmedQuery = String(formData.query || '').trim()
    const emailTrim = String(formData.email || '').trim()

    if (trimmedPhone.length !== 10) {
      setFormError('Please enter a valid 10-digit phone number.')
      return
    }
    if (!isValidGmail(emailTrim)) {
      setFormError('Please enter a valid Gmail address only (example: name@gmail.com).')
      return
    }
    if (trimmedQuery.length < 10) {
      setFormError('Please write at least 10 characters in your query.')
      return
    }
    setIsSubmitting(true)

    const message = `
    Name: ${formData.name}
Phone: ${trimmedPhone}
Email: ${emailTrim.toLowerCase()}
Address: ${formData.address}
Subject (order / dish / other): ${String(formData.topic || '').trim() || '—'}
Query: ${formData.query}
`;

    const encodedMessage = encodeURIComponent(message);

    // WHATSAPP API
const whatsappUrl = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodedMessage}`;

toast.success('OPENING WHATSAPP...', {
  style: {
    border: '2px solid #f59e0b',
    padding: '16px',
    color: '#fff',
    background: 'rgba(0,0,0,0.8)',
    backdropFilter: 'blur(1px)',
  },
  iconTheme: { primary: '#f59e0b', secondary: '#fff' },
});

window.open(whatsappUrl, '_blank');

toast.success('WhatsApp opened successfully.', {
  style: {
    border: '2px solid #22c55e',
    padding: '14px',
    color: '#fff',
    background: 'rgba(0,0,0,0.8)',
  },
});

setFormData({
  name: '',
  phone: '',
  email: '',
  address: '',
  topic: '',
  query: ''
});
setIsSubmitting(false)


  };

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'phone') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10)
      setFormData({ ...formData, [name]: digitsOnly })
      return
    }
    setFormData({ ...formData, [name]: value })
  }

  const handlePhonePaste = (e) => {
    e.preventDefault()
    const pasted = (e.clipboardData || window.clipboardData).getData('text') || ''
    const digits = pasted.replace(/\D/g, '').slice(0, 10)
    setFormData((prev) => ({ ...prev, phone: digits }))
  }


  return (
    <div className='min-h-screen bg-gradient-to-r from-orange-900 via-amber-900 to-gray-900 animate-gradient-x py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-6 font-[Poppins] relative overflow-hidden'>
      <Toaster position='top-center' reverseOrder={false} toastOptions={{ duration: 4000 }} />
      {/* ADDITIONAL DECORATIVE ELEMTN */}
      <div className='absolute top-20 left-10 w-24 h-24 bg-orange-500/20 rounded-full animate-float' />
      <div className='absolute bottom-40 right-20 w-16 h-16 bg-green-500/20 rounded-full animate-float-delayed' />

      <div className="max-w-7xl mx-auto relative z-10">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-center mb-8 animate-fade-in-down">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-300">
            Connect With Us
          </span>
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* CONTACT INFO SECTION */}
          <div className="space-y-6">

            <div className="relative bg-white/5 backdrop-blur-lg rounded-2xl p-6 shadow-2xl transform transition-all duration-300 hover:scale-[1.02] animate-card-float border-l-4 border-amber-500 hover:border-amber-400 group ">
              <div className=' absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl' />

              <div className='flex items-center mb-4 relative z-10'>
                <div className='p-3 bg-gradient-to-br from-amber-500/30 to-amber-700/30 rounded-xl'>
                  <FiMapPin className='text-amber-400 text-2xl animate-pulse' />
                </div>
                <h3 className='ml-4 text-amber-100 text-xl font-semibold'>Our Headquarter</h3>
              </div>
              <div className='pl-12 relative z-10'>
                <p className='text-amber-100 font-light text-lg'>
                  Ahmedabad, Gujarat
                </p>
              </div>
            </div>


            <div className="relative bg-white/5 backdrop-blur-lg rounded-2xl p-6 shadow-2xl transform transition-all duration-300 hover:scale-[1.02] animate-card-float border-l-4 border-green-500 hover:border-green-400 group ">
              <div className=' absolute inset-0 bg-gradient-to-r from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl' />

              <div className='flex items-center mb-4 relative z-10'>
                <div className='p-3 bg-gradient-to-br from-green-500/30 to-green-700/30 rounded-xl'>
                  <FiPhone className='text-green-400 text-2xl animate-pulse' />
                </div>
                <h3 className='ml-4 text-amber-100 text-xl font-semibold'>Contact Number</h3>
              </div>
              <div className='pl-12 relative space-y-2 z-10'>
                <p className='text-amber-100 font-light flex items-center'>
                  <FiGlobe className='text-green-400 text-xl mr-2' />
                  +91 9638979920
                </p>
              </div>
            </div>

            <div className="relative bg-white/5 backdrop-blur-lg rounded-2xl p-6 shadow-2xl transform transition-all duration-300 hover:scale-[1.02] animate-card-float border-l-4 border-orange-500 hover:border-orange-400 group ">
              <div className=' absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl' />

              <div className='flex items-center mb-4 relative z-10'>
                <div className='p-3 bg-gradient-to-br from-orange-500/30 to-orange-700/30 rounded-xl'>
                  <FiMail className='text-orange-400 text-2xl animate-pulse' />
                </div>
                <h3 className='ml-4 text-orange-100 text-xl font-semibold'>Email Address</h3>
              </div>
              <div className='pl-12 relative z-10'>
                <p className='text-amber-100 font-light text-lg'>
                  patelkhush088@gmail.com
                </p>
              </div>
            </div>

          </div>

          {/* CONTACT FORM */}
          <div className="relative bg-white/5 backdrop-blur-lg rounded-2xl p-6 shadow-2xl animate-slide-in-right border-2 border-amber-500/30 hover:border-amber-500/50 transform-border duration-300">
            <div className='absolute -top-4 -right-4 w-12 h-12 bg-amber-500/30 rounded-full animate-ping-slow' />

            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              {contactFormFields.map(({ label, name, type, placeholder, pattern, Icon, required: fieldRequired }) => (
                <div key={name}>
                  <label className="block text-amber-100 text-sm font-medium mb-2">
                    {label}
                  </label>

                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                      <Icon className="text-amber-500 text-xl animate-pulse" />
                    </div>

                    <input
                      type={type}
                      value={formData[name]}
                      onChange={handleChange}
                      onPaste={name === 'phone' ? handlePhonePaste : undefined}
                      name={name}
                      inputMode={name === 'phone' ? 'numeric' : name === 'email' ? 'email' : undefined}
                      autoComplete={name === 'phone' ? 'tel' : name === 'email' ? 'email' : undefined}
                      maxLength={name === 'phone' ? 10 : name === 'email' ? 254 : undefined}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border-2 border-amber-500/30 rounded-xl text-amber-50 focus:ring-2 focus:ring-amber-500 focus:border-transparent placeholder-amber-200/50"
                      placeholder={placeholder}
                      pattern={pattern}
                      title={name === 'phone' ? 'Exactly 10 digits, numbers only' : name === 'email' ? 'Valid Gmail address: name@gmail.com' : undefined}
                      required={fieldRequired !== false}
                    />
                  </div>
                </div>
              ))}
              <div>
                <label className="block text-amber-100 text-sm font-medium mb-2">
                  Your Query
                </label>

                <div className="relative">
                  <div className="absolute left-3 top-4">
                    <FiMessageSquare className="text-amber-500 text-xl animate-pulse" />
                  </div>

                  <textarea
                    rows="4"
                    name="query"
                    value={formData.query}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border-2 border-amber-500/30 rounded-xl text-amber-50 focus:ring-2 focus:ring-amber-500 focus:border-transparent placeholder-amber-200/50"
                    placeholder="Ask about an order, menu item, delivery, or anything else…"
                    required>
                  </textarea>
                </div>
              </div>

              {!!formError && (
                <p className="rounded-lg border border-red-500/40 bg-red-900/20 px-3 py-2 text-sm text-red-200">
                  {formError}
                </p>
              )}

              <button
                type='submit'
                disabled={isSubmitting}
                className='w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-amber-500/20 flex items-center justify-center space-x-2 group disabled:opacity-70 disabled:cursor-not-allowed'
              >
                <span>{isSubmitting ? 'Sending...' : 'Submit Query'}</span>
                <FiArrowRight className='w-5 h-5 group-hover:translate-x-1 transition-transform' />
              </button>

            </form>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-amber-500/25 bg-white/5 px-4 py-3 text-sm text-amber-100/90">
            Avg response time: <span className="text-amber-300 font-semibold">under 10 minutes</span>
          </div>
          <div className="rounded-xl border border-amber-500/25 bg-white/5 px-4 py-3 text-sm text-amber-100/90">
            Support hours: <span className="text-amber-300 font-semibold">10:00 AM - 10:00 PM</span>
          </div>
          <div className="rounded-xl border border-amber-500/25 bg-white/5 px-4 py-3 text-sm text-amber-100/90">
            Your details are <span className="text-amber-300 font-semibold">safe & confidential</span>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Contact
