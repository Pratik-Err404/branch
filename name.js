const { Builder, By, Key, until } = require('selenium-webdriver');

(async function searchTimexWatch() {
    // Create a new instance of the Chrome driver
    let driver = await new Builder().forBrowser('chrome').build();

    try {
        // Navigate to Flipkart
        await driver.get('https://www.flipkart.com/');

        const searchBox = await driver.findElement(By.name('q'));
        await searchBox.sendKeys('Timex watch', Key.RETURN);

        // Wait for the search results to load
        await driver.wait(until.titleContains('Timex watch'), 10000);

        // Get the titles of the search results
        const results = await driver.findElements(By.css('a.s1Q9rs'));
        for (let i = 0; i < results.length; i++) {
            const title = await results[i].getAttribute('title');
            console.log(`Result ${i + 1}: ${title}`);
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        // Quit the driver
        await driver.quit();
    }
})();
