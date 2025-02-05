## Picco StoneHub web application
StoneHub is a web application worked as the communication interface among manufactures, clients and picco engineers.

### How to set up and run
- Clone this repository to your local machine and navigate to it
- Create `.env` file at the root of folder `stone-hub`, and populate it with the required environment varaibles (replacing `<client-id>` and `<client-secret>` with your APS Client ID and Client Secret):

    It should look like:

    ```
    APS_CLIENT_ID="<client-id>"
    APS_CLIENT_SECRET="<client-secret>"
    SERVER_SESSION_SECRET="<secret-phrase>" # secret phrase used to encrypt/decrypt server session cookies
    PORT=8080
    ```

    To get your own `APS_CLIENT_ID` and `APS_CLIENT_SECRET`, please see:
    
    - Tutorial: https://get-started.aps.autodesk.com/
    - Autodesk application: https://aps.autodesk.com/hubs/@personal/applications/

- Open a terminal and navigate to folder `stone-hub` by running the following command in the terminal:

    ```
    cd stone-hub
    ``` 
- Make sure you have `npm` and `node.js` installed. Then run the following commands in the termial:
    ```
    npm install
    npm start
    ``` 
- Open http://localhost:8080/ in a web broswer and now you are running Picco StoneHub web application!