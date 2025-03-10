const User = require("../models/User");
const Group = require("../models/Group");
const mongoose = require('mongoose');
const getAllGroups = async (req, res) => {
  try {
    const groups = await Group.find().populate("members", "name email"); // Assurez-vous que vous récupérez `name` et `email`
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getGroupByName = async (req, res) => {
  try {
    const group = await Group.findOne({ name: req.params.name });
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getGroupMembers = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate("members");
    res.json(group.members);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createGroup = async (req, res) => {
  try {
    const group = new Group(req.body);
    await group.save();
    res.status(201).json(group);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (req.body.name) {
      group.name = req.body.name;
    }
    if (req.body.members) {
      group.members = req.body.members;
    }
    await group.save();
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteGroup = async (req, res) => {
  try {
    await Group.findByIdAndDelete(req.params.id);
    res.json({ message: "Group deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 

const addMember = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    const user = await User
      .findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    group.members.push(user._id);
    await group.save();
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  } 
};

const deleteMember = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    const user = await User
      .findOne({ email: req.body.email  } || { name: req.body.name});
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    group.members.pull(user._id);
    await group.save(); 
    res.json(group);
    }
    catch (error) {
      res.status(500).json({ message: error.message });
    }
};

module.exports = {
  getAllGroups,
  getGroupById,
  getGroupByName,
  getGroupMembers,
  createGroup,
  updateGroup,
  deleteGroup,
  addMember,
  deleteMember
};