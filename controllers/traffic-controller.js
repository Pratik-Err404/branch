const  {Visit,ProductLinkData,ProductLinkKcpcData,FeedOfOrders} = require('../models/visits');
const axios = require('axios');
const { Builder, By, key,until } = require('selenium-webdriver');
const request = require('request-promise-native');
const schedule = require('node-schedule');

const loginMiddleware = async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).send('Email and password are required');
  }
  let authToken = null;
  if (!authToken) {
    const loginUrl = 'https://api.goaffpro.com/v1/user/login';
    const credentials = {
      email: email,    
      password: password 
    };
    try {
      const response = await axios.post(loginUrl, credentials, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      authToken = response.data.access_token; 
      console.log("token-->",authToken)
      req.authToken = authToken; 
      // next(); 
    } catch (err) {
      console.error('Error logging in:', err);
      return res.status(500).send('Failed to obtain auth token');
    }
  } else {
    req.authToken = authToken; 
    // next();
  }
};

const fetchAndProcessTrafficVisits = async (req, res) => {
  try {
  const limit = 5;
  let offset = 0;
  let hasMoreData = true;
  const apiUrl = 'https://api.goaffpro.com/v1/user/feed/traffic?site_ids=7066332&start_time=2024-07-11&end_time=2024-07-21';
 
  while (hasMoreData) {
    try {
      const response = await axios.get(apiUrl, {
        headers: {
          'Authorization': `Bearer ${req.authToken}`,
          'accept': 'application/json'
        },
        params: {
          limit: limit,
          offset: offset
        }
      });
      console.log("AuthToken-->",req.authToken)
      const visitsData = response.data.traffic;
      if (visitsData.length === 0) {
        hasMoreData = false;
        break;
      }

      // Count visits for each product-source pair
      const visitCounts = visitsData.reduce((acc, visit) => {
        if (!visit.landing_page) {
          return acc; 
        }
        const landingPageParts = visit.landing_page.split('/products/');
        if (landingPageParts.length < 2) {
          return acc; // Skip if landing_page doesn't have the expected format
        }

        const product = landingPageParts[1].split('?')[0];
        const url = new URL(visit.landing_page);
        const source = url.searchParams.get('utm_source');
        if (source) {
          const key = `${product}-${source}`;

          if (acc[key]) {
            acc[key].number_of_visits += 1;
          } else {
            acc[key] = {
              name: visit.sub_id || 'Unknown',
              id: visit.sub_id,
              product_id: product,
              number_of_visits: 1,
              unique_identifier: visit.sub_id,
            };
          }
        }
        return acc;
      }, {});
      const visits = Object.values(visitCounts);
      console.log("Final visits data:", JSON.stringify(visits, null, 2));

      for (let visit of visits) {
        const existingVisit = await Visit.findOne({ name: visit.name });

        if (existingVisit) {
          // Update the number_of_visits 
          existingVisit.number_of_visits += visit.number_of_visits;
          await existingVisit.save();
          console.log(`Updated visit for ${visit.name}`);
        } else {
          // Create a new document
          await Visit.create(visit);
          console.log(`Created new visit for ${visit.name}`);
        }
      }

      offset += limit;
     } catch (err) {
      console.error('Error fetching or saving visits:', err);
      hasMoreData = false;
    }
  }
  res.status(201).send('Visits saved successfully');
 } 
 catch (err) {
  console.error('Error fetching or saving visits:', err);
  res.status(500).send('Error fetching or saving visits: ' + err.message);
}
};

// schedule.scheduleJob("my-job", '*/10 * * * * *', async () => {
//   console.log("Scheduled job running...");
//   try {
//     await fetchAndProcessVisits();
//   } catch (err) {
//     console.error('Error in scheduled job:', err);
//   }
  
// });

// const generateUTMlink = (req, res) => {
//   try {
//     const { link } = req.body;
//     const { utm_source, utm_medium,utm_campaign,utm_content,utm_term } = req.query;

//     if (!link || !utm_source || !utm_medium || !utm_campaign) {
//       return res.status(400).send('Link, utm_source, utm_medium, and utm_campaign are required.');
//     }
//     let url = new URL(link);
//     url.searchParams.append('utm_source', utm_source);
//     url.searchParams.append('utm_medium', utm_medium);
//     url.searchParams.append('utm_campaign', utm_campaign);

//     if (utm_content) {
//       url.searchParams.append('utm_content', utm_content);
//     }
//     if (utm_term) {
//       url.searchParams.append('utm_term', utm_term);
//     }
//     res.status(200).json({ modifiedLink: url.href });
//   } catch (error) {
//     console.error('Error processing the link:', error);
//     res.status(500).send('Error processing the link: ' + error.message);
//   }
// };

const generateUtmLinks = async (req, res) => {
  let driver;
  try {
    const { link } = req.body; 
    const { utm_source, utm_medium, utm_campaign, utm_content, utm_term } = req.query;

    if (!link || !utm_source || !utm_medium || !utm_campaign ) {
      return res.status(400).send('Link, utm_source, utm_medium, utm_campaign, username, and password are required.');
    }

    function extractProductName(url) {
      const productNameMatch = url.match(/products\/([^?]+)/);
      return productNameMatch ? productNameMatch[1] : null;
    }
    const productName = extractProductName(link);
     console.log("product_name",productName);

const existingProductLink = await ProductLinkData.findOne({ user_id:utm_source, product_name: productName });
    if (existingProductLink) {
      return res.status(400).send('Product link already exists for this user.');
    }
    let url = new URL(link);
    url.searchParams.append('utm_source', utm_source);
    url.searchParams.append('utm_medium', utm_medium);
    url.searchParams.append('utm_campaign', utm_campaign);
    console.log("s0")

    if (utm_content) {
      url.searchParams.append('utm_content', utm_content);
    }
    if (utm_term) {
      url.searchParams.append('utm_term', utm_term);
    }


    const modifiedLink = url.href;

     driver = await new Builder().forBrowser('chrome').build();
    try {
      await driver.get('https://nature4nature.goaffpro.com/login'); 
      await driver.wait(until.titleIs('Login'), 10000); 

      await driver.wait(until.elementLocated(By.css('.btn.btn-light.d-block.w-100')), 10000);
        const googleLoginButton = await driver.findElement(By.css('.btn.btn-light.d-block.w-100'));
        await googleLoginButton.click();
        await driver.sleep(3000);
        const windows = await driver.getAllWindowHandles();
        console.log('Window handles:');

        if (windows.length > 1) {
            await driver.switchTo().window(windows[1]);
        } else {
            // Check if the URL changed
            const currentUrl = await driver.getCurrentUrl();
            if (currentUrl.includes('google.com')) {
                console.log('Google login page opened in the same window.');
            } else {
                console.error('No new window found and the URL did not change.');
                return;
            }
        }
        
        await driver.wait(until.elementLocated(By.id('identifierId')), 15000);
        const emailInput = await driver.findElement(By.id('identifierId'));
        await emailInput.sendKeys('guru@froker.in');
        await driver.sleep(3000);
        await driver.wait(until.elementLocated(By.xpath('//span[contains(text(), "Next")]/parent::button')), 15000);
        const nextButton = await driver.findElement(By.xpath('//span[contains(text(), "Next")]/parent::button'));
        await nextButton.click();

        const passwordInputLocator = By.name('Passwd');
        await driver.wait(until.elementLocated(passwordInputLocator), 20000);
        await driver.wait(until.elementIsVisible(driver.findElement(passwordInputLocator)), 20000);
        const passwordInput = await driver.findElement(passwordInputLocator); // Scroll into view if necessary
        await driver.executeScript("arguments[0].scrollIntoView(true);", passwordInput);
         
        await driver.wait(until.elementIsEnabled(passwordInput), 20000); // Ensure the password input is clickable
        await driver.sleep(3000);
        await passwordInput.sendKeys('Froker@4321');
        await driver.sleep(3000);
        await driver.wait(until.elementLocated(By.xpath("//button[span[text()='Next']]")), 40000);
        await driver.wait(until.elementIsVisible(driver.findElement(By.xpath("//button[span[text()='Next']]"))), 40000);
        const nextButton1 = await driver.findElement(By.xpath("//button[span[text()='Next']]"));
        try {
          await nextButton1.click();
                 } catch (error) {
             if (error.name === 'StaleElementReferenceError') {
              nextButton1 = await driver.findElement(By.xpath("//button[span[text()='Next']]"));
                               await nextButton1.click();
             } else {
                 throw error;
             }
         }
         
        await driver.wait(until.elementLocated(By.xpath('//a[contains(text(), "Marketing Tools")]')), 30000);
    const marketingToolsLink = await driver.findElement(By.xpath('//a[contains(text(), "Marketing Tools")]'));
    await driver.sleep(2000);

    await marketingToolsLink.click();

    await driver.wait(until.urlIs('https://nature4nature.goaffpro.com/products'), 50000);

      const linkInput = await driver.findElement(By.css('form.row.g-3.align-items-start .col-md-6 input.form-control'));
        await driver.wait(until.elementIsVisible(linkInput), 60000);
        await driver.sleep(2000);
        await linkInput.clear();
        await linkInput.sendKeys(modifiedLink);
        await driver.sleep(2000);
        const saveButton = await driver.findElement(By.css('.d-flex .btn.btn-link[title="Save"]'));
        await saveButton.click();
        await driver.sleep(1000);
      const linkInput1 = await driver.findElement(By.css('form.row.g-3.align-items-start .col-md-6:nth-of-type(2) input.form-control'));
    const url = await linkInput1.getAttribute('value');

    const urlParams = new URLSearchParams(url.split('?')[1]);
    const utmSource = urlParams.get('utm_source');

console.log("s1")
    const newProductLink = new ProductLinkData({
      user_id:utmSource,
      product_name: productName,
      url:url
    });
    console.log("s2")

    // Save the new document to the database
    await newProductLink.save();
    console.log("s3")
    console.log("database",)

    res.status(200).send({
      user_id:utmSource,
      product_name: productName,
      url:url
    });
    } catch (err) {
      console.error('Error with Selenium automation:', err);
      res.status(500).send('Error with Selenium automation: ' + err.message);
    } finally {
      await driver.quit();
    }
  } catch (error) {
    console.error('Error processing the request:', error);
    res.status(500).send('Error processing the request: ' + error.message);
  }
};

const feedOfOrders = async (req, res) => {
  let limit = 10;
  let offset = 0;
  const orderUrl = 'https://api.goaffpro.com/v1/user/feed/orders?site_ids=7066332&since_id=0&max_id=0&created_at_max=2024-08-01&created_at_min=2014-08-03&fields=id,number,total,subtotal,line_items,commission,created_at,currency,site_id,sub_id,conversion_details';
  
  let hasMoreData = true;
  let allOrders = []; // Accumulate all unique orders

  while (hasMoreData) {
    try {
      const response = await axios.get(orderUrl, {
        headers: {
          'Authorization': `Bearer ${req.authToken}`,
          'accept': 'application/json'
        },
        params: {
          limit: limit,
          offset: offset
        }
      });

      const newOrders = response.data.orders;
      // Break the loop if no new orders are returned
      if (newOrders.length === 0) {
        hasMoreData = false;
        break;
      }
      allOrders.push(...newOrders); 
      offset += limit; 
    } catch (error) {
      console.error("Error fetching orders", error);
      return res.status(500).json({ message: 'Error fetching orders', error });
    }
  }
  try {
    let feedOfOrders = await FeedOfOrders.findOne({});
    if (feedOfOrders) {
      const existingOrderIds = feedOfOrders.orders.map(order => order.id); // Assuming 'id' is the unique identifier for orders
      const uniqueNewOrders = allOrders.filter(order => !existingOrderIds.includes(order.id)); 
      feedOfOrders.orders.push(...uniqueNewOrders);
      feedOfOrders.limit = limit;
      feedOfOrders.offset = offset;
      feedOfOrders.count = feedOfOrders.orders.length;
    } else {
      feedOfOrders = new FeedOfOrders({ 
        orders: allOrders,
        limit: limit,
        offset: offset,
        count: allOrders.length
      });
    }
    await feedOfOrders.save();
    res.status(201).json({ message: 'Orders saved successfully' });
  } catch (error) {
    console.error("Error saving orders", error);
    res.status(500).json({ message: 'Error saving orders', error });
  }
};


//KCPC
const generateUtmLinksKcpc = async (req, res) => {
  try {
    const { link } = req.body; 
    const { utm_source, utm_medium, utm_campaign, utm_content, utm_term } = req.query;
    if (!link || !utm_source || !utm_medium || !utm_campaign) {
      return res.status(400).send('Link, utm_source, utm_medium, utm_campaign are required.');
    }
    const extractProductName = (url) => {
      const productNameMatch = url.match(/products\/([^?]+)/);
      return productNameMatch ? productNameMatch[1] : null;
    };

    const productName = extractProductName(link);
    console.log("product_name", productName);
    const existingProductLink = await ProductLinkKcpcData.findOne({ user_id: utm_source, product_name: productName });
    if (existingProductLink) {
      return res.status(400).send('Product link already exists for this user.');
    }
    const url = new URL(link);
    url.searchParams.append('utm_source', utm_source);
    url.searchParams.append('utm_medium', utm_medium);
    url.searchParams.append('utm_campaign', utm_campaign);

    if (utm_content) {
      url.searchParams.append('utm_content', utm_content);
    }
    if (utm_term) {
      url.searchParams.append('utm_term', utm_term);
    }
    const newProductLinkData = new ProductLinkKcpcData({
      user_id:utm_source,
      product_name: productName,
      url:url
    });
    await newProductLinkData.save();
    console.log("database",)
    res.status(200).send({
      user_id:utm_source,
      product_name: productName,
      url:url
  });
  } catch (error) {
    console.error('Error generating UTM links:', error);
    res.status(500).send('Internal Server Error');
  }
};


module.exports = {
  fetchAndProcessTrafficVisits,
  generateUtmLinks,
  loginMiddleware,
  feedOfOrders,
  generateUtmLinksKcpc
};
