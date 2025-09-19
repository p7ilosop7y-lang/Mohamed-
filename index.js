// imports
const cloudinary = require('cloudinary').v2;
const express = require('express');
const cors = require('cors');

// قم بإعداد حسابك في Cloudinary باستخدام متغيرات البيئة
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const app = express();
app.use(cors());
app.use(express.json());

// قم بإنشاء نقطة نهاية (endpoint) للتعامل مع طلبات الحذف
app.post('/delete-image', async (req, res) => {
  const { publicId } = req.body;

  if (!publicId) {
    return res.status(400).json({ error: 'Public ID is required.' });
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result === 'ok') {
      res.status(200).json({ message: 'Image deleted successfully.' });
    } else {
      res.status(404).json({ error: 'Image not found.' });
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Failed to delete image.' });
  }
});

// تصدير التطبيق للاستخدام كـ "serverless function"
module.exports = app;
