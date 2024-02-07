// Import necessary modules
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cors = require('cors');

// Load environment variables from .env file
dotenv.config();

// Create an Express application
const app = express();
const port = 3000;

// Enable Cross-Origin Resource Sharing (CORS) middleware
app.use(cors());
// Configure middleware to parse URL-encoded and JSON request bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Retrieve Discord application details from environment variables
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URL;

// Shared data object to pass information between routes
let sharedData = {};

// Route for initiating the Discord OAuth2 flow
app.get('/connect', (req, res) => {
    // Construct the Discord authorization URL and redirect the user
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify`;
    console.log(`Redirecting to Discord authorization: ${discordAuthUrl}`);
    res.redirect(discordAuthUrl);
});

// Route to handle the Discord callback and retrieve user ID
app.get('/Authentication', async (req, res) => {
    try {
        // Extract the authorization code from the query parameters
        const code = req.query.code;

        // Exchange the authorization code for an access token
        const tokenResponse = await axios.post(
            'https://discord.com/api/oauth2/token',
            new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: clientId,
                client_secret: clientSecret,
                code: code,
                redirect_uri: redirectUri,
                scope: 'identify'
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        const accessToken = tokenResponse.data.access_token;

        // Use the access token to fetch user information
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        const userId = userResponse.data.id;

        // Log the authorized user ID
        console.log(`Authorized user ID: ${userId}`);

        // Assuming you have the role assignment server URL
        const roleAssignmentServerUrl = process.env.BOT_URL;

        // Make a POST request to the role assignment server
        await axios.post(roleAssignmentServerUrl, { userId });

        // Retrieve shared data from previous POST request
        const wallet_address = sharedData.wallet_address;
        const token_id = sharedData.token_id;
        const network = sharedData.network;

        // Database URL to post user data
        const databaseUrl = process.env.DATABASE_URL;

        // Post user data to the database
        await axios.post(databaseUrl, {
            userId,
            wallet_address,
            token_id,
            network,
        });

        // Return a success message in the response
        res.send(`Request Validated! You've successfully gained a new Discord role! Close this tab and go check it out!`);
    } catch (error) {
        // Log and respond with an error message if an issue occurs during authentication
        console.error('Error during authentication:', error);
        res.status(500).send('Error during authentication: ', error);
    }
});

// New endpoint to handle POST request with parameters and store in sharedData
app.post('/addUser', async (req, res) => {
    try {
        // Extract parameters from the request body
        const { wallet_address, token_id, network } = req.body;

        // Store parameters in sharedData for later use
        sharedData = {
            wallet_address,
            token_id,
            network,
        }

        console.log('Sent Request Data to database succesfully!');
    } catch (error) {
        // Log and respond with an error message if an issue occurs during data posting
        console.error('Error during data posting:', error);
        res.status(500).send('Error during data posting.');
    }
});

// Start the Express server and listen on the specified port
app.listen(port, () => {
    console.log(`Authorization server is running!`);
});
