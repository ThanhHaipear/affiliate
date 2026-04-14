const serialize = (value) => JSON.parse(JSON.stringify(value, (_key, current) =>
  typeof current === 'bigint' ? current.toString() : current
));

exports.serialize = serialize;

exports.successResponse = (res, data, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({
    success: true,
    message,
    data: serialize(data)
  });
