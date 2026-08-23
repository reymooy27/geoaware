import { Hono } from 'hono';
import type { Env } from '../config/env.js';
import { riskRoutes } from './risk.js';
import { earthquakeRoutes } from './earthquake.js';
import { alertRoutes } from './alert.js';
import { offlineRoutes } from './offline.js';
import { userRoutes } from './user.js';
import { faultRoutes } from './fault.js';

export const api = new Hono<Env>();

api.route('/risk', riskRoutes);
api.route('/earthquakes', earthquakeRoutes);
api.route('/alerts', alertRoutes);
api.route('/offline', offlineRoutes);
api.route('/user', userRoutes);
api.route('/faults', faultRoutes);
