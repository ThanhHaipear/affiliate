# Affiliate Marketplace Backend API

## Run locally
1. `npm install`
2. `npx prisma generate`
3. `npx prisma migrate dev`
4. `npm run prisma:seed`
5. `npm run bootstrap:admin`
6. `npm run dev`

## Environment
Add Cloudinary config to `.env` before using upload API:

```env
UPLOAD_MAX_FILE_SIZE_MB=5
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=affiliate-marketplace
```

## Smoke test
Run with server already started:
1. `npm run smoke:test`

Default admin test account created by bootstrap:
- `email: admin.test@example.com`
- `password: 123456`

## Base URL
- Local: `http://localhost:4000/api`

## Auth rules
- `Public`: no token required.
- `Auth`: requires `Authorization: Bearer <accessToken>`.
- `CUSTOMER`, `ADMIN`, `SELLER`, `AFFILIATE`: requires authenticated account with that role.

## Account identity
- email is the unique login and recovery identity for one account.
- phone is profile information only and may be reused across multiple accounts.

## Response conventions
- `200 OK`: read/update success.
- `201 Created`: create success.
- `304 Not Modified`: browser reused cache, response body is empty.
- Standard JSON shape:

```json
{
  "success": true,
  "message": "Readable message",
  "data": {}
}
```

## Endpoint inventory

### Auth
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Public | Register `CUSTOMER`, `SELLER`, or `AFFILIATE`. |
| POST | `/api/auth/login` | Public | Login with email plus password. |
| POST | `/api/auth/refresh-token` | Public | Refresh access token using refresh token. |
| POST | `/api/auth/logout` | Public | Logout current session. |
| POST | `/api/auth/forgot-password` | Public | Reset password by email plus new password. |
| POST | `/api/auth/change-password` | Auth | Change password for current account. |
| POST | `/api/auth/enroll-affiliate` | Auth | Add `AFFILIATE` role onto current logged-in customer account. |

### Admin
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/api/admin/dashboard` | ADMIN | Dashboard stats and pending review overview. |
| GET | `/api/admin/accounts` | ADMIN | List accounts with filtering. |
| PATCH | `/api/admin/accounts/:accountId/lock` | ADMIN | Lock an account. |
| PATCH | `/api/admin/accounts/:accountId/unlock` | ADMIN | Unlock an account. |
| GET | `/api/admin/orders` | ADMIN | List orders for monitoring. |
| GET | `/api/admin/fraud-alerts` | ADMIN | List fraud alerts / suspicious activities. |
| GET | `/api/admin/settings` | ADMIN | Read current platform settings. |
| PUT | `/api/admin/settings/platform-fee` | ADMIN | Update default platform fee. |
| PATCH | `/api/admin/sellers/:sellerId/review` | ADMIN | Approve or reject seller. |
| PATCH | `/api/admin/affiliates/:affiliateId/review` | ADMIN | Approve or reject affiliate. |
| PATCH | `/api/admin/products/:productId/review` | ADMIN | Approve or reject product. |
| PATCH | `/api/admin/product-affiliate-settings/:settingId/review` | ADMIN | Approve or reject affiliate setting for a product. |

### Customer profile
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/api/users/profile` | CUSTOMER | Get current customer profile. |
| PUT | `/api/users/profile` | CUSTOMER | Update current customer profile. |

### Customer addresses
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/api/customer-addresses` | Auth | List current user's shipping addresses. |
| POST | `/api/customer-addresses` | Auth | Create shipping address. |
| PUT | `/api/customer-addresses/:addressId` | Auth | Update shipping address. |
| PATCH | `/api/customer-addresses/:addressId/default` | Auth | Set one address as default. |
| DELETE | `/api/customer-addresses/:addressId` | Auth | Delete shipping address. |

### Seller
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/api/seller/profile` | SELLER | Get seller profile, KYC, payment accounts. |
| PUT | `/api/seller/profile` | SELLER | Update seller profile. |
| POST | `/api/seller/kyc` | SELLER | Submit or resubmit seller KYC. |
| POST | `/api/seller/payment-accounts` | SELLER | Add seller payment account. |
| GET | `/api/seller/products` | SELLER | List seller products. |
| GET | `/api/seller/products/:productId` | SELLER | Get one seller product detail. |
| GET | `/api/seller/affiliate-settings` | SELLER | List product affiliate settings. |
| PUT | `/api/seller/products/:productId/affiliate-setting` | SELLER | Create or update affiliate commission setting for a product. |

### Affiliate
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/api/affiliate/profile` | AFFILIATE | Get affiliate profile, channels, payment accounts, KYC. |
| PUT | `/api/affiliate/profile` | AFFILIATE | Update affiliate profile, primary channel, default payment account, phone, avatar URL. |
| POST | `/api/affiliate/kyc` | AFFILIATE | Submit or resubmit affiliate KYC. |
| POST | `/api/affiliate/channels` | AFFILIATE | Add affiliate channel. |
| POST | `/api/affiliate/payment-accounts` | AFFILIATE | Add affiliate payment account. |
| GET | `/api/affiliate/stats` | AFFILIATE | Get affiliate dashboard stats. |

### Products
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/api/products` | Public | List public products. |
| GET | `/api/products/:productId` | Public | Get product detail. |
| POST | `/api/products` | SELLER | Create product. |
| PUT | `/api/products/:productId` | SELLER | Update product and replace images/variants in DB. |

### Uploads
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/api/uploads/images` | ADMIN, SELLER, AFFILIATE | Upload one or more images to Cloudinary and return `url` / `publicId`. Use returned URL in products, avatar, or KYC docs. |

### Tracking / affiliate links
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/api/tracking/links` | AFFILIATE | List current affiliate's generated links. |
| POST | `/api/tracking/links` | AFFILIATE | Create affiliate tracking link for a product. If same product was revoked before, endpoint reactivates old link. |
| PATCH | `/api/tracking/links/:linkId/revoke` | AFFILIATE | Revoke affiliate link. Revoked links stop recording new clicks. |
| POST | `/api/tracking/clicks` | Public | Record click for a short code and return attribution token/session. |

### Cart
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/api/cart` | Auth | Get current user's cart. |
| POST | `/api/cart/items` | Auth | Add item to cart. |
| PUT | `/api/cart/items/:itemId` | Auth | Update cart item quantity. |
| DELETE | `/api/cart/items/:itemId` | Auth | Remove item from cart. |
| POST | `/api/cart/checkout` | Auth | Checkout current cart into one or more orders. |

### Orders
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/api/orders` | Auth | List current user's orders. |
| GET | `/api/orders/:orderId` | Auth | Get order detail. |

### Payments
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/api/payments/:orderId/seller-confirm` | SELLER | Seller confirms money received, unlocking commission flow. |
| POST | `/api/payments/:orderId/refund` | Auth | Refund an order. |

### Commissions
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/api/commissions/me` | Auth | List current user's commissions. |

### Wallets
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/api/wallets/me` | Auth | Get current user's wallets. |

### Withdrawals
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/api/withdrawals/me` | Auth | List current user's withdrawals. |
| POST | `/api/withdrawals` | Auth | Create withdrawal request. |
| GET | `/api/withdrawals/pending/list` | ADMIN | List pending withdrawals. |

### Payout batches
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/api/payout-batches` | ADMIN | List payout batches. |
| POST | `/api/payout-batches` | ADMIN | Create payout batch from pending withdrawals. |
| POST | `/api/payout-batches/:batchId/process` | ADMIN | Process payout batch. |

### Notifications
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/api/notifications` | Auth | List notifications for current user. Supports query `audience=customer|affiliate`. |
| POST | `/api/notifications/read-all` | Auth | Mark all notifications as read. Supports query `audience=customer|affiliate`. |
| POST | `/api/notifications/:notificationId/read` | Auth | Mark one notification as read. |

## Upload flow
1. Call `POST /api/uploads/images` with `multipart/form-data`.
2. Send `file` for one image or `files` for multiple images.
3. Optionally send `scope` as `product`, `avatar`, or `kyc`.
4. Take `data.url` from response and save it into the normal JSON APIs below.

Example upload response:
```json
{
  "success": true,
  "message": "Images uploaded",
  "data": [
    {
      "url": "https://res.cloudinary.com/demo/image/upload/v1/affiliate-marketplace/products/demo.jpg",
      "publicId": "affiliate-marketplace/products/demo",
      "width": 1200,
      "height": 1200,
      "format": "jpg",
      "bytes": 345678,
      "originalName": "demo.jpg"
    }
  ]
}
```

## Database mapping for uploaded URLs
- `products.images[].url` -> table `product_images.url`
- `affiliate.avatarUrl` -> table `affiliates.avatar_url`
- `customer.avatarUrl` -> table `customer_profiles.avatar_url`
- `seller/affiliate kyc documentUrls[]` -> table `kyc_documents.file_url`

## Example request bodies

### Register customer
```json
{
  "email": "customer@example.com",
  "phone": "0901234566",
  "password": "12345678",
  "role": "CUSTOMER",
  "fullName": "Le Van C"
}
```

### Register seller
```json
{
  "email": "seller@example.com",
  "phone": "0901234567",
  "password": "12345678",
  "role": "SELLER",
  "fullName": "Nguyen Van A",
  "businessName": "Thoi trang va phu kien",
  "shopName": "A Shop",
  "paymentMethod": "BANK_TRANSFER",
  "bankName": "VCB",
  "bankAccountName": "Nguyen Van A",
  "bankAccountNumber": "123456789"
}
```

### Register affiliate
```json
{
  "email": "affiliate@example.com",
  "phone": "0901234568",
  "password": "12345678",
  "role": "AFFILIATE",
  "fullName": "Tran Thi B",
  "businessName": "Content Creator",
  "channelName": "Review Daily",
  "paymentMethod": "BANK_TRANSFER",
  "bankName": "ACB",
  "bankAccountName": "Tran Thi B",
  "bankAccountNumber": "987654321"
}
```

### Login
```json
{
  "email": "admin.test@example.com",
  "password": "123456"
}
```

### Refresh token
```json
{
  "refreshToken": "<refresh-token>"
}
```

### Forgot password
```json
{
  "email": "customer@example.com",
  "newPassword": "12345678"
}
```

### Change password
```json
{
  "currentPassword": "123456",
  "newPassword": "12345678"
}
```

### Enroll affiliate on current customer account
```json
{
  "fullName": "Tran Thi B",
  "businessName": "Content Creator",
  "channelName": "Review Daily",
  "paymentMethod": "MoMo",
  "bankAccountName": "Tran Thi B",
  "bankAccountNumber": "0901234568"
}
```

### Update customer profile
```json
{
  "fullName": "Customer Test",
  "phone": "03796894089"
}
```

### Create customer address
```json
{
  "recipientName": "Tran Thi B",
  "phone": "0900000000",
  "province": "Ho Chi Minh",
  "district": "Quan 1",
  "ward": "Ben Nghe",
  "detail": "123 Nguyen Hue",
  "isDefault": true
}
```

### Update seller profile
```json
{
  "shopName": "A Shop",
  "email": "seller@example.com",
  "phone": "0901234567",
  "address": "123 Nguyen Trai, Q1, HCM",
  "businessField": "Fashion",
  "shopDescription": "Lifestyle fashion store",
  "taxCode": "0312345678"
}
```

### Submit seller KYC
```json
{
  "documentType": "CCCD",
  "documentNumber": "079123456789",
  "fullNameOnDocument": "Nguyen Van A",
  "permanentAddress": "HCM City",
  "issuedPlace": "Cuc canh sat QLHC",
  "documentUrls": [
    "https://res.cloudinary.com/demo/image/upload/v1/affiliate-marketplace/kyc/seller-kyc-front.jpg",
    "https://res.cloudinary.com/demo/image/upload/v1/affiliate-marketplace/kyc/seller-kyc-back.jpg"
  ]
}
```

### Update affiliate profile
```json
{
  "fullName": "Tran Thi B",
  "phone": "0901234568",
  "avatarUrl": "https://res.cloudinary.com/demo/image/upload/v1/affiliate-marketplace/avatars/avatar.jpg",
  "channelPlatform": "TikTok",
  "channelUrl": "https://www.tiktok.com/@reviewdaily",
  "channelDescription": "Review do gia dung",
  "paymentType": "BANK_TRANSFER",
  "paymentAccountName": "Tran Thi B",
  "paymentAccountNumber": "987654321",
  "paymentBankName": "ACB",
  "paymentBranch": "Da Nang"
}
```

### Submit affiliate KYC
```json
{
  "documentType": "CCCD",
  "documentNumber": "079123456780",
  "fullNameOnDocument": "Tran Thi B",
  "permanentAddress": "Da Nang",
  "nationality": "Vietnam",
  "documentUrls": [
    "https://res.cloudinary.com/demo/image/upload/v1/affiliate-marketplace/kyc/affiliate-kyc-front.jpg",
    "https://res.cloudinary.com/demo/image/upload/v1/affiliate-marketplace/kyc/affiliate-kyc-back.jpg"
  ]
}
```

### Create product
```json
{
  "categoryId": 1,
  "name": "Product A",
  "slug": "product-a",
  "description": "Product description",
  "basePrice": 250000,
  "images": [
    {
      "url": "https://res.cloudinary.com/demo/image/upload/v1/affiliate-marketplace/products/product-1.jpg",
      "sortOrder": 1
    }
  ],
  "variants": [
    {
      "sku": "SKU-001",
      "variantName": "Default",
      "options": {
        "size": "M",
        "color": "black"
      },
      "price": 250000,
      "quantity": 100
    }
  ]
}
```

### Create affiliate link
```json
{
  "productId": 12
}
```

### Track click
```json
{
  "shortCode": "AB12CD34",
  "viewerId": 22,
  "referrer": "https://facebook.com",
  "deviceId": "browser-001"
}
```

### Add cart item
```json
{
  "productId": 12,
  "variantId": 41,
  "quantity": 2,
  "attributionToken": "ATTRIBUTIONTOKEN"
}
```

### Update cart item quantity
```json
{
  "quantity": 3
}
```

### Checkout
```json
{
  "addressId": 5,
  "selectedItemIds": [11, 12],
  "shippingFee": 30000,
  "discountAmount": 0,
  "buyerName": "Tran Thi B",
  "buyerEmail": "buyer@example.com",
  "buyerPhone": "0900000000",
  "shippingMethod": "STANDARD",
  "paymentMethod": "BANK_TRANSFER"
}
```


