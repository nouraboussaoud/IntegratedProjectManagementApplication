const Attendance = require("../models/Attendance");
const Group = require("../models/Group");
const recordAttendance = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { sessionDate, presentMembers, absentMembers } = req.body;
    const createdBy = req.userId;

    const attendance = new Attendance({
      group: groupId,
      sessionDate: new Date(sessionDate),
      presentMembers,
      absentMembers: absentMembers.map(member => ({
        member: member.member,
        isJustified: member.isJustified || false,
        justification: member.justification || "",
        followUpType: member.followUpType || "Normal follow-up day"
      })),
      createdBy
    });

    await attendance.save();

    const populated = await Attendance.findById(attendance._id)
      .populate({
        path: "group",
        select: "name members",
        populate: {
          path: "members",
          select: "name email profilePic"
        }
      })
      .populate("presentMembers", "name email profilePic")
      .populate("absentMembers.member", "name email profilePic")
      .populate("createdBy", "name email profilePic");

    res.status(201).json(populated);
  } catch (error) {
    console.error("Error in recordAttendance:", error); // Add this line
    res.status(500).json({ message: "Error recording attendance", error: error.message });
  }
};

const getAllAttendance = async (req, res) => {
  try {
    const records = await Attendance.find()
      .populate({
        path: "group",
        select: "name members",
        populate: {
          path: "members",
          select: "name email profilePic"
        }
      })
      .populate("presentMembers", "name email profilePic")
      .populate("absentMembers.member", "name email profilePic")
      .populate("createdBy", "name email profilePic")
      .sort("-sessionDate");

    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
const checkAttendanceExists = async (req, res) => {
  try {
    const { groupId, sessionDate } = req.params;
    
    // Convertir la date en objet Date et normaliser
    const dateObj = new Date(sessionDate);
    dateObj.setHours(0, 0, 0, 0); // Normaliser à minuit

    const endOfDay = new Date(dateObj);
    endOfDay.setHours(23, 59, 59, 999);

    const attendance = await Attendance.findOne({
      group: groupId,
      sessionDate: { 
        $gte: dateObj,
        $lte: endOfDay
      }
    })
    .populate("group", "name")
    .populate("presentMembers", "name email")
    .populate("absentMembers.member", "name email");

    if (!attendance) {
      return res.status(200).json({ exists: false });
    }

    return res.status(200).json({ exists: true, data: attendance });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
const getAttendanceByGroupId = async (req, res) => {
  try {
    const { groupId } = req.params;
    
    const attendanceRecords = await Attendance.find({ group: groupId })
      .populate({
        path: "group",
        select: "name members",
        populate: {
          path: "members",
          select: "name email profilePic"
        }
      })
      .populate("presentMembers", "name email profilePic")
      .populate("absentMembers.member", "name email profilePic")
      .populate("createdBy", "name email profilePic")
      .sort("-sessionDate");

    res.status(200).json(attendanceRecords);
  } catch (error) {
    res.status(500).json({ message: "Error fetching records", error: error.message });
  }
};

  


const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { sessionDate, presentMembers, absentMembers } = req.body;

    const updated = await Attendance.findByIdAndUpdate(
      id,
      {
        sessionDate,
        presentMembers,
        absentMembers: absentMembers.map(member => ({
          member: member.member,
          isJustified: member.isJustified,
          justification: member.justification,
          followUpType: member.followUpType
        })),
        lastModified: Date.now()
      },
      { new: true }
    )
    .populate({
      path: "group",
      select: "name members",
      populate: {
        path: "members",
        select: "name email profilePic"
      }
    })
    .populate("presentMembers", "name email profilePic")
    .populate("absentMembers.member", "name email profilePic")
    .populate("createdBy", "name email profilePic");

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: "Error updating", error: error.message });
  }
};
  const deleteAttendance = async (req, res) => {
    try {
      const { id } = req.params;
      
      const deletedAttendance = await Attendance.findByIdAndDelete(id);
      
      if (!deletedAttendance) {
        return res.status(404).json({ message: "Attendance record not found" });
      }
      
      res.status(200).json({ message: "Attendance record deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting attendance", error: error.message });
    }
  };

  const getAttendanceStats = async (req, res) => {
    try {
      const { groupId } = req.params;
  
      const attendances = await Attendance.find({ group: groupId })
        .populate("presentMembers", "name email profilePic")
        .populate("absentMembers.member", "name email profilePic");
  
      const group = await Group.findById(groupId)
        .populate("members", "name email profilePic");
  
      const stats = group.members.map(member => {
        const present = attendances.filter(a => 
          a.presentMembers.some(p => p._id.equals(member._id))
        ).length;
        
        const absentRecords = attendances.filter(a => 
          a.absentMembers.some(am => am.member._id.equals(member._id))
        );
  
        const absent = absentRecords.length;
        
        // Détails des absences
        const absenceDetails = absentRecords.map(record => ({
          date: record.sessionDate,
          isJustified: record.absentMembers.find(am => am.member._id.equals(member._id)).isJustified,
          justification: record.absentMembers.find(am => am.member._id.equals(member._id)).justification,
          followUpType: record.absentMembers.find(am => am.member._id.equals(member._id)).followUpType
        }));
  
        // Stats par type d'absence
        const normalFollowUpAbsences = absenceDetails.filter(a => 
          !a.isJustified && a.followUpType === "Normal follow-up day"
        ).length;
  
        const validationDayAbsences = absenceDetails.filter(a => 
          !a.isJustified && a.followUpType === "Validation day"
        ).length;
  
        const justifiedAbsences = absenceDetails.filter(a => a.isJustified).length;
  
        return {
          id: member._id,
          name: member.name,
          email: member.email,
          profilePic: member.profilePic,
          present,
          absent,
          totalSessions: attendances.length,
          presencePercentage: attendances.length > 0 
            ? Math.round((present / attendances.length) * 100)
            : 0,
          absenceDetails,
          normalFollowUpAbsences,
          validationDayAbsences,
          justifiedAbsences
        };
      });
  
      res.status(200).json(stats);
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  };
module.exports = {
  recordAttendance,
  getAllAttendance,
  checkAttendanceExists,
  getAttendanceByGroupId,
  updateAttendance,
  deleteAttendance,
  getAttendanceStats
};
