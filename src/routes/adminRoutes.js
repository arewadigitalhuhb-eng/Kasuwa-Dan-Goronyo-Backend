const express = require('express');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard', protect, authorize('admin', 'owner', 'manager'), async (req, res, next) => {
  try {
    const [productCount, saleCount, totalRevenue, lowStockProducts, recentSales] = await Promise.all([
      Product.countDocuments({ status: 'active' }),
      Sale.countDocuments(),
      Sale.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: '$total' },
          },
        },
      ]),
      Product.find({ quantity: { $lte: 10 } }).limit(10),
      Sale.find({}).sort({ createdAt: -1 }).limit(5).populate('customer'),
    ]);

    res.json({
      summary: {
        products: productCount,
        sales: saleCount,
        revenue: totalRevenue[0]?.total || 0,
        lowStockProducts: lowStockProducts.length,
      },
      recentSales,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
