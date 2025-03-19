import dotenv from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs/promises';
import path from 'path';
import cors from 'cors';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();
const app = express();
const port = process.env.SERVER_PORT;

// Configure CORS to allow requests from CORS_ORIGIN
const allowedOrigins = process.env.CORS_ORIGIN.split(',');

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

app.post('/convert', async (req, res) => {
    const { latex } = req.body;
    if (typeof latex !== 'string') {
        return res.status(400).send('Invalid LaTeX content');
    }

    const uniqueFilename = uuidv4();
    const texFilePath = path.join(__dirname, `resume_${uniqueFilename}.tex`);
    const pdfFilePath = path.join(__dirname, `resume_${uniqueFilename}.pdf`);
    const auxFilePath = path.join(__dirname, `resume_${uniqueFilename}.aux`);
    const logFilePath = path.join(__dirname, `resume_${uniqueFilename}.log`);
    const outFilePath = path.join(__dirname, `resume_${uniqueFilename}.out`);

    try {
        await fs.writeFile(texFilePath, latex);

        await new Promise((resolve, reject) => {
            exec(`pdflatex -output-directory=${__dirname} ${texFilePath}`, async (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error: ${stderr}`);
                    reject(new Error('Error generating PDF'));
                } else {
                    try {
                        const pdf = await fs.readFile(pdfFilePath);
                        res.contentType('application/pdf');
                        res.send(pdf);
                    } catch (readError) {
                        reject(new Error('Error reading PDF file'));
                    } finally {
                        // Clean up the files after sending
                        await fs.unlink(texFilePath);
                        await fs.unlink(pdfFilePath);
                        await fs.unlink(auxFilePath);
                        await fs.unlink(logFilePath);
                        await fs.unlink(outFilePath);
                    }
                    resolve();
                }
            });
        });

    } catch (err) {
        console.error(err);
        return res.status(500).send('Error generating PDF');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});