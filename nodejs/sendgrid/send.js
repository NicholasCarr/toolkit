import sgMail from "@sendgrid/mail";
import xlsx from 'xlsx';
import dotenv from "dotenv";
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
dotenv.config();

// Get the absolute path for the output file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputPath = path.resolve(__dirname, 'retraction.json');
// Create if it doesn't exist
if (!fs.existsSync(outputPath)) {
    fs.writeFileSync(outputPath, JSON.stringify([], null, 2));
}
// console.log('Writing to file:', outputPath);

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
// Dynamic Template ID
const templateId = "d-bde977e9738541e9a04074dc1cd31120";

// import client data from excel file
const workbook = xlsx.readFile('./retraction.xlsx');
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const clientData = xlsx.utils.sheet_to_json(worksheet);
// console.log(`Imported ${clientData.length} clients`);
// console.log(clientData[10]);

for (const client of clientData) {
    // Check if this record has already been processed
    const fileContent = fs.readFileSync(outputPath, 'utf8');
    const data = JSON.parse(fileContent);
    // console.log(data.length);
    let found = false;
    for (const item of data) {
        console.log(`Checking ${client['Record No']}`);
        if (item.record_no === client['Record No']) {
            console.log(`Skipping ${client['Record No']}`);
            found = true;
            break;
        }
    }

    if (!found) {
        console.log(`Processing ${client['Record No']} in 2 seconds`);
        // wait 2 seconds
        await new Promise(resolve => setTimeout(resolve, 2000));
        const msg = {
            // to: 'mei@baremedia.com.au',
            to: client.email,
            from: 'info@bachmayerorthodontics.com.au',
            templateId: templateId,
            dynamicTemplateData: {
                notification_date: "21 May 2025",
                contact_first_name: client.First,
                contact_last_name: client.Surname,
                contact_email: client.email,
                client_name: "The Bachmayer Orthodontic Clinic",
                client_email: "privacy@bachmayerorthodontics.com.au",
                client_reply_email: "privacy@bachmayerorthodontics.com.au",
                client_incident_email: "privacy@bachmayerorthodontics.com.au"
            }
        };
    
    sgMail
    .send(msg)
    .then((response) => {
            console.log('Email sent');
            // console.log(response);
            const responseData = response[0];
            // console.log(JSON.stringify(responseData));
            try {
                // write to processed.json which should be an array of objects, use the record No as the key, and then store the email address a value in the object
                const processedData = {
                    record_no: client['Record No'],
                    email: client.email,
                    statusCode: responseData.statusCode,
                    messageId: responseData.headers['x-message-id']
                };
                
                // check if the file exists
                if (fs.existsSync(outputPath)) {
                    console.log('File exists, reading current data...');
                    // read the file and parse as JSON array
                    const data = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
                    // append the new data
                    data.push(processedData);
                    // write back the entire array
                    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
                    console.log('Successfully updated file');
                } else {
                    console.log('File does not exist, creating new file...');
                    // create the file with initial array
                    fs.writeFileSync(outputPath, JSON.stringify([processedData], null, 2));
                    console.log('Successfully created new file');
                }
            } catch (error) {
                console.error('Error writing to file:', error);
            }
        })
    .catch((error) => {
            console.error('Error sending email:', JSON.stringify(error));
        });
    }
}

