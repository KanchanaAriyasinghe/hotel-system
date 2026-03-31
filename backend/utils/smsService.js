const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const sendBookingConfirmationSMS = async (phone, bookingDetails) => {
  const message = `
Your booking (ID: ${bookingDetails.bookingId}) is confirmed!
Check-in: ${bookingDetails.checkInDate}
Check-out: ${bookingDetails.checkOutDate}
Total: $${bookingDetails.totalPrice}
Thank you for booking with us!
  `.trim();

  return client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone,
  });
};

const sendPaymentConfirmationSMS = async (phone, paymentDetails) => {
  const message = `
Payment Confirmed!
Transaction ID: ${paymentDetails.transactionId}
Amount: $${paymentDetails.amount}
Payment Method: ${paymentDetails.method}
  `.trim();

  return client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone,
  });
};

module.exports = {
  sendBookingConfirmationSMS,
  sendPaymentConfirmationSMS,
};