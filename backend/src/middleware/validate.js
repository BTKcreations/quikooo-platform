/**
 * Middleware factory for request validation using Joi
 * @param {Object} schemas - { body?: Joi.Schema, query?: Joi.Schema, params?: Joi.Schema }
 */
function validate(schemas) {
  return (req, res, next) => {
    const locations = ['body', 'query', 'params'];

    for (const location of locations) {
      if (schemas[location]) {
        const { error, value } = schemas[location].validate(req[location], {
          abortEarly: false,
          stripUnknown: true,
        });

        if (error) {
          const errorDetails = error.details.map((detail) => ({
            field: detail.path.join('.'),
            message: detail.message.replace(/['"]/g, ''),
          }));

          return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errorDetails,
          });
        }

        // Replace with sanitized/coerced values
        req[location] = value;
      }
    }

    return next();
  };
}

module.exports = validate;
