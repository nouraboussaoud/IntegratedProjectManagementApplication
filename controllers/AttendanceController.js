const Attendance = require("../models/Attendance");
const Group = require("../models/Group");

const recordAttendance = async (req, res) => {
    try {
      const { groupId } = req.params;
      const { sessionDate, presentMembers, absentMembers } = req.body;
      const createdBy = req.userId;
  
      if (!groupId) {
        return res.status(400).json({ message: "Missing group ID in URL" });
      }
  
      const attendance = new Attendance({
        group: groupId,
        sessionDate,
        presentMembers,
        absentMembers,
        createdBy
      });
  
      await attendance.save();
  
      // ⚠️ Cette partie est importante : repopuler les références
      const populatedAttendance = await Attendance.findById(attendance._id)
        .populate("group", "name")
        .populate("presentMembers", "name email")
        .populate("absentMembers", "name email");
  
      res.status(201).json(populatedAttendance);
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
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
            select: "name email"
          }
        })
        .populate("presentMembers", "name email")
        .populate("absentMembers", "name email")
        .sort("-sessionDate");
  
      res.status(200).json(records);
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  };
  // Vérifier l'existence d'une entrée d'assiduité pour ce groupe et cette date
const checkAttendanceExists = async (req, res) => {
    try {
      const { groupId, sessionDate } = req.params;
  
      // Convertir la date en objet Date
      const dateObj = new Date(sessionDate);
      if (isNaN(dateObj.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
  
      // Définir le début et la fin du jour
      const startOfDay = new Date(dateObj);
      startOfDay.setHours(0, 0, 0, 0);
  
      const endOfDay = new Date(dateObj);
      endOfDay.setHours(23, 59, 59, 999);
  
      // Rechercher l'attendance
      const attendance = await Attendance.findOne({
        group: groupId,
        sessionDate: { $gte: startOfDay, $lte: endOfDay },
      })
      .populate("presentMembers", "name email")
      .populate("absentMembers", "name email");
  
      if (attendance) {
        return res.status(200).json(attendance);
      }
      return res.status(404).json({ message: "No attendance found" });
  
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  };
  const getAttendanceByGroupId = async (req, res) => {
    try {
      const { groupId } = req.params;
      
      // Fetch attendance records with detailed population
      const attendanceRecords = await Attendance.find({ group: groupId })
        .populate({
          path: 'group',
          select: 'name members',
          populate: {
            path: 'members',
            select: 'name email'
          }
        })
        .populate('presentMembers', 'name email')
        .populate('absentMembers', 'name email')
        .sort('-sessionDate');
      
      if (!attendanceRecords || attendanceRecords.length === 0) {
        return res.status(404).json({ message: "No attendance records found for this group." });
      }
      
      res.status(200).json(attendanceRecords);
    } catch (error) {
      console.error("Error fetching attendance records:", error);
      res.status(500).json({ 
        message: "Error fetching attendance records",
        error: error.message 
      });
    }
  };
  
  


  const updateAttendance = async (req, res) => {
    try {
      const { id } = req.params;
      const { sessionDate, presentMembers, absentMembers } = req.body;
  
      const updatedAttendance = await Attendance.findByIdAndUpdate(
        id,
        { sessionDate, presentMembers, absentMembers },
        { new: true }
      )
      .populate("group", "name")
      .populate("presentMembers", "name email")
      .populate("absentMembers", "name email");
  
      if (!updatedAttendance) {
        return res.status(404).json({ message: "Attendance record not found" });
      }
  
      res.status(200).json(updatedAttendance);
    } catch (error) {
      res.status(500).json({ message: "Error updating attendance", error: error.message });
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

module.exports = {
  recordAttendance,
  getAllAttendance,
  checkAttendanceExists,
  getAttendanceByGroupId,
  updateAttendance,
  deleteAttendance
};
