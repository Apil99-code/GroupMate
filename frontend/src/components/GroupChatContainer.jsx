import { useState, useEffect, useRef, useMemo } from "react";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import { useExpenseStore } from "../store/useExpenseStore";
import { useTripStore } from "../store/useTripStore";
import { MessageSquare, Receipt, Plane, Plus, Calendar, MapPin, DollarSign, Users, Image, Clock, XCircle, Check, X, Reply, Smile } from "lucide-react";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { formatMessageTime } from "../lib/utils";
import toast from "react-hot-toast";
import { format } from 'date-fns';
import EmojiPicker from 'emoji-picker-react';

const GroupChatContainer = () => {
  const {
    selectedGroup,
    sendGroupMessage,
    subscribeToGroupMessages,
    unsubscribeFromGroupMessages,
    addMessageReaction,
    removeMessageReaction,
    replyToMessage,
  } = useGroupStore();

  const { trips = [], getTrips, isTripsLoading } = useTripStore();
  const { 
    expenses,
    getExpenses,
    isExpensesLoading 
  } = useExpenseStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [activeTab, setActiveTab] = useState("chat");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showGroupExpenses, setShowGroupExpenses] = useState(true);
  const [expenseFilters, setExpenseFilters] = useState({
    category: '',
    status: '',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
    timePeriod: ''
  });
  const [newExpense, setNewExpense] = useState({
    title: '',
    amount: '',
    category: 'Other',
    description: '',
    date: new Date().toISOString().split('T')[0],
    tripId: '',
  });
  const [replyingTo, setReplyingTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(null); // stores messageId when picker is open

  // Log messages from selected group
  useEffect(() => {
    if (selectedGroup) {
      console.log('Group Messages:', selectedGroup.messages);
    }
  }, [selectedGroup]);

  // Fetch expenses when group changes
  useEffect(() => {
    if (selectedGroup?._id) {
      subscribeToGroupMessages();
      getExpenses(); // Fetch all expenses
    }

    return () => {
      unsubscribeFromGroupMessages();
    };
  }, [selectedGroup?._id]);

  // Auto-scroll to the latest message
  useEffect(() => {
    if (messageEndRef.current && activeTab === "chat") {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedGroup?.messages, activeTab]);

  // Filter trips for current group
  const groupTrips = trips.filter(trip => trip.groupId === selectedGroup?._id);

  // Filter expenses for current group
  const groupExpenses = useMemo(() => {
    if (!selectedGroup?._id || !expenses) return [];
    
    return expenses.filter(expense => 
      expense.group?._id === selectedGroup._id || // Handle populated group field
      expense.group === selectedGroup._id // Handle unpopulated group field
    );
  }, [expenses, selectedGroup?._id]);

  // Reset filters function
  const resetFilters = () => {
    setExpenseFilters({
      category: '',
      status: '',
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
      timePeriod: ''
    });
  };

  const handleSubmitExpense = async (e) => {
    e.preventDefault();
    if (!newExpense.title || !newExpense.amount) {
      toast.error('Title and amount are required');
      return;
    }

    try {
      const expenseData = {
        ...newExpense,
        amount: parseFloat(newExpense.amount),
        groupId: selectedGroup._id,
        group: selectedGroup._id,
        type: 'group',
        isGroupExpense: true,
        user: authUser._id,
        createdBy: authUser._id,
        tripId: newExpense.tripId || null,
      };

      const response = await addExpense(expenseData);
      
      // Send expense notification to group chat with the correct expense ID
      const tripInfo = newExpense.tripId ? 
        groupTrips.find(trip => trip._id === newExpense.tripId)?.title : null;
      
      await sendGroupMessage(selectedGroup._id, {
        text: `New expense added: ${newExpense.title} - $${newExpense.amount}${tripInfo ? ` for trip "${tripInfo}"` : ''}`,
        type: 'expense',
        metadata: {
          expenseId: response._id,
          amount: newExpense.amount,
          category: newExpense.category,
          tripId: newExpense.tripId
        }
      });

      setShowAddExpense(false);
      setNewExpense({
        title: '',
        amount: '',
        category: 'Other',
        description: '',
        date: new Date().toISOString().split('T')[0],
        tripId: '',
      });
      
      // Refresh expenses after adding
      getExpenses(selectedGroup._id);
      toast.success('Expense added successfully');
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Failed to add expense');
    }
  };

  const handleMarkAsPaid = async (expenseId) => {
    try {
      await updateExpense(expenseId, { status: 'paid' });
      await sendGroupMessage(selectedGroup._id, {
        text: `An expense has been marked as paid`,
        type: 'expense_update',
        metadata: {
          expenseId,
          status: 'paid'
        }
      });
      getExpenses(selectedGroup._id); // Refresh expenses
      toast.success('Expense marked as paid');
    } catch (error) {
      console.error('Error updating expense:', error);
      toast.error('Failed to update expense status');
    }
  };

  const handleCancelExpense = async (expenseId) => {
    try {
      await updateExpense(expenseId, { status: 'cancelled' });
      await sendGroupMessage(selectedGroup._id, {
        text: `An expense has been cancelled`,
        type: 'expense_update',
        metadata: {
          expenseId,
          status: 'cancelled'
        }
      });
      getExpenses(selectedGroup._id); // Refresh expenses
      toast.success('Expense cancelled');
    } catch (error) {
      console.error('Error cancelling expense:', error);
      toast.error('Failed to cancel expense');
    }
  };

  // Helper function to get sender name
  const getSenderName = (message) => {
    // If the sender is the current user
    if (message.senderId?._id === authUser._id || message.sender === authUser._id) {
      return "You";
    }

    // For populated sender objects
    if (message.sender?.fullName || message.senderId?.fullName) {
      return message.sender?.fullName || message.senderId?.fullName;
    }

    if (message.sender?.username || message.senderId?.username) {
      return message.sender?.username || message.senderId?.username;
    }

    // For expense messages
    if (message.type === 'expense') {
      if (message.createdBy?.fullName) return message.createdBy.fullName;
      if (message.createdBy?.username) return message.createdBy.username;
      if (message.user?.fullName) return message.user.fullName;
      if (message.user?.username) return message.user.username;
    }

    // Check in group members if we have an unpopulated ID
    const senderId = message.senderId?._id || message.senderId || message.sender;
    if (senderId && selectedGroup?.members) {
      const groupMember = selectedGroup.members.find(member => 
        member._id === senderId || 
        member._id.toString() === senderId.toString()
      );
      if (groupMember) {
        return groupMember.fullName || groupMember.username || "Unknown User";
      }
    }

    // If no valid sender info found
    return "Unknown User";
  };

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    try {
      const tripData = {
        ...newTripForm,
        userId: authUser._id,
        destination: newTripForm.location
      };
      const createdTrip = await createTrip(tripData);

      // Send trip notification to group chat
      await sendGroupMessage(selectedGroup._id, {
        text: `New trip created: ${tripData.title}`,
        type: 'trip_update',
        metadata: {
          tripId: createdTrip._id,
          tripDetails: `${tripData.location} - ${format(new Date(tripData.startDate), 'MMM d')} to ${format(new Date(tripData.endDate), 'MMM d, yyyy')}`,
          budget: tripData.budget,
          action: 'created'
        }
      });

      setShowNewTripModal(false);
      setNewTripForm({
        title: '',
        startDate: '',
        endDate: '',
        location: '',
        coordinates: [0, 0],
        groupId: '',
        budget: 0,
        status: 'planning',
        description: '',
        image: '',
        activities: [],
        accommodation: '',
        transportation: ''
      });
      
      toast.success('Trip created successfully');
    } catch (error) {
      console.error('Failed to create trip:', error);
      toast.error('Failed to create trip');
    }
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      await addMessageReaction(selectedGroup._id, messageId, emoji);
      setShowEmojiPicker(null); // Close emoji picker
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const handleRemoveReaction = async (messageId, emoji) => {
    try {
      await removeMessageReaction(selectedGroup._id, messageId, emoji);
    } catch (error) {
      console.error('Error removing reaction:', error);
    }
  };

  const handleReply = (message) => {
    setReplyingTo(message);
    // Focus on message input
    const messageInput = document.querySelector('#messageInput');
    if (messageInput) {
      messageInput.focus();
    }
  };

  if (!selectedGroup) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <p>No group selected</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ChatHeader />

      <div className="border-b border-base-300">
        <div className="grid grid-cols-3 w-full">
          <button
            className={`py-3 flex items-center justify-center gap-2 ${activeTab === "chat" ? "bg-base-300" : ""}`}
            onClick={() => setActiveTab("chat")}
          >
            <MessageSquare className="w-4 h-4" />
            Chat
          </button>
          <button
            className={`py-3 flex items-center justify-center gap-2 ${activeTab === "expenses" ? "bg-base-300" : ""}`}
            onClick={() => setActiveTab("expenses")}
          >
            <Receipt className="w-4 h-4" />
            Expenses
          </button>
          <button
            className={`py-3 flex items-center justify-center gap-2 ${activeTab === "trips" ? "bg-base-300" : ""}`}
            onClick={() => setActiveTab("trips")}
          >
            <Plane className="w-4 h-4" />
            Trips
          </button>
        </div>
      </div>

      {activeTab === "chat" && (
        <>
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            {/* Combined messages stream */}
            {(() => {
              // Combine regular messages and expense messages
              const allMessages = [
                ...(selectedGroup?.messages || []),
                ...(!isExpensesLoading ? groupExpenses.map(expense => ({
                  _id: `expense-${expense._id}`,
                  type: 'expense',
                  senderId: expense.createdBy || expense.user,
                  createdAt: expense.createdAt,
                  metadata: {
                    amount: expense.amount,
                    category: expense.category
                  },
                  text: expense.title,
                  expense: expense
                })) : [])
              ];

              // Sort all messages by creation date
              const sortedMessages = allMessages.sort((a, b) => 
                new Date(a.createdAt) - new Date(b.createdAt)
              );

              return sortedMessages.map((message) => {
                const isSender = message.senderId?._id === authUser._id || message.sender === authUser._id;
                const senderName = getSenderName(message);
                
                return (
                  <div
                    key={message._id}
                    className={`chat ${isSender ? "chat-end" : "chat-start"}`}
                  >
                    <div className="chat-header">
                      <span className="font-medium">{senderName}</span>
                      <time className="text-xs opacity-50 ml-2">
                        {formatMessageTime(message.createdAt)}
                      </time>
                    </div>

                    {message.replyTo && (
                      <div className="chat-bubble bg-base-300 opacity-75 mb-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Reply className="w-3 h-3" />
                          <span>Replying to {getSenderName(message.replyTo)}</span>
                        </div>
                        <div className="mt-1">{message.replyTo.text}</div>
                      </div>
                    )}

                    <div className={`chat-bubble ${isSender ? "chat-bubble-primary" : ""} relative group`}>
                      {message.type === 'expense' ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Receipt className="w-4 h-4" />
                            <span className="font-bold">{message.text}</span>
                          </div>
                          {message.metadata && (
                            <>
                              <div className="text-sm opacity-75">
                                Category: {message.metadata.category}
                              </div>
                              <div className="text-sm opacity-75">
                                Amount: ${parseFloat(message.metadata.amount).toFixed(2)}
                              </div>
                            </>
                          )}
                          {message.expense?.description && (
                            <div className="text-sm opacity-75">
                              Note: {message.expense.description}
                            </div>
                          )}
                          {message.expense?.status && (
                            <div className={`badge badge-sm ${
                              message.expense.status === 'paid' ? 'badge-success' :
                              message.expense.status === 'pending' ? 'badge-warning' :
                              'badge-error'
                            }`}>
                              {message.expense.status}
                            </div>
                          )}
                        </div>
                      ) : message.type === 'trip_update' ? (
                        <div className="flex flex-col gap-1 text-info">
                          <div className="flex items-center gap-2">
                            <Plane className="w-4 h-4" />
                            <span className="font-bold">{message.text}</span>
                          </div>
                          {message.metadata?.tripDetails && (
                            <div className="text-sm opacity-75">
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                {typeof message.metadata.tripDetails === 'string' 
                                  ? message.metadata.tripDetails 
                                  : JSON.stringify(message.metadata.tripDetails)}
                              </div>
                              {message.metadata.budget && (
                                <div className="flex items-center gap-2 mt-1">
                                  <DollarSign className="w-4 h-4" />
                                  Budget: ${parseFloat(message.metadata.budget).toFixed(2)}
                                </div>
                              )}
                              <div className="mt-2">
                                <button 
                                  onClick={() => window.location.href = `/trips/${message.metadata.tripId}`}
                                  className="btn btn-xs btn-outline btn-info"
                                >
                                  View Trip Details
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {message.text && (
                            <span className="whitespace-pre-wrap break-words">{message.text}</span>
                          )}
                          {message.image && (
                            <img
                              src={message.image}
                              alt="Message attachment"
                              className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(message.image, '_blank')}
                              onError={(e) => {
                                console.error("Error loading image:", e);
                                e.target.src = "/placeholder-image.png";
                              }}
                            />
                          )}
                        </div>
                      )}

                      {/* Message Actions */}
                      <div className="absolute -top-4 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 bg-base-100 rounded-full shadow-lg px-2 py-1">
                        <button
                          onClick={() => setShowEmojiPicker(message._id)}
                          className="btn btn-ghost btn-xs btn-circle"
                        >
                          <Smile className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleReply(message)}
                          className="btn btn-ghost btn-xs btn-circle"
                        >
                          <Reply className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Emoji Picker Popover */}
                      {showEmojiPicker === message._id && (
                        <div className="absolute top-full left-0 mt-2 z-50">
                          <div className="relative">
                            <button
                              onClick={() => setShowEmojiPicker(null)}
                              className="absolute -top-2 -right-2 btn btn-circle btn-xs btn-error"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <EmojiPicker
                              onEmojiClick={(emojiData) => handleReaction(message._id, emojiData.emoji)}
                              width={300}
                              height={400}
                            />
                          </div>
                        </div>
                      )}

                      {/* Message Reactions */}
                      {message.reactions && message.reactions.length > 0 && (
                        <div className="absolute -bottom-6 left-0 flex flex-wrap gap-1">
                          {Object.entries(
                            message.reactions.reduce((acc, reaction) => {
                              acc[reaction.emoji] = (acc[reaction.emoji] || []).concat(reaction.userId);
                              return acc;
                            }, {})
                          ).map(([emoji, users]) => (
                            <button
                              key={emoji}
                              onClick={() => {
                                const hasReacted = users.includes(authUser._id);
                                if (hasReacted) {
                                  handleRemoveReaction(message._id, emoji);
                                } else {
                                  handleReaction(message._id, emoji);
                                }
                              }}
                              className={`btn btn-xs ${
                                users.includes(authUser._id) ? 'btn-primary' : 'btn-ghost'
                              }`}
                            >
                              {emoji} {users.length}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
            <div ref={messageEndRef} />
          </div>

          <div className="border-t border-base-300 p-4">
            {replyingTo && (
              <div className="mb-2 p-2 bg-base-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Reply className="w-4 h-4" />
                  <span className="text-sm">
                    Replying to <span className="font-medium">{getSenderName(replyingTo)}</span>
                  </span>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="btn btn-ghost btn-xs btn-circle"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <MessageInput isGroup={true} replyTo={replyingTo} onSend={() => setReplyingTo(null)} />
          </div>
        </>
      )}

      {activeTab === "expenses" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card bg-base-200 shadow-lg">
              <div className="card-body p-4">
                <div className="flex items-center gap-2 text-sm opacity-70">
                  <DollarSign className="w-4 h-4" />
                  Total Expenses
                </div>
                <div className="text-2xl font-bold">
                  ${groupExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0).toFixed(2)}
                </div>
                <div className="text-xs text-success">↗ 12%</div>
              </div>
            </div>

            <div className="card bg-base-200 shadow-lg">
              <div className="card-body p-4">
                <div className="flex items-center gap-2 text-sm opacity-70">
                  <Receipt className="w-4 h-4" />
                  Paid Expenses
                </div>
                <div className="text-2xl font-bold">
                  ${groupExpenses.filter(exp => exp.status === 'paid').reduce((sum, exp) => sum + parseFloat(exp.amount), 0).toFixed(2)}
                </div>
                <div className="text-xs text-success">↗ 8%</div>
              </div>
            </div>

            <div className="card bg-base-200 shadow-lg">
              <div className="card-body p-4">
                <div className="flex items-center gap-2 text-sm opacity-70">
                  <Clock className="w-4 h-4" />
                  Pending Expenses
                </div>
                <div className="text-2xl font-bold">
                  ${groupExpenses.filter(exp => exp.status === 'pending').reduce((sum, exp) => sum + parseFloat(exp.amount), 0).toFixed(2)}
                </div>
                <div className="text-xs text-error">↘ 5%</div>
              </div>
            </div>

            <div className="card bg-base-200 shadow-lg">
              <div className="card-body p-4">
                <div className="flex items-center gap-2 text-sm opacity-70">
                  <XCircle className="w-4 h-4" />
                  Cancelled
                </div>
                <div className="text-2xl font-bold">
                  {groupExpenses.filter(exp => exp.status === 'cancelled').length}
                </div>
              </div>
            </div>
          </div>

          {/* Filters Section */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Group Expenses</h3>
              <button
                onClick={() => setShowAddExpense(true)}
                className="btn btn-primary btn-sm gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Expense
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Category</span>
                </label>
                <select 
                  className="select select-bordered w-full"
                  value={expenseFilters.category}
                  onChange={(e) => setExpenseFilters(prev => ({ ...prev, category: e.target.value }))}
                >
                  <option value="">All Categories</option>
                  <option value="Food">Food & Drinks</option>
                  <option value="Transportation">Transportation</option>
                  <option value="Accommodation">Accommodation</option>
                  <option value="Activities">Activities & Entertainment</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Groceries">Groceries</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Education">Education</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Time Period</span>
                </label>
                <select 
                  className="select select-bordered w-full"
                  onChange={(e) => {
                    const today = new Date();
                    let startDate = new Date();
                    
                    switch(e.target.value) {
                      case 'today':
                        startDate = new Date();
                        break;
                      case 'week':
                        startDate.setDate(today.getDate() - 7);
                        break;
                      case 'month':
                        startDate.setMonth(today.getMonth() - 1);
                        break;
                      case 'quarter':
                        startDate.setMonth(today.getMonth() - 3);
                        break;
                      case 'year':
                        startDate.setFullYear(today.getFullYear() - 1);
                        break;
                      default:
                        startDate = null;
                    }
                    
                    setExpenseFilters(prev => ({
                      ...prev,
                      startDate: startDate ? startDate.toISOString().split('T')[0] : '',
                      endDate: startDate ? today.toISOString().split('T')[0] : ''
                    }));
                  }}
                >
                  <option value="">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="quarter">Last 3 Months</option>
                  <option value="year">Last Year</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Status</span>
                </label>
                <select 
                  className="select select-bordered w-full"
                  value={expenseFilters.status}
                  onChange={(e) => setExpenseFilters(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="">All Status</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Custom Date Range (shows only when custom is selected) */}
            {expenseFilters.timePeriod === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Start Date</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={expenseFilters.startDate}
                    onChange={(e) => setExpenseFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">End Date</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={expenseFilters.endDate}
                    onChange={(e) => setExpenseFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Expenses Table */}
          {isExpensesLoading ? (
            <div className="flex justify-center py-8">
              <div className="loading loading-spinner loading-lg"></div>
            </div>
          ) : groupExpenses.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No expenses found for this group. Add one to get started!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Group</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groupExpenses.map((expense) => (
                    <tr key={expense._id}>
                      <td>{format(new Date(expense.date), 'MM/dd/yyyy')}</td>
                      <td>
                        <div>
                          <div className="font-bold">{expense.title}</div>
                          {expense.description && (
                            <div className="text-sm opacity-50">{expense.description}</div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="badge badge-outline">{expense.category}</div>
                      </td>
                      <td className="font-semibold">${parseFloat(expense.amount).toFixed(2)}</td>
                      <td>{selectedGroup.name}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          {expense.status === 'pending' && (
                            <button 
                              className="btn btn-ghost btn-xs"
                              onClick={() => handleMarkAsPaid(expense._id)}
                            >
                              <Check className="w-4 h-4 text-success" />
                            </button>
                          )}
                          {expense.status === 'paid' && (
                            <div className="badge badge-success">Paid</div>
                          )}
                          {expense.status === 'cancelled' && (
                            <div className="badge badge-error">Cancelled</div>
                          )}
                          {expense.status !== 'cancelled' && expense.status !== 'paid' && (
                            <button 
                              className="btn btn-ghost btn-xs"
                              onClick={() => handleCancelExpense(expense._id)}
                            >
                              <X className="w-4 h-4 text-error" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="3" className="text-right font-semibold">Total group expenses:</td>
                    <td colSpan="3" className="font-bold">
                      ${groupExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "trips" && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Group Trips</h2>
            <button
              onClick={() => window.location.href = '/trips/new'}
              className="btn btn-primary btn-sm gap-2"
            >
              <Plus className="w-4 h-4" />
              New Trip
            </button>
          </div>

          {isTripsLoading ? (
            <div className="flex justify-center py-8">
              <div className="loading loading-spinner loading-lg"></div>
            </div>
          ) : groupTrips.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No trips found for this group. Create one to get started!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupTrips.map((trip) => (
                <div key={trip._id} className="card bg-base-100 shadow-xl">
                  <div className="card-body">
                    <h3 className="card-title">{trip.title}</h3>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">{trip.description}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(new Date(trip.startDate), 'MMM d')} -{' '}
                          {format(new Date(trip.endDate), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{trip.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <DollarSign className="w-4 h-4" />
                        <span>Budget: ${trip.budget}</span>
                      </div>
                      <div className="badge badge-outline mt-2">
                        {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                      </div>
                    </div>
                    <div className="card-actions justify-end mt-4">
                      <button 
                        onClick={() => window.location.href = `/trips/${trip._id}`}
                        className="btn btn-primary btn-sm"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GroupChatContainer;