const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateBookingPDF = (bookingData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4' });
      const fileName = `booking-${bookingData.bookingId}.pdf`;
      const filePath = path.join(__dirname, '../uploads', fileName);

      // Create uploads directory if it doesn't exist
      if (!fs.existsSync(path.join(__dirname, '../uploads'))) {
        fs.mkdirSync(path.join(__dirname, '../uploads'));
      }

      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('HOTEL BOOKING CONFIRMATION', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica').text(`Booking ID: ${bookingData.bookingId}`, { align: 'center' });
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(1);

      // Guest Information
      doc.fontSize(14).font('Helvetica-Bold').text('Guest Information');
      doc.fontSize(11).font('Helvetica');
      doc.text(`Name: ${bookingData.guestName}`);
      doc.text(`Email: ${bookingData.email}`);
      doc.text(`Phone: ${bookingData.phone}`);
      doc.moveDown(1);

      // Room Details
      doc.fontSize(14).font('Helvetica-Bold').text('Room Details');
      doc.fontSize(11).font('Helvetica');
      doc.text(`Check-in: ${bookingData.checkInDate}`);
      doc.text(`Check-out: ${bookingData.checkOutDate}`);
      doc.text(`Room Type: ${bookingData.roomType}`);
      doc.text(`Number of Rooms: ${bookingData.numberOfRooms}`);
      doc.text(`Number of Nights: ${bookingData.numberOfNights}`);
      doc.moveDown(1);

      // Amenities
      if (bookingData.freeAmenities && bookingData.freeAmenities.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Free Amenities');
        doc.fontSize(11).font('Helvetica');
        bookingData.freeAmenities.forEach(amenity => {
          doc.text(`✓ ${amenity}`);
        });
        doc.moveDown(1);
      }

      // Paid Amenities
      if (bookingData.amenitiesBreakdown && Object.keys(bookingData.amenitiesBreakdown).length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Paid Amenities');
        doc.fontSize(11).font('Helvetica');
        Object.values(bookingData.amenitiesBreakdown).forEach(amenity => {
          doc.text(`${amenity.name} (${amenity.quantity} ${amenity.unit}): $${amenity.subtotal}`);
        });
        doc.moveDown(1);
      }

      // Price Summary
      doc.fontSize(14).font('Helvetica-Bold').text('Price Summary');
      doc.fontSize(11).font('Helvetica');
      doc.text(`Room Rate: $${bookingData.roomRate}`);
      doc.text(`Number of Nights: ${bookingData.numberOfNights}`);
      doc.text(`Subtotal: $${bookingData.roomSubtotal}`);
      
      if (bookingData.amenitiesTotal > 0) {
        doc.text(`Amenities: $${bookingData.amenitiesTotal}`);
      }
      
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.fontSize(12).font('Helvetica-Bold').text(`Total Amount: $${bookingData.totalPrice}`);
      doc.moveDown(2);

      // Footer
      doc.fontSize(10).font('Helvetica').text('Thank you for booking with us!', { align: 'center' });
      doc.text('This is an automated confirmation. Please contact support for any queries.', { align: 'center' });

      doc.end();

      stream.on('finish', () => {
        resolve(filePath);
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateBookingPDF };