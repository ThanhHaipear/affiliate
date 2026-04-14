const prisma = require("../../config/prisma");

async function findOwnedAddress(tx, accountId, addressId) {
  const rows = await tx.$queryRaw`
    SELECT
      id,
      account_id AS accountId,
      recipient_name AS recipientName,
      phone,
      province,
      district,
      ward,
      detail,
      is_default AS isDefault,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM customer_addresses
    WHERE id = ${BigInt(addressId)} AND account_id = ${accountId}
    LIMIT 1
  `;

  const address = rows[0] || null;
  if (!address) {
    throw new Error("Address not found");
  }

  return address;
}

exports.listAddresses = (accountId) => prisma.$queryRaw`
  SELECT
    id,
    account_id AS accountId,
    recipient_name AS recipientName,
    phone,
    province,
    district,
    ward,
    detail,
    is_default AS isDefault,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM customer_addresses
  WHERE account_id = ${accountId}
  ORDER BY is_default DESC, updated_at DESC, created_at DESC
`;

exports.createAddress = (accountId, payload) => prisma.$transaction(async (tx) => {
  const countRows = await tx.$queryRaw`SELECT COUNT(*) AS total FROM customer_addresses WHERE account_id = ${accountId}`;
  const count = Number(countRows[0]?.total || 0);
  const nextIsDefault = payload.isDefault || count === 0;

  if (nextIsDefault) {
    await tx.$executeRaw`
      UPDATE customer_addresses
      SET is_default = false, updated_at = NOW()
      WHERE account_id = ${accountId} AND is_default = true
    `;
  }

  await tx.$executeRaw`
    INSERT INTO customer_addresses (
      account_id,
      recipient_name,
      phone,
      province,
      district,
      ward,
      detail,
      is_default,
      created_at,
      updated_at
    ) VALUES (
      ${accountId},
      ${payload.recipientName},
      ${payload.phone},
      ${payload.province},
      ${payload.district},
      ${payload.ward},
      ${payload.detail},
      ${nextIsDefault},
      NOW(),
      NOW()
    )
  `;

  const inserted = await tx.$queryRaw`SELECT LAST_INSERT_ID() AS id`;
  return findOwnedAddress(tx, accountId, inserted[0].id);
});

exports.updateAddress = (accountId, addressId, payload) => prisma.$transaction(async (tx) => {
  const existing = await findOwnedAddress(tx, accountId, addressId);
  const nextIsDefault = payload.isDefault || Boolean(existing.isDefault);

  if (nextIsDefault) {
    await tx.$executeRaw`
      UPDATE customer_addresses
      SET is_default = false, updated_at = NOW()
      WHERE account_id = ${accountId} AND is_default = true AND id <> ${existing.id}
    `;
  }

  await tx.$executeRaw`
    UPDATE customer_addresses
    SET
      recipient_name = ${payload.recipientName},
      phone = ${payload.phone},
      province = ${payload.province},
      district = ${payload.district},
      ward = ${payload.ward},
      detail = ${payload.detail},
      is_default = ${nextIsDefault},
      updated_at = NOW()
    WHERE id = ${existing.id}
  `;

  return findOwnedAddress(tx, accountId, existing.id);
});

exports.deleteAddress = (accountId, addressId) => prisma.$transaction(async (tx) => {
  const existing = await findOwnedAddress(tx, accountId, addressId);

  await tx.$executeRaw`DELETE FROM customer_addresses WHERE id = ${existing.id}`;

  if (existing.isDefault) {
    const fallbackRows = await tx.$queryRaw`
      SELECT id FROM customer_addresses
      WHERE account_id = ${accountId}
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 1
    `;

    if (fallbackRows[0]?.id) {
      await tx.$executeRaw`
        UPDATE customer_addresses
        SET is_default = true, updated_at = NOW()
        WHERE id = ${fallbackRows[0].id}
      `;
    }
  }

  return { id: existing.id, removed: true };
});

exports.setDefaultAddress = (accountId, addressId) => prisma.$transaction(async (tx) => {
  const existing = await findOwnedAddress(tx, accountId, addressId);

  await tx.$executeRaw`
    UPDATE customer_addresses
    SET is_default = false, updated_at = NOW()
    WHERE account_id = ${accountId} AND is_default = true AND id <> ${existing.id}
  `;

  await tx.$executeRaw`
    UPDATE customer_addresses
    SET is_default = true, updated_at = NOW()
    WHERE id = ${existing.id}
  `;

  return findOwnedAddress(tx, accountId, existing.id);
});
