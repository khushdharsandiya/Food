import itemModal from "../Modals/itemModal.js";

export const createItem = async (req, res, next) => {
    try {
        const { name, description, category, price, rating, hearts, imageUrl: imageUrlFromBody, inStock } = req.body;

        // Prefer explicit URL from body; fall back to uploaded file if present.
        let imageUrl = '';
        if (imageUrlFromBody && String(imageUrlFromBody).trim()) {
            imageUrl = String(imageUrlFromBody).trim();
        } else if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`;
        }

        const total = Number(price) * 1;
        const normalizedInStock = String(inStock ?? 'true').toLowerCase() !== 'false';

        const newItem = new itemModal({
            name,
            description,
            category,
            price,
            rating,
            hearts,
            imageUrl,
            total,
            inStock: normalizedInStock,
        });

        const saved = await newItem.save();
        res.status(201).json(saved);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Item name already exists." });
        }
        next(error);
    }
}


// GET FUNCTION TO GET ALL ITEMS
export const getItems = async (_req, res, next) => {
    try {
        const items = await itemModal.find().sort({ createdAt: -1 });
        const host = `${_req.protocol}://${_req.get('host')}`;

        const resolveImageUrl = (url) => {
            if (!url) return '';
            if (/^https?:\/\//i.test(url)) return url;
            return host + url;
        };
        const withFullUrl = items.map(i => ({
            ...i.toObject(),
            imageUrl: resolveImageUrl(i.imageUrl),
        }))
        res.json(withFullUrl)
    }
    catch (err) {
        next(err);
    }
}

// PATCH stock availability (in/out of stock)
export const updateItemStock = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { inStock } = req.body;
        const normalizedInStock = String(inStock ?? 'true').toLowerCase() !== 'false';

        const updated = await itemModal.findByIdAndUpdate(
            id,
            { $set: { inStock: normalizedInStock } },
            { new: true }
        );

        if (!updated) return res.status(404).json({ message: 'Item not found' });
        res.json(updated);
    } catch (err) {
        next(err);
    }
}

// DELETE FUNCTION TO DELETE ITEMS
export const deleteItem = async (req, res, next) => {
    try {
        const removed = await itemModal.findByIdAndDelete(req.params.id);
        if (!removed) return res.status(404).json({ message: "Item not found" })
        res.status(204).end()
    }
    catch (err) {
        next(err);
    }
}
