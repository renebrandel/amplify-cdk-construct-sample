exports.handler = (event, _, callback) => {
  const messageToEcho = event.arguments.message;
  if (!messageToEcho) {
    callback('Didn\'t receive a `message` to echo')
  }
  callback(null, "HELLO " + messageToEcho);
};
