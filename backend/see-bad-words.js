// This is a script to view bad words in`bad-words` package.
const Filter = require('bad-words');
const filter = new Filter();

console.log(JSON.stringify(filter.list, null, 2));
