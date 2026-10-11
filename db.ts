import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    emailOrMobile: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['nagrik', 'department', 'nagar_nigam', 'admin'],
      required: true,
    },
    department: {
      type: String,
      enum: ['sadak', 'safai', 'bijli', 'jal'],
      required: false,
    },
    createdAt: { type: String, required: true },
  },
  { collection: 'users', strict: false }
);

const complaintSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    trackingId: { type: String, required: true },
    citizenId: String,
    citizenName: String,
    citizenContact: String,
    title: String,
    description: String,
    hindiDraft: String,
    category: { type: String, enum: ['sadak', 'safai', 'bijli', 'jal'] },
    photoUrl: String,
    location: Object,
    aiAnalysis: Object,
    priority: Object,
    weather: Object,
    departmentEta: String,
    departmentAssignedTo: String,
    departmentNote: String,
    status: { type: String, enum: ['darj', 'kaam_chalu', 'ho_gaya'] },
    createdAt: String,
    updatedAt: String,
    resolvedAt: String,
    resolutionPhotoUrl: String,
    resolutionNote: String,
    isLate: Boolean,
    slaHours: Number,
    hoursElapsed: Number,
    isSampleData: Boolean,
  },
  { collection: 'complaints', strict: false }
);

export const UserModel = mongoose.models.User || mongoose.model('User', userSchema);
export const ComplaintModel = mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);

export async function connectToMongo(): Promise<boolean> {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MONGO_URI must be set in production to prevent data loss.');
    }
    return false;
  }

  try {
    if (mongoose.connection.readyState === 1) {
      return true;
    }

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log('MongoDB connected successfully.');
    return true;
  } catch (error) {
    console.error('MongoDB connection failed:', (error as Error).message);
    throw error;
  }
}

export function isMongoAvailable(): boolean {
  return Boolean(process.env.MONGO_URI) && mongoose.connection.readyState === 1;
}

export async function syncSeedData<
  TUser extends { id: string },
  TComplaint extends { id: string },
>(users: TUser[], complaints: TComplaint[]): Promise<void> {
  if (!isMongoAvailable()) {
    return;
  }

  const userCount = await UserModel.countDocuments();
  if (userCount === 0) {
    await UserModel.insertMany(users);
  }

  const complaintCount = await ComplaintModel.countDocuments();
  if (complaintCount === 0) {
    await ComplaintModel.insertMany(complaints);
  }

  const storedUsers = await UserModel.find({}, { _id: 0, __v: 0 }).lean();
  const storedComplaints = await ComplaintModel.find({}, { _id: 0, __v: 0 }).lean();
  users.splice(0, users.length, ...storedUsers);
  complaints.splice(0, complaints.length, ...storedComplaints);
}

export async function persistUsers<T extends { id: string }>(users: T[]): Promise<void> {
  if (!isMongoAvailable()) {
    return;
  }

  if (users.length > 0) {
    await UserModel.bulkWrite(
      users.map((user) => ({
        updateOne: {
          filter: { id: user.id },
          update: { $set: user },
          upsert: true,
        },
      }))
    );
  }
}

export async function persistComplaints<T extends { id: string }>(complaints: T[]): Promise<void> {
  if (!isMongoAvailable()) {
    return;
  }

  if (complaints.length > 0) {
    await ComplaintModel.bulkWrite(
      complaints.map((complaint) => ({
        updateOne: {
          filter: { id: complaint.id },
          update: { $set: complaint },
          upsert: true,
        },
      }))
    );
  }
}
