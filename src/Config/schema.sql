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
        dentist_full_name VARCHAR(255),
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

CREATE TABLE
    clinic (
        id SERIAL PRIMARY KEY,
        clinic_logo VARCHAR(256),
        clinic_favicon VARCHAR(256),
        clinic_name VARCHAR(256) NOT NULL,
        clinic_phone_number VARCHAR(256),
        clinic_website VARCHAR(256),
        clinic_address_state VARCHAR(256),
        clinic_address_zip_code VARCHAR(256),
        clinic_address_street VARCHAR(256),
        clinic_address_city VARCHAR(256),
        clinic_address_country VARCHAR(256),
        clinic_working_hours VARCHAR(256),
        monday_from VARCHAR(256),
        monday_to VARCHAR(256),
        monday_closed VARCHAR(256),
        tuesday_from VARCHAR(256),
        tuesday_to VARCHAR(256),
        tuesday_closed VARCHAR(256),
        wednesday_from VARCHAR(256),
        wednesday_to VARCHAR(256),
        wednesday_closed VARCHAR(256),
        thursday_from VARCHAR(256),
        thursday_to VARCHAR(256),
        thursday_closed VARCHAR(256),
        friday_from VARCHAR(256),
        friday_to VARCHAR(256),
        friday_closed VARCHAR(256),
        saturday_from VARCHAR(256),
        saturday_to VARCHAR(256),
        saturday_closed VARCHAR(256),
        sunday_from VARCHAR(256),
        sunday_to VARCHAR(256),
        sunday_closed VARCHAR(256),
        whatsapp_number VARCHAR(256),
        instagram_url VARCHAR(256),
        facebook_url VARCHAR(256),
        x_url VARCHAR(256),
        tiktok_url VARCHAR(256),
        user_id INTEGER NOT NULL,
        created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(100),
        updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by VARCHAR(100)
    );

CREATE TABLE
    telnyx_call_logs (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER,
        clinic_id INTEGER,
        caller_number VARCHAR(20),
        recipient_id VARCHAR(255),
        phone_number VARCHAR(20) NOT NULL,
        call_start TIMESTAMP,
        call_end TIMESTAMP,
        duration INTEGER,
        call_status VARCHAR(50),
        direction VARCHAR(10),
        recording_url TEXT,
        notes TEXT,
        session_id VARCHAR(255),
        uuid VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW (),
        updated_at TIMESTAMP DEFAULT NOW (),
        created_by VARCHAR(255),
        updated_by VARCHAR(255)
    );

CREATE TABLE
    appointment_setting (
        id SERIAL PRIMARY KEY,
        clinic_id INTEGER NOT NULL,
        appointment_time_zone VARCHAR(255),
        appointment_days_Week VARCHAR(255),
        appointment_date_format VARCHAR(255),
        appointment_duration VARCHAR(255),
        appointment_reminders_SMS VARCHAR(255),
        appointmentReminders_email VARCHAR(255),
        appointment_reminders_3days VARCHAR(255),
        appointment_reminders_24hours VARCHAR(255),
        appointment_reminders_1hours VARCHAR(255),
        appointment_confirmation_request VARCHAR(255),
        cancellation_notification VARCHAR(255),
        created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(255),
        updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by VARCHAR(255)
    );

CREATE TABLE
    clinicclosedates (
        id SERIAL PRIMARY KEY,
        clinic_id INTEGER NOT NULL,
        appointment_close_dates VARCHAR(255),
        appointment_from_time VARCHAR(255),
        appointment_end_time VARCHAR(255),
        created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        created_by VARCHAR(255) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by VARCHAR(255)
    );

CREATE TABLE
    notification_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        clinic_id INTEGER NOT NULL,
        receive_notifications_sms BOOLEAN DEFAULT FALSE,
        receive_notifications_email BOOLEAN DEFAULT FALSE,
        receive_inApp_notification BOOLEAN DEFAULT FALSE,
        notifications_dnd BOOLEAN DEFAULT FALSE,
        notify_appointment_booked BOOLEAN DEFAULT FALSE,
        notify_lead_reschedule BOOLEAN DEFAULT FALSE,
        notify_confirmed_appointment BOOLEAN DEFAULT FALSE,
        notify_appointment_rescheduled_canceled BOOLEAN DEFAULT FALSE,
        notify_appointment_near BOOLEAN DEFAULT FALSE,
        notify_newlead_added BOOLEAN DEFAULT FALSE,
        notify_lead_assignments BOOLEAN DEFAULT FALSE,
        notify_mentioned_lead_notes BOOLEAN DEFAULT FALSE,
        notify_conversation_receive_newmessage BOOLEAN DEFAULT FALSE,
        notify_campaign_sent_scheduled BOOLEAN DEFAULT FALSE,
        notify_getinsights_campaign_performance BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(255),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by VARCHAR(255)
    );

CREATE TABLE
    block_leads (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER NOT NULL,
        clinic_id INTEGER NOT NULL,
        block_type VARCHAR(255),
        block_IP_address VARCHAR(255),
        block_phone_number VARCHAR(250),
        block_reason TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(255) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by VARCHAR(255) NOT NULL
    );

CREATE TABLE
    notifications (
        id SERIAL PRIMARY KEY,
        clinic_id INT,
        user_id INT NOT NULL,
        lead_id INT,
        type VARCHAR(50) NOT NULL,
        message TEXT,
        website_name VARCHAR(100),
        metadata JSONB,
        status VARCHAR(20) DEFAULT 'unread',
        created_at TIMESTAMP DEFAULT NOW (),
        updated_at TIMESTAMP DEFAULT NOW ()
    );