import { useState } from 'react';
import { useTripStore } from '../store/useTripStore';
import { X } from 'lucide-react';

const CreateTripFromChatModal = () => {
  const { 
    showCreateFromChatModal, 
    selectedChatGroup, 
    closeCreateFromChatModal,
    createTripFromChat,
    isTripSubmitting 
  } = useTripStore();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    destination: '',
    budget: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createTripFromChat({
        ...formData,
        chatGroupId: selectedChatGroup._id,
        budget: parseFloat(formData.budget),
      });
      setFormData({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        destination: '',
        budget: '',
      });
    } catch (error) {
      console.error('Failed to create trip:', error);
    }
  };

  if (!showCreateFromChatModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-base-100 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Create Trip from Chat</h2>
          <button
            onClick={closeCreateFromChatModal}
            className="btn btn-ghost btn-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">
              <span className="label-text">Trip Title</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Description</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Destination</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={formData.destination}
              onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">
                <span className="label-text">Start Date</span>
              </label>
              <input
                type="date"
                className="input input-bordered w-full"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text">End Date</span>
              </label>
              <input
                type="date"
                className="input input-bordered w-full"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="label">
              <span className="label-text">Budget</span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              required
            />
          </div>

          <div className="mt-6 flex justify-end space-x-2">
            <button
              type="button"
              onClick={closeCreateFromChatModal}
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isTripSubmitting}
            >
              {isTripSubmitting ? 'Creating...' : 'Create Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTripFromChatModal; 