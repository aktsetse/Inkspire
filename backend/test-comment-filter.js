// Import the filter functions
const {
  containsBadWords,
  countWords,
  shouldCreateNotification,
} = require("./utils/commentFilters");

// Wait a moment for the filter to initialize
setTimeout(() => {
  // Test cases
  const testCases = [
    {
      comment: "This is a normal comment with no bad words",
      expected: {
        hasBadWords: false,
        wordCount: 9,
        shouldNotify: true, // No bad words and more than 5 words
      },
    },
    {
      comment: "This comment has a bad word shit but it's longer than 5 words so notification should NOT be sent",
      expected: {
        hasBadWords: true,
        wordCount: 19,
        shouldNotify: false // Has bad words (should not notify regardless of length)
      }
    },
    {
      comment: "Short comment",
      expected: {
        hasBadWords: false,
        wordCount: 2,
        shouldNotify: false, // No bad words, but fewer than 5 words
      },
    },
    {
      comment: "😊 This 😂 comment 🎉 has 🔥 emojis 👍",
      expected: {
        hasBadWords: false,
        wordCount: 4,
        shouldNotify: false, // No bad words but fewer than 5 words (excluding emojis)
      },
    },
    {
      comment: "😊 fuck 😂 you 🎉",
      expected: {
        hasBadWords: true,
        wordCount: 2,
        shouldNotify: false, // Has bad words (should not notify regardless of length)
      },
    },
    {
      comment: "This is a perfectly fine comment",
      expected: {
        hasBadWords: false,
        wordCount: 6,
        shouldNotify: true, // No bad words and more than 5 words
      },
    },
    {
      comment: "Five words only here kawk",
      expected: {
        hasBadWords: true,
        wordCount: 5,
        shouldNotify: false, // Has bad words (should not notify regardless of length)
      },
    },
    {
      comment: "Six words only Test here kawk",
      expected: {
        hasBadWords: true,
        wordCount: 6,
        shouldNotify: false, // Has bad words (should not notify regardless of length)
      },
    },
  ];

  // Run tests
  console.log("TESTING COMMENT FILTER FUNCTIONALITY\n");

  testCases.forEach((test, index) => {
    const hasBadWords = containsBadWords(test.comment);
    const wordCount = countWords(test.comment);
    const shouldNotify = shouldCreateNotification(test.comment);

    console.log(`Test Case ${index + 1}: "${test.comment}"`);
    console.log(
      `Contains bad words: ${hasBadWords} (Expected: ${test.expected.hasBadWords})`
    );
    console.log(
      `Word count (excluding emojis): ${wordCount} (Expected: ${test.expected.wordCount})`
    );
    console.log(
      `Should create notification: ${shouldNotify} (Expected: ${test.expected.shouldNotify})`
    );

    const passed =
      hasBadWords === test.expected.hasBadWords &&
      wordCount === test.expected.wordCount &&
      shouldNotify === test.expected.shouldNotify;

    console.log(`Result: ${passed ? "PASSED ✅" : "FAILED ❌"}`);
    console.log("-----------------------------------");
  });
}, 1000); // Wait 1 second for the filter to initialize
