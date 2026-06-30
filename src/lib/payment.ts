import Stripe from 'stripe';

export type PaymentProvider = 'stripe' | 'flouci' | 'konnect';

export interface PaymentRequest {
  amount: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  bookingRef: string;
}

export interface PaymentResponse {
  paymentUrl?: string;
  clientSecret?: string;
  transactionRef?: string;
  provider: PaymentProvider;
  amount: number;
}

export class FlouciPaymentService {
  private apiKey: string;
  private appId: string;
  private signingSecret: string;

  constructor(apiKey: string, appId: string, signingSecret: string) {
    this.apiKey = apiKey;
    this.appId = appId;
    this.signingSecret = signingSecret;
  }

  async generateTransaction(payload: {
    api_key: string;
    app_id: string;
    amount_in_cents: number;
    currency: string;
    success_url: string;
    failure_url: string;
    developer_custom_user1?: string;
    system_email?: string;
    phone_number?: string;
    developer_custom_user2?: string;
    developer_custom_user3?: string;
    developer_custom_user4?: string;
  }) {
    // Official Flouci API v2 endpoint
    const url = 'https://developers.flouci.com/api/v2/generate_payment';
    const authHeader = `Bearer ${this.apiKey}:${this.signingSecret}`;
    
    // Flouci requires amount in millimes (TND amount * 1000)
    // payload.amount_in_cents is TND amount * 100, so millimes = cents * 10
    const amountInMillimes = Math.round(payload.amount_in_cents * 10);

    const body = {
      amount: String(amountInMillimes),
      success_link: payload.success_url,
      fail_link: payload.failure_url,
      developer_tracking_id: payload.developer_custom_user2 || '',
      accept_card: true,
      client_id: payload.developer_custom_user1 || ''
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Flouci API error: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    if (data.result && data.result.success) {
      return {
        success: true,
        payment_link: data.result.link,
        transaction_reference: data.result.payment_id,
        reference_id: data.result.payment_id
      };
    } else {
      throw new Error(data.result?.message || 'Failed to generate payment from Flouci');
    }
  }

  async getTransactionStatus(transactionReference: string) {
    // Official Flouci API v2 verify endpoint
    const url = `https://developers.flouci.com/api/v2/verify_payment/${transactionReference}`;
    const authHeader = `Bearer ${this.apiKey}:${this.signingSecret}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': authHeader
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Flouci API check error: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    return data;
  }
}

export class PaymentService {
  private stripeSecret: string;
  private flouciKey: string;
  private flouciAppId: string;
  private flouciSecret: string;

  constructor() {
    this.stripeSecret = process.env.STRIPE_SECRET_KEY || '';
    this.flouciKey = process.env.FLUOCI_API_KEY || '';
    this.flouciAppId = process.env.FLUOCI_APP_ID || '';
    this.flouciSecret = process.env.FLUOCI_SIGNING_SECRET_KEY || '';
  }

  async createPayment(provider: PaymentProvider, request: PaymentRequest): Promise<PaymentResponse> {
    if (provider === 'stripe') {
      return this.handleStripe(request);
    } else if (provider === 'flouci') {
      return this.handleFlouci(request);
    } else {
      throw new Error('Unsupported payment provider');
    }
  }

  private async handleStripe(req: PaymentRequest): Promise<PaymentResponse> {
    const stripe = new Stripe(this.stripeSecret, {
      apiVersion: '2025-02-11-preview' as any,
    });
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(req.amount * 100),
      currency: req.currency.toLowerCase(),
      payment_method_types: ['card'],
      metadata: { bookingRef: req.bookingRef },
    });

    return {
      clientSecret: paymentIntent.client_secret || undefined,
      provider: 'stripe',
      amount: req.amount,
      transactionRef: paymentIntent.id
    };
  }

  private async handleFlouci(req: PaymentRequest): Promise<PaymentResponse> {
    const flouciService = new FlouciPaymentService(
      this.flouciKey,
      this.flouciAppId,
      this.flouciSecret
    );

    const APP_URL = process.env.APP_URL || 'http://localhost:3000';
    const transaction = await flouciService.generateTransaction({
      api_key: this.flouciKey,
      app_id: this.flouciAppId,
      amount_in_cents: req.amount * 100,
      currency: 'TND',
      success_url: `${APP_URL}/payment/success?reference=${req.bookingRef}`,
      failure_url: `${APP_URL}/payment/failure`,
      developer_custom_user1: req.customerName,
      system_email: req.customerEmail,
      developer_custom_user2: req.bookingRef
    });

    return {
      paymentUrl: transaction.payment_link,
      transactionRef: transaction.transaction_reference,
      provider: 'flouci',
      amount: req.amount,
    };
  }
}
