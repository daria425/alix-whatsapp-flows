async function handleStatusCallback(req, res, next) {
  try {
    const body = JSON.parse(JSON.stringify(req.body));
    if (body.MessageStatus === "delivered") {
      console.log("success");
    }
    res.status(200).send("acknowledged");
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
}

module.exports = { handleStatusCallback };
