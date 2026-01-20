import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.chatMessage.deleteMany();
  await prisma.conversationParticipant.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.workerService.deleteMany();
  await prisma.worker.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.user.deleteMany();
  await prisma.serviceCategory.deleteMany();

  console.log('✅ Cleaned existing data');

  // Create Service Categories
  const categories = await Promise.all([
    prisma.serviceCategory.create({
      data: {
        name: 'Plumber',
        nameLocal: 'Plumber',
        description: 'Pipe repairs, installations, and water system maintenance',
        iconUrl: '🔧',
        sortOrder: 1,
        isActive: true,
      },
    }),
    prisma.serviceCategory.create({
      data: {
        name: 'Electrician',
        nameLocal: 'Electrician',
        description: 'Electrical repairs, wiring, and installations',
        iconUrl: '⚡',
        sortOrder: 2,
        isActive: true,
      },
    }),
    prisma.serviceCategory.create({
      data: {
        name: 'Phone Repair',
        nameLocal: 'Phone Repair',
        description: 'Mobile phone screen repairs and fixes',
        iconUrl: '📱',
        sortOrder: 3,
        isActive: true,
      },
    }),
    prisma.serviceCategory.create({
      data: {
        name: 'House Cleaning',
        nameLocal: 'Cleaning',
        description: 'Home and office cleaning services',
        iconUrl: '🧹',
        sortOrder: 4,
        isActive: true,
      },
    }),
    prisma.serviceCategory.create({
      data: {
        name: 'Carpenter',
        nameLocal: 'Carpenter',
        description: 'Furniture repair and woodwork',
        iconUrl: '🪚',
        sortOrder: 5,
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${categories.length} service categories`);

  // Create Admin User
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      phone: '0200000000',
      email: 'admin@quickserve.com',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Created admin user');

  // Create Customer Users
  const customers = await Promise.all([
    prisma.user.create({
      data: {
        phone: '0241234567',
        firstName: 'Kwame',
        lastName: 'Asante',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        latitude: 5.6037,
        longitude: -0.1870,
        address: 'Osu, Accra',
      },
    }),
    prisma.user.create({
      data: {
        phone: '0551234567',
        firstName: 'Ama',
        lastName: 'Mensah',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        latitude: 5.5913,
        longitude: -0.2219,
        address: 'Dansoman, Accra',
      },
    }),
    prisma.user.create({
      data: {
        phone: '0271234567',
        firstName: 'Kofi',
        lastName: 'Boateng',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        latitude: 5.6145,
        longitude: -0.2053,
        address: 'Cantonments, Accra',
      },
    }),
  ]);

  console.log(`✅ Created ${customers.length} customer users`);

  // Create Worker Users and Worker Profiles
  const workerData = [
    {
      user: {
        phone: '0242222222',
        firstName: 'Emmanuel',
        lastName: 'Owusu',
        role: 'WORKER' as const,
        status: 'ACTIVE' as const,
      },
      worker: {
        bio: 'Experienced plumber with 10+ years in residential and commercial plumbing. Fast, reliable service.',
        verificationStatus: 'VERIFIED' as const,
        isOnline: true,
        currentLatitude: 5.5950,
        currentLongitude: -0.1850,
        totalJobsCompleted: 156,
        averageRating: 4.8,
        totalReviews: 89,
      },
      services: [
        { categoryIndex: 0, basePrice: 50, description: 'Pipe repairs, leak fixes, and bathroom plumbing' },
      ],
    },
    {
      user: {
        phone: '0243333333',
        firstName: 'Abena',
        lastName: 'Darko',
        role: 'WORKER' as const,
        status: 'ACTIVE' as const,
      },
      worker: {
        bio: 'Licensed electrician specializing in home wiring and solar installations. Safety first!',
        verificationStatus: 'VERIFIED' as const,
        isOnline: true,
        currentLatitude: 5.6100,
        currentLongitude: -0.1900,
        totalJobsCompleted: 203,
        averageRating: 4.9,
        totalReviews: 124,
      },
      services: [
        { categoryIndex: 1, basePrice: 80, description: 'Electrical repairs, troubleshooting, and house wiring' },
      ],
    },
    {
      user: {
        phone: '0244444444',
        firstName: 'Yaw',
        lastName: 'Acheampong',
        role: 'WORKER' as const,
        status: 'ACTIVE' as const,
      },
      worker: {
        bio: 'Phone repair specialist. iPhone, Samsung, Tecno - all brands welcome. Quick turnaround.',
        verificationStatus: 'VERIFIED' as const,
        isOnline: true,
        currentLatitude: 5.5800,
        currentLongitude: -0.2000,
        totalJobsCompleted: 312,
        averageRating: 4.7,
        totalReviews: 201,
      },
      services: [
        { categoryIndex: 2, basePrice: 30, description: 'Screen, battery replacement, and water damage repair' },
      ],
    },
    {
      user: {
        phone: '0245555555',
        firstName: 'Akosua',
        lastName: 'Frimpong',
        role: 'WORKER' as const,
        status: 'ACTIVE' as const,
      },
      worker: {
        bio: 'Professional cleaning services for homes and offices. Eco-friendly products used.',
        verificationStatus: 'VERIFIED' as const,
        isOnline: false,
        currentLatitude: 5.6200,
        currentLongitude: -0.1750,
        totalJobsCompleted: 89,
        averageRating: 4.6,
        totalReviews: 45,
      },
      services: [
        { categoryIndex: 3, basePrice: 100, description: 'Home and office cleaning, deep cleaning available' },
      ],
    },
    {
      user: {
        phone: '0246666666',
        firstName: 'Kwesi',
        lastName: 'Appiah',
        role: 'WORKER' as const,
        status: 'ACTIVE' as const,
      },
      worker: {
        bio: 'Master carpenter with expertise in custom furniture and repairs. Quality craftsmanship guaranteed.',
        verificationStatus: 'VERIFIED' as const,
        isOnline: true,
        currentLatitude: 5.5700,
        currentLongitude: -0.2100,
        totalJobsCompleted: 67,
        averageRating: 4.9,
        totalReviews: 38,
      },
      services: [
        { categoryIndex: 4, basePrice: 120, description: 'Furniture repairs, custom making, door and window repairs' },
      ],
    },
    {
      user: {
        phone: '0247777777',
        firstName: 'Efua',
        lastName: 'Sarpong',
        role: 'WORKER' as const,
        status: 'ACTIVE' as const,
      },
      worker: {
        bio: 'Plumbing and electrical combo services. One call for all your home repair needs!',
        verificationStatus: 'PENDING' as const,
        isOnline: false,
        currentLatitude: 5.5850,
        currentLongitude: -0.1950,
        totalJobsCompleted: 0,
        averageRating: 0,
        totalReviews: 0,
      },
      services: [
        { categoryIndex: 0, basePrice: 60, description: 'Basic plumbing services' },
        { categoryIndex: 1, basePrice: 70, description: 'Basic electrical services' },
      ],
    },
  ];

  const workers = [];
  for (const data of workerData) {
    const user = await prisma.user.create({ data: data.user });
    const worker = await prisma.worker.create({
      data: {
        userId: user.id,
        ...data.worker,
        verifiedAt: data.worker.verificationStatus === 'VERIFIED' ? new Date() : null,
      },
    });

    // Create worker services
    for (const service of data.services) {
      await prisma.workerService.create({
        data: {
          workerId: worker.id,
          categoryId: categories[service.categoryIndex].id,
          basePrice: service.basePrice,
          priceUnit: 'per_job',
          description: service.description,
          isActive: true,
        },
      });
    }

    workers.push(worker);
  }

  console.log(`✅ Created ${workers.length} workers with services`);

  // Create Sample Bookings
  const bookings = await Promise.all([
    prisma.booking.create({
      data: {
        customerId: customers[0].id,
        workerId: workers[0].id,
        categoryId: categories[0].id,
        description: 'Kitchen sink is leaking. Need urgent repair.',
        latitude: 5.6037,
        longitude: -0.1870,
        address: 'Osu, Accra',
        status: 'COMPLETED',
        estimatedPrice: 50,
        finalPrice: 55,
        startedAt: new Date(Date.now() - 86400000 * 3),
        completedAt: new Date(Date.now() - 86400000 * 3 + 3600000),
      },
    }),
    prisma.booking.create({
      data: {
        customerId: customers[1].id,
        workerId: workers[1].id,
        categoryId: categories[1].id,
        description: 'Power outlet not working in living room',
        latitude: 5.5913,
        longitude: -0.2219,
        address: 'Dansoman, Accra',
        status: 'COMPLETED',
        estimatedPrice: 80,
        finalPrice: 80,
        startedAt: new Date(Date.now() - 86400000 * 2),
        completedAt: new Date(Date.now() - 86400000 * 2 + 7200000),
      },
    }),
    prisma.booking.create({
      data: {
        customerId: customers[2].id,
        workerId: workers[2].id,
        categoryId: categories[2].id,
        description: 'iPhone 13 screen cracked, need replacement',
        latitude: 5.6145,
        longitude: -0.2053,
        address: 'Cantonments, Accra',
        status: 'IN_PROGRESS',
        estimatedPrice: 30,
        startedAt: new Date(),
      },
    }),
    prisma.booking.create({
      data: {
        customerId: customers[0].id,
        workerId: workers[3].id,
        categoryId: categories[3].id,
        description: 'Need deep cleaning for 4-bedroom house',
        latitude: 5.6037,
        longitude: -0.1870,
        address: 'Osu, Accra',
        status: 'ACCEPTED',
        estimatedPrice: 200,
        scheduledAt: new Date(Date.now() + 86400000),
      },
    }),
    prisma.booking.create({
      data: {
        customerId: customers[1].id,
        categoryId: categories[4].id,
        description: 'Wardrobe door broken, need repair',
        latitude: 5.5913,
        longitude: -0.2219,
        address: 'Dansoman, Accra',
        status: 'PENDING',
        estimatedPrice: 120,
      },
    }),
  ]);

  console.log(`✅ Created ${bookings.length} bookings`);

  // Create Reviews for completed bookings
  const reviews = await Promise.all([
    prisma.review.create({
      data: {
        bookingId: bookings[0].id,
        customerId: customers[0].id,
        workerId: workers[0].id,
        rating: 5,
        comment: 'Emmanuel was very professional and fixed the leak quickly. Highly recommended!',
      },
    }),
    prisma.review.create({
      data: {
        bookingId: bookings[1].id,
        customerId: customers[1].id,
        workerId: workers[1].id,
        rating: 5,
        comment: 'Abena is an excellent electrician. Very knowledgeable and thorough. Will use again!',
      },
    }),
  ]);

  console.log(`✅ Created ${reviews.length} reviews`);

  // Create Payments for completed bookings
  const payments = await Promise.all([
    prisma.payment.create({
      data: {
        bookingId: bookings[0].id,
        amount: 55,
        currency: 'GHS',
        method: 'MTN_MOMO',
        status: 'COMPLETED',
        paidAt: new Date(Date.now() - 86400000 * 3 + 3600000),
        providerRef: 'MTN_REF_001',
      },
    }),
    prisma.payment.create({
      data: {
        bookingId: bookings[1].id,
        amount: 80,
        currency: 'GHS',
        method: 'MTN_MOMO',
        status: 'COMPLETED',
        paidAt: new Date(Date.now() - 86400000 * 2 + 7200000),
        providerRef: 'MTN_REF_002',
      },
    }),
  ]);

  console.log(`✅ Created ${payments.length} payments`);

  // Create Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: customers[0].id,
        type: 'SERVICE_COMPLETED',
        title: 'Service Completed',
        body: 'Your plumbing service has been completed. Please leave a review!',
        read: true,
      },
      {
        userId: customers[1].id,
        type: 'SERVICE_COMPLETED',
        title: 'Service Completed',
        body: 'Your electrical service has been completed. Please leave a review!',
        read: true,
      },
      {
        userId: customers[2].id,
        type: 'BOOKING_ACCEPTED',
        title: 'Booking Accepted',
        body: 'Yaw has accepted your phone repair request and is working on it.',
        read: false,
      },
      {
        userId: workers[0].userId,
        type: 'PAYMENT_RECEIVED',
        title: 'Payment Received',
        body: 'You have received GH₵55 for your plumbing service.',
        read: true,
      },
      {
        userId: workers[4].userId,
        type: 'BOOKING_REQUEST',
        title: 'New Job Request',
        body: 'You have a new wardrobe repair request in Dansoman.',
        read: false,
      },
    ],
  });

  console.log('✅ Created notifications');

  console.log('\n🎉 Database seeding completed!\n');
  console.log('📊 Summary:');
  console.log(`   - ${categories.length} service categories`);
  console.log(`   - 1 admin user (phone: 0200000000, password: admin123)`);
  console.log(`   - ${customers.length} customer users`);
  console.log(`   - ${workers.length} workers`);
  console.log(`   - ${bookings.length} bookings`);
  console.log(`   - ${reviews.length} reviews`);
  console.log(`   - ${payments.length} payments`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
