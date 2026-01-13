const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- กำลังสร้าง Users ทั้งหมดเข้าสู่ hr_db ---');

  const password = 'Password123';
  const hashedPassword = await bcrypt.hash(password, 10);
  const now = new Date();

  const users = [
    {
      email: 'worker.a@company.com',
      firstName: 'Worker',
      lastName: 'A',
      role: 'ADMIN',
    },
    {
      email: 'worker.b@company.com',
      firstName: 'Worker',
      lastName: 'B',
      role: 'EMPLOYEE',
    },
    {
      email: 'hr.manager@company.com',
      firstName: 'HR',
      lastName: 'Manager',
      role: 'MANAGER',
    }
  ];

  for (const user of users) {
    try {
      const createdUser = await prisma.employee.upsert({
        where: { email: user.email },
        update: {},
        create: {
          email: user.email,
          passwordHash: hashedPassword,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: true, // เปลี่ยนจาก status: 'ACTIVE' เป็น isActive: true ตามที่ Schema กำหนด
          joiningDate: now,
        },
      });
      console.log(`✅ สร้าง/ตรวจสอบ User: ${createdUser.email} (Role: ${createdUser.role})`);
    } catch (error) {
      console.error(`❌ ไม่สามารถสร้าง ${user.email} ได้:`, error.message);
    }
  }

  console.log('\n--- เสร็จสิ้น! ทุกคนใช้รหัสผ่าน: Password123 ---');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });