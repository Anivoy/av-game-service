import { AppError } from "./errorUtility.js";

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      if (!(source in req)) {
        throw new AppError(`Invalid validation source: ${source}`, 500);
      }

      const validated = schema.parse(req[source]);
      req[source] = validated;
      next();
    } catch (err) {
      next(err);
    }
  };
}

export const getUserId = (req) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    throw new AppError('User ID not found in request headers', 401);
  }
  return userId;
};