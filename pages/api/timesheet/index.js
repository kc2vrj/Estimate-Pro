import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { dbOperations } from "../../../lib/db";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  switch (req.method) {
    case "POST":
      return handlePost(req, res, session);
    case "GET":
      return handleGet(req, res, session);
    default:
      return res.status(405).json({ error: "Method not allowed" });
  }
}

async function handlePost(req, res, session) {
  try {
    const entry = {
      ...req.body,
      user_id: session.user.id,
    };

    // Validate required fields
    if (!entry.date || !entry.customer_name || !entry.time_in || !entry.time_out) {
      return res.status(400).json({
        error: "Missing required fields: date, customer_name, time_in, time_out",
      });
    }

    const id = await dbOperations.saveTimesheetEntry(entry);
    res.status(200).json({ id });
  } catch (error) {
    console.error("Error saving timesheet entry:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function handleGet(req, res, session) {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({
        error: "Missing required query parameters: startDate, endDate",
      });
    }

    const entries = await dbOperations.getUserTimesheetEntries(
      session.user.id,
      startDate,
      endDate
    );
    res.status(200).json(entries);
  } catch (error) {
    console.error("Error getting timesheet entries:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
