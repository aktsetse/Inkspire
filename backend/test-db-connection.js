const { PrismaClient } = require('./generated/prisma');

async function testConnection() {
  const prisma = new PrismaClient();

  try {
    console.log('Testing database connection...');

    // just testing a simple query
    const userCount = await prisma.user.count();
    console.log(`Connection successful! Found ${userCount} users in the database.`);

    // Test comment creation
    console.log('Testing comment creation...');
    const testComment = await prisma.comment.create({
      data: {
        content: 'This is a test comment',
        book_id: 'test-book-id',
        book_title: 'Test Book',
        userId: 1, // to be sure this user ID exists in database
      }
    });

    console.log('Test comment created successfully:', testComment.id);

    // Clean up the test comment
    await prisma.comment.delete({
      where: { id: testComment.id }
    });

    console.log('Test comment deleted successfully');

  } catch (error) {
    console.error('Connection error ❌', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
