import express from 'express';

// Should load all routes from the file routes/index.js
const routes = require('./routes/index');

const app = express();
/* Should listen on the port set by the environment variable PORT
or by default 5000 */
const port = process.env.PORT || 5000;

// Show port listening
app.listen(port, () => { console.log(`Server running on port ${port}`); });

// jsonify responses
app.use(express.json());
app.use('/', routes);
export default app;
