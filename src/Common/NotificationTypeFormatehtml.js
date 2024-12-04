export const NotificationsAppointmentIsBooked = (lead_name, dateTime) => {
  return `
      New appointment booked with 
      <span style="font-weight: 600;">${lead_name}</span> for 
      <span style="font-weight: 600;">${dateTime}</span>.
    `;
};

export const NotificationsAppointmentStatus = (lead_name, dateTime, status) => {
  return `
      Appointment with 
      <span style="font-weight: 600;">${lead_name}</span> on 
      <span style="font-weight: 600;">${dateTime}</span> has been 
      <span style="font-weight: 600;">${status}</span>.
    `;
};

export const NotificationsLeadRescheduleRequest = (
  lead_name,
  originalDateTime
) => {
  return `
      <span style="font-weight: 600;">${lead_name}</span> requested to reschedule their appointment originally set for 
      <span style="font-weight: 600;">${originalDateTime}</span>.
    `;
};

export const NotificationsAppointmentReminder = (
  lead_name,
  timeUntilAppointment
) => {
  return `
      Reminder: Your appointment with 
      <span style="font-weight: 600;">${lead_name}</span> is coming up in 
      <span style="font-weight: 600;">${timeUntilAppointment}</span>.
    `;
};

export const NotificationsAppointmentConfirmed = (lead_name, dateTime) => {
  return `
      Appointment with 
      <span style="font-weight: 600;">${lead_name}</span> on 
      <span style="font-weight: 600;">${dateTime}</span> is confirmed.
    `;
};

export const NotificationsNewLead = (lead_name) => {
  return `
      🎉 You’ve got a new lead: 
      <span style="font-weight: 600;">${lead_name}</span>.
    `;
};

export const NotificationsLeadAssigned = (lead_name) => {
  return `
      <span style="font-weight: 600;">${lead_name}</span> has been assigned to you.
    `;
};

export const NotificationsMentionedInNotes = (lead_name, noteContent) => {
  return `
      You were mentioned in a note about 
      <span style="font-weight: 600;">${lead_name}</span>. Note: 
      "<span style="font-weight: 600;">${noteContent}</span>".
    `;
};

export const NotificationsNewMessage = (lead_name, messagePreview) => {
  return `
      New message from 
      <span style="font-weight: 600;">${lead_name}</span>: 
      "<span style="font-weight: 600;">${messagePreview}</span>".
    `;
};

export const NotificationsConversationAssigned = (lead_name) => {
  return `
      A conversation with 
      <span style="font-weight: 600;">${lead_name}</span> has been assigned to you.
    `;
};

export const NotificationsCampaignStatus = (campaignNum, status) => {
  return `
      Campaign "<span style="font-weight: 600;">${campaignNum}</span>" has been 
      <span style="font-weight: 600;">${status}</span>.
    `;
};

export const NotificationsCampaignPerformance = (
  campaignName,
  openRate,
  replyRate
) => {
  return `
      Campaign "<span style="font-weight: 600;">${campaignName}</span>" is complete. See 
      <span style="font-weight: 600;">${openRate}%</span> opens, 
      <span style="font-weight: 600;">${replyRate}%</span> replies.
    `;
};
