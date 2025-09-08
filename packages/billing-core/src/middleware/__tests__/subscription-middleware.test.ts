import { Request, Response } from 'express';
import { SubscriptionMiddleware, AuthenticatedRequest } from '../subscription-middleware';
import { SubscriptionService } from '../../services/subscription-service';
import { SubscriptionTier, SubscriptionStatus } from '../../types/subscription';
import jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');
jest.mock('../../services/subscription-service');

describe('SubscriptionMiddleware', () => {
  let middleware: SubscriptionMiddleware;
  let mockSubscriptionService: jest.Mocked<SubscriptionService>;
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockSubscriptionService = {
      getUserSubscription: jest.fn(),
      getFeatureGate: jest.fn(),
      checkApiLimit: jest.fn(),
      incrementApiUsage: jest.fn(),
    } as any;

    middleware = new SubscriptionMiddleware(mockSubscriptionService);

    mockRequest = {
      headers: {},
      query: {},
      cookies: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('should authenticate user with valid token', async () => {
      mockRequest.headers!.authorization = 'Bearer valid_token';
      (jwt.verify as jest.Mock).mockReturnValue({
        userId: 'user123',
        email: 'test@example.com',
      });

      await middleware.requireAuth(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toEqual({
        id: 'user123',
        email: 'test@example.com',
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject request without token', async () => {
      await middleware.requireAuth(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token', async () => {
      mockRequest.headers!.authorization = 'Bearer invalid_token';
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await middleware.requireAuth(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid token',
      });
    });
  });

  describe('loadSubscription', () => {
    beforeEach(() => {
      mockRequest.user = { id: 'user123', email: 'test@example.com' };
    });

    it('should load subscription and feature gate', async () => {
      const mockSubscription = {
        userId: 'user123',
        tier: SubscriptionTier.PREMIUM,
        status: SubscriptionStatus.ACTIVE,
      };
      const mockFeatureGate = {
        userId: 'user123',
        tier: SubscriptionTier.PREMIUM,
        features: { realTimeData: true },
      };

      mockSubscriptionService.getUserSubscription.mockResolvedValue(mockSubscription as any);
      mockSubscriptionService.getFeatureGate.mockResolvedValue(mockFeatureGate as any);

      await middleware.loadSubscription(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.subscription).toEqual(mockSubscription);
      expect(mockRequest.featureGate).toEqual(mockFeatureGate);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle unauthenticated request', async () => {
      mockRequest.user = undefined;

      await middleware.loadSubscription(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'User not authenticated',
      });
    });
  });

  describe('requireTier', () => {
    beforeEach(() => {
      mockRequest.subscription = {
        tier: SubscriptionTier.PREMIUM,
        status: SubscriptionStatus.ACTIVE,
      } as any;
    });

    it('should allow access with sufficient tier', async () => {
      const tierMiddleware = middleware.requireTier(SubscriptionTier.PREMIUM);

      await tierMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow access with higher tier', async () => {
      mockRequest.subscription!.tier = SubscriptionTier.PRO;
      const tierMiddleware = middleware.requireTier(SubscriptionTier.PREMIUM);

      await tierMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject access with insufficient tier', async () => {
      mockRequest.subscription!.tier = SubscriptionTier.FREE;
      const tierMiddleware = middleware.requireTier(SubscriptionTier.PREMIUM);

      await tierMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Insufficient subscription tier',
        required: [SubscriptionTier.PREMIUM],
        current: SubscriptionTier.FREE,
        upgradeRequired: true,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle multiple allowed tiers', async () => {
      const tierMiddleware = middleware.requireTier([
        SubscriptionTier.PRO,
        SubscriptionTier.BUSINESS,
      ]);

      await tierMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Insufficient subscription tier',
        required: [SubscriptionTier.PRO, SubscriptionTier.BUSINESS],
        current: SubscriptionTier.PREMIUM,
        upgradeRequired: true,
      });
    });
  });

  describe('enforceApiLimits', () => {
    beforeEach(() => {
      mockRequest.user = { id: 'user123', email: 'test@example.com' };
      mockRequest.featureGate = {
        tier: SubscriptionTier.PREMIUM,
        features: { apiCalls: { daily: 1000, rateLimitPerMinute: 60 } },
      } as any;
    });

    it('should allow request within limits', async () => {
      mockSubscriptionService.checkApiLimit.mockResolvedValue(true);

      await middleware.enforceApiLimits(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockSubscriptionService.incrementApiUsage).toHaveBeenCalledWith('user123');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject request over limits', async () => {
      mockSubscriptionService.checkApiLimit.mockResolvedValue(false);

      await middleware.enforceApiLimits(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'API rate limit exceeded',
        limit: 1000,
        resetAt: expect.any(Date),
        upgradeRequired: true,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow unlimited tier without checks', async () => {
      mockRequest.featureGate!.features.apiCalls.daily = 'unlimited' as any;

      await middleware.enforceApiLimits(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockSubscriptionService.checkApiLimit).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('addDataDelay', () => {
    beforeEach(() => {
      mockRequest.featureGate = {
        features: { dataDelay: 300 },
      } as any;
    });

    it('should add delay parameter for delayed plans', async () => {
      await middleware.addDataDelay(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.query!.delay).toBe('300');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should not add delay for real-time plans', async () => {
      mockRequest.featureGate!.features.dataDelay = 0;

      await middleware.addDataDelay(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.query!.delay).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('filterHistoricalData', () => {
    beforeEach(() => {
      mockRequest.featureGate = {
        tier: SubscriptionTier.FREE,
        features: { historyDays: 7 },
      } as any;
    });

    it('should allow request within history limit', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      mockRequest.query!.startDate = yesterday.toISOString();

      await middleware.filterHistoricalData(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject request beyond history limit', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 30);
      mockRequest.query!.startDate = oldDate.toISOString();

      await middleware.filterHistoricalData(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Historical data access limited',
        maxHistoryDays: 7,
        tier: SubscriptionTier.FREE,
        upgradeRequired: true,
      });
    });
  });

  describe('requireActiveTrial', () => {
    it('should allow active subscription', async () => {
      mockRequest.subscription = {
        status: SubscriptionStatus.ACTIVE,
      } as any;

      await middleware.requireActiveTrial(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow active trial', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      mockRequest.subscription = {
        status: SubscriptionStatus.TRIALING,
        trialEnd: futureDate,
      } as any;

      await middleware.requireActiveTrial(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject expired trial', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      mockRequest.subscription = {
        status: SubscriptionStatus.TRIALING,
        trialEnd: pastDate,
      } as any;

      await middleware.requireActiveTrial(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Trial expired',
        trialExpired: true,
        upgradeRequired: true,
      });
    });
  });
});