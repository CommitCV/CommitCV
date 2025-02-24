import dotenv from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import exec from 'child_process';

dotenv.config();
const app = express();
const port = process.env.SERVER_PORT;

// Configure CORS to allow requests from commitcv.travisfriesen.ca
const corsOptions = {
     origin: process.env.CORS_ORIGIN,
     optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions)); // Use the cors middleware with options
app.use(bodyParser.json());

app.post('/convert', (req, res) => {
    const { latex } = req.body;
    if (typeof latex !== 'string') {
        return res.status(400).send('Invalid LaTeX content');
    }

    const texFilePath = path.join(__dirname, 'resume.tex');
    const pdfFilePath = path.join(__dirname, 'resume.pdf');

    fs.writeFileSync(texFilePath, latex);

    exec(`pdflatex -output-directory=${__dirname} ${texFilePath}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${stderr}`);
            return res.status(500).send('Error generating PDF');
        }

        const pdf = fs.readFileSync(pdfFilePath);
        res.contentType('application/pdf');
        res.send(pdf);

        // Clean up the files after sending
        fs.unlinkSync(texFilePath);
        fs.unlinkSync(pdfFilePath);
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});