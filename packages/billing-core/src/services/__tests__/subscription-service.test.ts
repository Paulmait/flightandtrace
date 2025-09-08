import { SubscriptionService } from '../subscription-service';
import { SubscriptionTier, SubscriptionStatus } from '../../types/subscription';
import Stripe from 'stripe';

jest.mock('stripe');
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    incr: jest.fn(),
    expireAt: jest.fn()
  }))
}));

describe('SubscriptionService', () => {
  let subscriptionService: SubscriptionService;
  let mockStripe: jest.Mocked<Stripe>;
  let mockDb: any;
  let mockRedis: any;

  beforeEach(() => {
    mockStripe = {
      customers: {
        create: jest.fn(),
      },
      checkout: {
        sessions: {
          create: jest.fn(),
        },
      },
      subscriptions: {
        retrieve: jest.fn(),
        update: jest.fn(),
      },
    } as any;

    mockDb = {
      users: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      subscriptions: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      alerts: {
        count: jest.fn(),
      },
    };

    mockRedis = {
      connect: jest.fn(),
      get: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
      incr: jest.fn(),
      expireAt: jest.fn(),
    };

    (Stripe as any).mockImplementation(() => mockStripe);
    require('redis').createClient.mockReturnValue(mockRedis);

    subscriptionService = new SubscriptionService({
      stripeSecretKey: 'test_key',
      database: mockDb,
    });
  });

  describe('createCustomer', () => {
    it('should create a Stripe customer and update user record', async () => {
      const mockCustomer = { id: 'cus_test123' };
      mockStripe.customers.create.mockResolvedValue(mockCustomer as any);
      mockDb.users.update.mockResolvedValue({});

      const customerId = await subscriptionService.createCustomer(
        'user123',
        'test@example.com',
        'Test User'
      );

      expect(customerId).toBe('cus_test123');
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        metadata: { userId: 'user123' },
        name: 'Test User',
      });
      expect(mockDb.users.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: { stripeCustomerId: 'cus_test123' },
      });
    });
  });

  describe('createCheckoutSession', () => {
    it('should create checkout session for existing customer', async () => {
      const mockUser = {
        stripeCustomerId: 'cus_existing',
        email: 'test@example.com',
      };
      const mockSession = {
        id: 'cs_test123',
        url: 'https://checkout.stripe.com/test',
      };

      mockDb.users.findUnique.mockResolvedValue(mockUser);
      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession as any);

      const session = await subscriptionService.createCheckoutSession(
        'user123',
        'price_premium_monthly',
        'https://app.com/success',
        'https://app.com/cancel',
        7
      );

      expect(session).toEqual(mockSession);
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_existing',
        mode: 'subscription',
        line_items: [{ price: 'price_premium_monthly', quantity: 1 }],
        success_url: 'https://app.com/success',
        cancel_url: 'https://app.com/cancel',
        metadata: { userId: 'user123' },
        subscription_data: { trial_period_days: 7 },
      });
    });

    it('should create new customer if none exists', async () => {
      const mockUser = {
        stripeCustomerId: null,
        email: 'test@example.com',
        name: 'Test User',
      };
      const mockCustomer = { id: 'cus_new123' };
      const mockSession = { id: 'cs_test123' };

      mockDb.users.findUnique.mockResolvedValue(mockUser);
      mockStripe.customers.create.mockResolvedValue(mockCustomer as any);
      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession as any);
      mockDb.users.update.mockResolvedValue({});

      await subscriptionService.createCheckoutSession(
        'user123',
        'price_premium_monthly',
        'https://app.com/success',
        'https://app.com/cancel'
      );

      expect(mockStripe.customers.create).toHaveBeenCalled();
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_new123',
        })
      );
    });
  });

  describe('getUserSubscription', () => {
    it('should return cached subscription if available', async () => {
      const mockSubscription = {
        id: 'sub_test123',
        userId: 'user123',
        tier: SubscriptionTier.PREMIUM,
        status: SubscriptionStatus.ACTIVE,
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(mockSubscription));

      const result = await subscriptionService.getUserSubscription('user123');

      expect(result).toEqual(mockSubscription);
      expect(mockRedis.get).toHaveBeenCalledWith('subscription:user123');
      expect(mockDb.subscriptions.findUnique).not.toHaveBeenCalled();
    });

    it('should create free subscription if none exists', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockDb.subscriptions.findUnique.mockResolvedValue(null);
      mockDb.subscriptions.create.mockResolvedValue({
        id: 'free_user123_123456',
        userId: 'user123',
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
      });

      const result = await subscriptionService.getUserSubscription('user123');

      expect(result.tier).toBe(SubscriptionTier.FREE);
      expect(result.status).toBe(SubscriptionStatus.ACTIVE);
      expect(mockDb.subscriptions.create).toHaveBeenCalled();
    });

    it('should cache subscription after fetching from database', async () => {
      const mockSubscription = {
        userId: 'user123',
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
      };

      mockRedis.get.mockResolvedValue(null);
      mockDb.subscriptions.findUnique.mockResolvedValue(mockSubscription);

      await subscriptionService.getUserSubscription('user123');

      expect(mockRedis.setEx).toHaveBeenCalledWith(
        'subscription:user123',
        300,
        JSON.stringify(mockSubscription)
      );
    });
  });

  describe('checkApiLimit', () => {
    it('should return true for unlimited plans', async () => {
      const result = await subscriptionService.checkApiLimit('user123', SubscriptionTier.BUSINESS);
      expect(result).toBe(true);
    });

    it('should check usage against limit for limited plans', async () => {
      mockRedis.get.mockResolvedValue('500'); // Current usage

      const result = await subscriptionService.checkApiLimit('user123', SubscriptionTier.PREMIUM);

      expect(result).toBe(true); // 500 < 1000 (Premium limit)
      expect(mockRedis.get).toHaveBeenCalledWith(
        expect.stringMatching(/^api_usage:user123:\d{4}-\d{2}-\d{2}$/)
      );
    });

    it('should return false when limit exceeded', async () => {
      mockRedis.get.mockResolvedValue('1001'); // Over Premium limit of 1000

      const result = await subscriptionService.checkApiLimit('user123', SubscriptionTier.PREMIUM);

      expect(result).toBe(false);
    });
  });

  describe('incrementApiUsage', () => {
    it('should increment usage counter and set expiry', async () => {
      await subscriptionService.incrementApiUsage('user123');

      expect(mockRedis.incr).toHaveBeenCalledWith(
        expect.stringMatching(/^api_usage:user123:\d{4}-\d{2}-\d{2}$/)
      );
      expect(mockRedis.expireAt).toHaveBeenCalled();
    });
  });

  describe('getFeatureGate', () => {
    it('should return feature gate with usage stats', async () => {
      const mockSubscription = {
        userId: 'user123',
        tier: SubscriptionTier.PREMIUM,
        status: SubscriptionStatus.ACTIVE,
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(mockSubscription));
      mockRedis.get.mockImplementation((key) => {
        if (key.includes('api_usage')) return '50';
        return JSON.stringify(mockSubscription);
      });
      mockDb.alerts.count.mockResolvedValue(3);

      const featureGate = await subscriptionService.getFeatureGate('user123');

      expect(featureGate.tier).toBe(SubscriptionTier.PREMIUM);
      expect(featureGate.features.realTimeData).toBe(true);
      expect(featureGate.features.apiCalls.daily).toBe(1000);
      expect(featureGate.usage.apiCalls).toBe(50);
      expect(featureGate.usage.alerts).toBe(3);
      expect(featureGate.limits.apiCallsRemaining).toBe(950);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel at period end by default', async () => {
      const mockSubscription = {
        stripeSubscriptionId: 'sub_test123',
        tier: SubscriptionTier.PREMIUM,
      };

      mockDb.subscriptions.findUnique.mockResolvedValue(mockSubscription);
      mockStripe.subscriptions.update.mockResolvedValue({} as any);

      await subscriptionService.cancelSubscription('user123');

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
        'sub_test123',
        { cancel_at_period_end: true }
      );
      expect(mockDb.subscriptions.update).not.toHaveBeenCalled();
    });

    it('should cancel immediately when requested', async () => {
      const mockSubscription = {
        stripeSubscriptionId: 'sub_test123',
        tier: SubscriptionTier.PREMIUM,
      };

      mockDb.subscriptions.findUnique.mockResolvedValue(mockSubscription);
      mockStripe.subscriptions.update.mockResolvedValue({} as any);

      await subscriptionService.cancelSubscription('user123', false);

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
        'sub_test123',
        { cancel_at_period_end: false }
      );
      expect(mockDb.subscriptions.update).toHaveBeenCalledWith({
        where: { userId: 'user123' },
        data: {
          status: SubscriptionStatus.CANCELED,
          canceledAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe('updateSubscriptionFromWebhook', () => {
    it('should handle subscription created event', async () => {
      const mockEvent = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_test123',
            customer: 'cus_test123',
            status: 'active',
            current_period_start: 1640995200,
            current_period_end: 1643673600,
            metadata: { userId: 'user123' },
            items: {
              data: [{ price: { id: 'price_premium_monthly' } }],
            },
          },
        },
      } as Stripe.Event;

      await subscriptionService.updateSubscriptionFromWebhook(mockEvent);

      expect(mockDb.subscriptions.upsert).toHaveBeenCalledWith({
        where: { userId: 'user123' },
        create: expect.objectContaining({
          userId: 'user123',
          stripeSubscriptionId: 'sub_test123',
          tier: SubscriptionTier.PREMIUM,
          status: SubscriptionStatus.ACTIVE,
        }),
        update: expect.objectContaining({
          tier: SubscriptionTier.PREMIUM,
          status: SubscriptionStatus.ACTIVE,
        }),
      });
      expect(mockRedis.del).toHaveBeenCalledWith('subscription:user123');
    });

    it('should handle subscription deleted event', async () => {
      const mockEvent = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            metadata: { userId: 'user123' },
          },
        },
      } as Stripe.Event;

      mockDb.subscriptions.create.mockResolvedValue({});

      await subscriptionService.updateSubscriptionFromWebhook(mockEvent);

      expect(mockDb.subscriptions.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user123',
          tier: SubscriptionTier.FREE,
          status: SubscriptionStatus.ACTIVE,
        }),
      });
    });
  });
});