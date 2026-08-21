import { Router } from 'express';
import { riskRoutes } from './risk.js';
import { earthquakeRoutes } from './earthquake.js';
import { alertRoutes } from './alert.js';
import { offlineRoutes } from './offline.js';
import { userRoutes } from './user.js';
import { faultRoutes } from './fault.js';

export const routes = Router();

routes.use('/risk', riskRoutes);
routes.use('/earthquakes', earthquakeRoutes);
routes.use('/alerts', alertRoutes);
routes.use('/offline', offlineRoutes);
routes.use('/user', userRoutes);
routes.use('/faults', faultRoutes);