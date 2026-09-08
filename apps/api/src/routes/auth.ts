import { Router } from 'express';

import { loginHandler, logoutHandler, sessionHandler } from '../controllers/authController';

export const authRouter = Router();

authRouter.post('/login', loginHandler);
authRouter.post('/logout', logoutHandler);
authRouter.get('/session', sessionHandler);
