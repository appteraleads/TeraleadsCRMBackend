CREATE TABLE
    users (
        id SERIAL PRIMARY KEY,
        activated_yn BOOLEAN DEFAULT FALSE,
        activation_link TEXT,
        activation_link_expire TIMESTAMP,
        arch_digital_workflow_yn BOOLEAN,
        clinic_name VARCHAR(255),
        clinic_size VARCHAR(50),
        clinic_website TEXT,
        dentist_full_name VARCHAR(255) ,
        email VARCHAR(255) UNIQUE NOT NULL,
        in_house_arch_lab_yn BOOLEAN,
        login_type CHAR(1) DEFAULT 'N',
        patients_average_per_week INTEGER,
        phone VARCHAR(15),
        profile_picture TEXT,
        roles TEXT,
        services_frequently TEXT,
        created_on TIMESTAMPTZ DEFAULT NOW (),
        created_by VARCHAR(255),
        updated_on TIMESTAMPTZ DEFAULT NOW (),
        updated_by VARCHAR(255)
    );

CREATE TABLE
    conversations (
        id SERIAL PRIMARY KEY,
        message TEXT,
        status TEXT,
        direction TEXT,
        "from" VARCHAR(20),
        "to" VARCHAR(20),
        lead_id INTEGER,
        unseen BOOLEAN,
        record_type TEXT,
        send_type TEXT,
        schedule_date_time TIMESTAMPTZ,
        received_at TIMESTAMPTZ,
        created_on TIMESTAMPTZ NOT NULL DEFAULT NOW (),
        created_by VARCHAR(255),
        updated_by VARCHAR(255),
        updated_on TIMESTAMPTZ DEFAULT NOW (),
        subject TEXT
    );

CREATE TABLE
    treatment_options (
        id SERIAL PRIMARY KEY,
        price VARCHAR(50),
        treatment_option VARCHAR(255),
        url VARCHAR(255) UNIQUE,
        created_on TIMESTAMPTZ DEFAULT NOW ()
    );

CREATE TABLE
    otp_verifications (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        expiry TIMESTAMPTZ NOT NULL,
        otp VARCHAR(10) NOT NULL,
        user_id VARCHAR(50) NOT NULL,
        created_on TIMESTAMPTZ DEFAULT NOW ()
    );

CREATE TABLE
    notes (
        id SERIAL PRIMARY KEY,
        created_by VARCHAR(255) NOT NULL,
        created_on TIMESTAMPTZ NOT NULL DEFAULT NOW (),
        updated_by VARCHAR(255),
        updated_on TIMESTAMPTZ DEFAULT NOW (),
        lead_id VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        user_id VARCHAR(255) NOT NULL
    );

CREATE TABLE
    leads (
        id SERIAL PRIMARY KEY,
        assign_to VARCHAR(100),
        created_by VARCHAR(100) NOT NULL,
        created_on TIMESTAMPTZ NOT NULL DEFAULT NOW (),
        updated_by VARCHAR(100),
        updated_on TIMESTAMPTZ DEFAULT NOW (),
        email VARCHAR(255) NOT NULL,
        email_verify VARCHAR(20) DEFAULT 'unverified',
        finance_score VARCHAR(20),
        first_name VARCHAR(100) NOT NULL,
        form_status VARCHAR(50),
        gcld_google VARCHAR(50),
        ip_address VARCHAR(45),
        last_name VARCHAR(100) NOT NULL,
        lead_status VARCHAR(50),
        lead_type VARCHAR(50),
        note_for_doctor TEXT,
        phone_number VARCHAR(20),
        phone_verify VARCHAR(20) DEFAULT 'unverified',
        treatment VARCHAR(100),
        utm_campaign VARCHAR(100),
        utm_medium VARCHAR(100),
        utm_source VARCHAR(100),
        unique_id VARCHAR(50) UNIQUE,
        user_name VARCHAR(100),
        website_name VARCHAR(255)
    );