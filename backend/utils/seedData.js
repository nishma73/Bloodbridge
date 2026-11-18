const User = require('../models/User');
const DonorProfile = require('../models/DonorProfile');
const HospitalProfile = require('../models/HospitalProfile');
const BloodRequest = require('../models/BloodRequest');
const DonationResponse = require('../models/DonationResponse');
const Notification = require('../models/Notification');

const DEFAULT_PASSWORD = 'password123';

const seedDatabase = async () => {
  console.log('[Seed] Clearing existing collections...');
  await Promise.all([
    User.deleteMany({}),
    DonorProfile.deleteMany({}),
    HospitalProfile.deleteMany({}),
    BloodRequest.deleteMany({}),
    DonationResponse.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  console.log('[Seed] Creating Administrator account...');
  const adminUser = await User.create({
    email: 'admin@bloodbridge.org',
    password: DEFAULT_PASSWORD,
    role: 'admin',
    isActive: true,
  });

  console.log('[Seed] Creating Hospitals...');
  // 1. Verified Hospital
  const hospitalUser1 = await User.create({
    email: 'hospital@example.com',
    password: DEFAULT_PASSWORD,
    role: 'hospital',
    isActive: true,
  });

  const hospitalProfile1 = await HospitalProfile.create({
    user: hospitalUser1._id,
    hospitalName: 'Sunrise Multispeciality Hospital',
    registrationNumber: 'KA-HOSP-4821',
    contactPerson: 'Dr. Priya Menon',
    phone: '+91 80000 12345',
    city: 'MG Road, Bengaluru',
    address: '12 MG Road, Bengaluru 560001',
    latitude: 12.9716,
    longitude: 77.5946,
    verified: true,
    verifiedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000),
    verifiedBy: adminUser._id,
    verificationNotes: 'Verified against state medical registry.',
  });

  // 2. Unverified Hospital (pending Admin verification demo)
  const hospitalUser2 = await User.create({
    email: 'metro@example.com',
    password: DEFAULT_PASSWORD,
    role: 'hospital',
    isActive: true,
  });

  await HospitalProfile.create({
    user: hospitalUser2._id,
    hospitalName: 'Metro Care Blood Center',
    registrationNumber: 'KA-BC-9082',
    contactPerson: 'Dr. Anand Kumar',
    phone: '+91 80000 54321',
    city: 'Indiranagar, Bengaluru',
    address: '88 100ft Road, Indiranagar, Bengaluru 560038',
    latitude: 12.9784,
    longitude: 77.6408,
    verified: false, // Pending verification
    verificationNotes: 'Pending document validation.',
  });

  console.log('[Seed] Creating Donors...');
  const donorSeeds = [
    {
      email: 'aarav@example.com',
      name: 'Aarav Sharma',
      bloodGroup: 'O-',
      phone: '+91 90000 00001',
      city: 'Koramangala, Bengaluru',
      latitude: 12.9352,
      longitude: 77.6245,
      available: true,
      verified: true,
      age: 28,
      gender: 'male',
      lastDonationDate: new Date('2025-08-14'),
      eligibility: { isEligible: true, weightKg: 72, notes: 'Eligible regular donor' },
    },
    {
      email: 'diya@example.com',
      name: 'Diya Patel',
      bloodGroup: 'O+',
      phone: '+91 90000 00002',
      city: 'Indiranagar, Bengaluru',
      latitude: 12.9784,
      longitude: 77.6408,
      available: true,
      verified: true,
      age: 24,
      gender: 'female',
      lastDonationDate: new Date('2025-05-02'),
      eligibility: { isEligible: true, weightKg: 58, notes: 'Eligible regular donor' },
    },
    {
      email: 'vivaan@example.com',
      name: 'Vivaan Reddy',
      bloodGroup: 'A+',
      phone: '+91 90000 00003',
      city: 'Yelahanka, Bengaluru',
      latitude: 13.0358,
      longitude: 77.597,
      available: false, // Currently unavailable
      verified: true,
      age: 32,
      gender: 'male',
      lastDonationDate: new Date('2025-09-20'),
      eligibility: { isEligible: true, weightKg: 78, notes: 'Traveling out of station' },
    },
    {
      email: 'ananya@example.com',
      name: 'Ananya Iyer',
      bloodGroup: 'B+',
      phone: '+91 90000 00004',
      city: 'Jayanagar, Bengaluru',
      latitude: 12.9081,
      longitude: 77.6476,
      available: true,
      verified: false,
      age: 22,
      gender: 'female',
      lastDonationDate: new Date('2024-12-11'),
      eligibility: { isEligible: true, weightKg: 54, notes: 'First-time registered donor' },
    },
    {
      email: 'kabir@example.com',
      name: 'Kabir Nair',
      bloodGroup: 'AB+',
      phone: '+91 90000 00005',
      city: 'Whitefield, Bengaluru',
      latitude: 12.9698,
      longitude: 77.75,
      available: true,
      verified: true,
      age: 29,
      gender: 'male',
      lastDonationDate: new Date('2025-06-30'),
      eligibility: { isEligible: true, weightKg: 70, notes: 'Eligible' },
    },
    {
      email: 'meera@example.com',
      name: 'Meera Rao',
      bloodGroup: 'A-',
      phone: '+91 90000 00006',
      city: 'Banashankari, Bengaluru',
      latitude: 12.8452,
      longitude: 77.6602,
      available: true,
      verified: true,
      age: 27,
      gender: 'female',
      lastDonationDate: new Date('2025-02-18'),
      eligibility: { isEligible: true, weightKg: 56, notes: 'Eligible' },
    },
    {
      email: 'rohan@example.com',
      name: 'Rohan Gupta',
      bloodGroup: 'B-',
      phone: '+91 90000 00007',
      city: 'Hebbal, Bengaluru',
      latitude: 13.0827,
      longitude: 77.5877,
      available: true,
      verified: true,
      age: 35,
      gender: 'male',
      lastDonationDate: new Date('2025-07-22'),
      eligibility: { isEligible: true, weightKg: 75, notes: 'Eligible' },
    },
    {
      email: 'sara@example.com',
      name: 'Sara Khan',
      bloodGroup: 'AB-',
      phone: '+91 90000 00008',
      city: 'Rajajinagar, Bengaluru',
      latitude: 12.997,
      longitude: 77.571,
      available: false,
      verified: true,
      age: 30,
      gender: 'female',
      lastDonationDate: new Date('2025-10-01'),
      eligibility: { isEligible: true, weightKg: 60, notes: 'Recently donated' },
    },
    {
      email: 'ishaan@example.com',
      name: 'Ishaan Verma',
      bloodGroup: 'O-',
      phone: '+91 90000 00009',
      city: 'Shivajinagar, Bengaluru',
      latitude: 12.925,
      longitude: 77.5938,
      available: true,
      verified: true,
      age: 26,
      gender: 'male',
      lastDonationDate: new Date('2025-04-09'),
      eligibility: { isEligible: true, weightKg: 68, notes: 'Universal donor O-' },
    },
    {
      email: 'nisha@example.com',
      name: 'Nisha Menon',
      bloodGroup: 'O+',
      phone: '+91 90000 00010',
      city: 'Marathahalli, Bengaluru',
      latitude: 12.962,
      longitude: 77.7,
      available: true,
      verified: true,
      age: 31,
      gender: 'female',
      lastDonationDate: new Date('2025-08-01'),
      eligibility: { isEligible: true, weightKg: 59, notes: 'Eligible' },
    },
  ];

  const createdDonors = [];
  for (const item of donorSeeds) {
    const user = await User.create({
      email: item.email,
      password: DEFAULT_PASSWORD,
      role: 'donor',
      isActive: true,
    });

    const profile = await DonorProfile.create({
      user: user._id,
      name: item.name,
      bloodGroup: item.bloodGroup,
      phone: item.phone,
      city: item.city,
      latitude: item.latitude,
      longitude: item.longitude,
      available: item.available,
      verified: item.verified,
      age: item.age,
      gender: item.gender,
      lastDonationDate: item.lastDonationDate,
      eligibility: item.eligibility,
      donationCount: item.lastDonationDate ? 3 : 0,
    });

    createdDonors.push({ user, profile });
  }

  console.log('[Seed] Creating Blood Requests...');
  // Request 1: O- Emergency
  const req1 = await BloodRequest.create({
    hospital: hospitalUser1._id,
    hospitalName: hospitalProfile1.hospitalName,
    patientName: 'Ramesh Kumar (ICU Ward 3)',
    bloodGroup: 'O-',
    units: 2,
    urgency: 'high',
    city: 'MG Road, Bengaluru',
    address: '12 MG Road, Bengaluru',
    contactPhone: hospitalProfile1.phone,
    latitude: 12.9716,
    longitude: 77.5946,
    radiusKm: 25,
    notes: 'Trauma case in ICU. Continuous requirement.',
    status: 'sent',
    requiredBy: new Date(Date.now() + 24 * 3600 * 1000),
  });

  // Request 2: B+ Surgery
  const req2 = await BloodRequest.create({
    hospital: hospitalUser1._id,
    hospitalName: hospitalProfile1.hospitalName,
    patientName: 'Suman Rao (OT 2)',
    bloodGroup: 'B+',
    units: 1,
    urgency: 'medium',
    city: 'MG Road, Bengaluru',
    address: '12 MG Road, Bengaluru',
    contactPhone: hospitalProfile1.phone,
    latitude: 12.9716,
    longitude: 77.5946,
    radiusKm: 20,
    notes: 'Scheduled orthopedic surgery.',
    status: 'pending',
    requiredBy: new Date(Date.now() + 48 * 3600 * 1000),
  });

  // Request 3: A+ Completed
  const req3 = await BloodRequest.create({
    hospital: hospitalUser1._id,
    hospitalName: hospitalProfile1.hospitalName,
    patientName: 'Kavita Das',
    bloodGroup: 'A+',
    units: 3,
    urgency: 'low',
    city: 'MG Road, Bengaluru',
    address: '12 MG Road, Bengaluru',
    contactPhone: hospitalProfile1.phone,
    latitude: 12.9716,
    longitude: 77.5946,
    radiusKm: 15,
    notes: 'Elective procedure, stock replenishment.',
    status: 'completed',
    requiredBy: new Date(Date.now() - 48 * 3600 * 1000),
  });

  console.log('[Seed] Creating Donation Responses...');
  // Find Aarav (O-)
  const aarav = createdDonors.find((d) => d.profile.bloodGroup === 'O-');
  if (aarav) {
    await DonationResponse.create({
      requestId: req1._id,
      donorId: aarav.user._id,
      hospitalId: hospitalUser1._id,
      requestBloodGroup: req1.bloodGroup,
      hospitalName: req1.hospitalName,
      donorName: aarav.profile.name,
      donorBloodGroup: aarav.profile.bloodGroup,
      donorPhone: aarav.profile.phone,
      status: 'sent',
      message: 'Urgent emergency ICU requirement.',
    });

    await Notification.create({
      userId: aarav.user._id,
      title: 'New donation request',
      body: `${req1.hospitalName} needs ${req1.bloodGroup} blood urgently.`,
      link: '/donor',
    });
  }

  // Find Diya (O+) for req3 completed response
  const diya = createdDonors.find((d) => d.profile.bloodGroup === 'O+');
  if (diya) {
    await DonationResponse.create({
      requestId: req3._id,
      donorId: diya.user._id,
      hospitalId: hospitalUser1._id,
      requestBloodGroup: req3.bloodGroup,
      hospitalName: req3.hospitalName,
      donorName: diya.profile.name,
      donorBloodGroup: diya.profile.bloodGroup,
      donorPhone: diya.profile.phone,
      status: 'completed',
      message: 'Elective surgery stock replenishment.',
      respondedAt: new Date(Date.now() - 70 * 3600 * 1000),
      completedAt: new Date(Date.now() - 50 * 3600 * 1000),
    });
  }

  console.log('[Seed] Database successfully seeded!');
  return {
    admin: { email: adminUser.email, password: DEFAULT_PASSWORD },
    hospital: { email: hospitalUser1.email, password: DEFAULT_PASSWORD },
    donors: createdDonors.map((d) => ({ email: d.user.email, group: d.profile.bloodGroup })),
  };
};

module.exports = { seedDatabase };
