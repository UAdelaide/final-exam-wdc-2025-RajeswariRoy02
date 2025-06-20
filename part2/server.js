const app = require('./app'); // Import your Express app
const port = process.env.PORT || 3000; // Use port from environment variable or default to 3000

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});