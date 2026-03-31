// backend/models/Staff.js

const mongoose = require('mongoose');

const departmentPositions = {
  "Front Office": [
    "Receptionist", "Front Desk Executive", "Guest Service Agent",
    "Concierge", "Reservation Agent", "Front Office Supervisor", "Front Office Manager",
  ],
  "Housekeeping": [
    "Room Attendant", "Cleaner", "Housekeeper", "Laundry Staff",
    "Public Area Cleaner", "Housekeeping Supervisor", "Housekeeping Manager",
  ],
  "Food & Beverage": [
    "Waiter", "Waitress", "Steward", "Chef", "Sous Chef", "Commis Chef",
    "Kitchen Staff", "Bartender", "Restaurant Supervisor", "F&B Manager", "Banquet Staff",
  ],
  "Maintenance": [
    "Technician", "Electrician", "Plumber", "HVAC Technician",
    "Maintenance Staff", "Engineering Supervisor", "Chief Engineer",
  ],
  "Administration": [
    "Admin Officer", "HR Officer", "Accountant", "IT Officer",
    "Assistant Manager", "General Manager",
  ],
  "Security": [
    "Security Guard", "Security Officer", "CCTV Operator", "Security Supervisor",
  ],
  "Transport": [
    "Driver", "Bellboy", "Porter", "Valet", "Transport Supervisor",
  ],
};

const staffSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    name:       { type: String, required: true, trim: true },
    email:      { type: String, required: true, trim: true, lowercase: true },
    phone:      { type: String, required: true, trim: true },
    department: { type: String, required: true, enum: Object.keys(departmentPositions) },
    position:   {
      type: String,
      required: true,
      validate: {
        validator: function (value) {
          const positions = departmentPositions[this.department];
          return positions && positions.includes(value);
        },
        message: 'Invalid position for selected department',
      },
    },
    salary:      { type: Number, min: 0 },
    joinDate:    { type: Date },
    shiftTiming: { type: String },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Staff', staffSchema);