const express = require("express");

const authRoutes = require("../modules/auth/auth.routes");
const adminRoutes = require("../modules/admin/admin.routes");
const sellerRoutes = require("../modules/seller/seller.routes");
const affiliateRoutes = require("../modules/affiliate/affiliate.routes");
const userRoutes = require("../modules/user/user.routes");
const productRoutes = require("../modules/product/product.routes");
const trackingRoutes = require("../modules/tracking/tracking.routes");
const cartRoutes = require("../modules/cart/cart.routes");
const orderRoutes = require("../modules/order/order.routes");
const paymentRoutes = require("../modules/payment/payment.routes");
const commissionRoutes = require("../modules/commission/commission.routes");
const walletRoutes = require("../modules/wallet/wallet.routes");
const withdrawalRoutes = require("../modules/withdrawal/withdrawal.routes");
const payoutRoutes = require("../modules/payout/payout.routes");
const notificationRoutes = require("../modules/notification/notification.routes");
const uploadRoutes = require("../modules/upload/upload.routes");
const customerAddressRoutes = require("../modules/customer-address/customer-address.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/seller", sellerRoutes);
router.use("/affiliate", affiliateRoutes);
router.use("/users", userRoutes);
router.use("/products", productRoutes);
router.use("/tracking", trackingRoutes);
router.use("/cart", cartRoutes);
router.use("/orders", orderRoutes);
router.use("/payments", paymentRoutes);
router.use("/commissions", commissionRoutes);
router.use("/wallets", walletRoutes);
router.use("/withdrawals", withdrawalRoutes);
router.use("/payout-batches", payoutRoutes);
router.use("/notifications", notificationRoutes);
router.use("/uploads", uploadRoutes);
router.use("/customer-addresses", customerAddressRoutes);

module.exports = router;
