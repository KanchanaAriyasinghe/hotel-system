const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendBookingConfirmationEmail = async (email, bookingDetails) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: '✅ Booking Confirmation - Hotel Management System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2ecc71;">✅ Booking Confirmed</h1>
        </div>

        <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #333;">Booking Details</h2>
          <p><strong>Booking ID:</strong> ${bookingDetails.bookingId}</p>
          <p><strong>Guest Name:</strong> ${bookingDetails.guestName}</p>
          <p><strong>Check-in:</strong> ${bookingDetails.checkInDate}</p>
          <p><strong>Check-out:</strong> ${bookingDetails.checkOutDate}</p>
          <p><strong>Room Type:</strong> ${bookingDetails.roomType}</p>
          <p><strong>Number of Rooms:</strong> ${bookingDetails.numberOfRooms}</p>
        </div>

        <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #333;">Price Summary</h2>
          <p><strong>Room Rate:</strong> $${bookingDetails.roomRate}</p>
          <p><strong>Number of Nights:</strong> ${bookingDetails.numberOfNights}</p>
          <p style="border-top: 1px solid #ddd; padding-top: 10px; margin-top: 10px;">
            <strong style="font-size: 18px; color: #2ecc71;">Total Amount: $${bookingDetails.totalPrice}</strong>
          </p>
        </div>

        <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #333;">Amenities</h2>
          <p><strong>Free Amenities:</strong></p>
          <ul>
            ${bookingDetails.freeAmenities.map(a => `<li>${a}</li>`).join('')}
          </ul>
          ${bookingDetails.amenitiesBreakdown && Object.keys(bookingDetails.amenitiesBreakdown).length > 0 ? `
            <p><strong>Paid Amenities:</strong></p>
            <ul>
              ${Object.values(bookingDetails.amenitiesBreakdown).map(a => 
                `<li>${a.name} (${a.quantity} ${a.unit}): $${a.subtotal}</li>`
              ).join('')}
            </ul>
          ` : ''}
        </div>

        <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0; color: #155724;">
            <strong>Thank you for booking with us!</strong><br/>
            We look forward to your arrival. If you have any questions, please don't hesitate to contact us.
          </p>
        </div>

        <div style="text-align: center; color: #666; font-size: 12px;">
          <p>Hotel Management System | Booking Confirmation</p>
          <p style="margin-top: 10px;">This is an automated email. Please do not reply to this email.</p>
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

const sendPaymentConfirmationEmail = async (email, paymentDetails) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: '💳 Payment Confirmation - Hotel Booking',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2ecc71;">✅ Payment Successful</h2>
        <p>Your payment has been processed successfully.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
          <p><strong>Transaction ID:</strong> ${paymentDetails.transactionId}</p>
          <p><strong>Amount:</strong> $${paymentDetails.amount}</p>
          <p><strong>Payment Method:</strong> ${paymentDetails.method}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>

        <p style="margin-top: 20px; color: #666; font-size: 12px;">
          Please keep this email for your records. If you have any questions, contact support.
        </p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = {
  sendBookingConfirmationEmail,
  sendPaymentConfirmationEmail,
  transporter,
};