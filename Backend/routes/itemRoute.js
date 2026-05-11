import express from 'express'
import multer from 'multer'
import { createItem, getItems, deleteItem, updateItemStock } from '../Controllers/itemController.js'
import adminAuthMiddleware from '../middleware/adminAuth.js'

const itemRouter = express.Router()

// TYPE HERE MULTER FUNCTION TO STORE IMAGE
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, 'uploads/'),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
})

const upload = multer({ storage });

itemRouter.get('/', getItems);
itemRouter.post('/', adminAuthMiddleware, upload.single('image'), createItem);
itemRouter.delete('/:id', adminAuthMiddleware, deleteItem);
itemRouter.patch('/:id/stock', adminAuthMiddleware, updateItemStock);

export default itemRouter
