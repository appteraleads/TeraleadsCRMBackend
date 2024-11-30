require("dotenv").config();
const axios = require("axios");
const telnyxBaseUrl = "https://api.telnyx.com/v2";
const Leads = require("../Modal/Lead");
const Conversations = require("../Modal/Conversation");

const outboundCallWithTelxyn = async (req, res) => {
  try {
    const { toNumber, fromNumber } = req.body;
    console.log(toNumber, fromNumber);
    // data: {
    //   connection_id: process.env.TELNYX_CONNECTION_ID,
    //   to: toNumber,  // The phone number to call
    //   from: fromNumber,
    // }
    const response = await axios.post(
      "https://api.telnyx.com/v2/outbound_calls",
      {
        data: {
          to: "+17792003110", //ring central - user
          from: "+13083050002", // this is for clint = clinic
          connection_id: "2122061384203110274", // Telnyx connection ID
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.TELNYX_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json({
      success: true,
      call: response.data,
      message: "Call initiated successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to initiate the call",
      error: error.message,
      error: error,
    });
  }
};

const outboundcallsWebhook = async (req, res) => {
  console.log(req, res);
};

const sendMessageFromTelnyxNumber = async (from, to, text) => {
  try {
    const data = {
      from,
      to,
      text,
    };

    const response = await axios.post(`${telnyxBaseUrl}/messages`, data, {
      headers: {
        Authorization: `Bearer ${process.env.TELNYX_API_KEY}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error.message);
    return { success: false, error: error.message };
  }
};

const fetchTelnyxDataRecording = async (endpoint) => {
  try {
    const response = await axios.get(`${telnyxBaseUrl}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${process.env.TELNYX_API_KEY}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching record from Telnyx:", error.message);
    throw error;
  }
};

const fetchTelnyxData = async (endpoint) => {
  try {
    const response = await axios.get(`${telnyxBaseUrl}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${process.env.TELNYX_API_KEY}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching record from Telnyx:", error.message);
    throw error;
  }
};

const getWebhook_deliveries = async () => {
  try {
    const data = await fetchTelnyxData("/webhook_deliveries");
    const timestamp = new Date();

    await Promise.all(
      data?.data.map(async (item) => {
        const callSessionId = item?.webhook?.payload?.call_session_id;
        const phoneNumberFrom = item?.webhook?.payload?.from;

        if (!callSessionId || !phoneNumberFrom) {
          return;
        }

        const existingLead = await Leads.findOne({
          where: {
            phone_number: phoneNumberFrom,
            call_session_id: item?.webhook?.payload?.call_session_id || "",
          },
        });

        if (!existingLead) {
          const apiUrl = `/recordings?v3=${item.webhook.payload.call_control_id}&call_session_id=${callSessionId}`;
          const recordData = await fetchTelnyxDataRecording(apiUrl);

          const safeData = {
            phone_number_to: item?.webhook?.payload?.to || "",
            phone_number: phoneNumberFrom,
            call_session_id: callSessionId,
            hangup_cause: item?.webhook?.payload?.hangup_cause || "",
            call_start_time: item?.webhook?.payload?.start_time || "",
            recording_url: recordData?.data[0]?.download_urls?.mp3 || "",
            lead_type: "Call_lead",
            lead_status: "AllLeads",
            created_by: "System",
            created_on: timestamp,
          };
          await Leads.create(safeData);
        }
      })
    );
    console.log("Cron job completed for webhook Telnyx.");
  } catch (error) {
    console.error("Error fetching Telnyx data:", error.message);
  }
};

const webhook_getResponseFromTelnyx = async (req, res) => {
  const webhookEvent = req?.body?.data?.event_type;

  if (webhookEvent === "message.received") {
    const receivedMessage = req?.body?.data?.payload?.text;
    const fromNumber = req?.body?.data?.payload.from?.phone_number;
    const toNumber = req?.body?.data?.payload?.to[0]?.phone_number;
    const received_at = req?.body?.data?.payload?.received_at;
    const timestamp = new Date();

    const lead = await Leads.findOne({
      where: { phone_number: fromNumber },
      order: [["updated_on", "DESC"]], // or "created_at" if that's more relevant
    });

    if (lead) {
      let conversationData = {
        message: receivedMessage,
        status: "",
        direction: "Inbound",
        from: fromNumber,
        to: toNumber,
        lead_id: lead.id,
        unseen: false,
        record_type: "SMS",
        received_at: timestamp,
        created_on: timestamp,
      };

      await Conversations.create(conversationData);

      if (receivedMessage.toLowerCase() === "1") {
        await Leads.update(
          { lead_status: "Appointment", appointment_status: "Confirmed" },
          { where: { id: lead.id } }
        );
      } else if (receivedMessage.toLowerCase() === "2") {
        await Leads.update(
          { lead_status: "RescheduleRequested", appointment_status: "" },
          { where: { id: lead.id } }
        );
      }
    } else {
      console.log("No matching lead found for phone number:", fromNumber);
    }
  }
  res.status(200).send("Webhook received");
};

module.exports = {
  getWebhook_deliveries,
  sendMessageFromTelnyxNumber,
  webhook_getResponseFromTelnyx,
  outboundCallWithTelxyn,
  outboundcallsWebhook
};
