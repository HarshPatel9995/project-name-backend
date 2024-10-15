const express = require("express");
const axios = require("axios");
const xml2js = require("xml2js");
const cors = require("cors"); // Import cors
const bodyParser = require("body-parser");
const cheerio = require("cheerio");
const app = express();
const PORT = 5000;

app.use(cors({ origin: true }));
app.use(bodyParser.json({ limit: "4048mb" }));
app.use(
  bodyParser.urlencoded({
    limit: "4048mb",
    extended: true,
    parameterLimit: 1024000000,
  })
);
app.use(bodyParser.json());

app.post("/fetch-metadata", async (req, res) => {
  console.log("object :>> ", req.body);

  const { sitemapUrl } = req.body;
  const results = [];
  try {
    const sitemapResponse = await axios.get(sitemapUrl);
    const $sitemap = cheerio.load(sitemapResponse.data, { xmlMode: true });

    console.log("sitemap :>> ", $sitemap);
    const urls = [];

    $sitemap("url").each((i, el) => {
      const url = $sitemap(el).find("loc").text();
      urls.push(url);
    });

    console.log("urls :>> ", urls);

    // Use Promise.all to fetch all pages concurrently
    const metadata = await Promise.all(
      urls.map(async (url) => {
        try {
          const pageResponse = await axios.get(url);
          const $page = cheerio.load(pageResponse.data);
          const title = $page("title").text() || "-";
          const description =
            $page('meta[name="description"]').attr("content") || "-";

          console.log("data :>> ", url, title, description);
          return {
            url,
            title,
            description,
          };
        } catch (error) {
          console.error(`Error fetching ${url}: ${error.message}`);
          return {
            url,
            title: "-",
            description: "-",
            error: error.message,
          };
        }
      })
    );
    res.status(200).send({ status: 1, data: metadata });
  } catch (error) {
    res.status(500).send({ status: 0, data: results, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
