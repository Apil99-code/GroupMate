import { useState } from 'react';
import { useGroupStore } from '../store/useGroupStore';
import { toast } from 'react-hot-toast';
import { useAuthStore } from "../store/useAuthStore";

const GroupSettingsModal = ({ isOpen, onClose, group }) => {
  const { authUser } = useAuthStore();
  const [newGroupName, setNewGroupName] = useState(group?.name || '');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const { updateGroupName, addGroupMember, removeGroupMember, deleteGroup } = useGroupStore();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRenameGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error('Group name cannot be empty');
      return;
    }
    try {
      await updateGroupName(group._id, newGroupName);
      toast.success('Group renamed successfully');
      onClose();
    } catch (error) {
      console.error('Error renaming group:', error);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) {
      toast.error('Please enter an email');
      return;
    }
    try {
      await addGroupMember(group._id, newMemberEmail);
      toast.success('Member added successfully');
      setNewMemberEmail('');
    } catch (error) {
      console.error('Error adding member:', error);
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      // If user is removing themselves, show a confirmation
      if (memberId === authUser._id) {
        if (!window.confirm('Are you sure you want to leave this group?')) {
          return;
        }
      }
      await removeGroupMember(group._id, memberId);
      
      // If the user removed themselves, close the modal
      if (memberId === authUser._id) {
        onClose();
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error(error.response?.data?.error || 'Failed to remove member');
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteGroup(group._id);
      onClose();
    } catch (error) {
      console.error('Error deleting group:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-base-200 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-base-content">Group Settings</h2>
        
        {/* Rename Group Section */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 text-base-content">Rename Group</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="flex-1 p-2 border border-base-300 rounded bg-base-100 text-base-content"
              placeholder="New group name"
            />
            <button
              onClick={handleRenameGroup}
              className="btn btn-primary"
            >
              Rename
            </button>
          </div>
        </div>

        {/* Add Member Section */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 text-base-content">Add Member</h3>
          <div className="flex gap-2">
            <input
              type="email"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              className="flex-1 p-2 border border-base-300 rounded bg-base-100 text-base-content"
              placeholder="Enter member email"
            />
            <button
              onClick={handleAddMember}
              className="btn btn-success"
            >
              Add
            </button>
          </div>
        </div>

        {/* Members List Section */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 text-base-content">Group Members</h3>
          <div className="space-y-2">
            {group?.members?.map((member) => (
              <div key={member._id} className="flex items-center justify-between p-2 bg-base-100 rounded">
                <div className="flex items-center gap-2">
                  <span className="text-base-content">
                    {member.fullName || member.email}
                  </span>
                  {member._id === group.members[0]._id && (
                    <span className="text-xs text-success">(Admin)</span>
                  )}
                </div>
                {(member._id === authUser._id || (authUser._id === group.members[0]._id && member._id !== group.members[0]._id)) && (
                  <button
                    onClick={() => handleRemoveMember(member._id)}
                    className={`btn btn-ghost btn-sm ${member._id === authUser._id ? 'text-warning' : 'text-error'}`}
                  >
                    {member._id === authUser._id ? 'Leave' : 'Remove'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Delete Group Section */}
        {authUser._id === group.members[0]._id && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2 text-error">Danger Zone</h3>
            <div className="p-4 bg-error bg-opacity-10 rounded-lg">
              <p className="text-error mb-4">Once you delete a group, there is no going back. Please be certain.</p>
              <button
                onClick={handleDeleteGroup}
                disabled={isDeleting}
                className="btn btn-error w-full"
              >
                {isDeleting ? 'Deleting...' : 'Delete Group'}
              </button>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full btn btn-ghost"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default GroupSettingsModal;