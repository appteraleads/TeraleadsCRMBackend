const createUserQuery = `
INSERT INTO users (
  clinic_name, 
  dentist_full_name, 
  clinic_website, 
  email, 
  phone, 
  clinic_size, 
  patients_average_per_week, 
  services_frequently, 
  in_house_arch_lab_yn, 
  arch_digital_workflow_yn, 
  activation_link, 
  activation_link_expire, 
  activated_yn,
  password,
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,$14)
RETURNING *;
`;

const createGoogleUserQuery = `
  INSERT INTO users (
    dentist_full_name, 
    email, 
    profile_picture,
    login_type
  ) VALUES ($1, $2, $3, $4)
  RETURNING *;
`;
const createFaceBookUserQuery = `
  INSERT INTO users (
    dentist_full_name, 
    email, 
    profile_picture,
    login_type
  ) VALUES ($1, $2, $3, $4)
  RETURNING *;
`;
module.exports={
    createUserQuery,
    createGoogleUserQuery,createFaceBookUserQuery
}