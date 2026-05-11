import React, { useEffect, useState } from 'react'
import { styles } from '../assets/dummyadmin'
import adminClient from '../api/adminClient'
import { FiHeart, FiSearch, FiStar, FiTrash2, FiToggleLeft, FiToggleRight } from 'react-icons/fi'

const List = () => {

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const { data } = await adminClient.get('/api/items')
        const list = Array.isArray(data) ? data : data?.items ?? []
        setItems(list)
      } catch (err) {
        console.error('Error fetching items:', err)
        setItems([])
      } finally {
        setLoading(false)
      }
    }
    fetchItems()
  }, [])

  //DELETE ITEMS
  const handleDelete = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      await adminClient.delete(`/api/items/${itemId}`);
      setItems(prev => prev.filter(item => item._id !== itemId));
      console.log('Delete item Id:', itemId)
    } catch (err) {
      console.log('Error deleting item:', err);
    }
  }

  const handleToggleStock = async (item) => {
    try {
      const { data } = await adminClient.patch(`/api/items/${item._id}/stock`, {
        inStock: !item.inStock,
      });
      setItems(prev => prev.map(it => it._id === item._id ? data : it));
    } catch (err) {
      console.log('Error updating stock:', err);
      alert('Stock update failed, please try again.');
    }
  }

  const renderStars = (rating) => (
    [...Array(5)].map((_, i) => (
      <FiStar
        key={i}
        className={`text-xl ${i < rating
          ? 'text-amber-400 fill-current'
          : 'text-amber-100/30'
          }`}
      />
    ))
  );

  if (loading) {
    return (
      <div
        className={styles.pageWrapper
          .replace(/bg-gradient-to-br.*/, '')
          .concat(' flex items-center justify-center text-amber-100')}
      >
        Loading Menu...
      </div>
    );
  }

  const filteredItems = items.filter((item) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      String(item.name || '').toLowerCase().includes(q) ||
      String(item.category || '').toLowerCase().includes(q) ||
      String(item.description || '').toLowerCase().includes(q)
    )
  })


  return (
    <div className={styles.pageWrapper}>
      <div className="max-w-7xl mx-auto">
        <div className={styles.cardContainer}>
          <h2 className={styles.title}>Manage Menu Items</h2>

          <div className='mb-6'>
            <div className='relative max-w-md'>
              <FiSearch className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-amber-400/80' />
              <input
                type='text'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder='Search by name, category, description...'
                className='w-full rounded-xl border border-amber-500/30 bg-[#3a2b2b]/60 py-2.5 pl-10 pr-4 text-amber-100 placeholder:text-amber-300/60 focus:outline-none focus:border-amber-400'
              />
            </div>
            <p className='mt-2 text-xs text-amber-200/70'>Showing {filteredItems.length} of {items.length} items</p>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr>
                  <th className={styles.th}>Image</th>
                  <th className={styles.th}>Name</th>
                  <th className={styles.th}>Category</th>
                  <th className={styles.th}>Price (₹)</th>
                  <th className={styles.th}>Rating</th>
                  <th className={styles.th}>Hearts</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.thCenter}>Delete</th>
                </tr>
              </thead>

              <tbody>
                {filteredItems.map(item => (
                  <tr key={item._id} className={styles.tr}>
                    <td className={styles.imgCell}>
                      <img src={item.imageUrl} alt={item.name}
                        className={styles.img} />
                    </td>

                    <td className={styles.nameCell}>
                      <div className='space-y-1'>
                        <p className={styles.nameText}>{item.name}</p>
                        <p className={styles.descText}>{item.description}</p>
                      </div>
                    </td>

                    <td className={styles.categoryCell}>{item.category}</td>
                    <td className={styles.priceCell}>₹{item.price}</td>
                    <td className={styles.ratingCell}>
                      <div className='flex gap-1'>
                        {renderStars(item.rating)}
                      </div>
                    </td>

                    <td className={styles.heartsCell}>
                      <div className={styles.heartsWrapper}>
                        <FiHeart className='text-xl' />
                        <span>{item.hearts}</span>
                      </div>
                    </td>

                    <td className='p-4'>
                      <button
                        type="button"
                        onClick={() => handleToggleStock(item)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border 
                        ${item.inStock
                            ? 'bg-emerald-900/30 border-emerald-500/60 text-emerald-200'
                            : 'bg-rose-900/30 border-rose-500/60 text-rose-200'
                        }`}
                      >
                        {item.inStock ? (
                          <>
                            <FiToggleRight className="text-emerald-400" />
                            <span>In stock</span>
                          </>
                        ) : (
                          <>
                            <FiToggleLeft className="text-rose-400" />
                            <span>Out of stock</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className='p-4 text-center'>
                      <button onClick={() => handleDelete(item._id)}
                        className={styles.deleteBtn}>
                        <FiTrash2 className='text-2xl' />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredItems.length === 0 && (
            <div className={styles.emptyState}>
              No items found for this search
            </div>
          )}
        </div>
      </div>
    </div>

  )
}

export default List