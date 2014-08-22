module.exports = function mountRestApi(server) {
  server.use('/api', server.loopback.rest());
};