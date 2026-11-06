import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../core/errors';

export type UserRoleType = 'SUBSCRIBER' | 'AGENT' | 'ADMIN';

export function rbacMiddleware(allowedRoles: UserRoleType[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required prior to role verification'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access denied. Role '${req.user.role}' is not authorized. Required: [${allowedRoles.join(', ')}]`
        )
      );
    }

    next();
  };
}
