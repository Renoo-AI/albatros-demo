import { FlouciPaymentService } from '../../src/lib/payment';

export const config = { runtime: 'edge' };

export async function POST(req: Request) {
  try {
    const { amountInCents, currency, successUrl, failureUrl, customerName, customerEmail, customerPhone } = await req.json();
    const APP_URL = process.env.APP_URL || 'http://localhost:5173';

    const successUrlFull = successUrl || `${APP_URL}/payment/success`;
    const failureUrlFull = failureUrl || `${APP_URL}/payment/failure`;

    const paymentService = new FlouciPaymentService(
      process.env.FLUOCI_API_KEY || '',
      process.env.FLUOCI_APP_ID || '',
      process.env.FLUOCI_SIGNING_SECRET_KEY || ''
    );

    const bookingReference = `BOOKING-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const transaction = await paymentService.generateTransaction({
      api_key: process.env.FLUOCI_API_KEY || '',
      app_id: process.env.FLUOCI_APP_ID || '',
      amount_in_cents: amountInCents,
      currency: currency || 'TND',
      success_url: successUrlFull,
      failure_url: failureUrlFull,
      developer_custom_user1: customerName || '',
      system_email: customerEmail || '',
      phone_number: customerPhone || '',
      developer_custom_user2: bookingReference,
      developer_custom_user3: 'Albatros',
      developer_custom_user4: 'Banquet Hall',
    });

    if (!transaction.success || !transaction.payment_link) {
      throw new Error('Failed to generate payment from Flouci');
    }

    return Response.json({
      success: true,
      paymentUrl: transaction.payment_link,
      transactionReference: transaction.transaction_reference,
      transactionId: transaction.reference_id,
      amountInCents,
      currency,
      bookingReference,
    });

  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment',
      },
      { status: 500 }
    );
  }
}