const express = require('express');
const connectDB = require('./db');
const visitController = require('./controllers/traffic-controller');

const app = express();
const port = 3000;

app.use(express.json());
connectDB();

app.post('/visits',visitController.loginMiddleware, visitController.fetchAndProcessTrafficVisits);
app.post('/product-urls',visitController.generateUtmLinks);
app.post('/feed-of-orders',visitController.loginMiddleware,visitController.feedOfOrders);
app.post('/kcpc-product-urls',visitController.generateUtmLinksKcpc);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
