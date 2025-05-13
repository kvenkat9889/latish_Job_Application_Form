CREATE TABLE applications (
    ref_no VARCHAR(20) PRIMARY KEY, -- Unique application reference number (e.g., APP-2025-12345)
    name VARCHAR(50) NOT NULL, -- Applicant's full name
    email VARCHAR(50) NOT NULL, -- Applicant's email address
    phone VARCHAR(15) NOT NULL, -- Applicant's phone number (up to 15 digits)
    gender VARCHAR(10) NOT NULL, -- Applicant's gender (Male, Female, Other)
    guardian_name VARCHAR(50) NOT NULL, -- Guardian's full name
    guardian_phone VARCHAR(15) NOT NULL, -- Guardian's phone number (up to 15 digits)
    job_type VARCHAR(20) NOT NULL, -- Job type (Fresher, Associate, Experienced)
    location VARCHAR(50) NOT NULL, -- Preferred work location (e.g., Hyderabad)
    status VARCHAR(20) DEFAULT 'New', -- Application status (New, Shortlisted, Approved, Rejected)
    has_work_exp BOOLEAN DEFAULT FALSE, -- Has previous work experience
    company VARCHAR(100), -- Previous company name (if has_work_exp)
    years_exp DECIMAL(3,1), -- Years of experience (if has_work_exp, up to 99.9)
    work_location VARCHAR(50), -- Previous work location (if has_work_exp)
    has_pg BOOLEAN DEFAULT FALSE, -- Has post-graduate degree
    ssc_certificate_name VARCHAR(100) NOT NULL, -- SSC certificate file name
    ssc_certificate_data TEXT NOT NULL, -- SSC certificate base64 data
    hsc_certificate_name VARCHAR(100) NOT NULL, -- HSC certificate file name
    hsc_certificate_data TEXT NOT NULL, -- HSC certificate base64 data
    graduation_certificate_name VARCHAR(100) NOT NULL, -- Graduation certificate file name
    graduation_certificate_data TEXT NOT NULL, -- Graduation certificate base64 data
    pg_certificate_name VARCHAR(100), -- PG certificate file name (optional)
    pg_certificate_data TEXT, -- PG certificate base64 data (optional)
    relieving_letter_name VARCHAR(100), -- Relieving letter file name (if has_work_exp)
    relieving_letter_data TEXT, -- Relieving letter base64 data (if has_work_exp)
    offer_letter_name VARCHAR(100), -- Offer letter file name (set by HR)
    offer_letter_data TEXT, -- Offer letter base64 data (set by HR)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Application creation timestamp
    -- Ensure unique email or phone to prevent duplicate applications
    CONSTRAINT unique_email_phone UNIQUE (email, phone),
    -- Ensure relieving letter is provided if has_work_exp is TRUE
    CONSTRAINT check_relieving_letter CHECK (
        (has_work_exp = FALSE) OR 
        (has_work_exp = TRUE AND relieving_letter_name IS NOT NULL AND relieving_letter_data IS NOT NULL)
    )
);

-- Create indexes for faster search
CREATE INDEX idx_applications_email ON applications(email);
CREATE INDEX idx_applications_phone ON applications(phone);
CREATE INDEX idx_applications_status ON applications(status);
