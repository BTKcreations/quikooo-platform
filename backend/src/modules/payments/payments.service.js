class PaymentsService {
  static async createPayment({ orderId, amount }) {
    // TODO: Connect to Payment Gateway (Razorpay/Cashfree/UPI)
    return {
      paymentId: `PAY-${Date.now()}`,
      orderId,
      amount,
      currency: 'INR',
      status: 'INITIATED',
      paymentUrl: `https://payment.quikooo.mock/checkout?id=${orderId}`,
    };
  }

  static async verifyPayment({ orderId, paymentId, gatewaySignature }) {
    // TODO: Verify HMAC signature with gateway secret
    return {
      orderId,
      paymentId,
      status: 'SUCCESS',
      verifiedAt: new Date().toISOString(),
    };
  }

  static async initiateRefund({ orderId, amount, reason }) {
    // TODO: Process refund via gateway
    return {
      refundId: `REF-${Date.now()}`,
      orderId,
      amount,
      reason,
      status: 'REFUND_INITIATED',
    };
  }
}

module.exports = PaymentsService;
