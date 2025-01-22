const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const net = require('net');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Function to check if a port is available
const isPortAvailable = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', () => {
      resolve(false);
    });
    
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    
    server.listen(port);
  });
};

// Function to find the next available port
const findAvailablePort = async (startPort) => {
  let port = startPort;
  while (!(await isPortAvailable(port))) {
    port++;
  }
  return port;
};

app.prepare().then(async () => {
  const port = await findAvailablePort(8080);
  
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});
