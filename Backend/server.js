const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = 3007;

// PostgreSQL connection
const pool = new Pool({
    user: 'postgres',
    host: 'postgres',
    database: 'job_application_db',
    password: 'admin123',
    port: 5432,
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Check database connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to PostgreSQL:', err.stack);
        return;
    }
    console.log('Connected to PostgreSQL database');
    release();
});

// Helper function to check for duplicate email or phone
async function checkDuplicate(email, phone) {
    try {
        const result = await pool.query(
            'SELECT COUNT(*) FROM applications WHERE email = $1 OR phone = $2',
            [email, phone]
        );
        return parseInt(result.rows[0].count) > 0;
    } catch (err) {
        console.error('Error checking duplicates:', err);
        throw err;
    }
}

// Endpoint to check for duplicate email or phone
app.post('/api/check-duplicate', async (req, res) => {
    const { email, phone } = req.body;
    if (!email || !phone) {
        return res.status(400).json({ error: 'Email and phone are required' });
    }

    try {
        const isDuplicate = await checkDuplicate(email, phone);
        res.json({ isDuplicate });
    } catch (err) {
        console.error('Error in check-duplicate:', err);
        res.status(500).json({ error: 'Failed to check duplicates' });
    }
});

// Endpoint to save a new application
app.post('/api/applications', async (req, res) => {
    const applicationData = req.body;

    if (!applicationData.refNo || !applicationData.email || !applicationData.phone || !applicationData.documents) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const isDuplicate = await checkDuplicate(applicationData.email, applicationData.phone);
        if (isDuplicate) {
            return res.status(400).json({ error: 'An application with this email or phone number already exists.' });
        }

        const queryText = `
            INSERT INTO applications (
                ref_no, name, email, phone, gender, guardian_name, guardian_phone,
                job_type, location, status, has_work_exp, company, years_exp, work_location,
                has_pg, ssc_certificate_name, ssc_certificate_data, hsc_certificate_name,
                hsc_certificate_data, graduation_certificate_name, graduation_certificate_data,
                pg_certificate_name, pg_certificate_data, relieving_letter_name, relieving_letter_data
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
            RETURNING ref_no
        `;
        const values = [
            applicationData.refNo,
            applicationData.name,
            applicationData.email,
            applicationData.phone,
            applicationData.gender,
            applicationData.guardianName,
            applicationData.guardianPhone,
            applicationData.jobType,
            applicationData.location,
            applicationData.status || 'New',
            applicationData.hasExperience === 'yes',
            applicationData.hasExperience === 'yes' ? applicationData.companyName : null,
            applicationData.hasExperience === 'yes' ? parseFloat(applicationData.yearsOfExperience) : null,
            applicationData.hasExperience === 'yes' ? applicationData.workLocation : null,
            !!applicationData.documents.pgCertificate,
            applicationData.documents.sscCertificate.name,
            applicationData.documents.sscCertificate.data,
            applicationData.documents.hscCertificate.name,
            applicationData.documents.hscCertificate.data,
            applicationData.documents.graduationCertificate.name,
            applicationData.documents.graduationCertificate.data,
            applicationData.documents.pgCertificate ? applicationData.documents.pgCertificate.name : null,
            applicationData.documents.pgCertificate ? applicationData.documents.pgCertificate.data : null,
            applicationData.documents.relevingLetter ? applicationData.documents.relevingLetter.name : null,
            applicationData.documents.relevingLetter ? applicationData.documents.relevingLetter.data : null,
        ];

        const result = await pool.query(queryText, values);
        res.status(201).json({ refNo: result.rows[0].ref_no, message: 'Application saved successfully' });
    } catch (err) {
        console.error('Error saving application:', err);
        res.status(500).json({ error: 'Failed to save application' });
    }
});

// Endpoint to retrieve all applications
app.get('/api/applications', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM applications ORDER BY created_at DESC');
        const applications = result.rows.map(app => ({
            refNo: app.ref_no,
            name: app.name,
            email: app.email,
            phone: app.phone,
            gender: app.gender,
            guardianName: app.guardian_name,
            guardianPhone: app.guardian_phone,
            jobType: app.job_type,
            location: app.location,
            status: app.status,
            hasWorkExp: app.has_work_exp,
            company: app.company,
            yearsExp: app.years_exp ? app.years_exp.toString() : null,
            workLocation: app.work_location,
            hasPG: app.has_pg,
            documents: {
                sscCertificate: { name: app.ssc_certificate_name, data: app.ssc_certificate_data, type: app.ssc_certificate_data.split(';')[0].split(':')[1] },
                hscCertificate: { name: app.hsc_certificate_name, data: app.hsc_certificate_data, type: app.hsc_certificate_data.split(';')[0].split(':')[1] },
                graduationCertificate: { name: app.graduation_certificate_name, data: app.graduation_certificate_data, type: app.graduation_certificate_data.split(';')[0].split(':')[1] },
                ...(app.pg_certificate_name && { pgCertificate: { name: app.pg_certificate_name, data: app.pg_certificate_data, type: app.pg_certificate_data.split(';')[0].split(':')[1] } }),
                ...(app.relieving_letter_name && { relevingLetter: { name: app.relieving_letter_name, data: app.relieving_letter_data, type: app.relieving_letter_data.split(';')[0].split(':')[1] } }),
                ...(app.offer_letter_name && { offerLetter: { name: app.offer_letter_name, data: app.offer_letter_data, type: app.offer_letter_data.split(';')[0].split(':')[1] } }),
            },
        }));
        res.json(applications);
    } catch (err) {
        console.error('Error retrieving applications:', err);
        res.status(500).json({ error: 'Failed to retrieve applications' });
    }
});

// Endpoint to retrieve a single application by ref_no
app.get('/api/applications/:refNo', async (req, res) => {
    const { refNo } = req.params;

    try {
        const result = await pool.query('SELECT * FROM applications WHERE ref_no = $1', [refNo]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }

        const app = result.rows[0];
        const application = {
            refNo: app.ref_no,
            name: app.name,
            email: app.email,
            phone: app.phone,
            gender: app.gender,
            guardianName: app.guardian_name,
            guardianPhone: app.guardian_phone,
            jobType: app.job_type,
            location: app.location,
            status: app.status,
            hasWorkExp: app.has_work_exp,
            company: app.company,
            yearsExp: app.years_exp ? app.years_exp.toString() : null,
            workLocation: app.work_location,
            hasPG: app.has_pg,
            documents: {
                sscCertificate: { name: app.ssc_certificate_name, data: app.ssc_certificate_data, type: app.ssc_certificate_data.split(';')[0].split(':')[1] },
                hscCertificate: { name: app.hsc_certificate_name, data: app.hsc_certificate_data, type: app.hsc_certificate_data.split(';')[0].split(':')[1] },
                graduationCertificate: { name: app.graduation_certificate_name, data: app.graduation_certificate_data, type: app.graduation_certificate_data.split(';')[0].split(':')[1] },
                ...(app.pg_certificate_name && { pgCertificate: { name: app.pg_certificate_name, data: app.pg_certificate_data, type: app.pg_certificate_data.split(';')[0].split(':')[1] } }),
                ...(app.relieving_letter_name && { relevingLetter: { name: app.relieving_letter_name, data: app.relieving_letter_data, type: app.relieving_letter_data.split(';')[0].split(':')[1] } }),
                ...(app.offer_letter_name && { offerLetter: { name: app.offer_letter_name, data: app.offer_letter_data, type: app.offer_letter_data.split(';')[0].split(':')[1] } }),
            },
        };
        res.json(application);
    } catch (err) {
        console.error('Error retrieving application:', err);
        res.status(500).json({ error: 'Failed to retrieve application' });
    }
});

// Endpoint to download offer letter
app.get('/api/applications/:refNo/document/offerLetter', async (req, res) => {
    const { refNo } = req.params;

    try {
        const queryText = `
            SELECT offer_letter_name AS name, offer_letter_data AS data
            FROM applications
            WHERE ref_no = $1
        `;
        const result = await pool.query(queryText, [refNo]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }

        const { name, data } = result.rows[0];
        if (!name || !data) {
            return res.status(404).json({ error: 'Offer letter not found for this application' });
        }

        // Extract base64 data from data URI
        const base64Data = data.split(',')[1];
        const mimeType = data.split(';')[0].split(':')[1];
        const buffer = Buffer.from(base64Data, 'base64');

        // Set headers for file download
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
        res.setHeader('Content-Length', buffer.length);

        // Send the file buffer
        res.send(buffer);
    } catch (err) {
        console.error('Error retrieving offer letter:', err);
        res.status(500).json({ error: 'Failed to retrieve offer letter' });
    }
});

// Endpoint to update application status
app.put('/api/applications/:refNo/status', async (req, res) => {
    const { refNo } = req.params;
    const { status } = req.body;

    try {
        const result = await pool.query(
            'UPDATE applications SET status = $1 WHERE ref_no = $2 RETURNING ref_no',
            [status, refNo]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }
        res.json({ message: 'Status updated successfully', refNo: result.rows[0].ref_no });
    } catch (err) {
        console.error('Error updating status:', err);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// Endpoint to upload offer letter
app.put('/api/applications/:refNo/offer-letter', async (req, res) => {
    const { refNo } = req.params;
    const { offerLetter } = req.body;

    try {
        const result = await pool.query(
            'UPDATE applications SET status = $1, offer_letter_name = $2, offer_letter_data = $3 WHERE ref_no = $4 RETURNING ref_no',
            ['Approved', offerLetter.name, offerLetter.data, refNo]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }
        res.json({ message: 'Offer letter uploaded successfully', refNo: result.rows[0].ref_no });
    } catch (err) {
        console.error('Error uploading offer letter:', err);
        res.status(500).json({ error: 'Failed to upload offer letter' });
    }
});

// Endpoint to delete applications
app.delete('/api/applications', async (req, res) => {
    const { refNos } = req.body;

    if (!refNos || !Array.isArray(refNos) || refNos.length === 0) {
        return res.status(400).json({ error: 'No applications selected for deletion' });
    }

    try {
        const result = await pool.query(
            'DELETE FROM applications WHERE ref_no = ANY($1) RETURNING ref_no',
            [refNos]
        );
        res.json({ message: `${result.rows.length} application(s) deleted successfully` });
    } catch (err) {
        console.error('Error deleting applications:', err);
        res.status(500).json({ error: 'Failed to delete applications' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://98.80.67.100:${port}`);
});
