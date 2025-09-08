import { Request, Response, NextFunction } from 'express';
import { SubscriptionTier, UserSubscription, FeatureGate } from '../types/subscription';
import { SubscriptionService } from '../services/subscription-service';
import { getPlanByTier } from '../stripe/plans';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    subscription?: UserSubscription;
  };
  subscription?: UserSubscription;
  featureGate?: FeatureGate;
}

export class SubscriptionMiddleware {
  private subscriptionService: SubscriptionService;

  constructor(subscriptionService: SubscriptionService) {
    this.subscriptionService = subscriptionService;
  }

  requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const token = this.extractToken(req);
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      req.user = {
        id: decoded.userId,
        email: decoded.email
      };

      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  loadSubscription = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const subscription = await this.subscriptionService.getUserSubscription(req.user.id);
      req.subscription = subscription;
      req.user.subscription = subscription;

      const featureGate = await this.subscriptionService.getFeatureGate(req.user.id);
      req.featureGate = featureGate;

      next();
    } catch (error) {
      console.error('Error loading subscription:', error);
      res.status(500).json({ error: 'Failed to load subscription' });
    }
  };

  requireTier = (requiredTier: SubscriptionTier | SubscriptionTier[]) => {
    const tiers = Array.isArray(requiredTier) ? requiredTier : [requiredTier];
    
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.subscription) {
        return res.status(403).json({ error: 'Subscription required' });
      }

      const userTier = req.subscription.tier;
      const tierHierarchy = [
        SubscriptionTier.FREE,
        SubscriptionTier.PREMIUM,
        SubscriptionTier.PRO,
        SubscriptionTier.BUSINESS
      ];

      const userTierLevel = tierHierarchy.indexOf(userTier);
      const hasAccess = tiers.some(tier => {
        const requiredLevel = tierHierarchy.indexOf(tier);
        return userTierLevel >= requiredLevel;
      });

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Insufficient subscription tier',
          required: tiers,
          current: userTier,
          upgradeRequired: true
        });
      }

      next();
    };
  };

  requireFeature = (featureName: keyof FeatureGate['features']) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.featureGate) {
        return res.status(403).json({ error: 'Feature access not available' });
      }

      const hasFeature = req.featureGate.features[featureName];
      if (!hasFeature) {
        return res.status(403).json({
          error: `Feature '${featureName}' not available in current plan`,
          tier: req.featureGate.tier,
          upgradeRequired: true
        });
      }

      next();
    };
  };

  enforceApiLimits = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.featureGate) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { apiCalls } = req.featureGate.features;
      if (apiCalls.daily === 'unlimited') {
        return next();
      }

      const canMakeRequest = await this.subscriptionService.checkApiLimit(
        req.user.id,
        req.featureGate.tier
      );

      if (!canMakeRequest) {
        return res.status(429).json({
          error: 'API rate limit exceeded',
          limit: apiCalls.daily,
          resetAt: this.getNextResetTime(),
          upgradeRequired: true
        });
      }

      await this.subscriptionService.incrementApiUsage(req.user.id);
      next();
    } catch (error) {
      console.error('Error enforcing API limits:', error);
      res.status(500).json({ error: 'Failed to check API limits' });
    }
  };

  addDataDelay = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.featureGate) {
      return next();
    }

    const { dataDelay } = req.featureGate.features;
    if (dataDelay > 0) {
      req.query.delay = dataDelay.toString();
    }

    next();
  };

  filterHistoricalData = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.featureGate) {
      return next();
    }

    const { historyDays } = req.featureGate.features;
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() - historyDays);

    if (req.query.startDate) {
      const requestedDate = new Date(req.query.startDate as string);
      if (requestedDate < maxDate) {
        return res.status(403).json({
          error: 'Historical data access limited',
          maxHistoryDays: historyDays,
          tier: req.featureGate.tier,
          upgradeRequired: true
        });
      }
    }

    next();
  };

  requireActiveTrial = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.subscription) {
      return res.status(403).json({ error: 'Subscription required' });
    }

    const { status, trialEnd } = req.subscription;
    const now = new Date();

    if (status !== 'trialing') {
      return next();
    }

    if (!trialEnd || now > trialEnd) {
      return res.status(403).json({
        error: 'Trial expired',
        trialExpired: true,
        upgradeRequired: true
      });
    }

    next();
  };

  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    return req.query.token as string || req.cookies?.token || null;
  }

  private getNextResetTime(): Date {
    const tomorrow = new Date();
    tomorrow.setUTCHours(0, 0, 0, 0);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    return tomorrow;
  }
}