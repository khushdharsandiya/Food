import React, { useState } from 'react'
import { styles } from '../assets/dummyadmin';
import { FiHeart, FiStar, FiUpload } from 'react-icons/fi';
import adminClient from '../api/adminClient';
import { FaRupeeSign } from 'react-icons/fa';

const AddItems = () => {

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: '',
        price: '',
        rating: 0,
        hearts: 0,
        total: 0,
        image: null,
        imageUrl: '',
        preview: ''
    });
    const [categories] = useState([
        'Breakfast', 'Lunch', 'Dinner', 'Mexican', 'Italian', 'Desserts', 'Drinks'
    ])
    const [hoverRating, setHoverRating] = useState(0);

    const handleInputChange = e => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleImageUpload = e => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({
                ...prev,
                image: file,
                // Choosing a file clears URL mode
                imageUrl: '',
                preview: URL.createObjectURL(file)
            }))
        }
    }

    const handleRating = rating => setFormData(prev => ({ ...prev, rating }));

    const handleHearts = () => setFormData(prev => ({ ...prev, hearts: prev.hearts + 1 }))

    const handleSubmit = async e => {
        e.preventDefault();
        try {
            const payload = new FormData();
            Object.entries(formData).forEach(([key, val]) => {
                if (key === 'preview') return;
                // If imageUrl is set, file upload is optional
                if (key === 'image' && !val) return;
                payload.append(key, val);
            });

            await adminClient.post('/api/items', payload);

            setFormData({
                name: '',
                description: '',
                category: '',
                price: '',
                rating: 0,
                hearts: 0,
                total: 0,
                image: null,
                imageUrl: '',
                preview: ''
            })
        } catch (err) {
            console.log('Error uploading item:', err.response || err.message);
        }
    }

    return (
        <div className={styles.formWrapper}>
            <div className="max-w-4xl mx-auto">
                <div className={styles.formCard}>
                    <h2 className={styles.formTitle}>Add New Menu Item</h2>

                    <form className="space-y-6 sm:space-y-8" onSubmit={handleSubmit}>
                        <div className={styles.uploadWrapper}>
                            <label className={styles.uploadLabel}>
                                {formData.preview ? (
                                    <img
                                        src={formData.preview}
                                        alt="Preview"
                                        className={styles.previewImage}
                                    />
                                ) : (
                                    <div className="text-center p-4">
                                        <FiUpload className={styles.uploadIcon} />
                                        <p className={styles.uploadText}>Click to upload product image (optional)</p>
                                        <p className="text-xs text-amber-200/60 mt-1">
                                            Or paste a direct image URL below
                                        </p>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                />
                            </label>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block mb-2 text-base sm:text-lg text-amber-400">
                                    Product Name
                                </label>
                                <input type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className={styles.inputField}
                                    placeholder="Enter Product Name"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block mb-2 text-base sm:text-lg text-amber-400">
                                    Image URL (optional)
                                </label>
                                <input
                                    type="url"
                                    name="imageUrl"
                                    value={formData.imageUrl}
                                    onChange={e => {
                                        handleInputChange(e);
                                        // URL mode: clear file and use URL as preview
                                        if (e.target.value) {
                                            setFormData(prev => ({
                                                ...prev,
                                                image: null,
                                                preview: e.target.value
                                            }));
                                        }
                                    }}
                                    className={styles.inputField}
                                    placeholder="Paste direct image URL (e.g. https://...jpg)"
                                />
                                <p className="mt-1 text-xs text-amber-200/60">
                                    Paste a <span className="font-semibold">direct image</span> URL (e.g. from Google or Unsplash).
                                </p>
                            </div>

                            <div>
                                <label className="block mb-2 text-base sm:text-lg text-amber-400">
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    className={styles.inputField + ' h-32 sm:h-40'}
                                    placeholder="Enter Product Description"
                                    required />
                            </div>

                            <div className={styles.gridTwoCols}>
                                <div>
                                    <label className="block mb-2 text-base sm:text-lg text-amber-400">
                                        Category
                                    </label>

                                    <select
                                        name="category"
                                        value={formData.category}
                                        onChange={handleInputChange}
                                        className={styles.inputField}
                                        required
                                    >
                                        <option value="">Select Category</option>

                                        {categories.map((c) => (
                                            <option key={c} value={c} className="bg-[#3a2b2b]">
                                                {c}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-2 text-base sm:text-lg text-amber-400">
                                        Price (₹)
                                    </label>
                                    <div className={styles.relativeInput}>
                                        <FaRupeeSign className={styles.rupeeIcon} />
                                        <input type="number" name='price'
                                            value={formData.price}
                                            onChange={handleInputChange} className={styles.inputField + ' pl-10 sm:pl-12 '}
                                            placeholder='Enter Price'
                                            min='0'
                                            step='0.01'
                                            required />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.gridTwoCols}>
                                <div>
                                    <label className='block mb-2 text-base sm:text-lg text-amber-400'>
                                        Rating
                                    </label>
                                    <div className='flex gap-2'>
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button key={star} type='button' onClick={() => handleRating(star)}
                                                onMouseEnter={() => setHoverRating(star)}
                                                onMouseLeave={() => setHoverRating(0)}
                                                className='text-2xl sm:text-3xl transition-transform hover:scale-110'>
                                                <FiStar className={star <= (hoverRating || formData.rating) ? 'text-amber-400 fill-current' : 'text-amber-100/30'} />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block mb-2 text-base sm:text-lg text-amber-400">
                                        Popularity
                                    </label>

                                    <div className="flex items-center gap-3 sm:gap-4">
                                        <button
                                            type="button"
                                            onClick={handleHearts}
                                            className="text-2xl sm:text-3xl text-amber-400 hover:text-amber-300 transition-colors animate-pulse"
                                        >
                                            <FiHeart />
                                        </button>

                                        <input
                                            type="number"
                                            name="hearts"
                                            value={formData.hearts}
                                            onChange={handleInputChange}
                                            className={styles.inputField + ' pl-10 sm:pl-12'}
                                            placeholder="Enter Likes"
                                            min="0"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className={styles.actionBtn}>
                                Add To Menu
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

    )
}

export default AddItems


