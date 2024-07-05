let api_base = process.env.API_BASE;
if (process.env.NODE_ENV === "development") {
  api_base = "http://localhost:8080/";
}
module.exports = { api_base };
