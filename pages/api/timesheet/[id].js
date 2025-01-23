import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import dbOperations from "../../../lib/db";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: "Missing timesheet entry ID" });
  }

  switch (req.method) {
    case "GET":
      return handleGet(req, res, session, id);
    case "PUT":
      return handlePut(req, res, session, id);
    case "DELETE":
      return handleDelete(req, res, session, id);
    default:
      return res.status(405).json({ error: "Method not allowed" });
  }
}

async function handleGet(req, res, session, id) {
  try {
    const entry = await dbOperations.getTimesheetEntry(id);
    if (!entry) {
      return res.status(404).json({ error: "Timesheet entry not found" });
    }

    if (entry.user_id !== session.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.status(200).json(entry);
  } catch (error) {
    console.error("Error getting timesheet entry:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function handlePut(req, res, session, id) {
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

    const success = await dbOperations.updateTimesheetEntry(id, entry);
    if (!success) {
      return res.status(404).json({ error: "Timesheet entry not found or unauthorized" });
    }

    res.status(200).json({ message: "Timesheet entry updated successfully" });
  } catch (error) {
    console.error("Error updating timesheet entry:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function handleDelete(req, res, session, id) {
  try {
    const success = await dbOperations.deleteTimesheetEntry(id, session.user.id);
    if (!success) {
      return res.status(404).json({ error: "Timesheet entry not found or unauthorized" });
    }

    res.status(200).json({ message: "Timesheet entry deleted successfully" });
  } catch (error) {
    console.error("Error deleting timesheet entry:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
