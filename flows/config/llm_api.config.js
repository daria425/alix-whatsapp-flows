let api_base = process.env.API_BASE;
if (process.env.NODE_ENV === "development") {
  api_base = "http://127.0.0.1:8000/";
}
module.exports = { api_base };
