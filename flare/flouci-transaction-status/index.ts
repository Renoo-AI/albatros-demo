import { FlouciPaymentService } from '../../src/lib/payment';

export const config = { runtime: 'edge' };

export async function POST(req: Request) {
  try {
    const { transactionReference } = await req.json();

    if (!transactionReference) {
      return Response.json(
        {
          success: false,
          error: 'Transaction reference is required',
        },
        { status: 400 }
      );
    }

    const paymentService = new FlouciPaymentService(
      process.env.FLUOCI_API_KEY || '',
      process.env.FLUOCI_APP_ID || '',
      process.env.FLUOCI_SIGNING_SECRET_KEY || ''
    );

    const transaction = await paymentService.getTransactionStatus(transactionReference);

    return Response.json({
      success: true,
      transaction,
    });

  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get transaction status',
      },
      { status: 500 }
    );
  }
}