const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  name: { type: String, required: true },
  id: { type: String, required: true },
  product_id: { type: String, required: true },
  number_of_visits: { type: Number, required: true, default: 0 },
  unique_identifier: { type: String, unique: true }
});
visitSchema.index({ id: 1 }, { unique: true });

const utmLinkSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  product_name: { type: String, required: true },
  url: { type: String, required: true }
});

const metadataSchema = new mongoose.Schema({
  lastProcessedSinceId: String
});

const feedOfOrdersSchema = new mongoose.Schema({
  orders: { type: Array, required: true },
  limit: { type: Number, required: true,default: 0 },
  offset: { type: Number, required: true,default: 0 },
  count : {type :Number, required :true,default: 0}
});

const utmLinkKcpcSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  product_name: { type: String, required: true },
  url: { type: String, required: true }
});


const Visit = mongoose.model('Visit', visitSchema);
const ProductLinkData = mongoose.model('ProductLink', utmLinkSchema);
const Metadata = mongoose.model('Metadata', metadataSchema);
const FeedOfOrders = mongoose.model('FeedOfOrders', feedOfOrdersSchema);
const ProductLinkKcpcData = mongoose.model('ProductLinkKcpc', utmLinkKcpcSchema);

module.exports ={ Visit,ProductLinkData,Metadata,FeedOfOrders,ProductLinkKcpcData };





