const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/health',
    method: 'GET'
};

const req = http.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Response:', data);
        try {
            const jsonData = JSON.parse(data);
            console.log('✅ Server is responding with JSON');
        } catch (e) {
            console.log('❌ Server is NOT responding with JSON');
            console.log('Raw response:', data);
        }
    });
});

req.on('error', (error) => {
    console.log('❌ Cannot connect to server:', error.message);
});

req.end();