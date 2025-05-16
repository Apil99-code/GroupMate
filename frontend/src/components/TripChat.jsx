import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useGroupStore } from '../store/useGroupStore';
import { useExpenseStore } from '../store/useExpenseStore';
import { Send, DollarSign, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';

const TripChat = ({ tripId, chatGroupId }) => {
  const { authUser } = useAuthStore();
  const { selectedGroup, sendGroupMessage, getGroupMessages } = useGroupStore();
  const { addExpense } = useExpenseStore();
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [newExpense, setNewExpense] = useState({
    title: '',
    amount: '',
    category: 'Other',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (chatGroupId) {
      loadMessages();
    }
  }, [chatGroupId]);

  const loadMessages = async () => {
    try {
      const groupMessages = await getGroupMessages(chatGroupId);
      setMessages(groupMessages);
      scrollToBottom();
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await sendGroupMessage(chatGroupId, {
        text: newMessage,
        type: 'text'
      });
      setNewMessage('');
      loadMessages();
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!newExpense.title || !newExpense.amount) {
      toast.error('Title and amount are required');
      return;
    }

    try {
      const expenseData = {
        ...newExpense,
        userId: authUser._id,
        groupId: chatGroupId,
        tripId,
        amount: parseFloat(newExpense.amount),
      };
      
      await addExpense(expenseData);
      setShowExpenseModal(false);
      setNewExpense({
        title: '',
        amount: '',
        category: 'Other',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      loadMessages();
    } catch (error) {
      toast.error('Failed to add expense');
    }
  };

  const renderMessage = (message) => {
    const isOwnMessage = message.sender._id === authUser._id;
    
    switch (message.type) {
      case 'expense':
        return (
          <div className="chat-message bg-base-200 p-3 rounded-lg my-2">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              <span className="font-bold">{message.text}</span>
            </div>
            <div className="text-sm text-gray-500">
              Category: {message.metadata.category}
            </div>
          </div>
        );
      
      case 'trip_update':
        return (
          <div className="chat-message bg-info/20 p-3 rounded-lg my-2">
            <div className="text-info">{message.text}</div>
          </div>
        );
      
      default:
        return (
          <div className={`chat ${isOwnMessage ? 'chat-end' : 'chat-start'}`}>
            <div className="chat-image avatar">
              <div className="w-10 rounded-full">
                <img src={message.sender.profilePic || 'https://via.placeholder.com/40'} alt="avatar" />
              </div>
            </div>
            <div className="chat-header">
              {message.sender.fullName}
              <time className="text-xs opacity-50 ml-2">
                {new Date(message.createdAt).toLocaleTimeString()}
              </time>
            </div>
            <div className={`chat-bubble ${isOwnMessage ? 'chat-bubble-primary' : ''}`}>
              {message.text}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message) => (
          <div key={message._id}>
            {renderMessage(message)}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="p-2 border-t border-base-300">
        <button
          onClick={() => setShowExpenseModal(true)}
          className="btn btn-outline btn-sm gap-2"
        >
          <DollarSign className="w-4 h-4" />
          Add Expense
        </button>
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-base-300">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="input input-bordered flex-1"
          />
          <button type="submit" className="btn btn-primary">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Add New Expense</h3>
            <form onSubmit={handleAddExpense} className="space-y-4 mt-4">
              <div className="form-control">
                <label className="label">Title</label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={newExpense.title}
                  onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                  placeholder="Expense title"
                />
              </div>
              <div className="form-control">
                <label className="label">Amount</label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="form-control">
                <label className="label">Category</label>
                <select
                  className="select select-bordered"
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                >
                  <option value="Food">Food</option>
                  <option value="Transportation">Transportation</option>
                  <option value="Accommodation">Accommodation</option>
                  <option value="Activities">Activities</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-control">
                <label className="label">Description</label>
                <textarea
                  className="textarea textarea-bordered"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  placeholder="Add a description..."
                />
              </div>
              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowExpenseModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Expense
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={() => setShowExpenseModal(false)}></div>
        </div>
      )}
    </div>
  );
};

export default TripChat; 