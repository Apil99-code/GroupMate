import { Trip } from "../models/trip.model.js"; // If Trip is a named export
import Group from "../models/group.model.js"; // If Group is a default export
import User from "../models/user.model.js"; // If User is a default export
import Notification from '../models/Notification.js';

// Create a new trip
export const createTrip = async (req, res) => {
  try {
    const { 
      title, 
      startDate, 
      endDate, 
      location, 
      coordinates, 
      budget, 
      description,
      groupId,
      status,
      image,
      activities,
      accommodation,
      transportation,
      userId,
      destination: userDestination = location
    } = req.body;

    // Validate required fields
    if (!title || !startDate || !endDate || !location || !coordinates || !budget || !userId || !userDestination) {
      return res.status(400).json({ 
        message: "All required fields must be provided including userId and destination" 
      });
    }

    // Validate dates
    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ 
        message: "End date must be after start date" 
      });
    }

    // Check if group exists and get all members
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ 
        message: "Group not found" 
      });
    }

    // Verify user is a member of the group
    if (!group.members.includes(userId)) {
      return res.status(403).json({ 
        message: "You must be a member of the group to create a trip" 
      });
    }

    // Create trip with all group members automatically added
    const newTrip = await Trip.create({
      title,
      startDate,
      endDate,
      location,
      coordinates,
      budget,
      description,
      groupId,
      status: status || 'planning',
      image,
      activities: activities || [],
      accommodation,
      transportation,
      userId,
      destination: userDestination,
      createdBy: userId,
      // Add all group members to the trip
      tripMembers: group.members.map(memberId => ({
        userId: memberId,
        role: memberId.toString() === userId.toString() ? 'admin' : 'member'
      })),
      // Share with all group members
      sharedWith: group.members,
      // Add the group to sharedGroups
      sharedGroups: [groupId]
    });

    // Add system message to group chat about trip creation
    await Group.findByIdAndUpdate(groupId, {
      $push: {
        messages: {
          text: `Trip "${title}" has been created`,
          sender: userId,
          type: 'trip_update',
          metadata: {
            tripId: newTrip._id,
            action: 'created',
            tripDetails: {
              title,
              location,
              startDate,
              endDate,
              budget,
              description: description || '',
              activities: activities || []
            }
          }
        }
      },
      $set: { lastActivity: new Date() }
    });

    // Emit socket event to notify all group members
    const io = req.app.get('io');
    if (io) {
      group.members.forEach(memberId => {
        io.to(`user_${memberId}`).emit('tripUpdate', {
          type: 'TRIP_CREATED',
          trip: newTrip,
          groupId
        });
      });
    }

    // Notify all group members except the creator
    for (const memberId of group.members) {
      if (memberId.toString() !== userId.toString()) {
        await Notification.create({
          user: memberId,
          type: 'trip',
          title: 'New Trip Created',
          message: `A new trip "${title}" was created in group "${group.name}".`
        });
      }
    }

    // Populate the trip with related data
    const populatedTrip = await Trip.findById(newTrip._id)
      .populate('createdBy', 'fullName profilePic')
      .populate('tripMembers.userId', 'fullName profilePic')
      .populate('groupId', 'name')
      .populate('sharedWith', 'fullName profilePic');

    res.status(201).json(populatedTrip);
  } catch (error) {
    console.error("Error in createTrip:", error.message);
    res.status(500).json({ 
      message: "Failed to create trip", 
      error: error.message 
    });
  }
};

// Get all trips for a user
export const getTrips = async (req, res) => {
  try {
    const trips = await Trip.find({
      $or: [
        { userId: req.user.id },
        { sharedWith: req.user.id },
        { sharedGroups: { $in: req.user.groups } },
        { isPublic: true }
      ]
    }).sort({ startDate: 1 });
    res.status(200).json(trips);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch trips", error: error.message });
  }
};

// Update a trip
export const updateTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const updateData = req.body;

    // Find trip and verify ownership or admin access
    const trip = await Trip.findOne({
      _id: id,
      $or: [
        { userId },
        { 'tripMembers.userId': userId, 'tripMembers.role': 'admin' }
      ]
    });

    if (!trip) {
      return res.status(404).json({ message: "Trip not found or you don't have permission to update it" });
    }

    // Prevent updating certain fields
    const { userId: _, tripMembers, ...safeUpdateData } = updateData;

    const updatedTrip = await Trip.findByIdAndUpdate(
      id,
      { $set: safeUpdateData },
      { new: true }
    )
    .populate('createdBy', 'fullName profilePic')
    .populate('tripMembers.userId', 'fullName profilePic')
    .populate('groupId', 'name');

    res.status(200).json(updatedTrip);
  } catch (error) {
    console.error("Error in updateTrip:", error.message);
    res.status(500).json({ message: "Failed to update trip", error: error.message });
  }
};

// Delete a trip
export const deleteTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const trip = await Trip.findOne({ _id: id, userId: req.user.id });

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    await Trip.findByIdAndDelete(id);
    res.status(200).json({ message: "Trip deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete trip", error: error.message });
  }
};

// Share trip with users or groups
export const shareTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const { sharedWith, sharedGroups, isPublic } = req.body;
    const userId = req.user._id;

    // Find trip and verify ownership
    const trip = await Trip.findOne({ 
      _id: id,
      $or: [
        { userId },
        { 'tripMembers.userId': userId, 'tripMembers.role': 'admin' }
      ]
    });

    if (!trip) {
      return res.status(404).json({ message: "Trip not found or you don't have permission to share it" });
    }

    const updatedTrip = await Trip.findByIdAndUpdate(
      id,
      {
        $set: { isPublic },
        $addToSet: {
          sharedWith: { $each: sharedWith || [] },
          sharedGroups: { $each: sharedGroups || [] },
        },
      },
      { new: true }
    )
    .populate("sharedWith", "fullName profilePic")
    .populate("sharedGroups", "name")
    .populate("tripMembers.userId", "fullName profilePic");

    res.status(200).json(updatedTrip);
  } catch (error) {
    console.error("Error in shareTrip:", error.message);
    res.status(500).json({ message: "Failed to share trip", error: error.message });
  }
};

// Mark trip as completed
export const markTripAsCompleted = async (req, res) => {
  try {
    const { id } = req.params;
    const trip = await Trip.findById(id);

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    trip.status = "completed";
    await trip.save();

    res.status(200).json(trip);
  } catch (error) {
    res.status(500).json({ message: "Failed to mark trip as completed", error: error.message });
  }
};

// Create a trip from chat
export const createTripFromChat = async (req, res) => {
  try {
    const { title, description, startDate, endDate, destination, budget, chatGroupId } = req.body;
    const userId = req.user._id;

    // Verify chat group exists and user is a member
    const chatGroup = await Group.findById(chatGroupId);
    if (!chatGroup) {
      return res.status(404).json({ message: "Chat group not found" });
    }

    if (!chatGroup.members.includes(userId)) {
      return res.status(403).json({ message: "You must be a member of the chat group to create a trip" });
    }

    // Create new trip with chat group members
    const trip = await Trip.create({
      title,
      description,
      startDate,
      endDate,
      destination,
      budget,
      createdBy: userId,
      members: chatGroup.members,
      chatGroupId,
    });

    res.status(201).json(trip);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update trip members
export const updateTripMembers = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { members } = req.body;
    
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Verify user is trip admin
    const isAdmin = trip.tripMembers.some(member => 
      member.userId.toString() === req.user._id.toString() && 
      member.role === 'admin'
    );

    if (!isAdmin) {
      return res.status(403).json({ message: "Only trip admins can update members" });
    }

    // Verify all members are from the associated group
    const group = await Group.findById(trip.groupId);
    const validMembers = members.every(memberId => 
      group.members.includes(memberId)
    );

    if (!validMembers) {
      return res.status(400).json({ message: "All members must be part of the group" });
    }

    // Update trip members
    trip.tripMembers = members.map(memberId => ({
      userId: memberId,
      role: trip.tripMembers.find(m => m.userId.toString() === memberId.toString())?.role || 'member'
    }));

    await trip.save();

    // Add system message about member update
    await Group.findByIdAndUpdate(trip.groupId, {
      $push: {
        messages: {
          text: `Trip members have been updated`,
          sender: req.user._id,
          type: 'trip_update',
          metadata: {
            tripId: trip._id,
            action: 'members_updated'
          }
        }
      },
      $set: { lastActivity: new Date() }
    });

    const populatedTrip = await Trip.findById(trip._id)
      .populate('tripMembers.userId', 'fullName profilePic')
      .populate('groupId', 'name');

    res.status(200).json(populatedTrip);
  } catch (error) {
    console.error("Error in updateTripMembers:", error.message);
    res.status(500).json({ 
      message: "Failed to update trip members", 
      error: error.message 
    });
  }
};

// Get trip expenses (both group and personal)
export const getTripExpenses = async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.user._id;

    const trip = await Trip.findById(tripId)
      .populate({
        path: "expenses",
        populate: {
          path: "createdBy",
          select: "name email"
        }
      });

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Verify user is a trip member
    if (!trip.members.includes(userId)) {
      return res.status(403).json({ message: "You must be a trip member to view expenses" });
    }

    // Separate group and personal expenses
    const expenses = {
      group: trip.expenses.filter(expense => expense.isGroupExpense),
      personal: trip.expenses.filter(expense => 
        !expense.isGroupExpense && expense.createdBy._id.toString() === userId.toString()
      )
    };

    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single trip by ID
export const getTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const trip = await Trip.findOne({
      _id: id,
      $or: [
        { userId },
        { 'tripMembers.userId': userId },
        { sharedWith: userId },
        { sharedGroups: { $in: req.user.groups } },
        { isPublic: true }
      ]
    })
    .populate('createdBy', 'fullName profilePic')
    .populate('tripMembers.userId', 'fullName profilePic')
    .populate('groupId', 'name')
    .populate('sharedWith', 'fullName profilePic')
    .populate('sharedGroups', 'name');

    if (!trip) {
      return res.status(404).json({ message: "Trip not found or you don't have access to it" });
    }

    res.status(200).json(trip);
  } catch (error) {
    console.error("Error in getTrip:", error.message);
    res.status(500).json({ 
      message: "Failed to fetch trip", 
      error: error.message 
    });
  }
};

// Add a new function to get trips for a group
export const getGroupTrips = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    // Verify group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!group.members.includes(userId)) {
      return res.status(403).json({ message: "You must be a member of the group to view its trips" });
    }

    // Get all trips for the group
    const trips = await Trip.find({ 
      $or: [
        { groupId },
        { sharedGroups: groupId }
      ]
    })
    .populate('createdBy', 'fullName profilePic')
    .populate('tripMembers.userId', 'fullName profilePic')
    .populate('groupId', 'name')
    .sort({ startDate: 1 });

    res.status(200).json(trips);
  } catch (error) {
    console.error("Error in getGroupTrips:", error);
    res.status(500).json({ 
      message: "Failed to fetch group trips", 
      error: error.message 
    });
  }
};
